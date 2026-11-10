import type { User } from "@prisma/client";

export type SubscriptionStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";

/** Contas com acesso permanente (admin). */
const LIFETIME_EMAILS = new Set(["bryangamafernandes@gmail.com"]);

type SubscriptionUser = Pick<User, "email" | "subscriptionStatus" | "subscriptionPlan" | "subscriptionExpiresAt">;

export function hasLifetimeAccess(user: Pick<User, "email" | "subscriptionPlan">) {
  return user.subscriptionPlan === "lifetime" || LIFETIME_EMAILS.has(user.email.toLowerCase());
}

export function isSubscriptionActive(user: SubscriptionUser) {
  if (hasLifetimeAccess(user)) return true;
  if (user.subscriptionStatus !== "ACTIVE") return false;
  if (!user.subscriptionExpiresAt) return true;
  return user.subscriptionExpiresAt.getTime() > Date.now();
}

export function needsSubscriptionPayment(user: SubscriptionUser) {
  return !isSubscriptionActive(user);
}
