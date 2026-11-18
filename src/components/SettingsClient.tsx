"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { card, input, label } from "@/components/ui";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/site";

export default function SettingsClient({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDeleting(false);
      setError(data.error ?? "Couldn't delete your account");
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className={`${card} space-y-2 p-5`}>
        <h2 className="font-medium">Your account</h2>
        <p className="text-sm">
          Signed in as <strong>{email}</strong>
        </p>
        <p className="text-sm text-black/60 dark:text-white/60">
          To revoke {APP_NAME}&apos;s access to a TikTok account, disconnect it on the Accounts page, or remove it in TikTok under
          Settings and privacy → Security → Apps and services. Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section className={`${card} border-red-500/30 p-5 dark:border-red-500/30`}>
        <h2 className="font-medium text-red-700 dark:text-red-300">Delete account</h2>
        <p className="mt-1 text-sm text-black/70 dark:text-white/70">
          Permanently deletes your {APP_NAME} account and everything in it: connected TikTok accounts (access is revoked on TikTok
          and the tokens are deleted), uploaded videos, posts and schedules. Videos already published on TikTok stay on TikTok.
          This can&apos;t be undone.
        </p>
        <form onSubmit={deleteAccount} className="mt-4 grid max-w-md gap-3">
          <div>
            <label className={label} htmlFor="delete-password">
              Your password
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              required
            />
          </div>
          <div>
            <label className={label} htmlFor="delete-confirm">
              Type DELETE to confirm
            </label>
            <input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={input} />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={deleting || !password || confirmText !== "DELETE"}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Permanently delete my account"}
          </button>
        </form>
      </section>
    </div>
  );
}
