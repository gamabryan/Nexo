import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { activateUserSubscription } from "@/lib/activate-subscription";
import { authOptions } from "@/lib/auth";
import { getAbacatePay, isAbacatePayConfigured } from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/subscription";
import { isSubscriptionPlanId } from "@/lib/subscription-plans";

export const runtime = "nodejs";

/**
 * Confirma pagamento após retorno do checkout (fallback quando o webhook
 * ainda não chegou, comum em localhost).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if (isSubscriptionActive(user)) {
    return NextResponse.json({ ok: true, status: "ACTIVE" });
  }

  if (!isAbacatePayConfigured() || !user.subscriptionCheckoutId) {
    return NextResponse.json({ ok: true, status: user.subscriptionStatus });
  }

  try {
    const abacate = getAbacatePay();
    const checkout = await abacate.checkouts.get(user.subscriptionCheckoutId);
    if (!checkout.success || !checkout.data) {
      return NextResponse.json({ ok: true, status: user.subscriptionStatus });
    }

    const status = String(checkout.data.status || "").toUpperCase();
    if (status === "PAID") {
      const meta = checkout.data.metadata as Record<string, unknown> | undefined;
      const planFromMeta =
        meta && typeof meta.planId === "string" ? meta.planId : user.subscriptionPlan;

      await activateUserSubscription({
        user,
        planId: isSubscriptionPlanId(planFromMeta) ? planFromMeta : user.subscriptionPlan,
        checkoutId: user.subscriptionCheckoutId,
      });
      return NextResponse.json({ ok: true, status: "ACTIVE" });
    }
  } catch {
    /* ignore polling errors */
  }

  return NextResponse.json({ ok: true, status: user.subscriptionStatus });
}
