import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("token encryption", () => {
  const saved = { auth: process.env.AUTH_SECRET, key: process.env.TOKEN_ENCRYPTION_KEY };
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-one";
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });
  afterEach(() => {
    if (saved.auth === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = saved.auth;
    if (saved.key === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = saved.key;
  });

  it("round-trips a token and never stores it in plain text", () => {
    const stored = encryptSecret("act.example-access-token");
    assert.ok(stored.startsWith("enc:v1:"));
    assert.ok(!stored.includes("act.example"));
    assert.equal(decryptSecret(stored), "act.example-access-token");
  });

  it("uses a fresh random IV each time", () => {
    assert.notEqual(encryptSecret("same"), encryptSecret("same"));
  });

  it("passes through values saved before encryption existed", () => {
    assert.equal(decryptSecret("plain-old-token"), "plain-old-token");
  });

  it("refuses tampered data", () => {
    const stored = encryptSecret("abc");
    const flipped = stored.slice(0, -2) + (stored.endsWith("A") ? "B" : "A") + stored.slice(-1);
    assert.throws(() => decryptSecret(flipped), /reconnect/i);
  });

  it("can't be read with a different key", () => {
    const stored = encryptSecret("abc");
    process.env.AUTH_SECRET = "test-secret-two";
    assert.throws(() => decryptSecret(stored), /reconnect/i);
  });

  it("uses TOKEN_ENCRYPTION_KEY when provided and checks its length", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    assert.equal(decryptSecret(encryptSecret("xyz")), "xyz");
    process.env.TOKEN_ENCRYPTION_KEY = "too-short";
    assert.throws(() => encryptSecret("xyz"), /32 bytes/);
  });
});
