import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Video uploads go through the proxy layer, which buffers request bodies and
    // truncates them at 10MB by default — big files then fail to parse. Keep this
    // above MAX_UPLOAD_MB in src/lib/uploadLimits.ts.
    proxyClientMaxBodySize: "250mb",
  },
};

export default nextConfig;
