import Link from "next/link";
import { APP_NAME } from "@/lib/site";

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← {APP_NAME}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  );
}
