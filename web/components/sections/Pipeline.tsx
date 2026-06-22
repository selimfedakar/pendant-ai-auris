"use client";

import { motion } from "framer-motion";

const LAYERS = [
  {
    layer: "Pendant",
    role: "A dumb sensor",
    body: "Microphone, camera, speaker, and a BLE radio. No intelligence on your neck — that keeps the hardware light, cheap, and replaceable.",
    chips: ["Mic", "Camera", "Speaker", "BLE"],
  },
  {
    layer: "iOS App",
    role: "The brain",
    body: "Routing, memory, integrations, and UI. The app decides what to do, holds your context, and talks to the cloud.",
    chips: ["Routing", "Memory", "Calendar", "Offline queue"],
  },
  {
    layer: "Cloud",
    role: "The heavy lifting",
    body: "Speech to text, language understanding, and a spoken reply — running on infrastructure that can be upgraded without ever touching the pendant.",
    chips: ["Whisper STT", "LLM reasoning", "Neural TTS", "KV memory"],
  },
];

export default function Pipeline() {
  return (
    <section id="pipeline" className="relative px-6 py-32">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-20 max-w-2xl"
        >
          <span className="font-display text-sm uppercase tracking-[0.25em] text-gold">
            How the intelligence flows
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Three layers. One thought.
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line that the steps light up along */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-hairline md:left-1/2" />

          <div className="flex flex-col gap-16">
            {LAYERS.map((l, i) => (
              <motion.div
                key={l.layer}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative grid grid-cols-[40px_1fr] gap-6 md:grid-cols-2 md:gap-12"
              >
                {/* Node dot */}
                <div className="md:hidden">
                  <NodeDot />
                </div>

                {/* Text — alternates side on desktop */}
                <div
                  className={`${
                    i % 2 === 0 ? "md:order-1 md:text-right" : "md:order-2"
                  }`}
                >
                  <span className="font-display text-xs uppercase tracking-[0.25em] text-gold">
                    {l.layer}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-fg">
                    {l.role}
                  </h3>
                  <p className="mt-3 text-muted">{l.body}</p>
                  <div
                    className={`mt-5 flex flex-wrap gap-2 ${
                      i % 2 === 0 ? "md:justify-end" : ""
                    }`}
                  >
                    {l.chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-hairline px-3 py-1 text-xs text-muted"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Center node on desktop */}
                <div
                  className={`hidden md:flex md:items-start md:justify-center ${
                    i % 2 === 0 ? "md:order-2" : "md:order-1"
                  }`}
                >
                  <NodeDot />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mx-auto mt-20 max-w-xl text-balance text-center text-lg text-muted"
        >
          The pendant is a dumb sensor. All the intelligence lives in the app and
          the cloud — so the thing around your neck stays simple, and gets smarter
          on its own.
        </motion.p>
      </div>
    </section>
  );
}

function NodeDot() {
  return (
    <span className="relative grid h-10 w-10 place-items-center">
      <span className="absolute h-10 w-10 rounded-full bg-gold/15 blur-md" />
      <span
        className="relative h-3.5 w-3.5 rounded-full bg-gold"
        style={{ boxShadow: "0 0 16px 3px rgba(232,184,75,0.7)" }}
      />
    </span>
  );
}
