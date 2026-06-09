/// <reference types="@capacitor/cli" />
// Capacitor configuration for wrapping the Vite build as native iOS/Android apps.
// Run after `npm run build` produced `dist/`:
//
//   pnpm add -D @capacitor/cli
//   pnpm add @capacitor/core @capacitor/ios @capacitor/android
//   npx cap init "Hibi Matcha" com.hibimatcha.pos --web-dir=dist/client
//   npx cap add ios
//   npx cap add android
//   npx cap sync
//   npx cap open ios       # opens Xcode (need a Mac)
//   npx cap open android   # opens Android Studio
//
// The web app must be served from a real URL or bundled. For thermal printer
// support inside Capacitor, install:
//   npm i capacitor-thermal-printer  (or similar plugin matching your hardware)

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hibimatcha.pos",
  appName: "Hibi Matcha",
  webDir: "dist/client",
  // For production, point this at your deployed URL so the in-app webview loads it.
  // For local development:
  //   server: { url: "http://YOUR.LAN.IP:5173", cleartext: true }
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#fdfdfb",
  },
  android: {
    backgroundColor: "#fdfdfb",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#15803d",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#15803d",
    },
  },
};

export default config;
