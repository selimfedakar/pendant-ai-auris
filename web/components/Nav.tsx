"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";

const LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Specs", href: "/specs" },
  { label: "About", href: "/about" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const solid = scrolled || open || pathname !== "/";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? "border-b border-hairline bg-base/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="block h-2.5 w-2.5 rounded-full bg-gold"
            style={{ boxShadow: "0 0 12px 2px rgba(232,184,75,0.7)" }}
          />
          <span className="font-display text-lg font-semibold tracking-tight text-fg">
            Auris
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors hover:text-fg ${
                  active ? "text-fg" : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/#reserve"
            className="hidden rounded-full bg-gold px-5 py-2 text-sm font-medium text-base transition-transform hover:scale-[1.03] active:scale-95 sm:block"
            style={{ boxShadow: "0 0 24px rgba(232,184,75,0.35)" }}
          >
            Reserve
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-fg md:hidden"
          >
            <span className="relative flex h-3 w-4 flex-col justify-between">
              <span
                className={`block h-[1.5px] w-full bg-current transition-transform duration-300 ${
                  open ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[1.5px] w-full bg-current transition-opacity duration-300 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-[1.5px] w-full bg-current transition-transform duration-300 ${
                  open ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Scroll progress — a thin gold thread along the bottom edge */}
      <motion.div
        className="absolute bottom-0 left-0 h-px origin-left bg-gold/70"
        style={{ scaleX: progress, width: "100%" }}
        aria-hidden="true"
      />

      {/* Mobile dropdown */}
      <div
        className={`overflow-hidden border-t border-hairline bg-base/95 backdrop-blur-xl transition-[max-height] duration-400 md:hidden ${
          open ? "max-h-80" : "max-h-0 border-transparent"
        }`}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-2 py-3 text-base text-fg transition-colors hover:bg-panel"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#reserve"
            className="mt-2 rounded-full bg-gold px-5 py-3 text-center text-sm font-medium text-base"
            style={{ boxShadow: "0 0 24px rgba(232,184,75,0.35)" }}
          >
            Reserve
          </Link>
        </div>
      </div>
    </header>
  );
}
