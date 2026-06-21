"use client";

import { motion } from "framer-motion";

/**
 * Generic scroll reveal: fades and lifts its children into view once. Used across
 * the sub-pages so server components can stay server components while still getting
 * the site's signature ease-out entrance. Respects reduced motion via Framer's
 * built-in handling.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
