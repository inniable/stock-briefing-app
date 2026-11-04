"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip web ServiceWorker inside native Android APK WebView
    if (Capacitor.isNativePlatform()) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore service worker registration errors in local dev
      });
    }
  }, []);

  return null;
}
