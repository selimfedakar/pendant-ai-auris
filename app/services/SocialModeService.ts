import { audioService } from './AudioService';
import { backendService } from './BackendService';
import { notificationService } from './NotificationService';

import { DetectedEvent } from './BackendService';

const AMBIENT_SESSION_MS = 10 * 60 * 1000; // 10 minutes

type Insight = {
  transcript: string;
  reply: string;
  todos: string[];
  events: DetectedEvent[];
};

type SessionEndPayload = {
  summary: string;
  durationMinutes: number;
  transcriptCount: number;
};

class SocialModeService {
  private active = false;
  private userId: string = '';
  private personality: string | undefined;
  private userName: string | undefined;
  private userProfession: string | undefined;
  private insightCallback: ((insight: Insight) => void) | null = null;
  private sessionEndCallback: ((payload: SessionEndPayload) => void) | null = null;

  // Ambient session state
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionTranscripts: string[] = [];
  private sessionStartTime: number = 0;

  onInsight(cb: (insight: Insight) => void): void {
    this.insightCallback = cb;
  }

  onSessionEnd(cb: (payload: SessionEndPayload) => void): void {
    this.sessionEndCallback = cb;
  }

  getElapsedSeconds(): number {
    if (!this.active || !this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  getRemainingSeconds(): number {
    const elapsed = this.getElapsedSeconds();
    return Math.max(0, Math.floor(AMBIENT_SESSION_MS / 1000) - elapsed);
  }

  async start(
    userId: string,
    personality?: string,
    userName?: string,
    userProfession?: string,
  ): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.userId = userId;
    this.personality = personality;
    this.userName = userName;
    this.userProfession = userProfession;
    this.sessionTranscripts = [];
    this.sessionStartTime = Date.now();

    this.sessionTimer = setTimeout(() => this.endSession(), AMBIENT_SESSION_MS);

    await this.startCycle();
  }

  // Stops social mode and generates an immediate session summary.
  async stopWithSummary(): Promise<void> {
    if (!this.active) return;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (audioService.isRecording()) {
      try { await audioService.stopRecording(); } catch { /* ignore */ }
    }
    // endSession clears this.active and fires sessionEndCallback
    await this.endSession();
  }

  async stop(): Promise<void> {
    if (!this.active) return;
    this.active = false;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (audioService.isRecording()) {
      try { await audioService.stopRecording(); } catch { /* ignore */ }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private async endSession(): Promise<void> {
    const wasActive = this.active;
    this.active = false;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    if (audioService.isRecording()) {
      try { await audioService.stopRecording(); } catch { /* ignore */ }
    }

    if (!wasActive || !this.sessionTranscripts.length) {
      // Fire callback even with no content so UI can update
      this.sessionEndCallback?.({
        summary: 'Social session ended. No conversations were captured.',
        durationMinutes: Math.round((Date.now() - this.sessionStartTime) / 60000),
        transcriptCount: 0,
      });
      return;
    }

    const durationMinutes = Math.round((Date.now() - this.sessionStartTime) / 60000);
    const context = this.sessionTranscripts.join('\n');

    let summary = '';
    try {
      summary = await backendService.summarizeSession(
        context,
        this.personality,
        this.userName,
      );
    } catch (err) {
      console.error('[SocialMode] summarizeSession failed:', err);
      summary = `Session complete (${durationMinutes} min, ${this.sessionTranscripts.length} segments captured).`;
    }

    const payload: SessionEndPayload = {
      summary,
      durationMinutes,
      transcriptCount: this.sessionTranscripts.length,
    };

    this.sessionEndCallback?.(payload);

    notificationService.scheduleLocal(
      'Auris — Session Complete',
      summary,
      { type: 'ambient_summary' },
    ).catch(() => {});
  }

  private async startCycle(): Promise<void> {
    if (!this.active) return;
    try {
      await audioService.startRecording(() => this.stopAndSend());
    } catch (err) {
      console.error('[SocialMode] startRecording failed:', err);
      this.scheduleRestart();
    }
  }

  private async stopAndSend(): Promise<void> {
    if (!this.active) return;
    let uri: string;
    try {
      uri = await audioService.stopRecording();
    } catch (err) {
      console.error('[SocialMode] stopRecording failed:', err);
      this.scheduleRestart();
      return;
    }

    try {
      const result = await backendService.processAudioStreaming(
        uri,
        this.userId,
        this.personality,
        this.userName,
        this.userProfession,
      );

      if (result.transcript) {
        this.sessionTranscripts.push(result.transcript);
      }

      // Only surface insight when there is meaningful content
      if (result.reply && result.reply.trim().length > 0) {
        this.insightCallback?.({
          transcript: result.transcript,
          reply: result.reply,
          todos: result.todos,
          events: result.events ?? [],
        });
      }

      // Keyword-triggered summary: user asked for a recap mid-session
      const SUMMARY_KEYWORDS = ['özet', 'ozet', 'summary', 'summarize', 'özetle', 'ne konuştuk', 'what did we discuss'];
      const transcriptLower = (result.transcript ?? '').toLowerCase();
      if (SUMMARY_KEYWORDS.some(kw => transcriptLower.includes(kw))) {
        await this.endSession();
        return;
      }
    } catch (err) {
      console.error('[SocialMode] processAudioStreaming failed:', err);
    }

    await this.startCycle();
  }

  private scheduleRestart(): void {
    setTimeout(() => this.startCycle(), 2000);
  }
}

export const socialModeService = new SocialModeService();
