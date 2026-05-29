import { audioService } from './AudioService';
import { backendService } from './BackendService';

import { DetectedEvent } from './BackendService';

type Insight = {
  transcript: string;
  reply: string;
  todos: string[];
  events: DetectedEvent[];
};

class SocialModeService {
  private active = false;
  private userId: string = '';
  private personality: string | undefined;
  private userName: string | undefined;
  private userProfession: string | undefined;
  private insightCallback: ((insight: Insight) => void) | null = null;

  onInsight(cb: (insight: Insight) => void): void {
    this.insightCallback = cb;
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
    await this.startCycle();
  }

  async stop(): Promise<void> {
    if (!this.active) return;
    this.active = false;
    if (audioService.isRecording()) {
      try { await audioService.stopRecording(); } catch { /* recording may have already stopped */ }
    }
  }

  isActive(): boolean {
    return this.active;
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
      this.insightCallback?.({
        transcript: result.transcript,
        reply: result.reply,
        todos: result.todos,
        events: result.events ?? [],
      });
    } catch (err) {
      console.error('[SocialMode] processAudioStreaming failed:', err);
    }

    // Always restart the cycle regardless of backend success or failure.
    await this.startCycle();
  }

  private scheduleRestart(): void {
    setTimeout(() => this.startCycle(), 2000);
  }
}

export const socialModeService = new SocialModeService();
