import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { APP_NAME } from "@/lib/site";

export const metadata = { title: `How it works · ${APP_NAME}` };

export default function HowItWorksPage() {
  return (
    <LegalPage title={`How ${APP_NAME} works`}>
      <p>
        {APP_NAME} lets TikTok creators upload a finished video and publish it to a TikTok account they own — right away, or at a
        date and time they choose. Here is the whole flow, step by step.
      </p>

      <h2>1. Create an account</h2>
      <p>
        Sign up with an email address and password. You can{" "}
        <Link href="/signup" className="underline">
          sign up here
        </Link>
        . By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>

      <h2>2. Connect a TikTok account</h2>
      <p>
        On the Accounts page, choose <strong>Connect with TikTok</strong>. You are sent to TikTok&apos;s own authorization page,
        where you log in and approve two permissions:
      </p>
      <ul>
        <li>
          <strong>user.info.basic</strong> — lets {APP_NAME} show the display name of the account you connected.
        </li>
        <li>
          <strong>video.publish</strong> — lets {APP_NAME} publish the videos you choose to that account.
        </li>
      </ul>
      <p>{APP_NAME} never sees your TikTok password. You can disconnect an account at any time.</p>

      <h2>3. Upload a video</h2>
      <p>
        On the <strong>Post to TikTok</strong> page, upload a video file (MP4, MOV or WebM, up to 200 MB). You can play it back to
        check it before anything is sent to TikTok.
      </p>

      <h2>4. Review and choose your settings</h2>
      <p>
        Before a video can be posted, you review it and choose the settings for that post. {APP_NAME} asks TikTok what the
        selected account allows, and shows only those options:
      </p>
      <ul>
        <li>a caption you write yourself;</li>
        <li>who can watch the video — you must choose this, there is no default;</li>
        <li>whether comments, duets and stitches are allowed — all off until you turn them on, and unavailable if the account has disabled them in TikTok;</li>
        <li>a disclosure if the video promotes your own brand or a third party, with TikTok&apos;s required labels;</li>
        <li>TikTok&apos;s Music Usage Confirmation (and Branded Content Policy where it applies).</li>
      </ul>

      <h2>5. Post now or schedule</h2>
      <p>
        Press <strong>Post to TikTok</strong> to publish immediately, or pick a date and time to schedule it. A scheduled post goes
        out only at the time you set, using the settings you confirmed. You can see the status of every post and cancel a
        scheduled post before it publishes.
      </p>

      <h2>Posts can be private at first</h2>
      <p>
        TikTok may limit videos posted through an app that has not completed TikTok&apos;s content audit to the{" "}
        <strong>Only me</strong> audience. When that applies, {APP_NAME} offers only the audiences TikTok allows for your account.
        Videos can still be seen by you in the TikTok app.
      </p>

      <h2>Your files and data</h2>
      <p>
        Uploaded videos are private to your account and are deleted from our servers about 24 hours after they finish posting
        (or after 14 days if never posted). See the <Link href="/privacy" className="underline">Privacy Policy</Link> for details,
        or the <Link href="/faq" className="underline">FAQ</Link> for common questions.
      </p>
    </LegalPage>
  );
}
