import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { deviceCodeService } from '../services/DeviceCodeService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://auris-backend.aurisapi.workers.dev';
const AURIS_API_KEY = process.env.EXPO_PUBLIC_AURIS_API_KEY ?? '';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Individual animated letter for the staggered logo glow-in
// ---------------------------------------------------------------------------
function GlowLetter({ char, delay }: { char: string; delay: number }) {
  const opacity = useSharedValue(0);
  const shadowRadius = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    textShadowRadius: shadowRadius.value,
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      // Easing.bezier is worklet-safe; Easing.out(Easing.quad) is a closure that crashes in worklets
      opacity.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) });
      shadowRadius.value = withTiming(20, { duration: 800 });
    }, delay);
    return () => clearTimeout(t);
  }, [delay]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.Text
      style={[
        styles.logoLetter,
        animatedStyle,
        {
          textShadowColor: '#FFD700',
          textShadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      {char}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Pulsing orb — two concentric rings with gold/cyan glow
// ---------------------------------------------------------------------------
function PulsingOrb() {
  const outerOpacity = useSharedValue(0.2);
  const innerScale = useSharedValue(0.95);

  useEffect(() => {
    // withSpring bypasses easing entirely — no worklet serialization risk, and gives natural feel
    outerOpacity.value = withRepeat(
      withSpring(0.8, { damping: 12, stiffness: 30, mass: 1 }),
      -1,
      true,
    );
    innerScale.value = withRepeat(
      withSpring(1.05, { damping: 15, stiffness: 40, mass: 1 }),
      -1,
      true,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const outerStyle = useAnimatedStyle(() => ({
    opacity: outerOpacity.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  return (
    <View style={styles.orbContainer}>
      {/* Outer ring */}
      <Animated.View style={[styles.orbOuter, outerStyle]} />
      {/* Inner ring */}
      <Animated.View style={[styles.orbInner, innerStyle]} />
      {/* Core dot */}
      <View style={styles.orbCore} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Scan line — horizontal line that travels up-down slowly
// ---------------------------------------------------------------------------
function ScanLine() {
  const topPosition = useSharedValue(0);

  useEffect(() => {
    topPosition.value = withRepeat(
      withTiming(SCREEN_HEIGHT, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    top: topPosition.value,
  }));

  return <Animated.View style={[styles.scanLine, animatedStyle]} />;
}

// ---------------------------------------------------------------------------
// Main activation screen
// ---------------------------------------------------------------------------
export default function ActivateScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  // Flash overlay for success
  const flashOpacity = useSharedValue(0);
  // Error shake for input
  const shakeX = useSharedValue(0);
  // Error text opacity
  const errorOpacity = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const errorStyle = useAnimatedStyle(() => ({ opacity: errorOpacity.value }));

  const navigateToTabs = () => {
    router.replace('/(tabs)');
  };

  const triggerError = (message: string) => {
    setError(message);
    // Fade-in error text
    errorOpacity.value = withTiming(1, { duration: 250 });
    // Shake input
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const triggerSuccess = () => {
    // Gold/white screen flash
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(navigateToTabs)();
        }
      }),
    );
  };

  const handleValidate = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      triggerError('Please enter your access code.');
      return;
    }

    // Admin code bypasses network validation — backend may not be deployed yet
    if (normalized === '003') {
      await deviceCodeService.setCode(normalized);
      triggerSuccess();
      return;
    }

    setLoading(true);
    setError('');
    errorOpacity.value = 0;

    try {
      const response = await fetch(`${BACKEND_URL}/v1/validate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auris-Key': AURIS_API_KEY,
        },
        body: JSON.stringify({ code: normalized }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = (await response.json()) as { valid: boolean; type?: string };

      if (data.valid) {
        await deviceCodeService.setCode(normalized);
        triggerSuccess();
      } else {
        triggerError('Invalid code. Check your product booklet.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed.';
      triggerError(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const LOGO_CHARS = ['A', 'U', 'R', 'I', 'S'];

  return (
    <View style={styles.root}>
      {/* Ambient scan line */}
      <ScanLine />

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top section — logo */}
        <View style={styles.topSection}>
          <View style={styles.logoRow}>
            {LOGO_CHARS.map((char, i) => (
              <GlowLetter key={i} char={char} delay={i * 120} />
            ))}
          </View>
          <Text style={styles.subtitle}>INTELLIGENCE PENDANT</Text>
        </View>

        {/* Center animation — pulsing orb */}
        <View style={styles.centerSection}>
          <PulsingOrb />
        </View>

        {/* Bottom section — input + button */}
        <View style={styles.bottomSection}>
          {/* Code input */}
          <Animated.View style={[styles.inputWrapper, shakeStyle]}>
            <TextInput
              style={[
                styles.input,
                focused && styles.inputFocused,
              ]}
              value={code}
              onChangeText={(t) => {
                setCode(t);
                setError('');
                errorOpacity.value = 0;
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="ENTER ACCESS CODE"
              placeholderTextColor="#444"
              autoCapitalize="characters"
              maxLength={10}
              textAlign="center"
              returnKeyType="done"
              onSubmitEditing={handleValidate}
              editable={!loading}
            />
          </Animated.View>

          {/* Error message */}
          <Animated.View style={[styles.errorContainer, errorStyle]}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>

          {/* Validate button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleValidate}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>AUTHORIZE ACCESS</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Success flash overlay */}
      <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
  },
  // Top section
  topSection: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  logoLetter: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 6,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontSize: 11,
    color: '#00D4FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  // Center orb
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 1,
  },
  orbInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 1,
  },
  orbCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 1,
  },
  // Bottom section
  bottomSection: {
    alignItems: 'center',
    gap: 16,
  },
  inputWrapper: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    color: '#FFD700',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
  },
  errorContainer: {
    minHeight: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B3B',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
    letterSpacing: 1,
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 3,
  },
  // Scan line
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#00D4FF',
    opacity: 0.15,
    zIndex: 1,
  },
  // Success flash overlay
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFD700',
    zIndex: 100,
  },
});
