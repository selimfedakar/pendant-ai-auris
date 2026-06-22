"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Objection-handling FAQ for the landing page. Native <button> disclosure
 * pattern (keyboard + screen-reader friendly) with a smooth height/opacity
 * reveal. The questions are the ones that actually block a reservation:
 * price, privacy, battery, returns.
 */
const FAQS = [
  {
    q: "Why $199 plus $14.99 a month?",
    a: "The $199 covers the pendant itself — the microphone, camera, speaker, and battery you wear. The monthly fee is the intelligence: always-on transcription, vision, memory, and the models that improve over time. Hardware is the smallest part of Auris; the software is the product.",
  },
  {
    q: "Is it always recording?",
    a: "No. Auris listens for moments you choose, and you stay in control. Nothing is stored without you, you can see exactly what's kept, and you can delete all of it at any time. The device is deliberately simple — the privacy guarantees live in the architecture, not in a promise.",
  },
  {
    q: "How long does the battery last?",
    a: "A full day of ambient use on a single charge, with fast top-ups over USB-C. Auris sleeps intelligently between moments so it isn't burning power when nothing's happening.",
  },
  {
    q: "What happens to my data?",
    a: "It's yours. Captured moments are tied to your account, encrypted in transit, and never sold. You can export or wipe everything from the app — and when you delete, it's gone, not archived.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Reserving today places no charge and no obligation. Once Auris ships, every order is covered by a 30-day return window — if it isn't for you, send it back.",
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-glow focus-visible:outline-none focus-visible:text-glow"
      >
        <span className="font-display text-lg font-medium text-fg">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-2xl leading-none text-gold"
          aria-hidden="true"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={`faq-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-10 text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  return (
    <section id="faq" className="px-6 py-28">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs uppercase tracking-[0.22em] text-gold">
            Questions
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            The things you&apos;re wondering.
          </h2>
        </motion.div>
        <div className="mt-10">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
