"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Voice with memory",
    body: "Conversations that remember the last twenty turns — context carries from one moment to the next.",
  },
  {
    title: "Vision analysis",
    body: "Capture a photo mid-conversation and get a multimodal answer about what you're looking at.",
  },
  {
    title: "Ambient intelligence",
    body: "Background listening in social mode surfaces only what matters, with a silent notification.",
  },
  {
    title: "Auto todo & events",
    body: "Tasks and meetings — with times and people — are pulled from speech and captured automatically.",
  },
  {
    title: "Calendar context",
    body: "Auris reads your next seven days before every conversation, so its answers fit your day.",
  },
  {
    title: "Offline-resilient",
    body: "Lost connection? Requests queue locally and retry the moment you're back online.",
  },
];

const card = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function Features() {
  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-2xl"
        >
          <span className="font-display text-sm uppercase tracking-[0.25em] text-gold">
            What it does
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Quietly capable.
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={card}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="group rounded-2xl border border-hairline bg-panel/40 p-7 transition-colors duration-300 hover:border-gold/40"
            >
              <div
                className="mb-5 h-9 w-9 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #ffd98a, #e8b84b 55%, #b9852a)",
                  boxShadow: "0 0 20px rgba(232,184,75,0.4)",
                }}
              />
              <h3 className="font-display text-lg font-semibold text-fg">
                {f.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
