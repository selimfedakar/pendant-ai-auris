import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const GOLD = '#C9A84C';
const CARD_BG = '#0D0D0D';
const SURFACE = '#161616';
const BORDER = '#2A2A2A';
const TEXT_PRIMARY = '#F0F0F0';
const TEXT_SECONDARY = '#888888';
const CYAN = '#00E5FF';
const BLUE = '#4A9EFF';

type Props = {
  visible: boolean;
  summary: string;
  durationMinutes: number;
  transcriptCount: number;
  onDismiss: () => void;
};

export function SocialSummaryCard({ visible, summary, durationMinutes, transcriptCount, onDismiss }: Props) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide up / slide down animation
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 180, mass: 0.8 });
      autoDismissTimer.current = setTimeout(() => {
        onDismiss();
      }, 8000);
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 26, stiffness: 200 });
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
    };
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const handleDismiss = () => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
    onDismiss();
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={14} color={BLUE} />
        </View>
        <Text style={styles.headerLabel}>SOCIAL SESSION COMPLETE</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statText}>{durationMinutes} MIN</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statText}>{transcriptCount} SEGMENTS</Text>
        </View>
      </View>

      {/* Summary text */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryAccentBar} />
        <ScrollView
          style={styles.summaryScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <Text style={styles.summaryText}>{summary}</Text>
        </ScrollView>
      </View>

      {/* Dismiss button */}
      <Pressable
        style={({ pressed }) => [styles.dismissButton, pressed && { opacity: 0.75 }]}
        onPress={handleDismiss}
      >
        <Text style={styles.dismissButtonText}>CLOSE</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 20,
    zIndex: 200,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 0.5,
    borderColor: `${GOLD}40`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${BLUE}20`,
    borderWidth: 1,
    borderColor: `${BLUE}50`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BLUE,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statChip: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: CYAN,
    letterSpacing: 1.2,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
    maxHeight: 140,
  },
  summaryAccentBar: {
    width: 4,
    backgroundColor: GOLD,
  },
  summaryScroll: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 21,
  },
  dismissButton: {
    backgroundColor: `${BLUE}25`,
    borderWidth: 1,
    borderColor: `${BLUE}50`,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
    letterSpacing: 2,
  },
});
