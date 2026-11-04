const isApkBuild = process.env.BUILD_TARGET === "apk";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isApkBuild ? { output: "export", trailingSlash: true } : {}),
  // Rule #1 (No Image Scraping): Strictly block external image hosts (`remotePatterns: []`)
  images: {
    unoptimized: isApkBuild,
    remotePatterns: [],
  },
};

export default nextConfig;
