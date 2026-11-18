"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AccountWithStyles } from "@/lib/types";
import { useFetchJson } from "@/lib/useFetchJson";
import { formatDateTime } from "@/lib/format";
import { APP_NAME } from "@/lib/site";
import { card, primaryButton, secondaryButton } from "@/components/ui";

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  );
}

function AccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Capture the OAuth result banners once, then strip them from the URL.
  const [banner] = useState(() => ({
    connected: searchParams.get("connected"),
    error: searchParams.get("connect_error"),
  }));
  useEffect(() => {
    if (banner.connected || banner.error) router.replace("/accounts");
  }, [banner, router]);

  const { data: accounts, reload } = useFetchJson<AccountWithStyles[]>("/api/accounts");
  const [error, setError] = useState<string | null>(null);

  async function disconnect(account: AccountWithStyles) {
    if (
      !confirm(
        `Disconnect ${account.displayName}? ${APP_NAME} will revoke its access on TikTok, delete the stored tokens, and cancel any posts scheduled for this account.`,
      )
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't disconnect the account");
      return;
    }
    reload();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Connect the TikTok accounts you own or manage. You sign in on TikTok&apos;s own page, so {APP_NAME} never sees your TikTok
          password.
        </p>
      </div>

      {banner.connected && (
        <p className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">TikTok account connected.</p>
      )}
      {banner.error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{banner.error}</p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <section className={`${card} space-y-3 p-5`}>
        <h2 className="font-medium">Connect a TikTok account</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          TikTok will ask you to approve two permissions: <strong>basic profile info</strong> (so we can show which account is connected)
          and <strong>publishing videos</strong> (so {APP_NAME} can post the videos you choose). Nothing is ever posted without you
          choosing to.
        </p>
        {/* A plain link (not next/link): this starts a full-page redirect to TikTok. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/tiktok/start" className={`${primaryButton} inline-block`}>
          Connect with TikTok
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Your connected accounts</h2>
        {accounts === null ? (
          <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className={`${card} p-5 text-sm text-black/50 dark:text-white/50`}>No accounts connected yet.</p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className={`${card} flex flex-wrap items-center gap-4 p-5`}>
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                style={{ backgroundColor: account.avatarColor }}
                aria-hidden
              >
                {account.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{account.displayName}</p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  Connected {formatDateTime(account.connectedAt)} · {account.postedCount} video{account.postedCount === 1 ? "" : "s"} posted
                </p>
                {account.lastError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Last problem: {account.lastError}</p>}
              </div>
              <div className="flex gap-2">
                <Link href="/posts" className={primaryButton}>
                  Post a video
                </Link>
                <button type="button" onClick={() => disconnect(account)} className={secondaryButton}>
                  Disconnect
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
