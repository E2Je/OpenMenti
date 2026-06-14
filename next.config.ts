import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent folder would otherwise
  // make Next infer the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
