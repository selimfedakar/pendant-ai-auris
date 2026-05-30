import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
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

function HistoryCard({ item }: { item: HistoryEntry }) {
  const modeColor = item.mode === 'solo' ? theme.colors.gold : '#4A9EFF';
  const modeLabel = item.mode === 'solo' ? 'SOLO' : 'SOCIAL';
  const modeIcon = item.mode === 'solo' ? 'mic-outline' : 'people-outline';

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryCard item={item} />}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} count={section.data.length} />
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
});
