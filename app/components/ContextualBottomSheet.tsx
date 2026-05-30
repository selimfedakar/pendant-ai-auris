import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  PanResponder,
  StyleSheet,
  ListRenderItemInfo,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.5;
const SIDE_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.52;
const CAROUSEL_HEIGHT = 200;

const CYAN = '#00E5FF';
const EMERALD = '#10B981';
const INDIGO = '#6366F1';

type Module = {
  id: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const MODULES: Module[] = [
  {
    id: 'visual',
    label: 'Visual Analysis',
    color: CYAN,
    icon: 'hardware-chip-outline',
    description: 'Camera + AI vision',
  },
  {
    id: 'calendar',
    label: 'Calendar Sync',
    color: EMERALD,
    icon: 'calendar-outline',
    description: 'Schedule-aware AI',
  },
  {
    id: 'email',
    label: 'Email Intel',
    color: INDIGO,
    icon: 'mail-outline',
    description: 'Gmail AI analysis',
  },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Module>);

interface ModuleItemProps {
  item: Module;
  index: number;
  scrollX: Animated.SharedValue<number>;
  isSelected: boolean;
}

function ModuleItem({ item, index, scrollX, isSelected }: ModuleItemProps) {
  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];
    const scale   = interpolate(scrollX.value, inputRange, [0.65, 1, 0.65],  Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];
    const glow = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity: glow };
  });

  return (
    <View style={styles.itemOuter}>
      <Animated.View style={[styles.itemInner, animStyle]}>
        <Animated.View
          style={[
            styles.glowHalo,
            { borderColor: item.color, shadowColor: item.color },
            glowStyle,
          ]}
        />
        <View style={[styles.iconCircle, { borderColor: `${item.color}90`, backgroundColor: `${item.color}14` }]}>
          <Ionicons name={item.icon} size={34} color={item.color} />
          {isSelected && (
            <View style={[styles.activeIndicator, { backgroundColor: item.color, borderColor: theme.colors.background }]}>
              <Ionicons name="checkmark" size={9} color="#000" />
            </View>
          )}
        </View>
        <Text style={[styles.moduleLabel, { color: item.color }]}>{item.label}</Text>
        {isSelected && (
          <Text style={[styles.activeLabel, { color: item.color }]}>ACTIVE</Text>
        )}
      </Animated.View>
    </View>
  );
}

interface ContextualBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  selectedModule: string;
  onModuleSelect: (id: string) => void;
}

export function ContextualBottomSheet({ visible, onDismiss, selectedModule, onModuleSelect }: ContextualBottomSheetProps) {
  const scrollX    = useSharedValue(ITEM_WIDTH);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const flatListRef = useRef<FlatList<Module>>(null);
  const currentScrollX = useRef(ITEM_WIDTH);
  const [centeredId, setCenteredId] = useState('visual');

  const updateCentered = (x: number) => {
    currentScrollX.current = x;
    const idx = Math.max(0, Math.min(MODULES.length - 1, Math.round(x / ITEM_WIDTH)));
    setCenteredId(MODULES[idx].id);
  };

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 100 });
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 1, animated: false });
      }, 60);
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, { damping: 22, stiffness: 100 });
    }
  }, [visible]);

  const dismiss = () => {
    translateY.value = withSpring(
      SHEET_HEIGHT,
      { damping: 20, stiffness: 100 },
      (done) => {
        'worklet';
        if (done) runOnJS(onDismiss)();
      },
    );
  };

  const handleActivate = () => {
    const idx = Math.max(0, Math.min(MODULES.length - 1, Math.round(currentScrollX.current / ITEM_WIDTH)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onModuleSelect(MODULES[idx].id);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.value = gs.dy;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          dismiss();
        } else {
          translateY.value = withSpring(0, { damping: 22, stiffness: 100 });
        }
      },
    }),
  ).current;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollX.value = event.contentOffset.x;
      runOnJS(updateCentered)(event.contentOffset.x);
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const centeredModule = MODULES.find((m) => m.id === centeredId) ?? MODULES[1];
  const activeModuleData = MODULES.find((m) => m.id === selectedModule) ?? MODULES[1];
  const isCenteredAlreadyActive = centeredId === selectedModule;

  return (
    <Animated.View
      style={[styles.sheet, sheetStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <View style={styles.handleBar} />
        <Text style={styles.title}>Contextual Analysis</Text>
        <Text style={styles.subtitle}>swipe to select · tap activate</Text>
      </View>

      <View style={styles.carouselContainer}>
        <AnimatedFlatList
          ref={flatListRef as any}
          data={MODULES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SIDE_SPACING }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          initialScrollIndex={1}
          getItemLayout={(_, index) => ({
            length: ITEM_WIDTH,
            offset: ITEM_WIDTH * index,
            index,
          })}
          renderItem={({ item, index }: ListRenderItemInfo<Module>) => (
            <ModuleItem
              item={item}
              index={index}
              scrollX={scrollX}
              isSelected={item.id === selectedModule}
            />
          )}
        />
      </View>

      {/* Activate button */}
      <Pressable
        style={({ pressed }) => [
          styles.activateBtn,
          { borderColor: `${centeredModule.color}50`, backgroundColor: `${centeredModule.color}10` },
          pressed && styles.activateBtnPressed,
        ]}
        onPress={handleActivate}
      >
        <Ionicons
          name={isCenteredAlreadyActive ? 'checkmark-circle' : 'radio-button-on-outline'}
          size={14}
          color={centeredModule.color}
        />
        <Text style={[styles.activateBtnText, { color: centeredModule.color }]}>
          {isCenteredAlreadyActive ? 'ALREADY ACTIVE' : `ACTIVATE ${centeredModule.label.toUpperCase()}`}
        </Text>
      </Pressable>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: activeModuleData.color }]} />
        <Text style={styles.statusText}>
          {activeModuleData.label.toUpperCase()}: {activeModuleData.description}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: 'rgba(8, 8, 20, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: `${CYAN}28`,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginBottom: 14,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1.3,
  },
  carouselContainer: {
    height: CAROUSEL_HEIGHT,
    width: '100%',
  },
  itemOuter: {
    width: ITEM_WIDTH,
    height: CAROUSEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  moduleLabel: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  activeLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginTop: 4,
    opacity: 0.8,
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  activateBtnPressed: {
    opacity: 0.6,
  },
  activateBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 24,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statusText: {
    color: theme.colors.textTertiary,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '500',
    flexShrink: 1,
  },
});
