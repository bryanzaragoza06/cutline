// Client-safe upload limits. Must stay below proxyClientMaxBodySize in next.config.ts.
export const MAX_UPLOAD_MB = 200;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
