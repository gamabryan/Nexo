import { effectiveFreight, parseMoney, proposalSaleTotal, toProposalItems } from "@/lib/money";

export function parseProposalInput(body: unknown) {
  if (!body || typeof body !== "object") {
    return { error: "Dados do orçamento inválidos." } as const;
  }

  const data = body as Record<string, unknown>;
  const clientName = typeof data.clientName === "string" ? data.clientName.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const materials = typeof data.materialsNeeded === "string" ? data.materialsNeeded.trim() : "";
  const items = toProposalItems(data.items).slice(0, 50);
  const days = Number(data.estimatedDays);
  const hasFreight = Boolean(data.hasFreight);
  const freightRaw = parseMoney(data.freightAmount ?? 0);
  const freightAmount = Number.isFinite(freightRaw) && freightRaw >= 0 ? freightRaw : 0;

  if (!clientName) return { error: "Informe o nome do cliente." } as const;
  if (!description) return { error: "A descrição do serviço é obrigatória." } as const;
  if (items.length === 0) {
    return { error: "Adicione pelo menos um item com nome e valor." } as const;
  }
  if (hasFreight && freightAmount <= 0) {
    return { error: "Informe o valor do frete ou desative a opção." } as const;
  }

  return {
    clientName,
    description,
    materialsNeeded: materials || "A definir com o cliente",
    items,
    estimatedDays: Number.isFinite(days) ? Math.max(1, Math.round(days)) : 1,
    hasFreight,
    freightAmount: effectiveFreight(hasFreight, freightAmount),
    totalAmount: proposalSaleTotal(items, hasFreight, freightAmount),
  };
}
