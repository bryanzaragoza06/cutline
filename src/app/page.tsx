import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/site";
import { card, primaryButton, secondaryButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Upload your own videos",
    body: "Bring a finished video (MP4, MOV or WebM), add a caption, and preview exactly what will be posted.",
  },
  {
    title: "Post to TikTok in one step",
    body: "Pick one of your connected TikTok accounts, choose who can watch and which interactions are allowed, and publish straight to your profile.",
  },
  {
    title: "Schedule for later",
    body: "Choose a date and time for each post. It publishes to the account you picked, with the settings you chose when you scheduled it.",
  },
  {
    title: "Stay in control",
    body: "You sign in with TikTok's official login, so we never see your TikTok password. You can see every post's status, cancel scheduled posts, and disconnect an account at any time.",
  },
];

const STEPS = [
  { title: "Create an account", body: `Sign up to ${APP_NAME} with an email address and password.` },
  { title: "Connect TikTok", body: "Approve access on TikTok's own authorization screen. You choose which TikTok account to connect." },
  { title: "Upload a video", body: "Add a video file and an optional caption. You can preview it before anything is sent." },
  { title: "Post or schedule", body: "Choose the audience and interaction settings, confirm, and post now or pick a time." },
];

const PERMISSIONS = [
  {
    scope: "user.info.basic",
    why: "Shows your TikTok display name so you can see which account is connected. We store your TikTok open ID and display name.",
  },
  {
    scope: "video.publish",
    why: "Publishes the video you uploaded and confirmed to your own TikTok account, using TikTok's Content Posting API (Direct Post). We only post when you press the post button, or at the time you scheduled.",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
          {APP_NAME}
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/how-it-works" className="hidden px-2 hover:underline sm:inline">
            How it works
          </Link>
          <Link href="/faq" className="hidden px-2 hover:underline sm:inline">
            FAQ
          </Link>
          <Link href="/login" className={secondaryButton}>
            Log in
          </Link>
          <Link href="/signup" className={primaryButton}>
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt={`${APP_NAME} logo`} width={96} height={96} className="rounded-3xl shadow-lg" />
          <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Upload your videos. Post them to TikTok now, or on a schedule.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-black/70 dark:text-white/70">
            {APP_NAME} is a web app for TikTok creators. Connect your own TikTok account, upload a video, choose a caption and who can
            watch it, then publish it to your profile — immediately or at a time you pick.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={`${primaryButton} px-6 py-3 text-base`}>
              Get started
            </Link>
            <Link href="/login" className={`${secondaryButton} px-6 py-3 text-base`}>
              Log in
            </Link>
          </div>
        </section>

        <section className="pb-16">
          <h2 className="text-center text-2xl font-semibold">What {APP_NAME} does</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className={`${card} p-6`}>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className={`${card} p-5`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-baby text-sm font-semibold text-black">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-black/70 dark:text-white/70">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-16">
          <h2 className="text-center text-2xl font-semibold">What we access on your TikTok account</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-black/70 dark:text-white/70">
            {APP_NAME} uses TikTok&apos;s official Login Kit and Content Posting API and asks for only these two permissions.
          </p>
          <div className={`${card} mx-auto mt-6 max-w-3xl divide-y divide-black/10 dark:divide-white/10`}>
            {PERMISSIONS.map((p) => (
              <div key={p.scope} className="flex flex-col gap-1 p-5 sm:flex-row sm:gap-6">
                <code className="shrink-0 text-sm font-semibold sm:w-44">{p.scope}</code>
                <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">{p.why}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <h2 className="text-center text-2xl font-semibold">Your data and your control</h2>
          <ul className="mx-auto mt-6 max-w-3xl space-y-3 text-sm leading-relaxed text-black/80 dark:text-white/80">
            <li className={`${card} p-4`}>
              <strong>We never see your TikTok password.</strong> You approve access on TikTok&apos;s own page, and the access tokens
              TikTok gives us are encrypted when stored and never sent to your browser.
            </li>
            <li className={`${card} p-4`}>
              <strong>Nothing posts without you.</strong> Every post uses the audience, interaction and disclosure settings you chose.
              Scheduled posts go out only at the time you set.
            </li>
            <li className={`${card} p-4`}>
              <strong>Your videos aren&apos;t kept.</strong> Uploaded videos are deleted from our servers about a day after they finish
              posting, or when you delete them.
            </li>
            <li className={`${card} p-4`}>
              <strong>Leave any time.</strong> Disconnect an account to revoke access and delete its tokens, or delete your whole
              account from Settings. Read our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="underline">
                Terms of Service
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className={`${card} mb-16 p-8 text-center`}>
          <h2 className="text-2xl font-semibold">Ready to post your next video?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-black/70 dark:text-white/70">
            Create an account, connect TikTok in a few clicks, and disconnect whenever you like.
          </p>
          <Link href="/signup" className={`${primaryButton} mt-6 inline-block px-6 py-3 text-base`}>
            Create your account
          </Link>
        </section>

        <p className="pb-8 text-center text-xs text-black/50 dark:text-white/50">
          Questions? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          . {APP_NAME} is not affiliated with, endorsed or sponsored by TikTok.
        </p>
      </main>
    </div>
  );
}
