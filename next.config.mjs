import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function buildUploadRemotePatterns() {
  const patterns = [
    {
      protocol: "http",
      hostname: "localhost",
      port: "3000",
      pathname: "/uploads/**",
    },
    {
      protocol: "http",
      hostname: "127.0.0.1",
      port: "3000",
      pathname: "/uploads/**",
    },
  ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const { protocol, hostname, port } = new URL(appUrl);
      if (hostname && !["localhost", "127.0.0.1"].includes(hostname)) {
        patterns.push({
          protocol: protocol.replace(":", ""),
          hostname,
          ...(port ? { port } : {}),
          pathname: "/uploads/**",
        });
      }
    } catch {
      // ignore invalid NEXT_PUBLIC_APP_URL
    }
  }

  return patterns;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: [
    "obtect-jeffery-congruent.ngrok-free.dev",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: [
    "bullmq",
    "ioredis",
    "firebase-admin",
    "mqtt",
    "@google-cloud/firestore",
    "@google-cloud/storage",
  ],
  transpilePackages: ["@mui/material-nextjs"],
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: buildUploadRemotePatterns(),
  },
};

export default withNextIntl(nextConfig);
