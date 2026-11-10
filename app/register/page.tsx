import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/user";
import { isSubscriptionActive } from "@/lib/subscription";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(isSubscriptionActive(user) ? "/" : "/subscribe");
  }

  return <RegisterForm />;
}
