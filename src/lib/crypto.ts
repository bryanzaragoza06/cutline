import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

// TikTok access/refresh tokens are encrypted at rest (AES-256-GCM) so a copy of
// the database file alone is not enough to use them.
//
// Key: TOKEN_ENCRYPTION_KEY (32 random bytes, base64) if set, otherwise derived
// from AUTH_SECRET. If the key changes, stored tokens can't be read and each
// TikTok account has to be reconnected (nothing else is lost).

const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
    return buf;
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "cutline", "tiktok-token-encryption", 32));
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, body]).toString("base64");
}

/** Decrypts a stored value. Values saved before encryption existed (no prefix) are returned as-is. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const data = Buffer.from(stored.slice(PREFIX.length), "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Couldn't read this account's saved TikTok access — reconnect it from the Accounts page.");
  }
}
