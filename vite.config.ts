import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

import pkg from './package.json';

const appVersion = pkg.version;
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.COMMIT_REF || Date.now().toString();

const appVersionPlugin = () => ({
  name: "app-version-file",
  closeBundle() {
    writeFileSync("dist/app-version.json", `${JSON.stringify({ version: appVersion, buildId })}\n`);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    appVersionPlugin(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.png", "pwa-192x192.png", "pwa-256x256.png", "pwa-384x384.png", "pwa-512x512.png", "pwa-maskable-512.png"],
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "EmpatiQ",
        short_name: "EmpatiQ",
        description: "Sistema integral de gestión de talento humano",
        theme_color: "#2B3A5C",
        background_color: "#F3F4F7",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-512x512.png?v=2",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-192x192.png?v=2",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-256x256.png?v=2",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "/pwa-384x384.png?v=2",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png?v=2",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512.png?v=2",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId),
  },
}));
