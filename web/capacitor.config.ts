import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stockbriefing.app",
  appName: "공시브리핑",
  webDir: "out",
  backgroundColor: "#ffffff",
  android: {
    allowMixedContent: false,
    buildOptions: {
      releaseType: "APK",
    },
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
