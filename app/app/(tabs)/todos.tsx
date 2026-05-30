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
import { theme } from '@/constants/theme';

const TODOS_KEY = '@auris:todos';
const EVENTS_KEY = '@auris:events';

const PURPLE = '#9D4EDD';
const CYAN = '#00E5FF';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  source: 'manual' | 'voice' | 'auris';
};

type ScheduledEvent = {
  id: string;
  title: string;
  datetime: string;
  participants: string[];
  done: boolean;
  createdAt: number;
};

type Section = {
  title: string;
  color: string;
  icon: 'sparkles-outline' | 'create-outline' | 'checkmark-done-outline' | 'calendar-outline';
  data: (Todo | ScheduledEvent)[];
  isEvent?: boolean;
};

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
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
}: {
  event: ScheduledEvent;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
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
            return <EventRow event={item as ScheduledEvent} onToggle={toggleEvent} onDelete={deleteEvent} />;
          }
          if ('datetime' in item) {
            return <EventRow event={item as ScheduledEvent} onToggle={toggleEvent} onDelete={deleteEvent} />;
          }
          return <TodoRow todo={item as Todo} onToggle={toggleTodo} onDelete={deleteTodo} />;
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
