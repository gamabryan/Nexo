import { NextResponse } from "next/server";
import { activateUserSubscription } from "@/lib/activate-subscription";
import { prisma } from "@/lib/prisma";
import { hasLifetimeAccess } from "@/lib/subscription";
import { isSubscriptionPlanId } from "@/lib/subscription-plans";

export const runtime = "nodejs";

type WebhookPayload = {
  id?: string;
  event?: string;
  data?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractUserId(data: Record<string, unknown> | null) {
  if (!data) return "";

  const metadata = asRecord(data.metadata);
  const subscription = asRecord(data.subscription);
  const checkout = asRecord(data.checkout) ?? asRecord(data.billing);
  const subMeta = asRecord(subscription?.metadata);
  const checkoutMeta = asRecord(checkout?.metadata);

  const fromMeta = pickString(
    metadata?.userId,
    subMeta?.userId,
    checkoutMeta?.userId,
  );
  if (fromMeta) return fromMeta;

  const externalId = pickString(
    data.externalId,
    subscription?.externalId,
    checkout?.externalId,
  );
  if (externalId.startsWith("user_")) {
    const parts = externalId.split("_");
    if (parts.length >= 2 && parts[1]) return parts[1];
  }

  return "";
}

function extractPlanId(data: Record<string, unknown> | null) {
  if (!data) return "";
  const metadata = asRecord(data.metadata);
  const subscription = asRecord(data.subscription);
  const checkout = asRecord(data.checkout) ?? asRecord(data.billing);
  const subMeta = asRecord(subscription?.metadata);
  const checkoutMeta = asRecord(checkout?.metadata);
  const planId = pickString(metadata?.planId, subMeta?.planId, checkoutMeta?.planId);
  return isSubscriptionPlanId(planId) ? planId : "";
}

function extractSubscriptionId(data: Record<string, unknown> | null) {
  if (!data) return "";
  const subscription = asRecord(data.subscription);
  const rawId = typeof data.id === "string" ? data.id : "";
  return pickString(
    subscription?.id,
    data.subscriptionId,
    rawId.startsWith("subs_") ? rawId : "",
  );
}

function extractCheckoutId(data: Record<string, unknown> | null) {
  if (!data) return "";
  const checkout = asRecord(data.checkout) ?? asRecord(data.billing);
  const id = pickString(checkout?.id, data.id, data.checkoutId, data.billingId);
  return id.startsWith("bill_") ? id : id;
}

function extractExternalId(data: Record<string, unknown> | null) {
  if (!data) return "";
  const subscription = asRecord(data.subscription);
  const checkout = asRecord(data.checkout) ?? asRecord(data.billing);
  return pickString(data.externalId, subscription?.externalId, checkout?.externalId);
}

async function findUserForWebhook(data: Record<string, unknown> | null) {
  const userId = extractUserId(data);
  if (userId) {
    const byId = await prisma.user.findUnique({ where: { id: userId } });
    if (byId) return byId;
  }

  const externalId = extractExternalId(data);
  if (externalId) {
    const byExternal = await prisma.user.findFirst({
      where: { subscriptionExternalId: externalId },
    });
    if (byExternal) return byExternal;
  }

  const checkoutId = extractCheckoutId(data);
  if (checkoutId) {
    const byCheckout = await prisma.user.findFirst({
      where: { subscriptionCheckoutId: checkoutId },
    });
    if (byCheckout) return byCheckout;
  }

  return null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim() || "";
  const provided = url.searchParams.get("webhookSecret") || "";

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const event = typeof payload.event === "string" ? payload.event : "";
  const data = asRecord(payload.data);

  if (
    event !== "subscription.completed" &&
    event !== "subscription.renewed" &&
    event !== "subscription.cancelled" &&
    event !== "checkout.completed"
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const user = await findUserForWebhook(data);
  if (!user) {
    return NextResponse.json({ ok: true, unmatched: true });
  }

  if (event === "subscription.cancelled") {
    if (!hasLifetimeAccess(user)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "CANCELLED" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  await activateUserSubscription({
    user,
    planId: extractPlanId(data) || user.subscriptionPlan,
    checkoutId: extractCheckoutId(data),
    subscriptionId: extractSubscriptionId(data),
  });

  return NextResponse.json({ ok: true });
}
