import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/user";
import { isSubscriptionActive } from "@/lib/subscription";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(isSubscriptionActive(user) ? "/" : "/subscribe");
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
