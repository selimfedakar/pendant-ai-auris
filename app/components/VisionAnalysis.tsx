import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  PanResponder,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.25);

interface VisionAnalysisProps {
  imageBase64: string | null;
  transcript: string;
  analysis: string;
  visible: boolean;
  onDismiss: () => void;
}

export function VisionAnalysis({
  imageBase64,
  transcript,
  analysis,
  visible,
  onDismiss,
}: VisionAnalysisProps) {
  const translateY = useSharedValue(PANEL_HEIGHT);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : PANEL_HEIGHT, {
      damping: 24,
      stiffness: 230,
    });
  }, [visible]);

  const dismiss = () => {
    translateY.value = withSpring(
      PANEL_HEIGHT,
      { damping: 20, stiffness: 200 },
      (done) => {
        'worklet';
        if (done) runOnJS(onDismiss)();
      },
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.value = gs.dy;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 70 || gs.vy > 0.6) {
          dismiss();
        } else {
          translateY.value = withSpring(0, { damping: 24, stiffness: 230 });
        }
      },
    }),
  ).current;

  const panStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.panel, panStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Drag handle */}
      <View style={styles.handleZone} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.headerRow}>
        {imageBase64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.headerText}>
          <Text style={styles.headerLabel}>VISION ANALYSIS</Text>
          {transcript ? (
            <Text style={styles.transcriptText} numberOfLines={2}>
              {transcript}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Analysis content */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled
      >
        <Text style={styles.analysisText}>{analysis}</Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#070810',
    borderTopWidth: 0.5,
    borderTopColor: '#00D4FF28',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff15',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#15151F',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#00D4FF25',
  },
  headerText: { flex: 1 },
  headerLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#00D4FF',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  transcriptText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  analysisText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
});
