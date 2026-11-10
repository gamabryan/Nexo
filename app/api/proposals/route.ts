import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { parseProposalInput } from "@/lib/proposal-input";
import { prisma } from "@/lib/prisma";
import { toListItem, toPublicProposal } from "@/lib/serialize";
import { requireActiveApiUser } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;
  const proposals = await prisma.proposal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(proposals.map(toListItem));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const parsed = parseProposalInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;
  const proposal = await prisma.proposal.create({
    data: {
      userId: user.id,
      clientName: parsed.clientName,
      description: parsed.description,
      items: parsed.items as Prisma.InputJsonValue,
      totalAmount: parsed.totalAmount,
      estimatedDays: parsed.estimatedDays,
      materialsNeeded: parsed.materialsNeeded,
      hasFreight: parsed.hasFreight,
      freightAmount: parsed.freightAmount,
    },
    include: { user: true },
  });

  return NextResponse.json(toPublicProposal(proposal), { status: 201 });
}
