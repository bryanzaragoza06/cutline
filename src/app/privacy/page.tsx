import LegalPage from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";

export const metadata = { title: `Privacy Policy · ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={POLICY_UPDATED}>
      <p>
        {APP_NAME} is a web app that lets you upload your own videos and publish them to TikTok accounts you connect, now or on a
        schedule. This policy explains what we collect, why, who we share it with, and how you can delete it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and a password, which we store only as a one-way bcrypt hash — we
          never store or see your actual password.
        </li>
        <li>
          <strong>TikTok connection data:</strong> when you connect a TikTok account we receive and store its TikTok open ID and
          display name, plus the OAuth access and refresh tokens TikTok issues. The tokens are encrypted before they are stored. We
          never receive your TikTok password.
        </li>
        <li>
          <strong>TikTok posting options:</strong> each time you open the posting screen we ask TikTok for your account&apos;s
          available audience options, interaction settings and maximum video length, so we can show you the correct choices. We
          don&apos;t keep this information.
        </li>
        <li>
          <strong>Content you provide:</strong> the videos you upload, the captions you write, and the posts, schedules and posting
          settings you configure, including their status.
        </li>
        <li>
          <strong>Basic technical data:</strong> our hosting provider records standard request logs (such as IP address, browser
          type and pages requested) to operate and secure the service.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to provide the service to you: to sign you in, show which TikTok accounts are connected, publish the videos you choose
        to post now or at the time you schedule, show you posting status, and keep the service secure. We do not sell or rent your
        data, we don&apos;t show ads, and we don&apos;t use your videos for any purpose other than running {APP_NAME} for you.
      </p>

      <h2>TikTok data</h2>
      <p>
        We use TikTok&apos;s official Login Kit and Content Posting API, with two permissions: <code>user.info.basic</code> (your
        display name, to show which account is connected) and <code>video.publish</code> (to publish videos you chose to post).
        Tokens are stored on our server, are never sent to your browser, and are never shared with other users or third parties.
        You can revoke {APP_NAME}&apos;s access at any time in TikTok (Settings and privacy → Security → Apps and services) or by
        disconnecting the account in {APP_NAME}.
      </p>

      <h2>Who we share data with</h2>
      <ul>
        <li>
          <strong>TikTok</strong> — only the videos, captions and post settings you choose to publish, sent through TikTok&apos;s
          API.
        </li>
        <li>
          <strong>Our hosting provider</strong> (Railway), which stores the database and files on our behalf and may not use them
          for its own purposes.
        </li>
        <li>Authorities, if required by law.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use only essential cookies: one to keep you signed in, and a short-lived one to protect the TikTok connection step. No
        advertising or analytics cookies.
      </p>

      <h2>Retention and security</h2>
      <p>
        Your account data, posts and schedules are kept until you delete them or your account. Uploaded video files are deleted from
        our servers about 24 hours after they finish posting, after 14 days if they are never posted, or immediately when you delete
        the post. Data is stored on a private server volume and sent over HTTPS; passwords are hashed, TikTok tokens are encrypted at
        rest, and videos you upload can only be viewed by you when signed in.
      </p>

      <h2>Deleting your data</h2>
      <ul>
        <li>
          Disconnecting a TikTok account in {APP_NAME} revokes our access on TikTok and permanently deletes its stored tokens and any
          scheduled posts for it.
        </li>
        <li>Deleting a post removes it from our database and deletes its uploaded video file.</li>
        <li>
          You can delete your entire {APP_NAME} account at any time under <strong>Settings → Delete account</strong>. This
          immediately and permanently deletes your account, connected TikTok accounts and their tokens, uploaded videos, posts and
          schedules. Videos already published to TikTok remain on TikTok and can be removed there.
        </li>
        <li>If you can&apos;t sign in, email us from your account&apos;s email address and we&apos;ll delete it within 30 days.</li>
      </ul>

      <h2>Children</h2>
      <p>
        {APP_NAME} is not intended for anyone under 18, and we do not knowingly collect data from children. If you believe a child
        has created an account, contact us and we will delete it.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date above.</p>

      <h2>Contact</h2>
      <p>
        Questions or deletion requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
