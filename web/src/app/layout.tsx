import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "US 전 종목 공시·금융뉴스 AI 브리핑",
  description:
    "미국 SEC EDGAR 전체 공시(8-K·Form 4), 기업 공식 보도자료, 글로벌 금융 뉴스 실시간 AI 번역·3줄 요약 모바일 앱",
  applicationName: "공시·뉴스 브리핑",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "공시브리핑",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/api/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-sky-500/30 dark:selection:text-sky-100 transition-colors">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
