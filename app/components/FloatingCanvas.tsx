import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Dimensions } from 'react-native';
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

const screenWidth = Dimensions.get('window').width;
const WIDGET_WIDTH = 220;
const EDGE_PADDING = 16;

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

interface ConnectorProps {
  phase: 0 | 1;
}

function AnimatedConnector({ phase }: ConnectorProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1750 + phase * 200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1750 + phase * 200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.connector, animStyle]} />;
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
    ? 'ATTACHED'
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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const onContextualPressRef = useRef(onContextualPress ?? (() => {}));
  useEffect(() => {
    onContextualPressRef.current = onContextualPress ?? (() => {});
  }, [onContextualPress]);

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = contextX.value + e.translationX;
      translateY.value = contextY.value + e.translationY;
    })
    .onEnd(() => {
      const currentCenterX = screenWidth / 2 + translateX.value;
      const snapRight = currentCenterX > screenWidth / 2;
      const targetX = snapRight
        ? screenWidth / 2 - WIDGET_WIDTH / 2 - EDGE_PADDING
        : -(screenWidth / 2 - WIDGET_WIDTH / 2 - EDGE_PADDING);
      translateX.value = withSpring(targetX, { damping: 18, stiffness: 180 });
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.canvas, dragStyle]}>
        <View style={styles.row}>
          <Pressable onPress={onContextualPress}>
            <SideNode phase={0} />
          </Pressable>
          <AnimatedConnector phase={0} />
          <CenterNode
            onPress={onVisionPress}
            onDismissImage={onDismissImage}
            hasCapturedImage={hasCapturedImage}
            hasAnalysisResult={hasAnalysisResult}
            capturedImageBase64={capturedImageBase64}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connector: {
    width: 32,
    height: 1.5,
    backgroundColor: `${GOLD}45`,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.65,
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
