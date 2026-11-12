import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.BASE_PATH || "/Bingo/";
export default defineConfig({
  base,
  test: { exclude: [...configDefaults.exclude, "**/._*"] },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-*.png", "fonts/*"],
      manifest: {
        name: "Bingo",
        short_name: "Bingo",
        id: base,
        start_url: base,
        scope: base,
        description:
          "Muzyczne Bingo. Losowanie kategorii i plansze PDF do druku.",
        lang: "pl",
        dir: "ltr",
        categories: ["games", "music"],
        theme_color: "#123f36",
        background_color: "#f6f5f1",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cacheId: "music-bingo",
        globPatterns: ["**/*.{js,css,html,svg,png,ttf,json}"],
        maximumFileSizeToCacheInBytes: 4000000,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
});
