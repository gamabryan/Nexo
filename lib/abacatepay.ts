import { AbacatePay } from "@abacatepay/sdk";
import {
  getSubscriptionPlan,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/lib/subscription-plans";

export type AbacateClient = ReturnType<typeof AbacatePay>;

let cachedClient: AbacateClient | null = null;
const productIdByExternalId = new Map<string, string>();

type ProductRecord = {
  id: string;
  externalId: string;
  cycle?: string | null;
  price?: number;
};

export function getAbacatePayApiKey() {
  return process.env.ABACATEPAY_API_KEY?.trim() || "";
}

export function getAbacatePay() {
  const secret = getAbacatePayApiKey();
  if (!secret) {
    throw new Error("ABACATEPAY_API_KEY não configurada.");
  }
  if (!cachedClient) {
    cachedClient = AbacatePay({ secret });
  }
  return cachedClient;
}

export function isAbacatePayConfigured() {
  return Boolean(getAbacatePayApiKey());
}

function asProductList(data: unknown): ProductRecord[] {
  if (Array.isArray(data)) return data as ProductRecord[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: ProductRecord[] }).data;
  }
  return [];
}

async function resolveProductId(
  abacate: AbacateClient,
  plan: (typeof SUBSCRIPTION_PLANS)[number],
): Promise<string> {
  const cached = productIdByExternalId.get(plan.externalId);
  if (cached) return cached;

  const existing = await abacate.products.get({ externalId: plan.externalId });
  if (existing.success && existing.data?.id) {
    productIdByExternalId.set(plan.externalId, existing.data.id);
    return existing.data.id;
  }

  // Produto avulso (sem cycle): checkout Pix único, prazo gerenciado no app.
  const created = await abacate.products.create({
    externalId: plan.externalId,
    name: `Nexos — ${plan.name}`,
    description: plan.description,
    price: plan.priceCents,
    currency: "BRL",
  });

  if (created.success && created.data?.id) {
    productIdByExternalId.set(plan.externalId, created.data.id);
    return created.data.id;
  }

  const message = String(created.error || "");
  if (/already exists|já existe/i.test(message)) {
    const again = await abacate.products.get({ externalId: plan.externalId });
    if (again.success && again.data?.id) {
      productIdByExternalId.set(plan.externalId, again.data.id);
      return again.data.id;
    }
  }

  throw new Error(created.error || `Falha ao criar produto ${plan.externalId}.`);
}

/**
 * Garante que os 3 produtos de acesso existam na loja AbacatePay.
 */
export async function ensureSubscriptionProducts() {
  const abacate = getAbacatePay();

  if (productIdByExternalId.size === SUBSCRIPTION_PLANS.length) {
    return productIdByExternalId;
  }

  const listed = await abacate.products.list({ limit: 100, page: 1 } as {
    limit?: number;
    page?: number;
  });
  if (listed.success) {
    for (const product of asProductList(listed.data)) {
      if (product.externalId && product.id) {
        productIdByExternalId.set(product.externalId, product.id);
      }
    }
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    await resolveProductId(abacate, plan);
  }

  return productIdByExternalId;
}

export async function getProductIdForPlan(planId: SubscriptionPlanId) {
  const plan = getSubscriptionPlan(planId);
  const map = await ensureSubscriptionProducts();
  const productId = map.get(plan.externalId);
  if (!productId) {
    throw new Error(`Produto AbacatePay não encontrado para o plano ${planId}.`);
  }
  return productId;
}

type CreateSubscriptionCheckoutInput = {
  planId: SubscriptionPlanId;
  userId: string;
  userEmail: string;
  userName: string;
  returnUrl: string;
  completionUrl: string;
};

type SubscriptionCheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
  externalId: string;
};

/**
 * Cria um checkout Pix avulso. O prazo de acesso é controlado pelo app após o pagamento.
 */
export async function createSubscriptionCheckout(
  input: CreateSubscriptionCheckoutInput,
): Promise<SubscriptionCheckoutResult> {
  const abacate = getAbacatePay();
  const productId = await getProductIdForPlan(input.planId);
  const externalId = `user_${input.userId}_${input.planId}_${Date.now()}`;

  const result = await abacate.checkouts.create({
    items: [{ id: productId, quantity: 1 }],
    externalId,
    returnUrl: input.returnUrl,
    completionUrl: input.completionUrl,
    methods: ["PIX" as const],
    metadata: {
      userId: input.userId,
      planId: input.planId,
      email: input.userEmail,
      name: input.userName,
      kind: "subscription",
    } as unknown as Record<string, object>,
  } as Parameters<typeof abacate.checkouts.create>[0]);

  if (!result.success || !result.data) {
    throw new Error(result.error || "Não foi possível criar o checkout de pagamento.");
  }

  const data = result.data as {
    id?: string;
    url?: string;
    externalId?: string | null;
  };

  if (!data.id || !data.url) {
    throw new Error("A AbacatePay não retornou o link de pagamento.");
  }

  return {
    checkoutId: data.id,
    checkoutUrl: data.url,
    externalId: data.externalId || externalId,
  };
}

export function appBaseUrl(requestUrl?: string) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      /* ignore */
    }
  }
  return "http://localhost:3000";
}
