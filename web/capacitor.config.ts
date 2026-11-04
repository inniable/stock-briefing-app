import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stockbriefing.app",
  appName: "공시브리핑",
  webDir: "out",
  backgroundColor: "#0f172a",
  android: {
    allowMixedContent: false,
    buildOptions: {
      releaseType: "AAB",
    },
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
