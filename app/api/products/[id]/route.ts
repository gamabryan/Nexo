import { NextResponse } from "next/server";
import { parseProductInput, parseStockDelta } from "@/lib/product-input";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/money";
import { toStockProduct } from "@/lib/serialize";
import { requireActiveApiUser } from "@/lib/user";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

async function findOwnedProduct(userId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, userId },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  const product = await findOwnedProduct(user.id, context.params.id);
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  return NextResponse.json(toStockProduct(product));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  const existing = await findOwnedProduct(user.id, context.params.id);
  if (!existing) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
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

  if ("delta" in data && Object.keys(data).length === 1) {
    const parsed = parseStockDelta(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const nextQuantity = roundMoney(existing.quantity + parsed.delta);
    if (nextQuantity < 0) {
      return NextResponse.json(
        { error: "Não há quantidade suficiente em estoque para essa saída." },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { quantity: nextQuantity },
    });

    return NextResponse.json(toStockProduct(product));
  }

  const parsed = parseProductInput({
    name: data.name ?? existing.name,
    sku: data.sku ?? existing.sku,
    unit: data.unit ?? existing.unit,
    quantity: data.quantity ?? existing.quantity,
    minQuantity: data.minQuantity ?? existing.minQuantity,
    unitCost: data.unitCost ?? existing.unitCost,
    unitPrice: data.unitPrice ?? existing.unitPrice,
    notes: data.notes ?? existing.notes,
  });

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: parsed,
  });

  return NextResponse.json(toStockProduct(product));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  const existing = await findOwnedProduct(user.id, context.params.id);
  if (!existing) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  await prisma.product.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
