import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SectionList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { calendarService } from '@/services/CalendarService';
import { notificationService } from '@/services/NotificationService';

const TODOS_KEY = '@auris:todos';
const EVENTS_KEY = '@auris:events';

const PURPLE = '#9D4EDD';
const CYAN = '#00E5FF';
const GREEN = '#10B981';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  source: 'manual' | 'voice' | 'auris';
  calendarSynced?: boolean;
};

type ScheduledEvent = {
  id: string;
  title: string;
  datetime: string;
  participants: string[];
  done: boolean;
  createdAt: number;
  general_timeframe?: string;
  location?: string;
  description?: string;
  calendarSynced?: boolean;
};

type Section = {
  title: string;
  color: string;
  icon: 'sparkles-outline' | 'create-outline' | 'checkmark-done-outline' | 'calendar-outline';
  data: (Todo | ScheduledEvent)[];
  isEvent?: boolean;
};

// Sync an event to iOS Calendar and send a push notification
async function syncEventToCalendar(event: ScheduledEvent): Promise<void> {
  const start = new Date(event.datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
  await calendarService.syncWithCalendar({
    title: event.title,
    startDate: start,
    endDate: end,
    allDay: false,
    location: event.location,
    notes: event.description,
  });
  notificationService.scheduleLocal(
    'Added to Calendar',
    `"${event.title}" was synced to your calendar.`,
    { type: 'calendar_sync' },
  ).catch(() => {});
}

// Sync an Auris-detected todo to iOS Calendar as an all-day event
async function syncTodoToCalendar(todo: Todo): Promise<void> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 0, 0);
  await calendarService.syncWithCalendar({
    title: todo.text,
    startDate: start,
    endDate: end,
    allDay: true,
  });
  notificationService.scheduleLocal(
    'Task Added to Calendar',
    `"${todo.text}" was added to today's calendar.`,
    { type: 'calendar_sync' },
  ).catch(() => {});
}

// ─── Event edit bottom sheet ────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

function EventEditSheet({
  event,
  visible,
  onSave,
  onClose,
}: {
  event: ScheduledEvent | null;
  visible: boolean;
  onSave: (updated: ScheduledEvent) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(600);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible && event) {
      const d = new Date(event.datetime);
      setTitle(event.title);
      setDate(isNaN(d.getTime()) ? new Date() : d);
      setHour(isNaN(d.getTime()) ? 9 : d.getHours());
      setMinute(isNaN(d.getTime()) ? 0 : Math.round(d.getMinutes() / 5) * 5 % 60);
      setLocation(event.location ?? '');
      setDescription(event.description ?? '');
      translateY.value = withSpring(0, { damping: 22, stiffness: 180 });
    } else {
      translateY.value = withTiming(600, { duration: 260 });
    }
  }, [visible, event]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const shiftDay = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  };

  const changeHour = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setHour(h => (h + delta + 24) % 24);
  };

  const changeMinute = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setMinute(m => (m + delta * 5 + 60) % 60);
  };

  const handleSave = () => {
    if (!event) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSave({
      ...event,
      title: trimmed,
      datetime: newDate.toISOString(),
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      calendarSynced: false,
    });
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={sheet.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[sheet.container, { paddingBottom: insets.bottom + 16 }, sheetStyle]}>
        {/* Handle */}
        <View style={sheet.handle} />

        {/* Header */}
        <View style={sheet.header}>
          <Pressable onPress={onClose} hitSlop={16}>
            <Text style={sheet.cancelBtn}>Cancel</Text>
          </Pressable>
          <Text style={sheet.headerTitle}>EDIT EVENT</Text>
          <Pressable onPress={handleSave} hitSlop={16}>
            <Text style={[sheet.saveBtn, !title.trim() && sheet.saveBtnDisabled]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={sheet.scroll}
          contentContainerStyle={sheet.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={sheet.section}>
            <Text style={sheet.label}>TITLE</Text>
            <TextInput
              style={sheet.textInput}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={theme.colors.textTertiary}
              selectionColor={CYAN}
              autoCorrect
            />
          </View>

          {/* Date */}
          <View style={sheet.section}>
            <Text style={sheet.label}>DATE</Text>
            <View style={sheet.dateRow}>
              <Pressable style={sheet.arrowBtn} onPress={() => shiftDay(-1)} hitSlop={12}>
                <Ionicons name="chevron-back" size={20} color={CYAN} />
              </Pressable>
              <View style={sheet.dateDisplay}>
                <Text style={sheet.dateDay}>{DAYS[date.getDay()]}</Text>
                <Text style={sheet.dateMain}>
                  {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}
                </Text>
              </View>
              <Pressable style={sheet.arrowBtn} onPress={() => shiftDay(1)} hitSlop={12}>
                <Ionicons name="chevron-forward" size={20} color={CYAN} />
              </Pressable>
            </View>
          </View>

          {/* Time */}
          <View style={sheet.section}>
            <Text style={sheet.label}>TIME</Text>
            <View style={sheet.timeRow}>
              {/* Hour */}
              <View style={sheet.timePicker}>
                <Pressable style={sheet.timeArrow} onPress={() => changeHour(1)} hitSlop={12}>
                  <Ionicons name="chevron-up" size={18} color={CYAN} />
                </Pressable>
                <Text style={sheet.timeValue}>{pad(hour)}</Text>
                <Pressable style={sheet.timeArrow} onPress={() => changeHour(-1)} hitSlop={12}>
                  <Ionicons name="chevron-down" size={18} color={CYAN} />
                </Pressable>
              </View>
              <Text style={sheet.timeColon}>:</Text>
              {/* Minute */}
              <View style={sheet.timePicker}>
                <Pressable style={sheet.timeArrow} onPress={() => changeMinute(1)} hitSlop={12}>
                  <Ionicons name="chevron-up" size={18} color={CYAN} />
                </Pressable>
                <Text style={sheet.timeValue}>{pad(minute)}</Text>
                <Pressable style={sheet.timeArrow} onPress={() => changeMinute(-1)} hitSlop={12}>
                  <Ionicons name="chevron-down" size={18} color={CYAN} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={sheet.section}>
            <Text style={sheet.label}>LOCATION</Text>
            <TextInput
              style={sheet.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Add location…"
              placeholderTextColor={theme.colors.textTertiary}
              selectionColor={CYAN}
              autoCorrect={false}
            />
          </View>

          {/* Description */}
          <View style={sheet.section}>
            <Text style={sheet.label}>NOTES</Text>
            <TextInput
              style={[sheet.textInput, sheet.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes…"
              placeholderTextColor={theme.colors.textTertiary}
              selectionColor={CYAN}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Participants (read-only) */}
          {event.participants.length > 0 && (
            <View style={sheet.section}>
              <Text style={sheet.label}>PARTICIPANTS</Text>
              <View style={sheet.participantRow}>
                {event.participants.map((p, i) => (
                  <View key={i} style={sheet.participantChip}>
                    <Ionicons name="person-outline" size={11} color={CYAN} />
                    <Text style={sheet.participantText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0.5,
    borderColor: `${CYAN}30`,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CYAN,
    letterSpacing: 3,
  },
  cancelBtn: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: CYAN,
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 4,
  },
  section: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1A1A',
    gap: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 2,
  },
  textInput: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    paddingVertical: 0,
    minHeight: 32,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${CYAN}12`,
    borderWidth: 0.5,
    borderColor: `${CYAN}30`,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dateDay: {
    fontSize: 10,
    color: CYAN,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  dateMain: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  timePicker: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
    backgroundColor: `${CYAN}08`,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: `${CYAN}25`,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timeArrow: {
    padding: 4,
  },
  timeValue: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 28,
    fontWeight: '300',
    color: theme.colors.textSecondary,
    marginTop: -4,
  },
  participantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${CYAN}12`,
    borderWidth: 0.5,
    borderColor: `${CYAN}30`,
  },
  participantText: {
    fontSize: 12,
    color: CYAN,
  },
});

// ─── Todo row ────────────────────────────────────────────────────────────────

function TodoRow({
  todo,
  onToggle,
  onDelete,
  onSync,
  onEdit,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = Math.max(e.translationX, -120);
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        translateX.value = withTiming(-120);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const deleteAction = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDelete)(todo.id);
    });
  };

  const isAI = todo.source === 'auris' || todo.source === 'voice';
  const accentColor = isAI ? PURPLE : theme.colors.gold;

  return (
    <View style={styles.todoWrapper}>
      <Pressable style={styles.deleteAction} onPress={deleteAction}>
        <Ionicons name="trash-outline" size={20} color="#FF4444" />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.todoRow, rowStyle]}>
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          <Pressable onPress={() => onToggle(todo.id)} style={styles.checkButton}>
            <View
              style={[
                styles.checkbox,
                todo.done && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
            >
              {todo.done && <Ionicons name="checkmark" size={12} color="#000" />}
            </View>
          </Pressable>

          <View style={styles.todoTextContainer}>
            <Text style={[styles.todoText, todo.done && styles.todoTextDone]}>
              {todo.text}
            </Text>
          </View>

          {!todo.done && (
            <Pressable style={styles.editBtn} onPress={() => onEdit(todo.id)} hitSlop={10}>
              <Ionicons name="pencil-outline" size={14} color={theme.colors.textTertiary} />
            </Pressable>
          )}
          {/* Calendar sync button — only for Auris-detected, not yet synced */}
          {isAI && !todo.done && !todo.calendarSynced && (
            <Pressable style={styles.calSyncBtn} onPress={() => onSync(todo.id)} hitSlop={10}>
              <Ionicons name="calendar-outline" size={16} color={CYAN} />
            </Pressable>
          )}
          {todo.calendarSynced && (
            <Ionicons name="checkmark-circle" size={16} color={GREEN} style={{ marginRight: 4 }} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function EventRow({
  event,
  onToggle,
  onDelete,
  onSync,
  onEdit,
}: {
  event: ScheduledEvent;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = Math.max(e.translationX, -120);
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        translateX.value = withTiming(-120);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const deleteAction = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDelete)(event.id);
    });
  };

  return (
    <View style={styles.todoWrapper}>
      <Pressable style={styles.deleteAction} onPress={deleteAction}>
        <Ionicons name="trash-outline" size={20} color="#FF4444" />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.todoRow, rowStyle]}>
          <View style={[styles.accentBar, { backgroundColor: CYAN }]} />

          <Pressable onPress={() => onToggle(event.id)} style={styles.checkButton}>
            <View
              style={[
                styles.checkbox,
                event.done && { backgroundColor: CYAN, borderColor: CYAN },
              ]}
            >
              {event.done && <Ionicons name="checkmark" size={12} color="#000" />}
            </View>
          </Pressable>

          <View style={styles.todoTextContainer}>
            <Text style={[styles.todoText, event.done && styles.todoTextDone]}>
              {event.title}
            </Text>
            <Text style={styles.eventMeta}>
              <Ionicons name="time-outline" size={11} color={CYAN} />
              {'  '}{formatEventDate(event.datetime)}
              {event.participants.length > 0
                ? `  ·  with ${event.participants.join(', ')}`
                : ''}
            </Text>
          </View>

          {!event.done && (
            <Pressable style={styles.editBtn} onPress={() => onEdit(event.id)} hitSlop={10}>
              <Ionicons name="pencil-outline" size={14} color={theme.colors.textTertiary} />
            </Pressable>
          )}
          {/* Sync to iOS Calendar button */}
          {!event.done && !event.calendarSynced && (
            <Pressable style={styles.calSyncBtn} onPress={() => onSync(event.id)} hitSlop={10}>
              <Ionicons name="calendar-outline" size={16} color={CYAN} />
            </Pressable>
          )}
          {event.calendarSynced && (
            <Ionicons name="checkmark-circle" size={16} color={GREEN} style={{ marginRight: 4 }} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function SectionHeader({ title, color, icon }: { title: string; color: string; icon: Section['icon'] }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

export default function TodosScreen() {
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);

  const load = useCallback(async () => {
    const [rawTodos, rawEvents] = await Promise.all([
      AsyncStorage.getItem(TODOS_KEY),
      AsyncStorage.getItem(EVENTS_KEY),
    ]);
    if (rawTodos) setTodos(JSON.parse(rawTodos));
    if (rawEvents) setEvents(JSON.parse(rawEvents));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const persist = useCallback((updated: Todo[]) => {
    setTodos(updated);
    AsyncStorage.setItem(TODOS_KEY, JSON.stringify(updated));
  }, []);

  const persistEvents = useCallback((updated: ScheduledEvent[]) => {
    setEvents(updated);
    AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  }, []);

  const addTodo = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    Keyboard.dismiss();
    persist([
      { id: `${Date.now()}`, text, done: false, createdAt: Date.now(), source: 'manual' },
      ...todos,
    ]);
    setInput('');
  }, [input, todos, persist]);

  const toggleTodo = (id: string) => {
    persist(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: string) => {
    persist(todos.filter((t) => t.id !== id));
  };

  const toggleEvent = (id: string) => {
    persistEvents(events.map((e) => (e.id === id ? { ...e, done: !e.done } : e)));
  };

  const deleteEvent = (id: string) => {
    persistEvents(events.filter((e) => e.id !== id));
  };

  const handleEditTodo = useCallback((id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    Alert.prompt(
      'Edit Task',
      undefined,
      (newText) => {
        const trimmed = (newText ?? '').trim();
        if (trimmed && trimmed !== todo.text) {
          persist(todos.map((t) => t.id === id ? { ...t, text: trimmed } : t));
        }
      },
      'plain-text',
      todo.text,
    );
  }, [todos, persist]);

  const handleEditEvent = useCallback((id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setEditingEvent(event);
  }, [events]);

  const handleSaveEvent = useCallback((updated: ScheduledEvent) => {
    persistEvents(events.map((e) => e.id === updated.id ? updated : e));
    setEditingEvent(null);
  }, [events, persistEvents]);

  const handleSyncTodo = useCallback((id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    Alert.alert(
      'Add to Calendar',
      `Add "${todo.text}" to today's calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              await syncTodoToCalendar(todo);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              persist(todos.map((t) => t.id === id ? { ...t, calendarSynced: true } : t));
            } catch (err: any) {
              Alert.alert('Calendar Error', err?.message ?? 'Could not add to calendar.');
            }
          },
        },
      ],
    );
  }, [todos, persist]);

  const handleSyncEvent = useCallback((id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    Alert.alert(
      'Sync to Calendar',
      `Sync "${event.title}" to your iOS Calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            try {
              await syncEventToCalendar(event);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              persistEvents(events.map((e) => e.id === id ? { ...e, calendarSynced: true } : e));
            } catch (err: any) {
              Alert.alert('Calendar Error', err?.message ?? 'Could not sync to calendar.');
            }
          },
        },
      ],
    );
  }, [events, persistEvents]);

  const clearDone = () => {
    Alert.alert('Clear completed?', 'This removes all finished tasks and events.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          persist(todos.filter((t) => !t.done));
          persistEvents(events.filter((e) => !e.done));
        },
      },
    ]);
  };

  const eventsPending = events.filter((e) => !e.done);
  const aiPending = todos.filter((t) => !t.done && (t.source === 'auris' || t.source === 'voice'));
  const manualPending = todos.filter((t) => !t.done && t.source === 'manual');
  const doneTodos = todos.filter((t) => t.done);
  const doneEvents = events.filter((e) => e.done);

  const sections: Section[] = [
    ...(eventsPending.length > 0
      ? [{ title: 'SCHEDULED BY AURIS', color: CYAN, icon: 'calendar-outline' as const, data: eventsPending, isEvent: true }]
      : []),
    ...(aiPending.length > 0
      ? [{ title: 'DETECTED BY AURIS', color: PURPLE, icon: 'sparkles-outline' as const, data: aiPending }]
      : []),
    ...(manualPending.length > 0
      ? [{ title: 'MY TASKS', color: theme.colors.gold, icon: 'create-outline' as const, data: manualPending }]
      : []),
    ...((doneTodos.length > 0 || doneEvents.length > 0)
      ? [{ title: 'COMPLETED', color: theme.colors.textTertiary, icon: 'checkmark-done-outline' as const, data: [...doneEvents, ...doneTodos], isEvent: false }]
      : []),
  ];

  const hasDone = doneTodos.length > 0 || doneEvents.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom}
    >
      <View style={styles.header}>
        <Text style={styles.title}>TO-DO</Text>
        {hasDone && (
          <Pressable onPress={clearDone}>
            <Text style={styles.clearText}>clear done</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTodo}
          placeholder="Add a task..."
          placeholderTextColor={theme.colors.textTertiary}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.5 }]}
          onPress={addTodo}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="add-circle" size={28} color={theme.colors.gold} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item, section }) => {
          if (section.isEvent && 'datetime' in item) {
            return (
              <EventRow
                event={item as ScheduledEvent}
                onToggle={toggleEvent}
                onDelete={deleteEvent}
                onSync={handleSyncEvent}
                onEdit={handleEditEvent}
              />
            );
          }
          if ('datetime' in item) {
            return (
              <EventRow
                event={item as ScheduledEvent}
                onToggle={toggleEvent}
                onDelete={deleteEvent}
                onSync={handleSyncEvent}
                onEdit={handleEditEvent}
              />
            );
          }
          return (
            <TodoRow
              todo={item as Todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onSync={handleSyncTodo}
              onEdit={handleEditTodo}
            />
          );
        }}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} color={section.color} icon={section.icon} />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={32} color={theme.colors.textTertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Auris automatically adds tasks from your conversations.{'\n'}You can also add your own above.
            </Text>
          </View>
        }
      />
      <EventEditSheet
        event={editingEvent}
        visible={editingEvent !== null}
        onSave={handleSaveEvent}
        onClose={() => setEditingEvent(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: 4,
  },
  clearText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    paddingLeft: 16,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  addButton: {
    paddingVertical: 6,
    paddingLeft: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  todoWrapper: {
    position: 'relative',
    marginHorizontal: 20,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingRight: 14,
    overflow: 'hidden',
    gap: 12,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 0,
    flexShrink: 0,
  },
  checkButton: {
    padding: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoTextContainer: {
    flex: 1,
  },
  todoText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  todoTextDone: {
    color: theme.colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  eventMeta: {
    fontSize: 11,
    color: CYAN,
    marginTop: 3,
    opacity: 0.8,
  },
  editBtn: {
    padding: 4,
    marginRight: 2,
  },
  calSyncBtn: {
    padding: 4,
    marginRight: 2,
  },
  separator: {
    height: 6,
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
