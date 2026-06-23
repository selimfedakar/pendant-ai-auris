"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { reserve } from "@/lib/reserve";
import WaitlistCount from "@/components/WaitlistCount";

type Status = "idle" | "loading" | "success" | "error";

/**
 * The waitlist email capture, extracted so it can be reused anywhere a reserve
 * call-to-action is needed (the landing CTA, the specs page, etc.). Posts to the
 * public /reserve endpoint on the Auris Worker via lib/reserve.
 */
export default function ReserveForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [alreadyReserved, setAlreadyReserved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const { alreadyReserved } = await reserve(email);
      setAlreadyReserved(alreadyReserved);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-md rounded-full border border-gold/40 bg-panel/60 px-6 py-4 text-center text-sm text-glow"
      >
        {alreadyReserved
          ? "You're already on the list — we'll be in touch when Auris ships."
          : "You're on the list. We'll be in touch when Auris ships."}
      </motion.div>
    );
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-md"}>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={handleSubmit}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          disabled={status === "loading"}
          className="flex-1 rounded-full border border-hairline bg-panel/60 px-5 py-3.5 text-sm text-fg placeholder:text-muted/60 outline-none transition-colors focus:border-gold/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-gold px-7 py-3.5 text-sm font-medium text-base transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-70"
          style={{ boxShadow: "0 0 28px rgba(232,184,75,0.4)" }}
        >
          {status === "loading" ? "Reserving…" : "Reserve"}
        </button>
      </form>
      {status === "error" ? (
        <p className="mt-4 text-center text-xs text-red-400">{error}</p>
      ) : (
        <p className="mt-4 text-center text-xs text-muted/60">
          No charge today. One email when it ships — nothing else.
        </p>
      )}
      {!compact && <WaitlistCount />}
    </div>
  );
}
