import type { NextConfig } from "next";

// картинки из public: браузер держит их сутки и не переспрашивает CDN на каждом заходе
// (по умолчанию Vercel велит перепроверять каждый раз — это лишние запросы в лимит CDN Requests).
// Подменил картинку — у тех, кто уже заходил, она обновится в течение суток или после нового деплоя с другим именем
const STATIC_IMAGE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:all*(jpg|jpeg|png|webp|gif|svg|ico)",
        headers: [{ key: "Cache-Control", value: STATIC_IMAGE_CACHE }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
