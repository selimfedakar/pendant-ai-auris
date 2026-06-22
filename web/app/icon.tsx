import { ImageResponse } from "next/og";

// Favicon generated from the orb identity: a glowing gold core on the warm-dark
// base. Browsers prefer this PNG over the legacy favicon.ico fallback.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 16,
            background:
              "radial-gradient(circle at 38% 32%, #ffd98a 0%, #e8b84b 55%, #b9852a 100%)",
            boxShadow: "0 0 7px 2px rgba(232,184,75,0.8)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
