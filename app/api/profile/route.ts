import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveApiUser } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;
  return NextResponse.json({
    name: user.name,
    email: user.email,
    companyName: user.companyName,
  });
}

export async function PATCH(request: Request) {
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
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const companyName = typeof data.companyName === "string" ? data.companyName.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (companyName.length < 2) {
    return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
  }

  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, email, companyName },
    });
    return NextResponse.json({
      name: updated.name,
      email: updated.email,
      companyName: updated.companyName,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar. Confira se o e-mail já está em uso." },
      { status: 400 },
    );
  }
}
