import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import { WaveformBars } from '@/components/WaveformBars';

export type OrbState = 'idle' | 'listening' | 'processing' | 'analyzing' | 'speaking';

const ORB_SIZE = 180;

const STATE_COLORS: Record<OrbState, string> = {
  idle: theme.colors.gold,
  listening: '#4A9EFF',
  processing: '#8B5CF6',
  analyzing: '#00D4FF',
  speaking: '#10B981',
};

const STATE_LABELS: Record<OrbState, string> = {
  idle: 'TAP TO SPEAK',
  listening: 'LISTENING',
  processing: 'THINKING',
  analyzing: 'SCANNING',
  speaking: 'AURIS',
};

interface Props {
  state: OrbState;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function AurisOrb({ state, onPress, onLongPress }: Props) {
  const color = STATE_COLORS[state];

  // Core orb
  const coreScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  // Rings
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);

  // Processing rotation
  const rotation = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(coreScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring1Opacity);
    cancelAnimation(ring2Scale);
    cancelAnimation(ring2Opacity);
    cancelAnimation(rotation);

    if (state === 'idle') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.97, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 2400 }),
          withTiming(0.25, { duration: 2400 }),
        ),
        -1,
        false,
      );
      ring1Scale.value = 1;
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.12, { duration: 2400 }),
          withTiming(0, { duration: 2400 }),
        ),
        -1,
        false,
      );
      ring2Scale.value = 1;
      ring2Opacity.value = 0;
    }

    if (state === 'listening') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.09, { duration: 500, easing: Easing.out(Easing.ease) }),
          withTiming(0.95, { duration: 500, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withTiming(0.85, { duration: 300 });

      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 0 }),
          withTiming(0, { duration: 1000 }),
        ),
        -1,
        false,
      );

      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.9, { duration: 1600, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 0 }),
          withTiming(0, { duration: 1600 }),
        ),
        -1,
        false,
      );
    }

    if (state === 'processing') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 900 }),
          withTiming(0.97, { duration: 900 }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        false,
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
      ring1Opacity.value = 0;
      ring2Opacity.value = 0;
    }

    if (state === 'analyzing') {
      // Fast dual-rotation scan effect for vision processing
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 600 }),
          withTiming(0.96, { duration: 600 }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 300 }),
          withTiming(0.2, { duration: 300 }),
        ),
        -1,
        false,
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false,
      );
      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.5, { duration: 800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        false,
      );
      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(1.8, { duration: 800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 400 }),
          withTiming(0.35, { duration: 0 }),
          withTiming(0, { duration: 800 }),
        ),
        -1,
        false,
      );
    }

    if (state === 'speaking') {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 380 }),
          withTiming(0.97, { duration: 380 }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withTiming(1, { duration: 200 });

      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.45, { duration: 700, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 0 }),
          withTiming(0, { duration: 700 }),
        ),
        -1,
        false,
      );

      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.7, { duration: 1100, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.28, { duration: 0 }),
          withTiming(0, { duration: 1100 }),
        ),
        -1,
        false,
      );
    }
  }, [state]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const rotatingRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value ?? 0}deg` }],
  }));

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={onPress} onLongPress={onLongPress}>
        <View style={styles.container}>
          {/* Outer ring */}
          <Animated.View
            style={[
              styles.ring,
              { width: ORB_SIZE + 100, height: ORB_SIZE + 100, borderRadius: (ORB_SIZE + 100) / 2, borderColor: color },
              ring2Style,
            ]}
          />
          {/* Inner ring */}
          <Animated.View
            style={[
              styles.ring,
              { width: ORB_SIZE + 50, height: ORB_SIZE + 50, borderRadius: (ORB_SIZE + 50) / 2, borderColor: color },
              ring1Style,
            ]}
          />

          {/* Glow halo */}
          <Animated.View
            style={[
              styles.glow,
              { backgroundColor: color },
              glowStyle,
            ]}
          />

          {/* Processing arc */}
          {state === 'processing' && (
            <Animated.View style={[styles.processingArc, { borderTopColor: color }, rotatingRingStyle]} />
          )}

          {/* Core orb */}
          <Animated.View style={[styles.orb, { borderColor: `${color}30`, shadowColor: color }, coreStyle]}>
            <View style={[styles.innerGlow, { backgroundColor: `${color}18` }]} />
            <View style={[styles.dot, { backgroundColor: color }]} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Label below orb */}
      <Text style={[styles.label, { color: state === 'idle' ? theme.colors.textTertiary : color }]}>
        {STATE_LABELS[state] ?? ''}
      </Text>

      {/* Waveform bars — visible only when listening */}
      <WaveformBars active={state === 'listening'} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 32,
  },
  container: {
    width: ORB_SIZE + 100,
    height: ORB_SIZE + 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    borderRadius: (ORB_SIZE + 20) / 2,
    opacity: 0,
  },
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.6,
    elevation: 20,
  },
  innerGlow: {
    position: 'absolute',
    width: ORB_SIZE - 16,
    height: ORB_SIZE - 16,
    borderRadius: (ORB_SIZE - 16) / 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  processingArc: {
    position: 'absolute',
    width: ORB_SIZE + 24,
    height: ORB_SIZE + 24,
    borderRadius: (ORB_SIZE + 24) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '400',
  },
});
