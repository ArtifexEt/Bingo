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
      includeAssets: [
        "icon.svg",
        "icon-*.png",
        "apple-touch-icon.png",
        "favicon-32.png",
        "fonts/*",
      ],
      manifest: {
        name: "Bingo — muzyczne bingo",
        short_name: "Bingo",
        id: base,
        start_url: base,
        scope: base,
        description:
          "Twoja muzyczna plansza Bingo. Graj na telefonie, zapisuj odpowiedzi i świętuj Bingo, także offline.",
        lang: "pl",
        dir: "ltr",
        categories: ["games", "music"],
        theme_color: "#123f36",
        background_color: "#f6f5f1",
        display: "standalone",
        shortcuts: [
          {
            name: "Na dobry początek",
            short_name: "Początkujący",
            url: `${base}?level=beginner`,
            icons: [
              { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            ],
          },
          {
            name: "Dla znawców",
            short_name: "Znawcy",
            url: `${base}?level=expert`,
            icons: [
              { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            ],
          },
        ],
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
        // Let players finish an answer before explicitly applying a new version.
        skipWaiting: false,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ttf,json}"],
        maximumFileSizeToCacheInBytes: 4000000,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
});
