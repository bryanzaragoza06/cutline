import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { APP_NAME } from "@/lib/site";
import SettingsClient from "@/components/SettingsClient";

export const metadata = { title: `Settings · ${APP_NAME}` };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <SettingsClient email={session.user.email ?? ""} />;
}
