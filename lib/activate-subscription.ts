import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasLifetimeAccess } from "@/lib/subscription";
import {
  computeSubscriptionExpiry,
  isSubscriptionPlanId,
  type SubscriptionPlanId,
} from "@/lib/subscription-plans";

export async function activateUserSubscription(input: {
  user: Pick<User, "id" | "email" | "subscriptionPlan" | "subscriptionExpiresAt">;
  planId?: string;
  checkoutId?: string;
  subscriptionId?: string;
}) {
  // Admin / lifetime: só garante ACTIVE, sem data de expiração.
  if (hasLifetimeAccess(input.user)) {
    return prisma.user.update({
      where: { id: input.user.id },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionPlan: "lifetime",
        subscriptionExpiresAt: null,
        ...(input.checkoutId ? { subscriptionCheckoutId: input.checkoutId } : {}),
        ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
      },
    });
  }

  const planId: SubscriptionPlanId = isSubscriptionPlanId(input.planId)
    ? input.planId
    : isSubscriptionPlanId(input.user.subscriptionPlan)
      ? input.user.subscriptionPlan
      : "monthly";

  const expiresAt = computeSubscriptionExpiry(
    planId,
    new Date(),
    input.user.subscriptionExpiresAt,
  );

  return prisma.user.update({
    where: { id: input.user.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionPlan: planId,
      subscriptionExpiresAt: expiresAt,
      ...(input.checkoutId ? { subscriptionCheckoutId: input.checkoutId } : {}),
      ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
    },
  });
}
