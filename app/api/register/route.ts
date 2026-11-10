import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  appBaseUrl,
  createSubscriptionCheckout,
  isAbacatePayConfigured,
} from "@/lib/abacatepay";
import { isSubscriptionPlanId } from "@/lib/subscription-plans";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isAbacatePayConfigured()) {
    return NextResponse.json(
      { error: "Pagamentos não configurados. Defina ABACATEPAY_API_KEY." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const companyName = typeof data.companyName === "string" ? data.companyName.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const planId = data.planId;

  if (name.length < 2) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (companyName.length < 2) {
    return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }
  if (!isSubscriptionPlanId(planId)) {
    return NextResponse.json({ error: "Escolha um plano de assinatura." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      companyName,
      passwordHash: await hashPassword(password),
      subscriptionPlan: planId,
      subscriptionStatus: "PENDING",
    },
  });

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
        subscriptionCheckoutId: checkout.checkoutId,
        subscriptionExternalId: checkout.externalId,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        checkoutUrl: checkout.checkoutUrl,
        planId,
      },
      { status: 201 },
    );
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    const message =
      error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
