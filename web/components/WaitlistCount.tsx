"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { reserveCount } from "@/lib/reserve";

/**
 * Live social-proof line under the reserve form. Pulls the real waitlist size
 * from the backend and only shows a number once it is meaningful — below the
 * threshold it nudges with "be among the first" instead of a tiny, weak count.
 * Fails silent (renders nothing) so it can never break the form.
 */
const THRESHOLD = 25;

export default function WaitlistCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    reserveCount().then((n) => {
      if (alive) setCount(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (count === null) return null;

  const label =
    count >= THRESHOLD
      ? `Join ${count.toLocaleString()}+ already on the waitlist`
      : "Be among the first to reserve yours";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mt-5 flex items-center justify-center gap-2.5 text-xs text-muted"
    >
      <span className="flex -space-x-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-4 w-4 rounded-full border border-base"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #ffd98a 0%, #e8b84b 50%, #b9852a 100%)",
            }}
          />
        ))}
      </span>
      <span>{label}</span>
    </motion.div>
  );
}
