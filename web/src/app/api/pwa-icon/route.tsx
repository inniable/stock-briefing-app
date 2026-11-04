import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const rawSize = Number(request.nextUrl.searchParams.get("size") || "512");
  const size = rawSize === 192 ? 192 : 512;
  const fontSize = Math.round(size * 0.42);
  const subSize = Math.round(size * 0.13);
  const radius = Math.round(size * 0.22);

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
          background: "#0f172a",
          borderRadius: radius,
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#10b981",
            fontSize,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          US
        </div>
        <div
          style={{
            display: "flex",
            marginTop: Math.round(size * 0.04),
            color: "#cbd5e1",
            fontSize: subSize,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          BRIEF
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
