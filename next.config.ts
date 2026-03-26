import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;
