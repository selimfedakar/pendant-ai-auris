import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { theme } from '@/constants/theme';

const CYAN = '#00D4FF';
const GOLD = theme.colors.gold;
const CRIMSON = '#C0392B';
const CRIMSON_BRIGHT = '#E74C3C';

interface FloatingCanvasProps {
  onVisionPress: () => void;
  onDismissImage: () => void;
  hasCapturedImage: boolean;
  hasAnalysisResult: boolean;
  capturedImageBase64?: string | null;
  onContextualPress?: () => void;
}

function SideNode({ phase }: { phase: 0 | 1 }) {
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const auraOpacity = useSharedValue(0.2);
  const scalePulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(phase === 0 ? -18 : 14, { duration: 2800 + phase * 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(phase === 0 ? 14 : -18, { duration: 2800 + phase * 600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    tx.value = withRepeat(
      withSequence(
        withTiming(phase === 0 ? -8 : 6, { duration: 4000 + phase * 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(phase === 0 ? 6 : -8, { duration: 4000 + phase * 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1700 + phase * 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.12, { duration: 1700 + phase * 400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    scalePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2300 + phase * 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.93, { duration: 2300 + phase * 400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    const cycleDuration = 4500 + phase * 300;
    rotation.value = withRepeat(
      withSequence(
        withTiming(2, { duration: cycleDuration / 4, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: cycleDuration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: cycleDuration / 4, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scalePulse.value },
    ],
  }));

  const auraStyle = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
  }));

  const diamondStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${45 + rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.sideColumn, floatStyle]}>
      <Text style={styles.sideLabel}>CONTEXTUAL{'\n'}ANALYSIS</Text>
      <View style={styles.sideNodeWrapper}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.sideNodeAura, auraStyle]} />
        <Animated.View style={[styles.sideNodeDiamond, diamondStyle]}>
          <View style={styles.sideNodeCore} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}


interface CenterNodeProps {
  onPress: () => void;
  onDismissImage: () => void;
  hasCapturedImage: boolean;
  hasAnalysisResult: boolean;
  capturedImageBase64?: string | null;
}

function CenterNode({ onPress, onDismissImage, hasCapturedImage, hasAnalysisResult, capturedImageBase64 }: CenterNodeProps) {
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const label = hasAnalysisResult
    ? 'SCAN RESULT'
    : hasCapturedImage
    ? 'ANALYZE'
    : 'VISION ANALYSIS';

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.91, { damping: 14 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      onPress={onPress}
    >
      <Animated.View style={[styles.centerNode, floatStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.centerGlow, glowStyle]} />
        <View style={styles.centerContent}>
          {hasCapturedImage && capturedImageBase64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${capturedImageBase64}` }}
              style={styles.capturedThumb}
            />
          ) : (
            <View style={styles.centerDot} />
          )}
          <Text style={styles.centerLabel} numberOfLines={1}>{label}</Text>
          {hasAnalysisResult && <View style={styles.resultDot} />}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingCanvas({
  onVisionPress,
  onDismissImage,
  hasCapturedImage,
  hasAnalysisResult,
  capturedImageBase64,
  onContextualPress,
}: FloatingCanvasProps) {
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      contextX.value = offsetX.value;
      contextY.value = offsetY.value;
    })
    .onUpdate((e) => {
      offsetX.value = contextX.value + e.translationX;
      offsetY.value = contextY.value + e.translationY;
    })
    .onEnd(() => {
      // stay where dropped — no snap back
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ],
  }));

  return (
    <View style={styles.canvas}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={dragStyle}>
          <Pressable onPress={onContextualPress}>
            <SideNode phase={0} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
      <View style={styles.centerWrapper} pointerEvents="box-none">
        <CenterNode
          onPress={onVisionPress}
          onDismissImage={onDismissImage}
          hasCapturedImage={hasCapturedImage}
          hasAnalysisResult={hasAnalysisResult}
          capturedImageBase64={capturedImageBase64}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: 'flex-start',
  },
  centerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // --- Side node ---
  sideColumn: {
    alignItems: 'center',
    gap: 5,
  },
  sideLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: `${CRIMSON_BRIGHT}CC`,
    letterSpacing: 1.4,
    textAlign: 'center',
    lineHeight: 10,
    textShadowColor: CRIMSON_BRIGHT,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  sideNodeWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: `${CRIMSON}12`,
    shadowColor: CRIMSON_BRIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 22,
    shadowOpacity: 0.85,
    elevation: 14,
  },
  sideNodeAura: {
    borderRadius: 28,
    backgroundColor: `${CRIMSON}30`,
  },
  sideNodeDiamond: {
    width: 32,
    height: 32,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: `${CRIMSON_BRIGHT}CC`,
    backgroundColor: `${CRIMSON}35`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideNodeCore: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: CRIMSON_BRIGHT,
    transform: [{ rotate: '-45deg' }],
  },
  // --- Center node ---
  centerNode: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `${CYAN}90`,
    backgroundColor: `${CYAN}09`,
    overflow: 'hidden',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  centerGlow: {
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: `${CYAN}40`,
    backgroundColor: `${CYAN}06`,
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: CYAN,
    opacity: 0.8,
  },
  capturedThumb: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: `${CYAN}50`,
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: CYAN,
    letterSpacing: 1.3,
  },
  resultDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
});
