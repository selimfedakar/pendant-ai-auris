import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { audioService } from '@/services/AudioService';

// Multipliers per bar to create a natural wave envelope shape
const BAR_MULTIPLIERS = [0.55, 0.72, 0.88, 1.0, 0.88, 0.72, 0.55];
const BAR_COUNT = BAR_MULTIPLIERS.length;

const MIN_HEIGHT = 3;
const MAX_HEIGHT = 64;
const ANIMATE_DURATION = 70;
const BAR_WIDTH = 5;
const BAR_GAP = 5;

interface Props {
  active: boolean;
  color: string;
}

function SingleBar({ height, color }: { height: Animated.SharedValue<number>; color: string }) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value ?? MIN_HEIGHT,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color, shadowColor: color },
        animatedStyle,
      ]}
    />
  );
}

export function WaveformBars({ active, color }: Props) {
  // One shared value per bar
  const barHeights = [
    useSharedValue(MIN_HEIGHT),
    useSharedValue(MIN_HEIGHT),
    useSharedValue(MIN_HEIGHT),
    useSharedValue(MIN_HEIGHT),
    useSharedValue(MIN_HEIGHT),
    useSharedValue(MIN_HEIGHT),
    useSharedValue(MIN_HEIGHT),
  ];

  useEffect(() => {
    if (active) {
      audioService.setMeteringCallback((db: number) => {
        // Map dB range -60..0 to 0..1
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
        for (let i = 0; i < BAR_COUNT; i++) {
          const targetHeight = MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT) * BAR_MULTIPLIERS[i];
          barHeights[i].value = withTiming(targetHeight, {
            duration: ANIMATE_DURATION,
            easing: Easing.out(Easing.sin),
          });
        }
      });
    } else {
      // Clear callback and animate all bars back to minimum
      audioService.setMeteringCallback(null);
      for (let i = 0; i < BAR_COUNT; i++) {
        barHeights[i].value = withTiming(MIN_HEIGHT, {
          duration: 200,
          easing: Easing.out(Easing.sin),
        });
      }
    }

    return () => {
      audioService.setMeteringCallback(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <View style={styles.container}>
      {barHeights.map((height, index) => (
        <SingleBar key={index} height={height} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
    height: MAX_HEIGHT,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
