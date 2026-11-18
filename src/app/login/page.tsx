import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { APP_NAME } from "@/lib/site";

export const metadata = { title: `Log in · ${APP_NAME}` };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
