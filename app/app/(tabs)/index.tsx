import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, AppState, Image, Linking, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AurisOrb, OrbState } from '@/components/AurisOrb';
import { FloatingCanvas } from '@/components/FloatingCanvas';
import { VisionAnalysis } from '@/components/VisionAnalysis';
import { ContextualBottomSheet } from '@/components/ContextualBottomSheet';
import { theme } from '@/constants/theme';
import { audioService } from '@/services/AudioService';
import { backendService, DetectedEvent } from '@/services/BackendService';
import { profileService, UserProfile } from '@/services/ProfileService';
import { historyService } from '@/services/HistoryService';
import { socialModeService } from '@/services/SocialModeService';
import { notificationService } from '@/services/NotificationService';
import { identityService } from '@/services/IdentityService';
import { calendarService } from '@/services/CalendarService';
import { gmailService } from '@/services/GmailService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

// Replace with your Google Cloud Console iOS client ID (bundle ID: com.aurisai.app)
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

const TODOS_KEY = '@auris:todos';
const EVENTS_KEY = '@auris:events';
const CAMERA_VIOLET = '#7C3AED';
const CAMERA_GLOW = '#A855F7';

type Todo = { id: string; text: string; done: boolean; createdAt: number; source: 'manual' | 'voice' | 'auris' };
type ScheduledEvent = { id: string; title: string; datetime: string; participants: string[]; done: boolean; createdAt: number };
type Message = { id: string; role: 'user' | 'auris'; text: string };
type Mode = 'solo' | 'social';

// ─── Animated message bubble ───────────────────────────────────────────────
function AnimatedBubble({ children, index }: { children: React.ReactNode; index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [mode, setMode] = useState<Mode>('solo');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ name: '', profession: '', personality: 'companion' });
  const scrollRef = useRef<Animated.ScrollView>(null);
  const isProcessingRef = useRef(false);
  const isCapturingRef = useRef(false);
  const userIdRef = useRef<string>('user-local');

  const [contextualSheetVisible, setContextualSheetVisible] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('visual');
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const streamingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vision hint pulse animation
  const visionHintOpacity = useSharedValue(0);
  const visionHintStyle = useAnimatedStyle(() => ({ opacity: visionHintOpacity.value }));

  const [visionPanel, setVisionPanel] = useState<{
    imageBase64: string | null;
    transcript: string;
    analysis: string;
    visible: boolean;
  }>({ imageBase64: null, transcript: '', analysis: '', visible: false });

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Flash overlay animation (camera capture)
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  // Thumbnail preview card animation
  const thumbnailScale = useSharedValue(0);
  const thumbnailStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbnailScale.value }],
  }));

  // Message list scroll Y tracker
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Animated backdrop for vision panel
  const backdropOpacity = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  useEffect(() => {
    backdropOpacity.value = withTiming(visionPanel.visible ? 1 : 0, { duration: 220 });
  }, [visionPanel.visible]);

  // Thumbnail spring in/out when capturedImageBase64 changes
  useEffect(() => {
    if (capturedImageBase64) {
      thumbnailScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    } else {
      thumbnailScale.value = withTiming(0, { duration: 150 });
    }
  }, [capturedImageBase64]);

  const addMessage = (role: 'user' | 'auris', text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${role}`, role, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const addStreamingMessage = useCallback((fullText: string): Promise<void> => {
    const id = `${Date.now()}-auris`;
    setMessages((prev) => [...prev, { id, role: 'auris', text: '' }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return new Promise<void>((resolve) => {
      const words = fullText.split(' ').filter(Boolean);
      if (!words.length) { resolve(); return; }
      let wordIdx = 0;
      streamingTimerRef.current = setInterval(() => {
        wordIdx += 1;
        const partial = words.slice(0, wordIdx).join(' ');
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: partial } : m)));
        if (wordIdx >= words.length) {
          clearInterval(streamingTimerRef.current!);
          streamingTimerRef.current = null;
          scrollRef.current?.scrollToEnd({ animated: true });
          resolve();
        }
      }, 60);
    });
  }, []);

  const appendTodos = useCallback(async (texts: string[]) => {
    if (!texts.length) return;
    const raw = await AsyncStorage.getItem(TODOS_KEY);
    const existing: Todo[] = raw ? JSON.parse(raw) : [];
    const newTodos: Todo[] = texts.map((text) => ({
      id: `${Date.now()}-${Math.random()}`,
      text,
      done: false,
      createdAt: Date.now(),
      source: 'auris',
    }));
    await AsyncStorage.setItem(TODOS_KEY, JSON.stringify([...newTodos, ...existing]));
  }, []);

  const appendEvents = useCallback(async (detected: DetectedEvent[]) => {
    if (!detected.length) return;
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const existing: ScheduledEvent[] = raw ? JSON.parse(raw) : [];
    const newEvents: ScheduledEvent[] = detected.map((e) => ({
      id: `${Date.now()}-${Math.random()}`,
      title: e.title,
      datetime: e.datetime,
      participants: Array.isArray(e.participants) ? e.participants : [],
      done: false,
      createdAt: Date.now(),
    }));
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify([...newEvents, ...existing]));
  }, []);

  useEffect(() => {
    if (capturedImageBase64 && orbState === 'idle') {
      visionHintOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0.25, { duration: 700 }),
        ),
        -1,
        false,
      );
    } else {
      visionHintOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [capturedImageBase64, orbState]);

  useEffect(() => {
    identityService.getUserId().then((id) => { userIdRef.current = id; });
  }, []);

  useEffect(() => {
    backendService.loadConfig();
    audioService.requestPermissions();
    notificationService.setup().catch(() => {});
    notificationService.setOnNotificationPress(() => setMode('solo'));
    return () => {
      if (streamingTimerRef.current) clearInterval(streamingTimerRef.current);
    };
  }, []);

  // Reload profile whenever the home tab is focused (picks up changes from profile tab).
  useFocusEffect(
    useCallback(() => {
      profileService.load().then(setProfile);
    }, [])
  );

  // Flush any offline-queued requests when the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      backendService.flushOfflineQueue((result) => {
        setMessages((prev) => {
          const additions: Message[] = [];
          if (result.transcript) {
            additions.push({ id: `${Date.now()}-user`, role: 'user', text: result.transcript });
          }
          if (result.reply) {
            additions.push({ id: `${Date.now()}-auris`, role: 'auris', text: result.reply });
          }
          return [...prev, ...additions];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
        appendTodos(result.todos).catch(() => {});
        appendEvents(result.events ?? []).catch(() => {});
        if (result.reply) {
          historyService.append({
            id: Date.now().toString(),
            summary: result.reply.split(/[.!?]/)[0]?.trim() || 'Queued Response',
            preview: result.reply,
            mode: 'solo',
            ts: Date.now(),
          }).catch(() => {});
        }
      }).catch(() => {});
    });
    return () => subscription.remove();
  }, [appendTodos, appendEvents]);

  useEffect(() => {
    if (mode !== 'social') {
      socialModeService.stop();
      return;
    }
    socialModeService.onSessionEnd(({ summary, durationMinutes }) => {
      setMode('solo');
      addStreamingMessage(`Ambient session complete (${durationMinutes} min). ${summary}`);
    });

    socialModeService.onInsight(async ({ transcript: t, reply, todos, events }) => {
      addMessage('auris', reply);
      notificationService.scheduleLocal('Auris', reply, { transcript: t, reply }).catch(() => {});
      appendTodos(todos).catch(() => {});
      appendEvents(events ?? []).catch(() => {});
      historyService.append({
        id: Date.now().toString(),
        summary: reply.split(/[.!?]/)[0]?.trim() || 'Ambient Insight',
        preview: reply,
        mode: 'social',
        ts: Date.now(),
      }).catch(() => {});
    });
    socialModeService.start(
      userIdRef.current,
      profile.personality,
      profile.name || undefined,
      profile.profession || undefined,
    );
    return () => { socialModeService.stop(); };
  }, [mode, profile.personality, profile.name, profile.profession, appendTodos, appendEvents]);

  const handleCameraPress = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        setCameraPermissionDenied(true);
        setShowCamera(true);
        return;
      }
    }
    setShowCamera(true);
  }, [cameraPermission, requestCameraPermission]);

  const handleTakePicture = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      // Flash overlay
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 220 }),
      );
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4, skipMetadata: true });
      if (!photo?.base64) {
        addMessage('auris', 'Image processing failed. Please capture again.');
        return;
      }
      setCapturedImageBase64(photo.base64);
    } catch {
      // non-fatal
    } finally {
      isCapturingRef.current = false;
      setShowCamera(false);
    }
  }, []);

  const handleDismissImage = useCallback(() => {
    setCapturedImageBase64(null);
  }, []);

  const handleVisionPress = useCallback(() => {
    if (visionPanel.analysis) {
      setVisionPanel((p) => ({ ...p, visible: true }));
    } else {
      handleCameraPress();
    }
  }, [visionPanel.analysis, handleCameraPress]);

  const stopAndProcess = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    const imageSnapshot = capturedImageBase64;
    setCapturedImageBase64(null);

    try {
      setOrbState(imageSnapshot ? 'analyzing' : 'processing');
      const uri = await audioService.stopRecording();

      const result = await backendService.processMultiModal({
        audioUri: uri,
        imageBase64: imageSnapshot ?? undefined,
        userId: userIdRef.current,
        personality: profile.personality,
        userName: profile.name || undefined,
        userProfession: profile.profession || undefined,
        contextData: calendarContextRef.current ?? emailContextRef.current,
      });

      const transcript = String(result.transcript ?? '');
      const reply = String(result.reply ?? '');
      const todos = Array.isArray(result.todos) ? result.todos : [];
      const events = Array.isArray(result.events) ? result.events : [];
      const audioUri = result.audioUri ?? '';

      console.log('[Auris] transcript:', JSON.stringify(transcript));
      console.log('[Auris] reply:', JSON.stringify(reply));
      console.log('[Auris] todos:', JSON.stringify(todos));
      console.log('[Auris] events:', JSON.stringify(events));
      console.log('[Auris] audioUri:', audioUri);

      if (transcript) addMessage('user', transcript);
      if (imageSnapshot && reply) {
        addMessage('auris', reply);
        setVisionPanel({ imageBase64: imageSnapshot, transcript, analysis: reply, visible: true });
      }

      await Promise.all([
        reply
          ? historyService.append({
              id: Date.now().toString(),
              summary: reply.split(/[.!?]/)[0]?.trim() || 'Conversation',
              preview: reply,
              mode,
              ts: Date.now(),
            })
          : Promise.resolve(),
        appendTodos(todos),
        events.length > 0
          ? (() => { setPendingCalendarAction(events[0]!); return Promise.resolve(); })()
          : Promise.resolve(),
      ]);

      // Start TTS and typewriter concurrently — audio fires immediately
      // (not awaited) so the orb transition and text animation are not blocked.
      if (reply && !imageSnapshot) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setOrbState('speaking');
        if (audioUri) {
          audioService.playFromUri(audioUri).catch((e) => console.warn('[Auris] TTS playback:', e));
        }
        await addStreamingMessage(reply);  // typewriter controls orb timing
      }

      // Typewriter finished — ready for next input; audio continues in background
      setOrbState('idle');
      isProcessingRef.current = false;
      setAudioUnavailable(!audioUri && !!reply);
    } catch (err: any) {
      const msg = String(err?.message ?? 'Something went wrong');
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      addMessage('auris', `(Error: ${msg})`);
      setOrbState('idle');
      isProcessingRef.current = false;
    }
  }, [profile, mode, appendTodos, appendEvents, capturedImageBase64, addStreamingMessage]);

  const calendarContextRef = useRef<string | undefined>(undefined);
  const emailContextRef = useRef<string | undefined>(undefined);

  const isGoogleAuthPendingRef = useRef(false);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  });

  useEffect(() => {
    gmailService.loadToken().catch(() => {});
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success' || googleResponse?.type === 'error' || googleResponse?.type === 'dismiss') {
      isGoogleAuthPendingRef.current = false;
    }
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      const expiresIn = googleResponse.authentication?.expiresIn ?? 3600;
      if (token) {
        gmailService.saveToken(token, expiresIn).then(() => {
          addStreamingMessage('Gmail connected. Email Intel is active — tap the orb to analyze your inbox.');
        }).catch(() => {});
      }
    } else if (googleResponse?.type === 'error') {
      setError('Gmail authentication failed. Please try again.');
    }
  }, [googleResponse]);

  const handleOrbLongPress = useCallback(async () => {
    if (mode === 'social') return;
    await audioService.stopPlayback();
    if (audioService.isRecording()) {
      try { await audioService.stopRecording(); } catch { /* ignore */ }
    }
    isProcessingRef.current = false;
    if (streamingTimerRef.current) { clearInterval(streamingTimerRef.current); streamingTimerRef.current = null; }
    setOrbState('idle');
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [mode]);

  const handleOrbPress = async () => {
    if (isProcessingRef.current || mode === 'social') return;
    setError(null);

    if (activeModule === 'email' && !gmailService.isAuthenticated()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (!isGoogleAuthPendingRef.current) {
        isGoogleAuthPendingRef.current = true;
        googlePromptAsync();
      }
      return;
    }

    if (audioService.isRecording()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await stopAndProcess();
      return;
    }

    if (activeModule === 'calendar') {
      calendarContextRef.current = await calendarService.getUpcomingEventsContext() ?? undefined;
      emailContextRef.current = undefined;
    } else if (activeModule === 'email') {
      try {
        emailContextRef.current = await gmailService.getEmailContext();
      } catch (err: any) {
        if (err.message === 'GMAIL_TOKEN_EXPIRED') {
          if (!isGoogleAuthPendingRef.current) {
            isGoogleAuthPendingRef.current = true;
            googlePromptAsync();
          }
          return;
        }
        setError(`Gmail fetch failed: ${err.message ?? 'unknown error'}`);
        emailContextRef.current = undefined;
        return;
      }
      calendarContextRef.current = undefined;
    } else {
      calendarContextRef.current = undefined;
      emailContextRef.current = undefined;
    }

    try {
      await audioService.startRecording(stopAndProcess);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setOrbState('listening');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(err?.message ?? 'Could not start microphone');
    }
  };

  const handleModuleSelect = useCallback(async (moduleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveModule(moduleId);
    setContextualSheetVisible(false);

    if (moduleId === 'calendar') {
      const events = await calendarService.getUpcomingEventsContext().catch(() => null);
      const msg = events
        ? `Calendar sync activated. ${events}`
        : 'Calendar sync activated. No upcoming events found in the next 7 days.';
      addStreamingMessage(msg);
    } else if (moduleId === 'visual') {
      addStreamingMessage('Visual analysis module activated. Capture an image then tap the orb to analyze.');
    } else if (moduleId === 'email') {
      if (gmailService.isAuthenticated()) {
        addStreamingMessage('Email Intel activated. Tap the orb to analyze your inbox.');
      } else {
        addStreamingMessage('Email Intel selected. Tap the orb to connect Gmail and start analyzing your inbox.');
      }
    }
  }, [addStreamingMessage]);

  const toggleMode = async () => {
    if (mode === 'social') {
      await socialModeService.stop();
      setMode('solo');
      addStreamingMessage('Solo mode active. I\'m ready to talk whenever you are.');
      return;
    }
    if (audioService.isRecording()) return;
    setMode('social');
    addStreamingMessage('Social mode active. My senses are fully open — passively listening to everything around you. I\'ll capture important moments and notify you. If you speak to me directly, I\'ll pay attention to that too.');
  };

  const modeColor = mode === 'solo' ? theme.colors.gold : '#4A9EFF';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>AURIS</Text>
        <Text style={styles.wordmarkSub}> AI</Text>
        <Pressable style={[styles.modeChip, { borderColor: `${modeColor}50` }]} onPress={toggleMode}>
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
          <Text style={[styles.modeLabel, { color: modeColor }]}>
            {mode === 'solo' ? 'SOLO' : 'SOCIAL'}
          </Text>
        </Pressable>
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={14} color="#FF6B6B" />
          </Pressable>
        </View>
      )}

      {/* Transcript scroll */}
      {messages.length > 0 && (
        <Animated.ScrollView
          ref={scrollRef}
          style={styles.transcript}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {messages.map((msg, i) => (
            <AnimatedBubble key={msg.id} index={i}>
              <View
                style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAuris]}
              >
                <Text style={[styles.bubbleText, msg.role === 'auris' && styles.bubbleTextAuris]}>
                  {msg.text ?? ''}
                </Text>
              </View>
            </AnimatedBubble>
          ))}
        </Animated.ScrollView>
      )}

      {/* Orb */}
      <View style={styles.orbContainer}>
        <AurisOrb state={orbState} onPress={handleOrbPress} onLongPress={handleOrbLongPress} />
      </View>

      {/* Vision hint — pulses when image is captured and orb is idle */}
      <Animated.View style={[styles.visionHintRow, visionHintStyle]} pointerEvents="none">
        <Text style={styles.visionHint}>AURIS EYE READY  ·  TAP ORB TO ANALYZE</Text>
      </Animated.View>

      {/* Audio unavailable badge */}
      {audioUnavailable && (
        <Pressable style={styles.audioUnavailableRow} onPress={() => setAudioUnavailable(false)}>
          <Ionicons name="volume-mute-outline" size={11} color="#888" />
          <Text style={styles.audioUnavailableText}>audio unavailable · tap to dismiss</Text>
        </Pressable>
      )}

      {/* Orb hint */}
      <View style={styles.hintRow}>
        {orbState === 'idle' && activeModule === 'email' && (
          <Text style={[styles.hint, { color: '#6366F1' }]}>
            {gmailService.isAuthenticated() ? 'tap to analyze inbox' : 'tap to connect gmail'}
          </Text>
        )}
        {orbState === 'idle' && activeModule === 'calendar' && (
          <Text style={[styles.hint, { color: '#10B981' }]}>
            {audioService.isRecording() ? 'tap to send' : 'schedule-aware · tap to talk'}
          </Text>
        )}
        {orbState === 'idle' && !capturedImageBase64 && activeModule !== 'email' && activeModule !== 'calendar' && (
          <Text style={styles.hint}>
            {audioService.isRecording() ? 'tap to send' : 'tap to talk'}
          </Text>
        )}
        {orbState === 'listening' && (
          <Text style={[styles.hint, { color: '#4A9EFF' }]}>tap again to send</Text>
        )}
      </View>

      {/* Camera button — between orb and pendant nodes */}
      <View style={styles.cameraSection}>
        <Pressable
          style={({ pressed }) => [
            styles.cameraRoundBtn,
            pressed && styles.cameraRoundBtnPressed,
          ]}
          onPress={handleCameraPress}
          hitSlop={20}
        >
          <Ionicons
            name={capturedImageBase64 ? 'camera-reverse' : 'camera'}
            size={22}
            color="#fff"
          />
          {capturedImageBase64 && <View style={styles.cameraBtnBadge} />}
        </Pressable>
        <Text style={styles.cameraLabel}>
          {capturedImageBase64 ? 'RETAKE' : 'CAPTURE'}
        </Text>
      </View>

      {/* Thumbnail preview card */}
      {capturedImageBase64 && (
        <Animated.View style={[styles.thumbnailCard, thumbnailStyle]}>
          <Image
            source={{ uri: 'data:image/jpeg;base64,' + capturedImageBase64 }}
            style={styles.thumbnailImage}
          />
          <Pressable style={styles.thumbnailDismiss} onPress={handleDismissImage}>
            <Ionicons name="close" size={10} color="#000" />
          </Pressable>
        </Animated.View>
      )}

      {/* Floating pendant canvas */}
      <FloatingCanvas
        onVisionPress={handleVisionPress}
        onDismissImage={handleDismissImage}
        hasCapturedImage={!!capturedImageBase64}
        hasAnalysisResult={!!visionPanel.analysis}
        capturedImageBase64={capturedImageBase64}
        onContextualPress={() => setContextualSheetVisible(true)}
      />

      <View style={{ height: insets.bottom + 10 }} />

      {/* Animated backdrop behind vision panel */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.visionBackdrop, backdropStyle]}
        pointerEvents={visionPanel.visible ? 'auto' : 'none'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setVisionPanel((p) => ({ ...p, visible: false }))}
        />
      </Animated.View>

      {/* Contextual analysis module selector */}
      <ContextualBottomSheet
        visible={contextualSheetVisible}
        onDismiss={() => setContextualSheetVisible(false)}
        selectedModule={activeModule}
        onModuleSelect={handleModuleSelect}
      />

      {/* Vision analysis bottom sheet */}
      <VisionAnalysis
        imageBase64={visionPanel.imageBase64}
        transcript={visionPanel.transcript}
        analysis={visionPanel.analysis}
        visible={visionPanel.visible}
        onDismiss={() => setVisionPanel((p) => ({ ...p, visible: false }))}
      />

      {/* Camera modal */}
      <Modal visible={showCamera} animationType="fade" statusBarTranslucent>
        <View style={styles.cameraModal}>
          {cameraPermissionDenied ? (
            <View style={styles.permissionDeniedContainer}>
              <Ionicons name="lock-closed" size={48} color="#FFD700" />
              <Text style={styles.permissionDeniedText}>Auris Eye requires camera access</Text>
              <TouchableOpacity
                style={styles.permissionDeniedButton}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.permissionDeniedButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
          )}
          {/* Flash overlay */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.flashOverlay, flashStyle]}
          />
          <Pressable style={styles.cameraClose} onPress={() => { setShowCamera(false); setCameraPermissionDenied(false); }}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {!cameraPermissionDenied && (
            <Pressable style={styles.captureButton} onPress={handleTakePicture}>
              <View style={styles.captureButtonInner} />
            </Pressable>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    gap: 8, width: '100%', paddingHorizontal: 20, justifyContent: 'center',
  },
  wordmark: { fontSize: 16, fontWeight: '700', color: theme.colors.gold, letterSpacing: 10 },
  wordmarkSub: { fontSize: 11, fontWeight: '400', color: theme.colors.textSecondary, letterSpacing: 4 },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, position: 'absolute', right: 20,
  },
  modeDot: { width: 5, height: 5, borderRadius: 3 },
  modeLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.5 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FF6B6B12', borderRadius: 10,
    borderWidth: 0.5, borderColor: '#FF6B6B40', width: '90%',
  },
  errorText: { flex: 1, color: '#FF6B6B', fontSize: 12, lineHeight: 16 },
  transcript: { width: '100%', maxHeight: '45%', marginTop: 16 },
  transcriptContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 220 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: {
    alignSelf: 'flex-end', backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 0.5, borderColor: theme.colors.border,
  },
  bubbleAuris: {
    alignSelf: 'flex-start', backgroundColor: `${theme.colors.gold}10`,
    borderWidth: 0.5, borderColor: `${theme.colors.gold}25`,
  },
  bubbleText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  bubbleTextAuris: { color: theme.colors.textPrimary },
  orbContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  visionHintRow: { alignItems: 'center', paddingBottom: 4 },
  visionHint: { color: '#A855F7', fontSize: 10, fontWeight: '600', letterSpacing: 1.4 },
  audioUnavailableRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4,
    backgroundColor: '#88888815', borderRadius: 8, borderWidth: 0.5, borderColor: '#88888830',
  },
  audioUnavailableText: { color: '#888', fontSize: 10, letterSpacing: 0.5 },
  hintRow: { alignItems: 'center', paddingBottom: 10, minHeight: 20 },
  hint: { color: theme.colors.textSecondary, fontSize: 12, letterSpacing: 1.2, fontWeight: '500' },
  // Camera button
  cameraSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cameraLabel: {
    marginTop: 5,
    fontSize: 8,
    fontWeight: '600',
    color: '#A78BFA',
    letterSpacing: 1.4,
  },
  cameraRoundBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: CAMERA_VIOLET,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CAMERA_GLOW,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.9,
    elevation: 14,
    borderWidth: 1.5,
    borderColor: '#A78BFA80',
  },
  cameraRoundBtnPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.94 }],
  },
  cameraBtnBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
  // Thumbnail preview card
  thumbnailCard: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    width: 72,
    height: 72,
    zIndex: 50,
  },
  thumbnailImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowRadius: 8,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  thumbnailDismiss: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Vision panel backdrop
  visionBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  // Camera modal
  cameraModal: { flex: 1, backgroundColor: '#000' },
  cameraView: { flex: 1 },
  flashOverlay: {
    backgroundColor: '#fff',
    zIndex: 999,
  },
  cameraClose: {
    position: 'absolute', top: 56, right: 24,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  captureButton: {
    position: 'absolute', bottom: 60, alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  captureButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  // Permission denied
  permissionDeniedContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  permissionDeniedText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionDeniedButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  permissionDeniedButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
