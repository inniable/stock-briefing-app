import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "US 전 종목 공시·금융뉴스 AI 브리핑",
    short_name: "공시브리핑",
    description:
      "미국 SEC EDGAR 공시(8-K·Form 4), 기업 보도자료, 글로벌 금융 뉴스 실시간 AI 번역·3줄 요약 모바일 앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait",
    categories: ["finance", "news", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "내 관심종목 보기",
        short_name: "관심종목",
        url: "/?tab=watchlist",
      },
      {
        name: "SEC 공시만 보기",
        short_name: "SEC 공시",
        url: "/?tab=sec",
      },
    ],
  };
}
