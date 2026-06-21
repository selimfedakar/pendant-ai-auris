"use client";

import SoundRings from "@/components/SoundRings";

/**
 * The Auris pendant rendered in code: a thin necklace cord, a bail, and a gold
 * pendant body whose face carries the concentric sound-ring engraving — the same
 * radiating motif that signals "always listening." Placeholder-grade jewelry that
 * can be swapped for a photoreal render later, but already feels like a product.
 */
export default function Pendant({
  size = 460,
  rings = 5,
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
      aria-label="Auris pendant"
      role="img"
    >
      {/* Radiating sound-rings behind the jewelry */}
      <div className="absolute inset-0 grid place-items-center">
        <SoundRings size={size} rings={rings} />
      </div>

      <svg
        viewBox="0 0 400 520"
        width={size}
        height={size}
        className="relative z-10"
        fill="none"
      >
        <defs>
          <radialGradient id="orbBody" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff4d6" />
            <stop offset="35%" stopColor="#ffd98a" />
            <stop offset="70%" stopColor="#e8b84b" />
            <stop offset="100%" stopColor="#9a6a1e" />
          </radialGradient>
          <radialGradient id="orbInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7e0" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#e8b84b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#e8b84b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cord" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8b84b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#e8b84b" stopOpacity="0.6" />
          </linearGradient>
          <radialGradient id="rim" cx="50%" cy="42%" r="58%">
            <stop offset="78%" stopColor="#ffe9a8" stopOpacity="0" />
            <stop offset="92%" stopColor="#ffe9a8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7a5012" stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Necklace cord — two strands meeting at the bail */}
        <path
          d="M2 8 C 90 120, 150 150, 196 188"
          stroke="url(#cord)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M398 8 C 310 120, 250 150, 204 188"
          stroke="url(#cord)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Bail (the loop that holds the pendant) */}
        <ellipse
          cx="200"
          cy="196"
          rx="13"
          ry="18"
          stroke="#e8b84b"
          strokeWidth="4"
          opacity="0.85"
        />

        {/* Pendant body */}
        <circle cx="200" cy="318" r="98" fill="url(#orbBody)" />
        <circle cx="200" cy="318" r="98" fill="url(#rim)" />

        {/* Engraved concentric grooves — the sound-ring signature, on the metal */}
        {[34, 52, 70, 86].map((r) => (
          <circle
            key={r}
            cx="200"
            cy="318"
            r={r}
            stroke="#7a5012"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
        ))}

        {/* Glowing core + inner bloom */}
        <circle cx="200" cy="318" r="120" fill="url(#orbInner)" />
        <circle
          cx="200"
          cy="318"
          r="16"
          fill="#fff7e0"
          style={{ filter: "drop-shadow(0 0 14px rgba(255,217,138,0.9))" }}
        />

        {/* Specular highlight */}
        <ellipse
          cx="168"
          cy="282"
          rx="34"
          ry="20"
          fill="#fffaf0"
          opacity="0.35"
          transform="rotate(-28 168 282)"
        />
      </svg>
    </div>
  );
}
