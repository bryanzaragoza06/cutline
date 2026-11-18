import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Upload your videos and post them to your TikTok account now or on a schedule.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-black/10 py-6 text-center text-xs text-black/50 dark:border-white/10 dark:text-white/50">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/how-it-works" className="hover:underline">
              How it works
            </Link>
            <Link href="/faq" className="hover:underline">
              FAQ
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
              Contact
            </a>
          </nav>
          <p className="mt-2">
            {APP_NAME} is not affiliated with or endorsed by TikTok.
          </p>
        </footer>
      </body>
    </html>
  );
}
