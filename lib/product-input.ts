import { parseMoney, roundMoney } from "@/lib/money";

export type ParsedProductInput = {
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  unitPrice: number;
  notes: string;
};

function parseNonNegative(value: unknown, label: string): number | { error: string } {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0) return { error: `${label} não pode ser negativo.` };
    return roundMoney(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const money = parseMoney(trimmed);
    if (Number.isFinite(money)) {
      if (money < 0) return { error: `${label} não pode ser negativo.` };
      return money;
    }
    const asNumber = Number(trimmed.replace(",", "."));
    if (Number.isFinite(asNumber)) {
      if (asNumber < 0) return { error: `${label} não pode ser negativo.` };
      return roundMoney(asNumber);
    }
  }

  return { error: `Informe um valor válido para ${label.toLowerCase()}.` };
}

export function parseProductInput(body: unknown): ParsedProductInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Dados inválidos." };
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const sku = typeof data.sku === "string" ? data.sku.trim() : "";
  const unit = typeof data.unit === "string" ? data.unit.trim() : "un";
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";

  if (name.length < 2) {
    return { error: "Informe o nome do produto." };
  }
  if (name.length > 120) {
    return { error: "O nome do produto é muito longo." };
  }
  if (sku.length > 60) {
    return { error: "O código/SKU é muito longo." };
  }
  if (!unit || unit.length > 20) {
    return { error: "Informe uma unidade válida (ex.: un, kg, m)." };
  }
  if (notes.length > 500) {
    return { error: "As observações são muito longas." };
  }

  const quantity = parseNonNegative(data.quantity, "A quantidade");
  if (typeof quantity === "object") return quantity;

  const minQuantity = parseNonNegative(data.minQuantity, "O estoque mínimo");
  if (typeof minQuantity === "object") return minQuantity;

  const unitCost = parseNonNegative(data.unitCost, "O custo unitário");
  if (typeof unitCost === "object") return unitCost;

  const unitPrice = parseNonNegative(data.unitPrice, "O preço de venda");
  if (typeof unitPrice === "object") return unitPrice;

  return {
    name,
    sku,
    unit,
    quantity,
    minQuantity,
    unitCost,
    unitPrice,
    notes,
  };
}

export function parseStockDelta(body: unknown): { delta: number } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Dados inválidos." };
  }

  const data = body as Record<string, unknown>;
  const raw = data.delta;

  let delta: number;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    delta = roundMoney(raw);
  } else if (typeof raw === "string") {
    const parsed = Number(raw.trim().replace(",", "."));
    if (!Number.isFinite(parsed)) {
      return { error: "Informe a quantidade a ajustar." };
    }
    delta = roundMoney(parsed);
  } else {
    return { error: "Informe a quantidade a ajustar." };
  }

  if (delta === 0) {
    return { error: "A quantidade do ajuste não pode ser zero." };
  }

  return { delta };
}
