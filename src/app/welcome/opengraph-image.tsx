import { ImageResponse } from "next/og"

export const alt = "FitDesk — Personal training, simplified."

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0f1e",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#ffffff",
            lineHeight: 1.05,
          }}
        >
          FitDesk
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 36,
            fontWeight: 600,
            color: "#00e096",
            letterSpacing: -0.5,
          }}
        >
          Personal training, simplified.
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
