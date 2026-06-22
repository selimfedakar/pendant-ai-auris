import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import PageCta from "@/components/PageCta";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Specs & pricing — Auris",
  description:
    "What's inside the Auris pendant, the two ways it works, and what it costs: $199 for the device, $14.99 / month for the intelligence.",
};

const SPECS: { group: string; rows: { k: string; v: string }[] }[] = [
  {
    group: "Sensors",
    rows: [
      { k: "Microphone", v: "Always-on, far-field, with on-device voice activity detection" },
      { k: "Camera", v: "On-demand capture for vision analysis" },
      { k: "Speaker", v: "Built-in, for spoken replies" },
    ],
  },
  {
    group: "Connectivity",
    rows: [
      { k: "Link", v: "Bluetooth Low Energy to your iPhone" },
      { k: "Companion app", v: "iOS — the brain that routes everything" },
      { k: "Cloud", v: "Managed AI pipeline (transcription, reasoning, voice)" },
    ],
  },
  {
    group: "Wear",
    rows: [
      { k: "Form", v: "Pendant on a necklace cord" },
      { k: "Indicator", v: "Quiet — no lights until you engage it" },
      { k: "Materials", v: "Final finish revealed at launch" },
    ],
  },
];

const MODES = [
  {
    name: "Solo Mode",
    tag: "Voice in, voice out",
    body: "Talk to Auris like a companion. It listens, reasons with memory of your past conversations, and answers out loud — capturing todos and events as it goes.",
  },
  {
    name: "Social Mode",
    tag: "Silent, ambient",
    body: "Auris listens in the background and stays quiet. When something matters — a commitment, a date, a name — it surfaces a notification on your phone instead of speaking.",
  },
];

export default function SpecsPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Specs & pricing"
        title="Small to wear. Large to think."
        lead="The pendant carries just enough hardware to see, hear, and speak. Everything clever happens in the app and the cloud."
      />

      {/* Spec groups */}
      <section className="px-6 pb-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {SPECS.map((s, i) => (
            <Reveal key={s.group} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-hairline bg-panel/40 p-8">
                <h2 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
                  {s.group}
                </h2>
                <dl className="mt-6 space-y-5">
                  {s.rows.map((r) => (
                    <div key={r.k} className="border-t border-hairline pt-5 first:border-0 first:pt-0">
                      <dt className="font-display text-base font-medium text-fg">
                        {r.k}
                      </dt>
                      <dd className="mt-1 text-sm text-muted">{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Two modes */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Two ways to wear it
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {MODES.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-hairline bg-panel/40 p-8">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted/70">
                    {m.tag}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-fg">
                    {m.name}
                  </h3>
                  <p className="mt-4 text-muted">{m.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-gold/30 bg-panel/50">
              <div className="grid sm:grid-cols-2">
                <div className="border-b border-hairline p-10 sm:border-b-0 sm:border-r">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted/70">
                    The device
                  </span>
                  <p className="mt-4 font-display text-5xl font-semibold text-fg">
                    $199
                  </p>
                  <p className="mt-2 text-sm text-muted">One-time. The pendant is yours.</p>
                </div>
                <div className="p-10">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted/70">
                    The intelligence
                  </span>
                  <p className="mt-4 font-display text-5xl font-semibold text-gold">
                    $14.99
                    <span className="font-body text-base font-normal text-muted">
                      {" "}
                      / month
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Transcription, reasoning, voice, and memory.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <PageCta title="Reserve yours" />
    </main>
  );
}
