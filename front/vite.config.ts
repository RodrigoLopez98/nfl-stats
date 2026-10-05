import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["nfl-logo.png"],
      manifest: {
        id: "/",
        name: "NFL Stats",
        short_name: "NFL Stats",
        description: "Marcadores, cartelera y rankings NFL",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0b0e14",
        background_color: "#0b0e14",
        icons: [
          {
            src: "/nfl-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/nfl-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/nfl-logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/a\.espncdn\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "espn-logos",
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
