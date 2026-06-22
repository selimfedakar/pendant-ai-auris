"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * A light cross-route fade so navigation feels like one continuous app rather
 * than full page loads. Keyed by pathname: each new route mounts a fresh node
 * that fades up from a few pixels. Deliberately subtle (≈350ms) and skipped by
 * the global reduced-motion guard in globals.css.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
