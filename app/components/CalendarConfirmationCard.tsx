import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  Switch,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const GOLD = '#C9A84C';
const GOLD_BRIGHT = '#FFD700';
const CARD_BG = '#0D0D0D';
const SURFACE = '#161616';
const BORDER = '#2A2A2A';
const CANCEL_COLOR = '#5C3C3C';
const TEXT_PRIMARY = '#F0F0F0';
const TEXT_SECONDARY = '#888888';
const CYAN = '#00E5FF';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 120

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// Maps general_timeframe to default hours/minutes
function timeframeToTime(tf: string | undefined): { h: number; m: number } {
  switch (tf) {
    case 'morning':   return { h: 9,  m: 0 };
    case 'afternoon': return { h: 14, m: 0 };
    case 'evening':   return { h: 18, m: 0 };
    default:          return { h: 9,  m: 0 };
  }
}

function nearestThirtyFromNow(): { h: number; m: number } {
  const now = new Date();
  const m = now.getMinutes() < 30 ? 30 : 0;
  const h = now.getMinutes() < 30 ? now.getHours() : (now.getHours() + 1) % 24;
  return { h, m };
}

function deriveInitialTime(event: Props['event']): { h: number; m: number } {
  if (!event) return nearestThirtyFromNow();
  if (event.datetime) {
    const timePart = event.datetime.split('T')[1];
    if (timePart && timePart !== '00:00:00' && timePart !== '00:00') {
      const [hStr, mStr] = timePart.split(':');
      const h = parseInt(hStr ?? '9', 10);
      const rawM = parseInt(mStr ?? '0', 10);
      // Snap minutes to nearest 5
      const m = Math.round(rawM / 5) * 5 % 60;
      return { h, m };
    }
  }
  if (event.general_timeframe) {
    return timeframeToTime(event.general_timeframe);
  }
  return nearestThirtyFromNow();
}

type Props = {
  visible: boolean;
  event: {
    title: string;
    datetime?: string;
    general_timeframe?: string;
    location?: string;
    description?: string;
    date?: string;
    all_day?: boolean;
  } | null;
  onConfirm: (confirmed: {
    title: string;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    location?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
};

function deriveDateString(event: Props['event']): string {
  if (!event) return '';
  if (event.date) return event.date;
  if (event.datetime) {
    return event.datetime.split('T')[0] ?? '';
  }
  return '';
}

// ─── Drum-roll column ────────────────────────────────────────────────────────

type DrumColumnProps = {
  items: string[];
  selectedIndex: number;
  onIndexChange: (i: number) => void;
  scrollRef: React.RefObject<ScrollView | null>;
};

function DrumColumn({ items, selectedIndex, onIndexChange, scrollRef }: DrumColumnProps) {
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onIndexChange(clamped);
  };

  return (
    <View style={drumStyles.column}>
      <ScrollView
        ref={scrollRef}
        style={{ height: PICKER_HEIGHT }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
      >
        {items.map((label, i) => (
          <View key={label} style={drumStyles.item}>
            <Text
              style={[
                drumStyles.itemText,
                i === selectedIndex && drumStyles.itemTextSelected,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Center highlight — ITEM_HEIGHT from top = center row of 3-item view */}
      <View pointerEvents="none" style={drumStyles.highlightOverlay} />
    </View>
  );
}

const drumStyles = StyleSheet.create({
  column: {
    flex: 1,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 18,
    color: GOLD_BRIGHT,
    fontWeight: '700',
  },
  highlightOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT, // skip top padding row → center row starts here
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#C9A84C20',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: GOLD,
  },
});

// ─── DrumPicker (hours + separator + minutes) ────────────────────────────────

type DrumPickerProps = {
  hour: number;
  minute: number; // 0,5,10,...,55
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  hourScrollRef: React.RefObject<ScrollView | null>;
  minuteScrollRef: React.RefObject<ScrollView | null>;
};

function DrumPicker({ hour, minute, onHourChange, onMinuteChange, hourScrollRef, minuteScrollRef }: DrumPickerProps) {
  const minuteIndex = Math.round(minute / 5);

  return (
    <View style={pickerStyles.container}>
      <DrumColumn
        items={HOURS}
        selectedIndex={hour}
        onIndexChange={onHourChange}
        scrollRef={hourScrollRef}
      />
      <View style={pickerStyles.separator}>
        <Text style={pickerStyles.separatorText}>:</Text>
      </View>
      <DrumColumn
        items={MINUTES}
        selectedIndex={minuteIndex}
        onIndexChange={(i) => onMinuteChange(i * 5)}
        scrollRef={minuteScrollRef}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: 'hidden',
    height: PICKER_HEIGHT,
  },
  separator: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorText: {
    fontSize: 20,
    fontWeight: '700',
    color: GOLD,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarConfirmationCard({ visible, event, onConfirm, onCancel }: Props) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');

  // isAllDay defaults to false unless event explicitly says all_day: true
  const [isAllDay, setIsAllDay] = useState<boolean>(false);

  // selectedTime holds the chosen hour (0-23) and minute (0,5,...,55)
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  const [titleFocused, setTitleFocused] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // Scroll the columns to reflect current selection
  const scrollToSelection = (h: number, m: number) => {
    // Delay slightly so the ScrollView is mounted and measured
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: h * ITEM_HEIGHT, animated: false });
      minuteScrollRef.current?.scrollTo({ y: Math.round(m / 5) * ITEM_HEIGHT, animated: false });
    }, 50);
  };

  // Sync state from incoming event prop whenever card becomes visible or event changes
  useEffect(() => {
    if (visible && event) {
      setTitle(event.title ?? '');
      setLocation(event.location ?? '');

      const allDay = event.all_day === true;
      setIsAllDay(allDay);

      const { h, m } = deriveInitialTime(event);
      setSelectedHour(h);
      setSelectedMinute(m);

      if (!allDay) {
        scrollToSelection(h, m);
      }
    }
  }, [visible, event]);

  // Slide up / slide down animation
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 180, mass: 0.8 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 26, stiffness: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible && !event) return null;

  const dateStr = deriveDateString(event);

  const handleConfirm = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      startDate = new Date(year, (month ?? 1) - 1, day ?? 1);
      endDate = new Date(year, (month ?? 1) - 1, day ?? 1);
    } else {
      startDate = new Date(now);
      endDate = new Date(now);
    }

    if (isAllDay) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 0, 0);
    } else {
      startDate.setHours(selectedHour, selectedMinute, 0, 0);
      endDate.setHours(selectedHour + 1, selectedMinute, 0, 0);
    }

    onConfirm({
      title: title.trim() || (event?.title ?? 'Event'),
      startDate,
      endDate,
      allDay: isAllDay,
      location: location.trim() || undefined,
      notes: event?.description || undefined,
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={15} color={GOLD} />
        <Text style={styles.headerLabel}>CALENDAR EVENT DETECTED</Text>
      </View>

      {/* Title field */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>TITLE</Text>
        <TextInput
          style={[styles.titleInput, titleFocused && styles.titleInputFocused]}
          value={title}
          onChangeText={setTitle}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          placeholderTextColor={TEXT_SECONDARY}
          selectionColor={GOLD_BRIGHT}
          returnKeyType="done"
        />
      </View>

      {/* Date row */}
      {dateStr ? (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>DATE</Text>
          <View style={styles.readonlyChip}>
            <Ionicons name="today-outline" size={12} color={CYAN} style={{ marginRight: 6 }} />
            <Text style={styles.readonlyChipText}>{dateStr}</Text>
          </View>
        </View>
      ) : null}

      {/* Time / All-day row */}
      <View style={styles.fieldRow}>
        <View style={styles.timeHeaderRow}>
          <Text style={styles.fieldLabel}>TIME</Text>
          <View style={styles.allDayToggleRow}>
            <Text style={styles.allDayLabel}>ALL DAY</Text>
            <Switch
              value={isAllDay}
              onValueChange={(val) => {
                setIsAllDay(val);
                if (!val) {
                  // Scroll to current selection when revealing picker
                  scrollToSelection(selectedHour, selectedMinute);
                }
              }}
              trackColor={{ false: BORDER, true: `${GOLD}80` }}
              thumbColor={isAllDay ? GOLD_BRIGHT : '#555'}
              ios_backgroundColor={BORDER}
            />
          </View>
        </View>

        {isAllDay ? (
          <View style={styles.readonlyChip}>
            <Ionicons name="sunny-outline" size={12} color={CYAN} style={{ marginRight: 6 }} />
            <Text style={styles.readonlyChipText}>ALL DAY</Text>
          </View>
        ) : (
          <DrumPicker
            hour={selectedHour}
            minute={selectedMinute}
            onHourChange={(h) => setSelectedHour(h)}
            onMinuteChange={(m) => setSelectedMinute(m)}
            hourScrollRef={hourScrollRef}
            minuteScrollRef={minuteScrollRef}
          />
        )}
      </View>

      {/* Location field */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>LOCATION</Text>
        <TextInput
          style={[styles.locationInput, locationFocused && styles.locationInputFocused]}
          value={location}
          onChangeText={setLocation}
          onFocus={() => setLocationFocused(true)}
          onBlur={() => setLocationFocused(false)}
          placeholder="Location (optional)"
          placeholderTextColor={TEXT_SECONDARY}
          selectionColor={GOLD_BRIGHT}
          returnKeyType="done"
        />
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.85 }]}
          onPress={handleConfirm}
        >
          <Ionicons name="checkmark" size={14} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.confirmButtonText}>CONFIRM &amp; SYNC</Text>
        </Pressable>
      </View>
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
    gap: 8,
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
  },
  fieldRow: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  titleInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  titleInputFocused: {
    borderColor: GOLD,
  },
  readonlyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  readonlyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: CYAN,
    letterSpacing: 0.5,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  allDayToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allDayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 1.2,
  },
  locationInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  locationInputFocused: {
    borderColor: `${GOLD}80`,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: CANCEL_COLOR,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#8B3A3A50',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF8080',
    letterSpacing: 1.5,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1.2,
  },
});
