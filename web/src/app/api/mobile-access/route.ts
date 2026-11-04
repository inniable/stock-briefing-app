import os from "os";
import fs from "fs";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

function detectLanIp(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const list = nets[name] ?? [];
    for (const net of list) {
      if (net.family === "IPv4" && !net.internal) {
        if (
          net.address.startsWith("192.168.") ||
          net.address.startsWith("10.") ||
          net.address.startsWith("172.")
        ) {
          return net.address;
        }
      }
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const customUrl = request.nextUrl.searchParams.get("url")?.trim() || "";
  const lanIp = detectLanIp();
  const lanUrl = lanIp ? `http://${lanIp}:3000` : "http://localhost:3000";

  // Check if an active public HTTPS tunnel URL file exists in workspace
  let tunnelUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  try {
    const tunnelFile = path.join(process.cwd(), ".mobile-tunnel-url");
    if (fs.existsSync(tunnelFile)) {
      const content = fs.readFileSync(tunnelFile, "utf8").trim();
      if (content.startsWith("https://")) {
        tunnelUrl = content;
      }
    }
  } catch {
    // Ignore file read errors
  }

  const primaryUrl = customUrl || tunnelUrl || lanUrl;

  const svgMarkup = await QRCode.toString(primaryUrl, {
    type: "svg",
    margin: 1,
    width: 200,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return NextResponse.json({
    primaryUrl,
    lanUrl,
    tunnelUrl: tunnelUrl || null,
    qrSvg: svgMarkup,
  });
}
