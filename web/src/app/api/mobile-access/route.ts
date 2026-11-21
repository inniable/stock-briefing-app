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

const MAX_QR_URL_LENGTH = 512;

function isPrivateLanHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) return true;
  const match172 = hostname.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }
  return false;
}

function isAllowedQrUrl(rawUrl: string, allowedHosts: Set<string>): boolean {
  if (!rawUrl || rawUrl.length > MAX_QR_URL_LENGTH) return false;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (isPrivateLanHost(host)) return true;
  if (allowedHosts.has(host)) return true;
  if (
    host === "github.com" &&
    parsed.pathname.startsWith("/inniable/stock-briefing-app/")
  ) {
    return true;
  }
  return false;
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

  const allowedHosts = new Set<string>();
  const requestHost = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname
  )
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (requestHost) allowedHosts.add(requestHost);
  for (const envUrl of [
    tunnelUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL,
  ]) {
    if (!envUrl) continue;
    try {
      allowedHosts.add(new URL(envUrl).hostname.toLowerCase());
    } catch {
      // Ignore malformed env URL
    }
  }

  if (customUrl && !isAllowedQrUrl(customUrl, allowedHosts)) {
    return NextResponse.json(
      { error: "Unsupported or untrusted QR URL." },
      { status: 400 }
    );
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
