import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NavBar from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <NavBar email={session.user.email ?? ""} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </>
  );
}
