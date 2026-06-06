import { Hono } from "hono";
import { cors } from "hono/cors";

type Message = { role: "user" | "assistant"; content: string };

type Env = {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  GROQ_API_KEY: string;
  AURIS_API_KEY: string;
  CONVERSATIONS: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Auris-Key", "X-User-Id", "X-Personality", "X-User-Name"],
  })
);

// Auth middleware — applied only to /v1/* routes
app.use("/v1/*", async (c, next) => {
  const expectedKey = c.env.AURIS_API_KEY;
  if (expectedKey) {
    const provided = c.req.header("X-Auris-Key");
    if (provided !== expectedKey) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }
  await next();
});

app.get("/", (c) => c.json({ status: "ok", service: "auris-backend" }));
app.get("/health", (c) =>
  c.json({ status: "healthy", timestamp: new Date().toISOString() })
);

const PERSONALITY_PROMPTS: Record<string, string> = {
  companion:
    "You are Auris, a warm and supportive AI companion. Be empathetic, encouraging, and conversational. Keep responses concise (2-3 sentences) and natural for voice.",
  professional:
    "You are Auris, a sharp professional AI assistant. Be precise, efficient, and business-focused. Keep responses concise (2-3 sentences) and actionable.",
  casual:
    "You are Auris, a chill and friendly AI. Be relaxed, use light humor, and keep things simple. Keep responses concise (2-3 sentences) and fun.",
  mentor:
    "You are Auris, a wise AI mentor. Be thoughtful, insightful, and guide the user to grow. Keep responses concise (2-3 sentences) and inspiring.",
  focus:
    "You are Auris, a focused productivity AI. Be direct, minimal, and help the user stay on track. Keep responses concise (1-2 sentences) and sharp.",
};

async function loadHistory(kv: KVNamespace | undefined, userId: string): Promise<Message[]> {
  if (!kv) return [];
  try {
    const raw = await kv.get(userId);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

async function saveHistory(kv: KVNamespace | undefined, userId: string, messages: Message[]): Promise<void> {
  if (!kv) return;
  try {
    await kv.put(userId, JSON.stringify(messages.slice(-20)), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  } catch {
    // non-fatal
  }
}

async function transcribeAudio(
  audioBlob: Blob,
  groqApiKey: string,
): Promise<{ text: string; language: string }> {
  // Guard: reject blobs too small to contain valid audio (corrupted or silent recording).
  if (audioBlob.size < 1000) {
    throw new Error(`Audio too short (${audioBlob.size} bytes) — please speak for at least 1 second`);
  }

  // Use 3-arg FormData.append so the part carries Content-Disposition: filename="audio.wav".
  // verbose_json gives us detected language alongside the transcript.
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "verbose_json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq STT failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { text: string; language?: string };
  return { text: data.text.trim(), language: data.language ?? "en" };
}

type DetectedEvent = {
  title: string;
  datetime?: string;
  general_timeframe?: 'morning' | 'afternoon' | 'evening' | 'all_day';
  location?: string;
  description?: string;
  participants: string[];
};
type ReplyResult = { reply: string; todos: string[]; events: DetectedEvent[] };

function detectionSuffix(): string {
  const now = new Date().toISOString();
  return (
    `Today's date and time is ${now}. ` +
    `If the user mentions tasks they need to do OR any scheduled meetings/events/appointments, ` +
    `append this exact JSON at the very end of your response (no other text after it): ` +
    `{"todos":["task1"],"events":[{"title":"Event title","participants":["name1"]}]}. ` +
    `For events: if an exact time is known, add "datetime":"YYYY-MM-DDTHH:MM:SS" (ISO 8601). ` +
    `If time is vague or not mentioned, omit datetime and add "general_timeframe":"morning"|"afternoon"|"evening"|"all_day" instead. ` +
    `Never guess or hallucinate a time. ` +
    `If mentioned, also include "location":"..." and "description":"...". ` +
    `Include only the arrays that have items (omit "todos" key if no tasks, omit "events" key if no events). ` +
    `Do not include this JSON if nothing was detected.`
  );
}

function parseDetectionJson(full: string): { reply: string; todos: string[]; events: DetectedEvent[] } {
  const jsonMatch = full.match(/(\{"(?:todos|events)"[\s\S]*\})\s*$/);
  let reply = full;
  let todos: string[] = [];
  let events: DetectedEvent[] = [];
  if (jsonMatch) {
    reply = full.slice(0, jsonMatch.index).trimEnd();
    try {
      const parsed = JSON.parse(jsonMatch[1]) as { todos?: string[]; events?: DetectedEvent[] };
      todos = Array.isArray(parsed.todos) ? parsed.todos : [];
      events = Array.isArray(parsed.events) ? parsed.events : [];
    } catch {
      // malformed JSON — ignore
    }
  }
  return { reply, todos, events };
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

type ApiMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };

async function generateReply(
  transcript: string,
  history: Message[],
  personality: string,
  userName: string,
  userProfession: string,
  anthropicApiKey: string,
  imageBase64?: string | null,
  contextData?: string,
): Promise<ReplyResult> {
  const basePrompt = PERSONALITY_PROMPTS[personality] ?? PERSONALITY_PROMPTS.companion;

  const contextLines: string[] = [basePrompt];
  if (userName) contextLines.push(`The user's name is ${userName}.`);
  if (userProfession) contextLines.push(`Their profession is ${userProfession}.`);
  if (contextData) contextLines.push(`Relevant context for this conversation: ${contextData}`);
  contextLines.push("Respond in the same language the user speaks.");
  contextLines.push(detectionSuffix());

  const systemPrompt = contextLines.join(" ");

  const userContent: string | ContentBlock[] = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
        { type: "text", text: transcript },
      ]
    : transcript;

  const messages: ApiMessage[] = [
    ...(history as ApiMessage[]),
    { role: "user", content: userContent },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude LLM failed: ${response.status} — ${err}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const textBlock = data.content.find((b) => b.type === "text");
  const full = textBlock?.text ?? "";

  const { reply, todos, events } = parseDetectionJson(full);
  return { reply, todos, events };
}

// Orpheus (English only, high quality) — default for English
async function synthesizeSpeechOrpheus(text: string, groqApiKey: string): Promise<ArrayBuffer> {
  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "canopylabs/orpheus-v1-english",
      voice: "diana",
      input: text,
      response_format: "wav",
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq TTS failed: ${response.status} — ${err}`);
  }
  return response.arrayBuffer();
}

// OpenAI Nova — multilingual fallback for non-English
async function synthesizeSpeechOpenAI(text: string, openaiApiKey: string): Promise<ArrayBuffer> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",
      input: text,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI TTS failed: ${response.status} — ${err}`);
  }
  return response.arrayBuffer();
}

// Route TTS: Orpheus for English (with OpenAI Nova fallback), OpenAI Nova for all other languages
async function synthesizeSpeech(
  text: string,
  groqApiKey: string,
  openaiApiKey: string,
  language: string = "en",
): Promise<ArrayBuffer> {
  if (language === "en") {
    try {
      return await synthesizeSpeechOrpheus(text, groqApiKey);
    } catch (err) {
      console.error("Orpheus TTS failed, falling back to OpenAI Nova:", err instanceof Error ? err.message : err);
      return synthesizeSpeechOpenAI(text, openaiApiKey);
    }
  }
  return synthesizeSpeechOpenAI(text, openaiApiKey);
}

async function collectClaudeStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  // Buffer carries the tail of a chunk that may be an incomplete SSE line.
  // Without this, a "data: {...}" line split across two chunks is silently discarded.
  let lineBuffer = "";

  const processLine = (raw: string) => {
    const line = raw.trimEnd(); // strip trailing \r from \r\n endings
    if (!line.startsWith("data: ")) return;
    const data = line.slice(6).trim();
    if (data === "[DONE]") return;
    let parsed: any;
    try { parsed = JSON.parse(data); } catch { return; }
    if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
      fullText += parsed.delta.text ?? "";
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? ""; // keep the potentially incomplete last line
      for (const line of lines) processLine(line);
    }
    // Flush any remaining content
    for (const line of lineBuffer.split("\n")) processLine(line);
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

function splitIntoSentences(text: string): string[] {
  const results: string[] = [];
  let buffer = "";

  for (let i = 0; i < text.length; i++) {
    buffer += text[i];

    const atSentenceEnd =
      (text[i] === "." || text[i] === "!" || text[i] === "?") &&
      (i + 1 >= text.length || text[i + 1] === " " || text[i + 1] === "\n");

    if (atSentenceEnd) {
      const trimmed = buffer.trim();
      if (trimmed) results.push(trimmed);
      buffer = "";
      if (i + 1 < text.length && text[i + 1] === " ") i++;
      continue;
    }

    if (text[i] === "," && buffer.trim().length >= 40) {
      const trimmed = buffer.trim();
      if (trimmed) results.push(trimmed);
      buffer = "";
    }
  }

  const remaining = buffer.trim();
  if (remaining) results.push(remaining);

  return results;
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Use Buffer (available via nodejs_compat flag) — reliable, handles padding/whitespace,
  // and avoids the slow charCode loop that caused truncation on large audio files.
  const clean = base64.replace(/[\s\r\n]/g, "");
  const buf = Buffer.from(clean, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  return new Blob([base64ToUint8Array(base64)], { type: mimeType });
}

// JSON body variants — avoid React Native FormData file-upload issues on device.

app.post("/v1/process-audio-json", async (c) => {
  let body: Record<string, string>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const audioBase64 = body.audio_base64;
  const userId = body.user_id ?? "anonymous";
  const personality = (body.personality ?? "companion").toLowerCase();
  const userName = body.user_name ?? "";
  const userProfession = body.user_profession ?? "";
  const imageBase64 = body.image_base64 || null;
  const contextData = body.context_data || undefined;

  if (!audioBase64) return c.json({ error: "Missing audio_base64" }, 400);

  try {
    const audioBlob = base64ToBlob(audioBase64, "audio/wav");

    const [sttResult, history] = await Promise.all([
      transcribeAudio(audioBlob, c.env.GROQ_API_KEY),
      loadHistory(c.env.CONVERSATIONS, userId),
    ]);
    const transcript = sttResult.text;
    const language = sttResult.language;

    if (!transcript) return c.json({ error: "No speech detected in audio" }, 422);

    const { reply, todos, events } = await generateReply(
      transcript,
      history,
      personality,
      userName,
      userProfession,
      c.env.ANTHROPIC_API_KEY,
      imageBase64,
      contextData,
    );

    await saveHistory(c.env.CONVERSATIONS, userId, [
      ...history,
      { role: "user", content: transcript },
      { role: "assistant", content: reply },
    ]);

    let audioBuffer: ArrayBuffer = new ArrayBuffer(0);
    let ttsSkipped = false;
    try {
      audioBuffer = await synthesizeSpeech(reply, c.env.GROQ_API_KEY, c.env.OPENAI_API_KEY, language);
    } catch (ttsErr) {
      console.error("TTS failed (non-fatal):", ttsErr instanceof Error ? ttsErr.message : ttsErr);
      ttsSkipped = true;
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Transcript": encodeURIComponent(transcript),
        "X-Reply": encodeURIComponent(reply),
        "X-User-Id": userId,
        "X-Personality": personality,
        ...(ttsSkipped && { "X-TTS-Skipped": "1" }),
        ...(todos.length > 0 && { "X-Todos": encodeURIComponent(JSON.stringify(todos)) }),
        ...(events.length > 0 && { "X-Events": encodeURIComponent(JSON.stringify(events)) }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-audio-json error:", message);
    return c.json({ error: message }, 500);
  }
});

app.post("/v1/process-audio-stream-json", async (c) => {
  let body: Record<string, string>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const audioBase64 = body.audio_base64;
  const userId = body.user_id ?? "anonymous";
  const personality = (body.personality ?? "companion").toLowerCase();
  const userName = body.user_name ?? "";
  const userProfession = body.user_profession ?? "";
  const contextData = body.context_data || undefined;

  if (!audioBase64) return c.json({ error: "Missing audio_base64" }, 400);

  try {
    const audioBlob = base64ToBlob(audioBase64, "audio/wav");

    const [sttResult2, history] = await Promise.all([
      transcribeAudio(audioBlob, c.env.GROQ_API_KEY),
      loadHistory(c.env.CONVERSATIONS, userId),
    ]);
    const transcript = sttResult2.text;
    const language = sttResult2.language;

    if (!transcript) return c.json({ error: "No speech detected in audio" }, 422);

    const basePrompt = PERSONALITY_PROMPTS[personality] ?? PERSONALITY_PROMPTS.companion;
    const contextLines: string[] = [basePrompt];
    if (userName) contextLines.push(`The user's name is ${userName}.`);
    if (userProfession) contextLines.push(`Their profession is ${userProfession}.`);
    if (contextData) contextLines.push(`Relevant context for this conversation: ${contextData}`);
    contextLines.push("Respond in the same language the user speaks.");
    contextLines.push(detectionSuffix());
    const systemPrompt = contextLines.join(" ");
    const messages: Message[] = [...history, { role: "user", content: transcript }];

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!claudeResponse.ok || !claudeResponse.body) {
      const err = await claudeResponse.text();
      throw new Error(`Claude LLM failed: ${claudeResponse.status} — ${err}`);
    }

    const fullRawReply = await collectClaudeStream(claudeResponse.body);
    const { reply, todos, events } = parseDetectionJson(fullRawReply);

    saveHistory(c.env.CONVERSATIONS, userId, [
      ...history,
      { role: "user", content: transcript },
      { role: "assistant", content: reply },
    ]).catch(() => {});

    const sentences = splitIntoSentences(reply).filter((s) => s.length > 0);
    const groqApiKey = c.env.GROQ_API_KEY;
    const openaiApiKey2 = c.env.OPENAI_API_KEY;
    const ttsPromises: Promise<ArrayBuffer | null>[] = sentences.map((sentence) =>
      synthesizeSpeech(sentence, groqApiKey, openaiApiKey2, language).catch((err) => {
        console.error("TTS sentence failed:", err instanceof Error ? err.message : err);
        return null;
      })
    );

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    const writeChunks = async () => {
      for (const ttsPromise of ttsPromises) {
        const buffer = await ttsPromise;
        if (buffer) await writer.write(new Uint8Array(buffer));
      }
      await writer.close();
    };

    writeChunks().catch(async (err) => {
      console.error("process-audio-stream-json write error:", err instanceof Error ? err.message : err);
      try { await writer.abort(err); } catch { /* ignore */ }
    });

    return new Response(readable as unknown as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "X-Transcript": encodeURIComponent(transcript),
        "X-Reply": encodeURIComponent(reply),
        ...(todos.length > 0 && { "X-Todos": encodeURIComponent(JSON.stringify(todos)) }),
        ...(events.length > 0 && { "X-Events": encodeURIComponent(JSON.stringify(events)) }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-audio-stream-json error:", message);
    return c.json({ error: message }, 500);
  }
});

// Text-only summarize endpoint — used by ambient session at end of 10-min window
app.post("/v1/summarize", async (c) => {
  let body: Record<string, string>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const context = body.context ?? "";
  const personality = (body.personality ?? "companion").toLowerCase();
  const userName = body.user_name ?? "";

  if (!context) return c.json({ error: "Missing context" }, 400);

  try {
    const basePrompt = PERSONALITY_PROMPTS[personality] ?? PERSONALITY_PROMPTS.companion;
    const systemLines = [
      basePrompt,
      userName ? `The user's name is ${userName}.` : "",
      "You are summarizing an ambient listening session. Provide 2-3 concise bullet-point insights from what was overheard. Be direct and useful.",
    ].filter(Boolean);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemLines.join(" "),
        messages: [{ role: "user", content: `Summarize this ambient session:\n${context}` }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude failed: ${response.status} — ${err}`);
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
    const summary = data.content.find((b) => b.type === "text")?.text ?? "";
    return c.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("summarize error:", message);
    return c.json({ error: message }, 500);
  }
});

// Device code validation — checks whether a code from the product booklet is valid.
// Admin code (003) is hardcoded server-side. Customer codes (AUR-XXXXXX) are
// stored in the CONVERSATIONS KV under the "code:" prefix.
app.post("/v1/validate-code", async (c) => {
  let body: { code?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const code = (body.code ?? "").trim().toUpperCase();

  if (!code) {
    return c.json({ valid: false }, 400);
  }

  // Admin code — hardcoded, no KV lookup needed.
  if (code === "003") {
    return c.json({ valid: true, type: "admin" });
  }

  // Customer code format: AUR- followed by exactly 6 uppercase alphanumerics.
  const customerCodeRegex = /^AUR-[A-Z0-9]{6}$/;
  if (customerCodeRegex.test(code)) {
    const kvKey = `code:${code}`;
    const existing = await c.env.CONVERSATIONS.get(kvKey);
    if (!existing) {
      return c.json({ valid: false });
    }

    // Record activation (upsert — overwrites previous value with updated activatedAt).
    await c.env.CONVERSATIONS.put(
      kvKey,
      JSON.stringify({ activatedAt: new Date().toISOString(), activations: 1 }),
    );

    return c.json({ valid: true, type: "customer" });
  }

  // Unknown format.
  return c.json({ valid: false });
});

// Raw binary endpoint — ESP32 sends WAV bytes directly (no base64, no JSON wrapper).
// Headers carry auth + metadata; body is the raw WAV file.
app.post("/v1/process-audio-raw", async (c) => {
  const userId = c.req.header("X-User-Id") ?? "anonymous";
  const personality = (c.req.header("X-Personality") ?? "companion").toLowerCase();
  const userName = c.req.header("X-User-Name") ?? "";

  const rawBody = await c.req.arrayBuffer();
  if (!rawBody || rawBody.byteLength === 0) {
    return c.json({ error: "Empty audio body" }, 400);
  }

  try {
    const audioBlob = new Blob([rawBody], { type: "audio/wav" });

    const [sttResult3, history] = await Promise.all([
      transcribeAudio(audioBlob, c.env.GROQ_API_KEY),
      loadHistory(c.env.CONVERSATIONS, userId),
    ]);
    const transcript = sttResult3.text;
    const language = sttResult3.language;

    if (!transcript) return c.json({ error: "No speech detected in audio" }, 422);

    const { reply, todos, events } = await generateReply(
      transcript,
      history,
      personality,
      userName,
      "",
      c.env.ANTHROPIC_API_KEY,
    );

    await saveHistory(c.env.CONVERSATIONS, userId, [
      ...history,
      { role: "user", content: transcript },
      { role: "assistant", content: reply },
    ]);

    let audioBuffer: ArrayBuffer = new ArrayBuffer(0);
    let ttsSkipped = false;
    try {
      audioBuffer = await synthesizeSpeech(reply, c.env.GROQ_API_KEY, c.env.OPENAI_API_KEY, language);
    } catch (ttsErr) {
      console.error("TTS failed (non-fatal):", ttsErr instanceof Error ? ttsErr.message : ttsErr);
      ttsSkipped = true;
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Transcript": encodeURIComponent(transcript),
        "X-Reply": encodeURIComponent(reply),
        "X-User-Id": userId,
        "X-Personality": personality,
        ...(ttsSkipped && { "X-TTS-Skipped": "1" }),
        ...(todos.length > 0 && { "X-Todos": encodeURIComponent(JSON.stringify(todos)) }),
        ...(events.length > 0 && { "X-Events": encodeURIComponent(JSON.stringify(events)) }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-audio-raw error:", message);
    return c.json({ error: message }, 500);
  }
});

// Legacy FormData endpoints kept for compatibility
app.post("/v1/process-audio-stream", async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart form data" }, 400);
  }

  const audioFileRaw = formData.get("audio");
  const userId = (formData.get("user_id") as string) ?? "anonymous";
  const personality = ((formData.get("personality") as string) ?? "companion").toLowerCase();
  const userName = (formData.get("user_name") as string) ?? "";
  const userProfession = (formData.get("user_profession") as string) ?? "";

  if (!audioFileRaw || typeof audioFileRaw === "string") {
    return c.json({ error: "Missing audio file in form data" }, 400);
  }
  const audioFile = audioFileRaw as File;

  try {
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || "audio/mp4",
    });

    const [sttResult4, history] = await Promise.all([
      transcribeAudio(audioBlob, c.env.GROQ_API_KEY),
      loadHistory(c.env.CONVERSATIONS, userId),
    ]);
    const transcript = sttResult4.text;
    const language = sttResult4.language;

    if (!transcript) {
      return c.json({ error: "No speech detected in audio" }, 422);
    }

    const basePrompt = PERSONALITY_PROMPTS[personality] ?? PERSONALITY_PROMPTS.companion;
    const contextLines: string[] = [basePrompt];
    if (userName) contextLines.push(`The user's name is ${userName}.`);
    if (userProfession) contextLines.push(`Their profession is ${userProfession}.`);
    contextLines.push("Respond in the same language the user speaks.");
    contextLines.push(detectionSuffix());
    const systemPrompt = contextLines.join(" ");
    const messages: Message[] = [...history, { role: "user", content: transcript }];

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!claudeResponse.ok || !claudeResponse.body) {
      const err = await claudeResponse.text();
      throw new Error(`Claude LLM failed: ${claudeResponse.status} — ${err}`);
    }

    const fullRawReply = await collectClaudeStream(claudeResponse.body);
    const { reply, todos, events } = parseDetectionJson(fullRawReply);

    saveHistory(c.env.CONVERSATIONS, userId, [
      ...history,
      { role: "user", content: transcript },
      { role: "assistant", content: reply },
    ]).catch(() => {});

    const sentences = splitIntoSentences(reply).filter((s) => s.length > 0);
    const groqApiKey = c.env.GROQ_API_KEY;
    const openaiApiKey4 = c.env.OPENAI_API_KEY;
    const ttsPromises: Promise<ArrayBuffer | null>[] = sentences.map((sentence) =>
      synthesizeSpeech(sentence, groqApiKey, openaiApiKey4, language).catch((err) => {
        console.error("TTS sentence failed:", err instanceof Error ? err.message : err);
        return null;
      })
    );

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    const writeChunks = async () => {
      for (const ttsPromise of ttsPromises) {
        const buffer = await ttsPromise;
        if (buffer) await writer.write(new Uint8Array(buffer));
      }
      await writer.close();
    };

    writeChunks().catch(async (err) => {
      console.error("process-audio-stream write error:", err instanceof Error ? err.message : err);
      try { await writer.abort(err); } catch { /* ignore */ }
    });

    return new Response(readable as unknown as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "X-Transcript": encodeURIComponent(transcript),
        "X-Reply": encodeURIComponent(reply),
        ...(todos.length > 0 && { "X-Todos": encodeURIComponent(JSON.stringify(todos)) }),
        ...(events.length > 0 && { "X-Events": encodeURIComponent(JSON.stringify(events)) }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-audio-stream error:", message);
    return c.json({ error: message }, 500);
  }
});

app.post("/v1/process-audio", async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart form data" }, 400);
  }

  const audioFileRaw2 = formData.get("audio");
  const userId = (formData.get("user_id") as string) ?? "anonymous";
  const personality = ((formData.get("personality") as string) ?? "companion").toLowerCase();
  const userName = (formData.get("user_name") as string) ?? "";
  const userProfession = (formData.get("user_profession") as string) ?? "";
  const imageBase64 = (formData.get("image_base64") as string | null) || null;

  if (!audioFileRaw2 || typeof audioFileRaw2 === "string") {
    return c.json({ error: "Missing audio file in form data" }, 400);
  }
  const audioFile2 = audioFileRaw2 as File;

  try {
    const audioBlob = new Blob([await audioFile2.arrayBuffer()], {
      type: audioFile2.type || "audio/mp4",
    });

    const [sttResult5, history] = await Promise.all([
      transcribeAudio(audioBlob, c.env.GROQ_API_KEY),
      loadHistory(c.env.CONVERSATIONS, userId),
    ]);
    const transcript = sttResult5.text;
    const language = sttResult5.language;

    if (!transcript) {
      return c.json({ error: "No speech detected in audio" }, 422);
    }

    const { reply, todos, events } = await generateReply(
      transcript,
      history,
      personality,
      userName,
      userProfession,
      c.env.ANTHROPIC_API_KEY,
      imageBase64
    );

    const updatedHistory: Message[] = [
      ...history,
      { role: "user", content: transcript },
      { role: "assistant", content: reply },
    ];
    await saveHistory(c.env.CONVERSATIONS, userId, updatedHistory);

    const audioBuffer = await synthesizeSpeech(reply, c.env.GROQ_API_KEY, c.env.OPENAI_API_KEY, language);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Transcript": encodeURIComponent(transcript),
        "X-Reply": encodeURIComponent(reply),
        "X-User-Id": userId,
        "X-Personality": personality,
        ...(todos.length > 0 && { "X-Todos": encodeURIComponent(JSON.stringify(todos)) }),
        ...(events.length > 0 && { "X-Events": encodeURIComponent(JSON.stringify(events)) }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("process-audio error:", message);
    return c.json({ error: message }, 500);
  }
});

export default app;
