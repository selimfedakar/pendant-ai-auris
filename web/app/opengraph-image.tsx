import { ImageResponse } from "next/og";

// Branded social share card — dark base with the signature gold sound-ring orb,
// the wordmark, and the tagline. Generated at build time and cached.
export const alt = "Auris — Always listening. Quietly yours.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 38%, #1a160b 0%, #0a0a0b 60%)",
          position: "relative",
        }}
      >
        {/* Concentric gold sound-rings */}
        {[420, 320, 220].map((d, i) => (
          <div
            key={d}
            style={{
              position: "absolute",
              top: 250 - d / 2,
              width: d,
              height: d,
              borderRadius: d,
              border: `2px solid rgba(232,184,75,${0.12 + i * 0.1})`,
            }}
          />
        ))}
        {/* Glowing core */}
        <div
          style={{
            position: "absolute",
            top: 250 - 56,
            width: 112,
            height: 112,
            borderRadius: 112,
            background:
              "radial-gradient(circle at 38% 32%, #ffd98a 0%, #e8b84b 55%, #b9852a 100%)",
            boxShadow: "0 0 120px 40px rgba(232,184,75,0.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 96,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: -2,
              color: "#f5f5f0",
            }}
          >
            Auris
          </div>
          <div style={{ fontSize: 30, color: "#9a9a92", marginTop: 8 }}>
            Always listening. Quietly yours.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
