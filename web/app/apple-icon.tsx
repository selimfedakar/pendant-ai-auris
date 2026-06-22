import { ImageResponse } from "next/og";

// Home-screen icon (iOS) from the orb identity, at the 180×180 Apple size.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 42%, #1a160b 0%, #0a0a0b 70%)",
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 92,
            background:
              "radial-gradient(circle at 38% 32%, #ffd98a 0%, #e8b84b 55%, #b9852a 100%)",
            boxShadow: "0 0 48px 14px rgba(232,184,75,0.6)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
