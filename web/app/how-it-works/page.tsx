import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import PageCta from "@/components/PageCta";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "How it works — Auris",
  description:
    "Auris is three layers: a sensor you wear, a brain in your pocket, and intelligence in the cloud. Here is exactly how a thought becomes an answer.",
};

const LAYERS = [
  {
    step: "01",
    name: "The pendant",
    role: "A deliberately dumb sensor",
    body: "Microphone, camera, and speaker in a piece of jewelry. It captures and it plays back — nothing more. No model runs here, so it stays small, cool, and private by design.",
    points: ["Always-on microphone", "On-demand camera", "Speaker for replies", "Bluetooth LE to your phone"],
  },
  {
    step: "02",
    name: "Your iPhone",
    role: "The brain",
    body: "The app is where Auris thinks about you specifically: routing, memory, your calendar and inbox context, and the interface. It decides what to send up and what to keep on device.",
    points: ["Voice activity detection", "Conversation memory", "Calendar & email context", "Offline-resilient queue"],
  },
  {
    step: "03",
    name: "The cloud",
    role: "The heavy lifting",
    body: "Speech-to-text, the language model, and text-to-speech run on managed AI infrastructure — fast enough to answer before you've put your phone away.",
    points: ["Groq Whisper transcription", "Claude reasoning", "Natural voice synthesis", "Encrypted memory store"],
  },
];

const PIPELINE = [
  { k: "You speak", v: "On-device voice detection knows when you start and stop — no wake word, no button to hold." },
  { k: "Speech → text", v: "Audio streams to Groq Whisper, which transcribes in any language automatically." },
  { k: "Text → understanding", v: "Claude reads the transcript with your recent history and context, then reasons about what you actually need." },
  { k: "Answer → voice", v: "The reply is synthesized to natural speech and played back through the pendant." },
  { k: "Captured for you", v: "Todos and calendar events are extracted in the background and waiting in the app." },
];

export default function HowItWorksPage() {
  return (
    <main>
      <PageHeader
        eyebrow="How it works"
        title="A dumb sensor. A smart everywhere else."
        lead="Auris is split into three layers so the thing you wear can be tiny and private, while the intelligence lives where it has room to be powerful."
      />

      {/* Three layers */}
      <section className="px-6 pb-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {LAYERS.map((l, i) => (
            <Reveal key={l.step} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl border border-hairline bg-panel/40 p-8">
                <span className="font-display text-sm text-gold">{l.step}</span>
                <h2 className="mt-3 font-display text-2xl font-semibold text-fg">
                  {l.name}
                </h2>
                <p className="mt-1 text-sm uppercase tracking-[0.18em] text-muted/70">
                  {l.role}
                </p>
                <p className="mt-5 text-muted">{l.body}</p>
                <ul className="mt-6 space-y-2.5 border-t border-hairline pt-6">
                  {l.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-sm text-fg/90">
                      <span className="h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              From a sentence to an answer
            </h2>
            <p className="mt-4 text-muted">
              Every interaction follows the same path — usually in a couple of
              seconds.
            </p>
          </Reveal>

          <div className="mt-12 space-y-px">
            {PIPELINE.map((s, i) => (
              <Reveal key={s.k} delay={i * 0.06}>
                <div className="flex gap-6 rounded-xl px-4 py-6 transition-colors hover:bg-panel/40">
                  <span className="font-display text-sm text-gold tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-medium text-fg">
                      {s.k}
                    </h3>
                    <p className="mt-1.5 text-muted">{s.v}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <PageCta />
    </main>
  );
}
