import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  Switch,
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

// Maps general_timeframe to a default HH:MM start time
function timeframeToHHMM(tf: string | undefined): string {
  switch (tf) {
    case 'morning': return '09:00';
    case 'afternoon': return '14:00';
    case 'evening': return '18:00';
    default: return '09:00';
  }
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

function deriveTimeString(event: Props['event']): string | null {
  if (!event) return null;
  if (event.datetime) {
    const timePart = event.datetime.split('T')[1];
    if (timePart) return timePart.slice(0, 5);
  }
  return null;
}

function hasSpecificTime(event: Props['event']): boolean {
  if (!event) return false;
  if (event.datetime) {
    const timePart = event.datetime.split('T')[1];
    return !!timePart && timePart !== '00:00:00' && timePart !== '00:00';
  }
  return false;
}

export function CalendarConfirmationCard({ visible, event, onConfirm, onCancel }: Props) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [timeInput, setTimeInput] = useState('09:00');
  const [titleFocused, setTitleFocused] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);
  const [timeFocused, setTimeFocused] = useState(false);

  // Sync state from incoming event prop whenever card becomes visible
  useEffect(() => {
    if (visible && event) {
      setTitle(event.title ?? '');
      setLocation(event.location ?? '');
      const specificTime = hasSpecificTime(event);
      setIsAllDay(!specificTime);
      if (specificTime) {
        setTimeInput(deriveTimeString(event) ?? '09:00');
      } else {
        setTimeInput(timeframeToHHMM(event.general_timeframe));
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
      const parts = timeInput.split(':');
      const h = parseInt(parts[0] ?? '9', 10) || 9;
      const m = parseInt(parts[1] ?? '0', 10) || 0;
      startDate.setHours(h, m, 0, 0);
      endDate.setHours(h + 1, m, 0, 0);
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
        <Text style={styles.fieldLabel}>TIME</Text>
        <View style={styles.timeRow}>
          {isAllDay ? (
            <View style={styles.readonlyChip}>
              <Ionicons name="sunny-outline" size={12} color={CYAN} style={{ marginRight: 6 }} />
              <Text style={styles.readonlyChipText}>ALL DAY</Text>
            </View>
          ) : (
            <TextInput
              style={[styles.timeInput, timeFocused && styles.timeInputFocused]}
              value={timeInput}
              onChangeText={(v) => {
                // Allow only digits and colon, max 5 chars (HH:MM)
                const cleaned = v.replace(/[^0-9:]/g, '').slice(0, 5);
                setTimeInput(cleaned);
              }}
              onFocus={() => setTimeFocused(true)}
              onBlur={() => setTimeFocused(false)}
              placeholder="HH:MM"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="numbers-and-punctuation"
              selectionColor={CYAN}
              returnKeyType="done"
              maxLength={5}
            />
          )}
          <View style={styles.allDayToggleRow}>
            <Text style={styles.allDayLabel}>ALL DAY</Text>
            <Switch
              value={isAllDay}
              onValueChange={setIsAllDay}
              trackColor={{ false: BORDER, true: `${GOLD}80` }}
              thumbColor={isAllDay ? GOLD_BRIGHT : '#555'}
              ios_backgroundColor={BORDER}
            />
          </View>
        </View>
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: CYAN,
    minWidth: 80,
    letterSpacing: 1,
  },
  timeInputFocused: {
    borderColor: CYAN,
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
