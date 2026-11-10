import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { SubscribeForm } from "@/components/subscribe-form";
import { isSubscriptionActive } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/user";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/subscribe");
  if (isSubscriptionActive(user)) redirect("/");

  return (
    <AuthFrame
      title="Assinatura"
      subtitle="Para usar o Nexos, escolha um plano e conclua o pagamento na AbacatePay."
      footer={
        <span className="inline-flex items-center gap-2">
          Logado como {user.email}. <LogoutButton />
        </span>
      }
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <SubscribeForm initialPlanId={user.subscriptionPlan} status={user.subscriptionStatus} />
      </Suspense>
    </AuthFrame>
  );
}
