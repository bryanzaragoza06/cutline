import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/site";

export const metadata = { title: `FAQ · ${APP_NAME}` };

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: `What is ${APP_NAME}?`,
    a: `${APP_NAME} is a web app for TikTok creators. You upload your own video, choose a caption and settings, and publish it to your TikTok account now or at a time you schedule.`,
  },
  {
    q: "Do you see my TikTok password?",
    a: "No. You log in on TikTok's own page. We only receive a token that TikTok issues, which we store encrypted.",
  },
  {
    q: "What permissions do you ask for, and why?",
    a: `Two: user.info.basic (to show which TikTok account is connected) and video.publish (to publish the videos you choose). ${APP_NAME} asks for nothing else.`,
  },
  {
    q: "Will anything post without my approval?",
    a: "No. Every post uses the audience, interaction and disclosure settings you chose. Scheduled posts go out only at the time you set, and you can cancel them first.",
  },
  {
    q: "Why does my video show as private on TikTok?",
    a: "TikTok may restrict posts from apps that haven't completed its content audit to \"Only me\". Until that changes, only the audiences TikTok allows for your account are offered.",
  },
  {
    q: "How long do you keep my videos?",
    a: "About 24 hours after a video finishes posting, 14 days if it's never posted, or immediately if you delete it. Videos already published stay on TikTok until you remove them there.",
  },
  {
    q: "What file types and sizes can I upload?",
    a: "MP4, MOV or WebM, up to 200 MB. The video must also fit within the maximum length TikTok allows for your account.",
  },
  {
    q: "How do I disconnect TikTok or delete my account?",
    a: (
      <>
        Disconnect an account on the Accounts page — this revokes our access on TikTok and deletes its tokens. To delete everything,
        use Settings → Delete account. Details are in the{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
  {
    q: "How do I get help?",
    a: (
      <>
        Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
          {CONTACT_EMAIL}
        </a>
        .
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <LegalPage title="Frequently asked questions">
      {FAQ.map((item) => (
        <section key={item.q}>
          <h2>{item.q}</h2>
          <p>{item.a}</p>
        </section>
      ))}
    </LegalPage>
  );
}
