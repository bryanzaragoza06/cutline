import LegalPage from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";

export const metadata = { title: `Terms of Service · ${APP_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={POLICY_UPDATED}>
      <p>
        These terms govern your use of {APP_NAME} (the &ldquo;service&rdquo;). By creating an account or using the service, you
        agree to them. If you don&apos;t agree, don&apos;t use the service.
      </p>

      <h2>The service</h2>
      <p>
        {APP_NAME} is a web app that lets you upload your own videos and publish them to TikTok accounts that you connect —
        immediately, or at a date and time you choose.
      </p>

      <h2>Eligibility and your account</h2>
      <ul>
        <li>You must be at least 18 years old (or the age of majority where you live) to use {APP_NAME}.</li>
        <li>You&apos;re responsible for keeping your login details secure and for all activity under your account.</li>
        <li>Provide a valid email address. You may not create accounts to evade a suspension.</li>
      </ul>

      <h2>Connected TikTok accounts</h2>
      <ul>
        <li>
          Only connect TikTok accounts that you own or are authorized to manage. By connecting an account, you authorize{" "}
          {APP_NAME} to publish the videos you upload and confirm — now or at the time you schedule — to that account.
        </li>
        <li>
          Every post uses the audience, interaction and commercial-content settings you choose for it. {APP_NAME} only publishes a
          video after you confirm it, and scheduled posts publish only at the time you set. You are responsible for every post
          published through {APP_NAME}.
        </li>
        <li>
          Your use of TikTok through {APP_NAME} is also governed by TikTok&apos;s Terms of Service, Community Guidelines, Music Usage
          Confirmation and, where applicable, Branded Content Policy. You must comply with them, including disclosing commercial
          content. TikTok may limit, hold or reject posts at its discretion. {APP_NAME} is not affiliated with or endorsed by TikTok.
        </li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>
          You keep all rights to the videos you upload. You grant us a limited license to store, process and transmit them solely to
          provide the service to you — for example, to deliver a video to TikTok when you choose to post it.
        </li>
        <li>
          You must own or have permission to use everything in the videos you upload, including any music, and you are responsible
          for having the rights needed to publish it on TikTok.
        </li>
        <li>
          Uploaded videos are deleted from our servers about 24 hours after they finish posting, after 14 days if they are never
          posted, or immediately when you delete them.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You may not use {APP_NAME} to:</p>
      <ul>
        <li>post content that is unlawful, infringing, hateful, harassing, sexually explicit, or harmful to minors;</li>
        <li>spam, mislead, impersonate others, or artificially manipulate engagement;</li>
        <li>post to accounts you aren&apos;t authorized to manage;</li>
        <li>interfere with, overload, reverse-engineer or gain unauthorized access to the service.</li>
      </ul>

      <h2>No spam</h2>
      <p>
        {APP_NAME} is for sharing your own original content on your own schedule. You agree not to use it for spam or manipulation.
        In particular, you may not:
      </p>
      <ul>
        <li>post the same or near-identical video repeatedly, or flood an account with repetitive or low-effort content;</li>
        <li>use {APP_NAME} to buy, sell, trade or generate fake followers, likes, views, comments or other engagement;</li>
        <li>post misleading, deceptive or irrelevant content, or use captions and hashtags to mislead viewers;</li>
        <li>post in bulk to many accounts you don&apos;t own or aren&apos;t authorized to manage;</li>
        <li>work around TikTok&apos;s rate limits, posting limits or content rules.</li>
      </ul>
      <p>
        We may limit, hold or remove scheduled posts and suspend accounts that we reasonably believe break these rules or TikTok&apos;s
        Community Guidelines.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We may suspend or close accounts that violate these terms or put the service, other users or TikTok&apos;s platform at
        risk. You can stop using {APP_NAME} at any time and delete your account under Settings, as described in our Privacy Policy.
      </p>

      <h2>Changes to the service and these terms</h2>
      <p>
        We may change, suspend or discontinue features at any time. We may update these terms; if we make material changes we will
        update the date above, and continued use after changes means you accept them.
      </p>

      <h2>No warranty; limitation of liability</h2>
      <p>
        {APP_NAME} is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind. Posts and
        scheduled posts may be delayed, fail, or be rejected or limited by TikTok. To the fullest extent permitted by law, we are not
        liable for any indirect, incidental or consequential damages, or for lost data, revenue, followers or opportunities arising
        from your use of the service.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
