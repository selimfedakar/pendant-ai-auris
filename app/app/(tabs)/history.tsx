import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { historyService, HistoryEntry } from '@/services/HistoryService';

type Section = { title: string; data: HistoryEntry[] };

function formatSectionDate(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yestStart = todayStart - 86400000;
  const entryStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (entryStart === todayStart) return 'Today';
  if (entryStart === yestStart) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function estimateDuration(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const secs = Math.max(1, Math.round(words / 2.5));
  return secs < 60 ? `~${secs}s` : `~${Math.round(secs / 60)}m`;
}

function groupHistory(entries: HistoryEntry[]): Section[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const key = formatSectionDate(entry.ts);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ─── Animated section header ─────────────────────────────────────────────────

function AnimatedSectionHeader({
  scrollY,
  children,
}: {
  scrollY: Animated.SharedValue<number>;
  children: React.ReactNode;
}) {
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0.5], Extrapolation.CLAMP),
  }));

  return <Animated.View style={headerStyle}>{children}</Animated.View>;
}

// ─── Animated card wrapper ────────────────────────────────────────────────────

function AnimatedHistoryCard({
  children,
  index,
  scrollY,
  itemHeight,
}: {
  children: React.ReactNode;
  index: number;
  scrollY: Animated.SharedValue<number>;
  itemHeight: number;
}) {
  const entryOpacity = useSharedValue(0);
  const entryY = useSharedValue(16);

  useEffect(() => {
    const delay = Math.min(index * 40, 300);
    const t = setTimeout(() => {
      entryOpacity.value = withTiming(1, { duration: 260 });
      entryY.value = withSpring(0, { damping: 16, stiffness: 100 });
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const itemOffset = index * itemHeight;
    const inputRange = [itemOffset - itemHeight * 2, itemOffset - itemHeight * 0.5];

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [1, 0.88],
      Extrapolation.CLAMP,
    );
    const scrollOpacity = interpolate(
      scrollY.value,
      inputRange,
      [1, 0.2],
      Extrapolation.CLAMP,
    );
    const rotateXDeg = interpolate(
      scrollY.value,
      inputRange,
      [0, -5],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      inputRange,
      [0, -8],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { perspective: 800 },
        { scale },
        { rotateX: `${rotateXDeg}deg` },
        { translateY: translateY + entryY.value },
      ],
      opacity: scrollOpacity * entryOpacity.value,
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// ─── Static sub-components ───────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

function HistoryCard({ item, onPress }: { item: HistoryEntry; onPress: () => void }) {
  const modeColor = item.mode === 'solo' ? theme.colors.gold : '#4A9EFF';
  const modeLabel = item.mode === 'solo' ? 'SOLO' : 'SOCIAL';
  const modeIcon = item.mode === 'solo' ? 'mic-outline' : 'people-outline';

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.modeBadge, { borderColor: `${modeColor}40`, backgroundColor: `${modeColor}08` }]}>
          <Ionicons name={modeIcon} size={9} color={modeColor} />
          <Text style={[styles.modeText, { color: modeColor }]}>{modeLabel}</Text>
        </View>
        <Text style={styles.durationText}>{estimateDuration(item.preview)}</Text>
        <Text style={styles.timeText}>{formatTime(item.ts)}</Text>
      </View>
      <Text style={styles.summaryText} numberOfLines={1}>{item.summary}</Text>
      <Text style={styles.previewText} numberOfLines={2}>{item.preview}</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryEntry | null>(null);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  useEffect(() => {
    historyService.load().then(setHistory);
  }, []);

  const sections = useMemo(() => groupHistory(history), [history]);

  const totalConversations = history.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>HISTORY</Text>
        {totalConversations > 0 && (
          <Text style={styles.totalCount}>{totalConversations} conversations</Text>
        )}
      </View>

      <Animated.SectionList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedHistoryCard
            index={index}
            scrollY={scrollY}
            itemHeight={88}
          >
            <HistoryCard item={item} onPress={() => setSelectedItem(item)} />
          </AnimatedHistoryCard>
        )}
        renderSectionHeader={({ section }) => (
          <AnimatedSectionHeader scrollY={scrollY}>
            <SectionHeader title={section.title} count={section.data.length} />
          </AnimatedSectionHeader>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No conversations yet.{'\n'}Start talking to Auris.</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalSummary}>{selectedItem?.summary}</Text>
            <Text style={styles.modalDate}>{selectedItem ? formatDate(selectedItem.ts) : ''}</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalPreview}>{selectedItem?.preview}</Text>
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setSelectedItem(null)}>
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: 4,
  },
  totalCount: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: theme.colors.border,
  },
  sectionBadgeText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.75,
    backgroundColor: theme.colors.surfaceElevated,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  durationText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    letterSpacing: 0.3,
  },
  timeText: {
    color: theme.colors.textTertiary,
    fontSize: 10,
    marginLeft: 'auto',
  },
  summaryText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  previewText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 0.5,
    borderColor: `${theme.colors.gold}40`,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '80%',
    gap: 10,
  },
  modalSummary: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalDate: {
    color: theme.colors.gold,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  modalScroll: {
    marginTop: 4,
    maxHeight: 300,
  },
  modalPreview: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  modalClose: {
    marginTop: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: `${theme.colors.gold}60`,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 28,
    paddingVertical: 9,
  },
  modalCloseText: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
