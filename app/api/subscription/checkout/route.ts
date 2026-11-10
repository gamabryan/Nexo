import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  appBaseUrl,
  createSubscriptionCheckout,
  isAbacatePayConfigured,
} from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";
import { isSubscriptionPlanId } from "@/lib/subscription-plans";
import { isSubscriptionActive } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAbacatePayConfigured()) {
    return NextResponse.json(
      { error: "Pagamentos não configurados. Defina ABACATEPAY_API_KEY." },
      { status: 503 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if (isSubscriptionActive(user)) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const requestedPlan = data.planId;
  const planId = isSubscriptionPlanId(requestedPlan)
    ? requestedPlan
    : isSubscriptionPlanId(user.subscriptionPlan)
      ? user.subscriptionPlan
      : "monthly";

  try {
    const base = appBaseUrl(request.url);
    const checkout = await createSubscriptionCheckout({
      planId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      returnUrl: `${base}/subscribe`,
      completionUrl: `${base}/subscribe?paid=1`,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: planId,
        subscriptionStatus: "PENDING",
        subscriptionCheckoutId: checkout.checkoutId,
        subscriptionExternalId: checkout.externalId,
      },
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: checkout.checkoutUrl,
      planId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
