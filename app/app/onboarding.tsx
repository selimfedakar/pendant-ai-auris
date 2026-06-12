import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { deviceCodeService } from '../services/DeviceCodeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOLD = '#C9A84C';
const BG = '#0A0A0A';
const ONBOARDING_KEY = '@auris:onboarding_complete';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://auris-backend.aurisapi.workers.dev';
const AURIS_API_KEY = process.env.EXPO_PUBLIC_AURIS_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Slide icons — pure RN shapes, no third-party icon deps
// ---------------------------------------------------------------------------

/** Slide 1: Solo Mode — gold orb circle with border glow */
function SoloIcon() {
  return (
    <View style={iconStyles.soloOuter}>
      <View style={iconStyles.soloInner} />
    </View>
  );
}

/** Slide 2: Social Mode — two overlapping circles */
function SocialIcon() {
  return (
    <View style={iconStyles.socialContainer}>
      <View style={[iconStyles.socialCircle, { left: 0 }]} />
      <View style={[iconStyles.socialCircle, { right: 0 }]} />
    </View>
  );
}

/** Slide 3: Vision Mode — square with rounded corners (camera viewfinder) */
function VisionIcon() {
  return (
    <View style={iconStyles.visionOuter}>
      {/* Corner ticks */}
      <View style={[iconStyles.corner, iconStyles.cornerTL]} />
      <View style={[iconStyles.corner, iconStyles.cornerTR]} />
      <View style={[iconStyles.corner, iconStyles.cornerBL]} />
      <View style={[iconStyles.corner, iconStyles.cornerBR]} />
      {/* Center dot */}
      <View style={iconStyles.visionDot} />
    </View>
  );
}

/** Final slide: Activation — padlock ring with keyhole */
function ActivateIcon() {
  return (
    <View style={iconStyles.activateOuter}>
      <View style={iconStyles.activateRing} />
      <View style={iconStyles.activateKeyhole} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Info slide data (the activation step is rendered separately as the last page)
// ---------------------------------------------------------------------------
const INFO_SLIDES = [
  {
    Icon: SoloIcon,
    title: 'Your AI Companion',
    subtitle: 'Swipe right on the orb for private AI conversations. Auris listens and responds.',
  },
  {
    Icon: SocialIcon,
    title: 'Silent Ambient Intelligence',
    subtitle: 'Swipe left on the orb. Auris listens silently and sends you insights — without interrupting.',
  },
  {
    Icon: VisionIcon,
    title: 'See the World Differently',
    subtitle: 'Tap the floating center node. Capture anything and ask Auris about it.',
  },
];

// The activation gate occupies the last page of the pager.
const TOTAL_PAGES = INFO_SLIDES.length + 1;
const ACTIVATE_INDEX = INFO_SLIDES.length;

// ---------------------------------------------------------------------------
// Main onboarding screen — info slides followed by the access-code gate
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Activation gate state
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex + 1 < TOTAL_PAGES) {
      goToPage(currentIndex + 1);
    }
  };

  // Persist completion + the unlocking code, then enter the app.
  const completeAndEnter = async (validatedCode: string) => {
    await deviceCodeService.setCode(validatedCode);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  };

  const handleAuthorize = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError('Please enter your access code.');
      return;
    }

    // Admin code bypasses network validation — used by the team before the
    // pendant ships. Customers receive AUR-XXXXXX codes in the product booklet.
    if (normalized === '003') {
      await completeAndEnter(normalized);
      return;
    }

    setLoading(true);
    setError('');

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
        await completeAndEnter(normalized);
      } else {
        setError('Invalid code. Check your product booklet.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isActivatePage = currentIndex === ACTIVATE_INDEX;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        {/* Info slides */}
        {INFO_SLIDES.map((slide, i) => {
          const { Icon } = slide;
          return (
            <View key={i} style={styles.slide}>
              <View style={styles.iconArea}>
                <Icon />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          );
        })}

        {/* Activation gate — the final page */}
        <View style={styles.slide}>
          <View style={styles.iconArea}>
            <ActivateIcon />
          </View>
          <Text style={styles.title}>Activate Auris</Text>
          <Text style={styles.subtitle}>
            Enter the access code from your product booklet to unlock Auris.
          </Text>

          <View style={styles.gate}>
            <TextInput
              style={[styles.input, focused && styles.inputFocused]}
              value={code}
              onChangeText={(t) => {
                setCode(t);
                setError('');
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="ENTER ACCESS CODE"
              placeholderTextColor="#444"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              textAlign="center"
              returnKeyType="done"
              onSubmitEditing={handleAuthorize}
              editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : <View style={styles.errorSpacer} />}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuthorize}
              activeOpacity={0.82}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <Text style={styles.buttonText}>AUTHORIZE ACCESS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomArea}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* NEXT button only on info slides; the activation page uses its inline button */}
        {!isActivatePage && (
          <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.82}>
            <Text style={styles.buttonText}>NEXT</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconArea: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#999999',
    lineHeight: 22,
    textAlign: 'center',
  },
  // Activation gate (below the last slide's text)
  gate: {
    width: '100%',
    marginTop: 36,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 6,
    color: GOLD,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
  },
  errorText: {
    color: '#FF3B3B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    minHeight: 18,
  },
  errorSpacer: {
    height: 18,
    marginTop: 12,
    marginBottom: 4,
  },
  bottomArea: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    alignItems: 'center',
    gap: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: GOLD,
  },
  dotInactive: {
    backgroundColor: '#333333',
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: GOLD,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

// ---------------------------------------------------------------------------
// Icon styles
// ---------------------------------------------------------------------------
const iconStyles = StyleSheet.create({
  // Solo: concentric circles with gold border glow
  soloOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.8,
  },
  soloInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 1,
  },

  // Social: two overlapping circles
  socialContainer: {
    width: 80,
    height: 56,
    position: 'relative',
  },
  socialCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: GOLD,
    top: 0,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
  },

  // Vision: rounded square viewfinder with corner ticks
  visionOuter: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.7,
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: GOLD,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  visionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 1,
  },

  // Activation: padlock ring with keyhole
  activateOuter: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.8,
  },
  activateKeyhole: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 1,
  },
});
