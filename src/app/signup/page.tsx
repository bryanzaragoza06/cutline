import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { APP_NAME } from "@/lib/site";

export const metadata = { title: `Sign up · ${APP_NAME}` };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
