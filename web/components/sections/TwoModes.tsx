"use client";

import { motion } from "framer-motion";

const MODES = [
  {
    tag: "Solo Mode",
    title: "You talk. It responds.",
    body: "Voice in, voice out. Full conversation memory, calendar awareness, and on-demand vision analysis — capture a photo mid-sentence and get an answer.",
    points: ["Voice-in / voice-out", "Persistent memory", "Vision analysis"],
    accent: "#e8b84b",
  },
  {
    tag: "Social Mode",
    title: "Silent. Always aware.",
    body: "Auris listens to your environment in the background and stays quiet — until something is worth your attention. Then a single notification, nothing more.",
    points: ["Ambient listening", "Silent by default", "Notifies only when it matters"],
    accent: "#7fb0ff",
  },
];

export default function TwoModes() {
  return (
    <section id="modes" className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-2xl"
        >
          <span className="font-display text-sm uppercase tracking-[0.25em] text-gold">
            Two ways to wear it
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            One pendant, two minds.
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {MODES.map((m, i) => (
            <motion.div
              key={m.tag}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: i * 0.12 }}
              className="group relative overflow-hidden rounded-3xl border border-hairline bg-panel/60 p-8 sm:p-10"
            >
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
                style={{ background: m.accent }}
              />
              <span
                className="relative font-display text-xs uppercase tracking-[0.25em]"
                style={{ color: m.accent }}
              >
                {m.tag}
              </span>
              <h3 className="relative mt-4 font-display text-2xl font-semibold text-fg sm:text-3xl">
                {m.title}
              </h3>
              <p className="relative mt-4 text-muted">{m.body}</p>
              <ul className="relative mt-8 flex flex-wrap gap-2">
                {m.points.map((p) => (
                  <li
                    key={p}
                    className="rounded-full border border-hairline px-3 py-1.5 text-xs text-muted"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
