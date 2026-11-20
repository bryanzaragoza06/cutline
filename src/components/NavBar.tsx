"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/lib/site";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/posts", label: "Post to TikTok" },
  { href: "/schedule", label: "Schedule" },
  { href: "/accounts", label: "Accounts" },
];

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-surface/75 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" width={24} height={24} className="rounded-md" />
          {APP_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1 text-sm ${
                isActive(link.href)
                  ? "bg-baby font-medium text-black"
                  : "text-black/70 hover:bg-baby-soft dark:text-white/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/settings" className="hidden text-black/60 hover:underline sm:inline dark:text-white/60" title="Settings">
            {email}
          </Link>
          <button
            type="button"
            onClick={async () => {
              // redirect:false so the browser (not the server's internal host) decides where to go
              await signOut({ redirect: false });
              window.location.href = "/";
            }}
            className="rounded-lg border border-black/15 px-3 py-1 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
