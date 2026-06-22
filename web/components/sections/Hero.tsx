"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Pendant from "@/components/Pendant";

const HEADLINE = ["Always", "listening.", "Quietly", "yours."];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const word = {
  hidden: { y: "110%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function Hero() {
  // The orb leans a few pixels toward the cursor — a faint sign of life without
  // pulling focus from the headline. Springs smooth the motion; we never attach
  // the listener when the user prefers reduced motion.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 60, damping: 18 });
  const y = useSpring(py, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      px.set(nx * 22);
      py.set(ny * 22);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py]);

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* The real pendant: follows the cursor faintly (outer), floats (inner) */}
      <motion.div
        aria-hidden="true"
        style={{ x, y }}
        className="pointer-events-none absolute inset-0 grid translate-y-[14%] place-items-center sm:translate-y-[10%]"
      >
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <Pendant
            size={680}
            rings={5}
            className="scale-[0.6] opacity-90 sm:scale-[0.85] lg:scale-100"
          />
        </motion.div>
      </motion.div>
      {/* Vignette so type stays legible over the glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, transparent 22%, rgba(10,10,11,0.78) 62%, var(--color-base) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-7 rounded-full border border-hairline bg-panel/50 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted backdrop-blur"
        >
          The always-on AI pendant
        </motion.span>

        <motion.h1
          variants={container}
          initial="hidden"
          animate="show"
          className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl md:text-8xl"
        >
          {HEADLINE.map((w, i) => (
            <span key={i} className="mx-2 inline-block overflow-hidden align-bottom">
              <motion.span
                variants={word}
                className={`inline-block ${
                  i >= 2
                    ? "bg-gradient-to-b from-glow to-gold bg-clip-text text-transparent"
                    : "text-fg"
                }`}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-8 max-w-xl text-balance text-lg text-muted"
        >
          A wearable pendant with a microphone, camera, and speaker. It listens,
          sees, and thinks — so you can stay present.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.1 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="#reserve"
            className="rounded-full bg-gold px-8 py-3.5 text-sm font-medium text-base transition-transform hover:scale-[1.03] active:scale-95"
            style={{ boxShadow: "0 0 32px rgba(232,184,75,0.4)" }}
          >
            Reserve yours
          </a>
          <a
            href="#showcase"
            className="rounded-full border border-hairline px-8 py-3.5 text-sm font-medium text-fg transition-colors hover:border-gold/50 hover:text-glow"
          >
            See how it works
          </a>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <span className="flex h-10 w-6 items-start justify-center rounded-full border border-hairline p-1.5">
          <motion.span
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="block h-1.5 w-1.5 rounded-full bg-gold"
          />
        </span>
      </motion.div>
    </section>
  );
}
