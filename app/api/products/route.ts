import { NextResponse } from "next/server";
import { parseProductInput } from "@/lib/product-input";
import { prisma } from "@/lib/prisma";
import { toStockProduct } from "@/lib/serialize";
import { requireActiveApiUser } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json(products.map(toStockProduct));
}

export async function POST(request: Request) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const parsed = parseProductInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      userId: user.id,
      ...parsed,
    },
  });

  return NextResponse.json(toStockProduct(product), { status: 201 });
}
