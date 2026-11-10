export const SUBSCRIPTION_PLAN_IDS = ["monthly", "quarterly", "annual"] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  /** externalId do produto avulso na AbacatePay (sem cycle) */
  externalId: string;
  name: string;
  description: string;
  /** Preço em reais */
  priceReais: number;
  /** Preço em centavos (API AbacatePay) */
  priceCents: number;
  /** Dias de acesso após o pagamento */
  durationDays: number;
  highlight?: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly",
    externalId: "nexos-acesso-30d",
    name: "1 mês",
    description: "Acesso por 30 dias. Ideal para testar.",
    priceReais: 20,
    priceCents: 2000,
    durationDays: 30,
  },
  {
    id: "quarterly",
    externalId: "nexos-acesso-90d",
    name: "3 meses",
    description: "Acesso por 90 dias. Melhor custo-benefício.",
    priceReais: 50,
    priceCents: 5000,
    durationDays: 90,
    highlight: true,
  },
  {
    id: "annual",
    externalId: "nexos-acesso-365d",
    name: "Anual",
    description: "Acesso por 365 dias. Maior economia.",
    priceReais: 100,
    priceCents: 10000,
    durationDays: 365,
  },
];

export function isSubscriptionPlanId(value: unknown): value is SubscriptionPlanId {
  return typeof value === "string" && SUBSCRIPTION_PLAN_IDS.includes(value as SubscriptionPlanId);
}

export function getSubscriptionPlan(id: SubscriptionPlanId): SubscriptionPlan {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Plano inválido: ${id}`);
  return plan;
}

export function formatPlanPrice(plan: SubscriptionPlan) {
  return plan.priceReais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function computeSubscriptionExpiry(
  planId: SubscriptionPlanId,
  from: Date = new Date(),
  currentExpiry?: Date | null,
) {
  const plan = getSubscriptionPlan(planId);
  const base =
    currentExpiry && currentExpiry.getTime() > from.getTime() ? currentExpiry : from;
  const expires = new Date(base);
  expires.setDate(expires.getDate() + plan.durationDays);
  return expires;
}
