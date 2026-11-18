"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { card, input, label, primaryButton } from "@/components/ui";
import { APP_NAME } from "@/lib/site";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Sign up failed");
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError(mode === "login" ? "Incorrect email or password" : "Account created, but sign-in failed — try logging in.");
        return;
      }
      const next = searchParams.get("next");
      // Only follow same-site relative paths.
      const target = mode === "login" && next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(target);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6 py-12">
      <div className={`${card} w-full max-w-sm p-6`}>
        <div className="mb-6 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-64.png" alt="" width={28} height={28} className="rounded-md" />
          <h1 className="text-lg font-semibold">{mode === "login" ? `Log in to ${APP_NAME}` : `Create your ${APP_NAME} account`}</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
            {mode === "signup" && <p className="mt-1 text-xs text-black/50 dark:text-white/50">At least 8 characters.</p>}
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {mode === "signup" && (
            <p className="text-xs text-black/60 dark:text-white/60">
              By signing up you agree to our{" "}
              <Link href="/terms" target="_blank" className="underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          )}
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-black/60 dark:text-white/60">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link href="/signup" className="font-medium text-black underline dark:text-white">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-black underline dark:text-white">
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
