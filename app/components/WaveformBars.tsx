import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { audioService } from '@/services/AudioService';

// Multipliers per bar to create a natural wave envelope shape
const BAR_MULTIPLIERS = [0.55, 0.72, 0.88, 1.0, 0.88, 0.72, 0.55];
const BAR_COUNT = BAR_MULTIPLIERS.length;

const MIN_HEIGHT = 3;
const MAX_HEIGHT = 64;
const BAR_WIDTH = 5;
const BAR_GAP = 5;

// Color interpolation anchors: low volume = gold, high volume = cyan
const COLOR_LOW = '#F5A623';  // gold
const COLOR_HIGH = '#00D4FF'; // cyan

interface Props {
  active: boolean;
  color: string;
}

function SingleBar({
  height,
  colorProgress,
}: {
  height: Animated.SharedValue<number>;
  colorProgress: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const barColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      [COLOR_LOW, COLOR_HIGH],
    );
    return {
      height: height.value ?? MIN_HEIGHT,
      backgroundColor: barColor,
      shadowColor: barColor,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bar,
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

  // Single shared color progress value (0 = gold, 1 = cyan) driven by avg metering
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      audioService.setMeteringCallback((db: number) => {
        // Map dB range -60..0 to 0..1
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
        for (let i = 0; i < BAR_COUNT; i++) {
          const targetHeight = MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT) * BAR_MULTIPLIERS[i];
          barHeights[i].value = withSpring(targetHeight, {
            damping: 15,
            stiffness: 200,
          });
        }
        // Drive color: normalized maps 0 → gold, 1 → cyan
        colorProgress.value = withSpring(normalized, {
          damping: 15,
          stiffness: 200,
        });
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
      colorProgress.value = withTiming(0, { duration: 200 });
    }

    return () => {
      audioService.setMeteringCallback(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <View style={styles.container}>
      {barHeights.map((height, index) => (
        <SingleBar key={index} height={height} colorProgress={colorProgress} />
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
