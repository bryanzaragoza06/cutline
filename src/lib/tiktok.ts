import { randomBytes } from "crypto";
import { open, stat } from "fs/promises";
import type { Account } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { planChunks } from "@/lib/chunkPlan";
import { TITLE_MAX } from "@/lib/postSettings";
import { videoContentType } from "@/lib/storage";

// TIKTOK_API_BASE only exists so automated tests can point at a fake TikTok. It is ignored in production.
const API_BASE =
  process.env.NODE_ENV !== "production" && process.env.TIKTOK_API_BASE ? process.env.TIKTOK_API_BASE : "https://open.tiktokapis.com";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = `${API_BASE}/v2/oauth/token/`;
const REVOKE_URL = `${API_BASE}/v2/oauth/revoke/`;
const USER_INFO_URL = `${API_BASE}/v2/user/info/`;
const CREATOR_INFO_URL = `${API_BASE}/v2/post/publish/creator_info/query/`;
const PUBLISH_INIT_URL = `${API_BASE}/v2/post/publish/video/init/`;
const PUBLISH_STATUS_URL = `${API_BASE}/v2/post/publish/status/fetch/`;

// Only what the app actually uses: login + Direct Post. (video.upload is for
// inbox/draft uploads, which we don't do — TikTok rejects unused scopes.)
const SCOPES = ["user.info.basic", "video.publish"];

function env(name: "TIKTOK_CLIENT_KEY" | "TIKTOK_CLIENT_SECRET" | "TIKTOK_REDIRECT_URI"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function generateState(): string {
  return randomBytes(16).toString("hex");
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: env("TIKTOK_CLIENT_KEY"),
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: env("TIKTOK_REDIRECT_URI"),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  open_id: string;
  scope: string;
  token_type?: string;
};

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: env("TIKTOK_CLIENT_KEY"),
      client_secret: env("TIKTOK_CLIENT_SECRET"),
      ...body,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`TikTok token request failed: ${JSON.stringify(data)}`);
  }
  return data as TokenResponse;
}

export function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  return postToken({ code, grant_type: "authorization_code", redirect_uri: env("TIKTOK_REDIRECT_URI") });
}

export function refreshTikTokToken(refreshToken: string): Promise<TokenResponse> {
  return postToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Tells TikTok to invalidate a token. Best effort: failures are ignored because we delete our copy regardless. */
export async function revokeAccess(account: Pick<Account, "accessToken">): Promise<void> {
  if (!account.accessToken) return;
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({
        client_key: env("TIKTOK_CLIENT_KEY"),
        client_secret: env("TIKTOK_CLIENT_SECRET"),
        token: decryptSecret(account.accessToken),
      }),
    });
  } catch (err) {
    console.error("[tiktok] token revoke failed (continuing)", err instanceof Error ? err.message : err);
  }
}

export async function fetchUserInfo(accessToken: string): Promise<{ open_id: string; display_name: string; avatar_url?: string }> {
  const res = await fetch(`${USER_INFO_URL}?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (data?.error?.code !== "ok") {
    throw new Error(`TikTok user info request failed: ${JSON.stringify(data?.error ?? data)}`);
  }
  return data.data.user;
}

/** The token fields to store for an account: always encrypted. */
export function tokenColumns(token: TokenResponse) {
  return {
    accessToken: encryptSecret(token.access_token),
    refreshToken: encryptSecret(token.refresh_token),
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    scope: token.scope,
  };
}

/** Returns a usable access token, refreshing (and persisting) it if it expires within 60s. */
export async function getValidAccessToken(
  account: Pick<Account, "id" | "accessToken" | "refreshToken" | "tokenExpiresAt">,
): Promise<string> {
  if (!account.accessToken || !account.refreshToken) {
    throw new Error("This account has no TikTok access token — reconnect it.");
  }
  const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt - Date.now() > 60_000) return decryptSecret(account.accessToken);

  const token = await refreshTikTokToken(decryptSecret(account.refreshToken));
  await prisma.account.update({ where: { id: account.id }, data: tokenColumns(token) });
  return token.access_token;
}

export type CreatorInfo = {
  creator_nickname: string;
  creator_username: string;
  creator_avatar_url: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

async function tiktokPost<T>(url: string, accessToken: string, body: unknown, what: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (data?.error?.code !== "ok") {
    throw new Error(`TikTok ${what} failed: ${JSON.stringify(data?.error ?? data)}`);
  }
  return data.data as T;
}

export function queryCreatorInfo(accessToken: string): Promise<CreatorInfo> {
  return tiktokPost<CreatorInfo>(CREATOR_INFO_URL, accessToken, {}, "creator info query");
}

export type PublishOptions = {
  accessToken: string;
  videoPath: string;
  durationSec: number;
  title: string;
  // Everything below must come from an explicit user choice — TikTok's Content
  // Sharing Guidelines forbid defaulting privacy or interaction settings.
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandOrganicToggle: boolean;
  brandContentToggle: boolean;
  // Automated posts only (Phase 2): if the requested audience isn't offered
  // (e.g. Public before TikTok's audit), post as Only me instead of failing.
  fallbackToSelfOnly?: boolean;
};

/** Direct Post of a local video via FILE_UPLOAD. Returns once TikTok has all the bytes. */
export async function publishVideoToTikTok(opts: PublishOptions): Promise<{ publishId: string; privacyLevel: string }> {
  const creator = await queryCreatorInfo(opts.accessToken);
  const options = creator.privacy_level_options ?? [];

  let privacyLevel = opts.privacyLevel;
  if (!privacyLevel) throw new Error("No audience was chosen for this post.");
  if (!options.includes(privacyLevel) && opts.fallbackToSelfOnly && options.includes("SELF_ONLY")) {
    privacyLevel = "SELF_ONLY";
  }
  if (!options.includes(privacyLevel)) {
    throw new Error(`TikTok no longer offers "${privacyLevel}" for this account (available: ${options.join(", ") || "none"}). Update the post settings.`);
  }
  if (opts.brandContentToggle && privacyLevel === "SELF_ONLY") {
    throw new Error("Branded content can't be posted privately");
  }
  if (opts.durationSec > creator.max_video_post_duration_sec) {
    throw new Error(`This account can only post videos up to ${creator.max_video_post_duration_sec}s (this one is ${Math.ceil(opts.durationSec)}s)`);
  }

  const postInfo = {
    title: opts.title.slice(0, TITLE_MAX),
    privacy_level: privacyLevel,
    // Never enable an interaction the creator has turned off in TikTok.
    disable_comment: !opts.allowComment || creator.comment_disabled,
    disable_duet: !opts.allowDuet || creator.duet_disabled,
    disable_stitch: !opts.allowStitch || creator.stitch_disabled,
    brand_organic_toggle: opts.brandOrganicToggle,
    brand_content_toggle: opts.brandContentToggle,
  };

  const { size: videoSize } = await stat(opts.videoPath);
  const { chunkSize, totalChunks } = planChunks(videoSize);
  const init = await tiktokPost<{ publish_id: string; upload_url: string }>(
    PUBLISH_INIT_URL,
    opts.accessToken,
    {
      post_info: postInfo,
      source_info: { source: "FILE_UPLOAD", video_size: videoSize, chunk_size: chunkSize, total_chunk_count: totalChunks },
    },
    "publish init",
  );

  const contentType = videoContentType(opts.videoPath);
  const handle = await open(opts.videoPath, "r");
  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = i === totalChunks - 1 ? videoSize - 1 : start + chunkSize - 1;
      const length = end - start + 1;
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, start);
      if (bytesRead !== length) throw new Error("Couldn't read the video file back from storage");

      const upload = await fetch(init.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(length),
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        },
        body: new Uint8Array(buffer),
      });
      if (!upload.ok) {
        const text = await upload.text().catch(() => "");
        throw new Error(`TikTok video upload failed on part ${i + 1} of ${totalChunks} (HTTP ${upload.status}): ${text.slice(0, 300)}`);
      }
    }
  } finally {
    await handle.close();
  }

  return { publishId: init.publish_id, privacyLevel };
}

export function checkPublishStatus(accessToken: string, publishId: string): Promise<{ status: string; fail_reason?: string }> {
  return tiktokPost(PUBLISH_STATUS_URL, accessToken, { publish_id: publishId }, "publish status check");
}
