"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import Pendant from "@/components/Pendant";

/** The real OrbState machine from the app, told as a scroll story. */
const STATES = [
  {
    key: "idle",
    label: "Idle",
    title: "Resting against you.",
    body: "No lights, no noise. Auris waits — a quiet pendant until you need it.",
    color: "#8a7a4a",
  },
  {
    key: "listening",
    label: "Listening",
    title: "It hears you start.",
    body: "Speak naturally. On-device voice detection knows when you begin and when you stop.",
    color: "#e8b84b",
  },
  {
    key: "thinking",
    label: "Thinking",
    title: "The cloud does the lifting.",
    body: "Speech becomes text, text becomes understanding — with memory of your last conversations.",
    color: "#ffd98a",
  },
  {
    key: "speaking",
    label: "Speaking",
    title: "It answers out loud.",
    body: "A voice reply, todos extracted, events captured. All before you've put your phone away.",
    color: "#fff0c2",
  },
];

export default function ProductShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          const idx = Math.min(
            STATES.length - 1,
            Math.floor(self.progress * STATES.length)
          );
          setActive(idx);
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const current = STATES[active];

  return (
    <section id="showcase" ref={sectionRef} className="relative min-h-screen">
      <div className="flex min-h-screen items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          {/* Orb — color shifts with state */}
          <div className="relative flex justify-center">
            <div
              className="origin-center scale-[0.72] transition-all duration-700 sm:scale-90 lg:scale-100"
              style={{ filter: `drop-shadow(0 0 60px ${current.color}66)` }}
            >
              <Pendant size={420} rings={active === 0 ? 2 : 5} />
            </div>
          </div>

          {/* State narration */}
          <div className="relative">
            <div className="mb-6 flex gap-2">
              {STATES.map((s, i) => (
                <span
                  key={s.key}
                  className="h-1 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background:
                      i <= active ? "var(--color-gold)" : "var(--color-hairline)",
                  }}
                />
              ))}
            </div>

            <span className="font-display text-sm uppercase tracking-[0.25em] text-gold">
              {current.label}
            </span>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
              {current.title}
            </h2>
            <p className="mt-5 max-w-md text-lg text-muted">{current.body}</p>

            <p className="mt-10 text-xs uppercase tracking-[0.2em] text-muted/60">
              Scroll to follow the pendant
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
