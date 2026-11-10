import type { ProposalItem, ProposalStatus } from "@/lib/types";

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundMoney(value);
  }

  if (typeof value !== "string") return Number.NaN;

  let normalized = value.trim().replace(/r\$/gi, "").replace(/\s/g, "");
  if (!normalized) return Number.NaN;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundMoney(parsed) : Number.NaN;
}

export function itemQuantity(quantity: unknown) {
  const value = typeof quantity === "number" ? quantity : Number(quantity);
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

export function lineSaleTotal(item: ProposalItem) {
  return roundMoney(item.price * itemQuantity(item.quantity));
}

export function lineCostTotal(item: ProposalItem) {
  return roundMoney(item.cost * itemQuantity(item.quantity));
}

export function sumItems(items: ProposalItem[]) {
  return roundMoney(items.reduce((total, item) => total + lineSaleTotal(item), 0));
}

export function sumItemCosts(items: ProposalItem[]) {
  return roundMoney(items.reduce((total, item) => total + lineCostTotal(item), 0));
}

export function effectiveFreight(hasFreight: boolean, freightAmount: number) {
  if (!hasFreight) return 0;
  return Number.isFinite(freightAmount) && freightAmount > 0 ? roundMoney(freightAmount) : 0;
}

export function proposalSaleTotal(
  items: ProposalItem[],
  hasFreight: boolean,
  freightAmount: number,
) {
  return roundMoney(sumItems(items) + effectiveFreight(hasFreight, freightAmount));
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatLongDate(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function formatDays(days: number) {
  const safe = Math.max(1, Math.round(days));
  return safe === 1 ? "1 dia" : `${safe} dias`;
}

export function proposalCode(id: string) {
  return `NX-${id.slice(-6).toUpperCase()}`;
}

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return value === "PENDING" || value === "PREPAID" || value === "PAID" || value === "REJECTED";
}

export function toProposalItems(value: unknown): ProposalItem[] {
  const source = typeof value === "string" ? safeJson(value) : value;
  if (!Array.isArray(source)) return [];

  return source.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const price = parseMoney(record.price);
    const costRaw = record.cost === undefined || record.cost === null || record.cost === "" ? 0 : parseMoney(record.cost);
    const cost = Number.isFinite(costRaw) ? costRaw : 0;
    const quantity = itemQuantity(record.quantity);
    if (!name || !Number.isFinite(price) || price < 0 || cost < 0) return [];
    return [{ name, price, cost, quantity }];
  });
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
