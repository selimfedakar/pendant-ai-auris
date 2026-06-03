import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  clamp,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { WaveformBars } from '@/components/WaveformBars';

export type OrbState = 'idle' | 'listening' | 'processing' | 'analyzing' | 'speaking';

const ORB_SIZE = 180;
const SWIPE_THRESHOLD = 60;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Mode colors
const GOLD = theme.colors.gold;    // '#C9A84C'
const SOCIAL_BLUE = '#4A9EFF';

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

export interface AurisOrbProps {
  state: OrbState;
  onPress: () => void;
  onLongPress?: () => void;
  mode?: 'solo' | 'social';
  onModeChange?: (newMode: 'solo' | 'social') => void;
}

// ---------------------------------------------------------------------------
// Single orb visual (stateless, receives color + all animation values)
// ---------------------------------------------------------------------------
interface OrbVisualProps {
  color: string;
  state: OrbState;
  coreScale: Animated.SharedValue<number>;
  glowOpacity: Animated.SharedValue<number>;
  ring1Scale: Animated.SharedValue<number>;
  ring1Opacity: Animated.SharedValue<number>;
  ring2Scale: Animated.SharedValue<number>;
  ring2Opacity: Animated.SharedValue<number>;
  rotation: Animated.SharedValue<number>;
}

function OrbVisual({
  color,
  state,
  coreScale,
  glowOpacity,
  ring1Scale,
  ring1Opacity,
  ring2Scale,
  ring2Opacity,
  rotation,
}: OrbVisualProps) {
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
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------
export function AurisOrb({ state, onPress, onLongPress, mode = 'solo', onModeChange }: AurisOrbProps) {
  // Derive the base idle color from mode — only applies when state === 'idle'
  const idleColor = mode === 'solo' ? GOLD : SOCIAL_BLUE;
  const color = state === 'idle' ? idleColor : STATE_COLORS[state];

  // Ghost idle color is the opposite mode's color
  const ghostColor = mode === 'solo' ? SOCIAL_BLUE : GOLD;

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

  // Ghost orb animation values (static — no active state-based animation needed)
  const ghostCoreScale = useSharedValue(1);
  const ghostGlowOpacity = useSharedValue(0.35);
  const ghostRing1Scale = useSharedValue(1);
  const ghostRing1Opacity = useSharedValue(0.1);
  const ghostRing2Scale = useSharedValue(1);
  const ghostRing2Opacity = useSharedValue(0);
  const ghostRotation = useSharedValue(0);

  // Swipe gesture state
  const dragX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  // labelOpacity: fades in when dragging, fades out after
  const labelOpacity = useSharedValue(0);

  // JS-side callbacks (must be called via runOnJS from worklet)
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const notifyModeChange = (newMode: 'solo' | 'social') => {
    onModeChange?.(newMode);
  };

  // ---------------------------------------------------------------------------
  // Orb state animations (same as original)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    cancelAnimation(coreScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring1Opacity);
    cancelAnimation(ring2Scale);
    cancelAnimation(ring2Opacity);
    cancelAnimation(rotation);

    if (state === 'idle') {
      // Gentle heartbeat: 0.99 → 1.01 → 0.99, 3s cycle
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.01, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.99, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
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
      // More dramatic breath: 0.92 → 1.08, 1.2s cycle
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(0.92, { duration: 600, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withSpring(0.85, { damping: 12, stiffness: 80 });

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
      // 20% faster rotation: 1400 → 1167ms per revolution
      rotation.value = withRepeat(
        withTiming(360, { duration: 1167, easing: Easing.linear }),
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
      glowOpacity.value = withSpring(1, { damping: 10, stiffness: 80 });

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

  // ---------------------------------------------------------------------------
  // Pan gesture — horizontal swipe to switch modes
  // ---------------------------------------------------------------------------
  const panGesture = Gesture.Pan()
    .minDistance(8)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onStart(() => {
      isDragging.value = true;
      labelOpacity.value = withTiming(1, { duration: 150 });
    })
    .onUpdate((e) => {
      // Rubber-band: clamp drag to ±SCREEN_WIDTH/2 with diminishing resistance
      const maxDrag = SCREEN_WIDTH / 2;
      dragX.value = clamp(e.translationX, -maxDrag, maxDrag);
    })
    .onEnd((e) => {
      isDragging.value = false;

      const committed = Math.abs(e.translationX) >= SWIPE_THRESHOLD;
      if (committed) {
        const newMode = e.translationX < 0 ? 'social' : 'solo';
        runOnJS(triggerHaptic)();
        runOnJS(notifyModeChange)(newMode);
      }

      // Always snap dragX back to 0
      dragX.value = withSpring(0, { damping: 20, stiffness: 200 });
      labelOpacity.value = withTiming(0, { duration: 300 });
    })
    .onFinalize(() => {
      isDragging.value = false;
      dragX.value = withSpring(0, { damping: 20, stiffness: 200 });
      labelOpacity.value = withTiming(0, { duration: 300 });
    });

  // ---------------------------------------------------------------------------
  // Tap gesture — forwarded to onPress / onLongPress via Pressable inside
  // We need to compose tap with pan so they don't conflict.
  // ---------------------------------------------------------------------------
  const tapGesture = Gesture.Tap()
    .maxDistance(10)
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      if (onLongPress) runOnJS(onLongPress)();
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(panGesture, tapGesture, longPressGesture),
  );

  // ---------------------------------------------------------------------------
  // Animated styles for swipe layer
  // ---------------------------------------------------------------------------

  // Active orb slides with drag
  const activeOrbSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  // Ghost orb: positioned on the incoming side
  // If dragging left (dragX < 0) → social (blue) ghost comes from the right
  // If dragging right (dragX > 0) → solo (gold) ghost comes from the left
  const ghostOrbSlideStyle = useAnimatedStyle(() => {
    const ghostOffset = dragX.value < 0
      ? dragX.value + SCREEN_WIDTH   // blue ghost starts from the right
      : dragX.value - SCREEN_WIDTH;  // gold ghost starts from the left
    return {
      transform: [{ translateX: ghostOffset }],
    };
  });

  // Ghost visibility: only show when actually dragging
  const ghostVisibilityStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value ? interpolate(Math.abs(dragX.value), [0, 30], [0, 1]) : 0,
  }));

  // Swipe hint label
  const swipeLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  // Interpolated glow color for the active orb based on drag distance
  // When idle, smoothly shifts shadowColor between solo/social color as the user drags
  const glowColorStyle = useAnimatedStyle(() => {
    if (state !== 'idle') return {};
    const interpolated = interpolateColor(
      dragX.value,
      mode === 'solo' ? [0, -SWIPE_THRESHOLD * 2] : [0, SWIPE_THRESHOLD * 2],
      mode === 'solo' ? [GOLD, SOCIAL_BLUE] : [SOCIAL_BLUE, GOLD],
    );
    return { shadowColor: interpolated };
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.wrapper}>
      {/* Clip container so ghost orbs don't overflow outside the orb hit area */}
      <View style={styles.swipeClipContainer}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.gestureArea}>
            {/* Ghost orb (incoming mode) */}
            <Animated.View
              style={[
                styles.orbSlot,
                ghostOrbSlideStyle,
                ghostVisibilityStyle,
              ]}
              pointerEvents="none"
            >
              <OrbVisual
                color={ghostColor}
                state="idle"
                coreScale={ghostCoreScale}
                glowOpacity={ghostGlowOpacity}
                ring1Scale={ghostRing1Scale}
                ring1Opacity={ghostRing1Opacity}
                ring2Scale={ghostRing2Scale}
                ring2Opacity={ghostRing2Opacity}
                rotation={ghostRotation}
              />
            </Animated.View>

            {/* Active orb (current mode) */}
            <Animated.View style={[styles.orbSlot, activeOrbSlideStyle, glowColorStyle]}>
              <OrbVisual
                color={color}
                state={state}
                coreScale={coreScale}
                glowOpacity={glowOpacity}
                ring1Scale={ring1Scale}
                ring1Opacity={ring1Opacity}
                ring2Scale={ring2Scale}
                ring2Opacity={ring2Opacity}
                rotation={rotation}
              />
            </Animated.View>

            {/* Swipe direction hint label */}
            <Animated.View style={[styles.swipeHintWrapper, swipeLabelStyle]} pointerEvents="none">
              <SwipeHintLabel dragX={dragX} mode={mode} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Label below orb */}
      <Text style={[styles.label, { color: state === 'idle' ? theme.colors.textTertiary : color }]}>
        {STATE_LABELS[state] ?? ''}
      </Text>

      {/* Waveform bars — visible only when listening */}
      <WaveformBars active={state === 'listening'} color={color} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Swipe hint label — reads dragX to show direction text
// ---------------------------------------------------------------------------
function SwipeHintLabel({
  dragX,
  mode,
}: {
  dragX: Animated.SharedValue<number>;
  mode: 'solo' | 'social';
}) {
  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: dragX.value < -10 ? interpolate(dragX.value, [-10, -50], [0, 1]) : 0,
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: dragX.value > 10 ? interpolate(dragX.value, [10, 50], [0, 1]) : 0,
  }));

  return (
    <View style={styles.swipeHintRow}>
      {/* Shown when swiping left → social */}
      <Animated.Text style={[styles.swipeHintText, { color: SOCIAL_BLUE }, leftLabelStyle]}>
        {'← SOCIAL'}
      </Animated.Text>
      {/* Shown when swiping right → solo */}
      <Animated.Text style={[styles.swipeHintText, { color: GOLD }, rightLabelStyle]}>
        {'SOLO →'}
      </Animated.Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const CLIP_SIZE = ORB_SIZE + 100; // matches container size

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 32,
  },
  swipeClipContainer: {
    width: CLIP_SIZE,
    height: CLIP_SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureArea: {
    width: CLIP_SIZE,
    height: CLIP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSlot: {
    position: 'absolute',
    width: CLIP_SIZE,
    height: CLIP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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
  swipeHintWrapper: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
