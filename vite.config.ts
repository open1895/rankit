import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          // Heavy, leaf-only libraries that don't import React at module init
          // can safely live in their own chunk.
          if (id.includes("html2canvas") || id.includes("jspdf")) return "canvas-pdf";
          if (id.includes("recharts") || id.includes("d3-")) return "recharts";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "date-fns";
          // Everything else (React + every library that touches React at
          // module init) goes into a single vendor chunk to guarantee
          // initialization order.
          return "react-vendor";
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // SW is intentionally disabled to avoid stale Workbox caches serving the
      // loading fallback HTML. We keep the plugin registered for the manifest
      // metadata but skip auto-registration.
      registerType: "autoUpdate",
      injectRegister: false,
      selfDestroying: true,
      manifest: false, // using public/manifest.json
      workbox: {
        // HTML은 캐시하지 않고 매번 네트워크 우선으로 가져와 즉시 업데이트 반영
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp}"],
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/~oauth/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // HTML 문서는 항상 네트워크 우선 (1주 캐시 폴백)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/jcaajxwdeqngihupjaaa\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query"],
  },
}));
