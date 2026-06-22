"use client";

import { motion } from "framer-motion";
import SoundRings from "@/components/SoundRings";
import ReserveForm from "@/components/ReserveForm";

/**
 * The closing call-to-action on the landing page: the brand line, the price, and
 * the waitlist form. The shared site footer now lives in the root layout, so this
 * section is purely the reserve moment.
 */
export default function ReserveCta() {
  return (
    <section id="reserve" className="relative overflow-hidden px-6 py-40 text-center">
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <SoundRings
          size={680}
          rings={4}
          className="scale-[0.55] opacity-50 sm:scale-[0.8] lg:scale-100"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 25%, var(--color-base) 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9 }}
        className="relative z-10 mx-auto max-w-2xl"
      >
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-6xl">
          A software company.
          <br />
          <span className="bg-gradient-to-b from-glow to-gold bg-clip-text text-transparent">
            It happens to make jewelry.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-lg text-muted">
          Reserve your Auris pendant. $199 device, then $14.99 / month for the
          intelligence behind it.
        </p>

        <div className="mt-10">
          <ReserveForm />
        </div>
      </motion.div>
    </section>
  );
}
