"use client";

/**
 * The Auris signature motif: a warm gold core radiating concentric sound-rings.
 * This is the in-app orb identity, reused in the hero, dividers, and footer.
 *
 * Pure CSS (the `ring-pulse` / `breathe` keyframes live in globals.css), so it
 * costs nothing on the main thread and freezes gracefully under reduced motion.
 */
export default function SoundRings({
  size = 320,
  rings = 4,
  className = "",
}: {
  size?: number;
  rings?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer soft halo */}
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle, rgba(232,184,75,0.18) 0%, rgba(232,184,75,0.04) 40%, transparent 70%)",
        }}
      />

      {/* Expanding sound-rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full border"
          style={{
            width: size * 0.42,
            height: size * 0.42,
            borderColor: "rgba(232,184,75,0.45)",
            animation: "var(--animate-ring)",
            animationDelay: `${(i * 4) / rings}s`,
          }}
        />
      ))}

      {/* Breathing gold core */}
      <span
        className="relative rounded-full"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          background:
            "radial-gradient(circle at 35% 30%, #ffd98a 0%, #e8b84b 45%, #b9852a 100%)",
          boxShadow:
            "0 0 40px 8px rgba(232,184,75,0.55), 0 0 120px 30px rgba(232,184,75,0.18)",
          animation: "var(--animate-breathe)",
        }}
      />
    </div>
  );
}
