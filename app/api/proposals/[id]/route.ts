import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isProposalStatus } from "@/lib/money";
import { parseProposalInput } from "@/lib/proposal-input";
import { prisma } from "@/lib/prisma";
import { toOwnerProposal, toPublicProposal } from "@/lib/serialize";
import type { ProposalStatus } from "@/lib/types";
import { getCurrentUser, requireActiveApiUser } from "@/lib/user";
import { isSubscriptionActive } from "@/lib/subscription";

export const runtime = "nodejs";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const proposal = await findProposal(params.id);
  if (!proposal) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (user && user.id === proposal.userId && isSubscriptionActive(user)) {
    return NextResponse.json(toOwnerProposal(proposal));
  }

  return NextResponse.json(toPublicProposal(proposal));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const existing = await findProposal(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
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
  const update: Prisma.ProposalUpdateInput = {};
  const user = await getCurrentUser();
  const isOwner = Boolean(user && user.id === existing.userId);

  if ("status" in data) {
    if (!isProposalStatus(data.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const next = data.status as ProposalStatus;
    const onlyStatus = Object.keys(data).every((key) => key === "status");
    const publicDecision =
      onlyStatus &&
      existing.status === "PENDING" &&
      (next === "PREPAID" || next === "REJECTED");
    const ownerMarkPaid = onlyStatus && existing.status === "PREPAID" && next === "PAID";

    if (publicDecision) {
      update.status = next;
    } else if (ownerMarkPaid) {
      if (!isOwner) {
        return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
      }
      if (!isSubscriptionActive(user!)) {
        return NextResponse.json(
          { error: "Assinatura necessária para continuar.", code: "SUBSCRIPTION_REQUIRED" },
          { status: 402 },
        );
      }
      update.status = next;
    } else if (isOwner && onlyStatus) {
      return NextResponse.json({ error: "Transição de status não permitida." }, { status: 400 });
    } else if (!isOwner) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    } else {
      return NextResponse.json({ error: "Transição de status não permitida." }, { status: 400 });
    }
  }

  if ("clientName" in data || "items" in data || "description" in data || "hasFreight" in data || "freightAmount" in data) {
    if (!isOwner) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }
    if (!isSubscriptionActive(user!)) {
      return NextResponse.json(
        { error: "Assinatura necessária para continuar.", code: "SUBSCRIPTION_REQUIRED" },
        { status: 402 },
      );
    }
    const parsed = parseProposalInput({
      clientName: data.clientName ?? existing.clientName,
      description: data.description ?? existing.description,
      materialsNeeded: data.materialsNeeded ?? existing.materialsNeeded,
      estimatedDays: data.estimatedDays ?? existing.estimatedDays,
      items: data.items ?? existing.items,
      hasFreight: data.hasFreight ?? existing.hasFreight,
      freightAmount: data.freightAmount ?? existing.freightAmount,
    });
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    update.clientName = parsed.clientName;
    update.description = parsed.description;
    update.items = parsed.items as Prisma.InputJsonValue;
    update.totalAmount = parsed.totalAmount;
    update.estimatedDays = parsed.estimatedDays;
    update.materialsNeeded = parsed.materialsNeeded;
    update.hasFreight = parsed.hasFreight;
    update.freightAmount = parsed.freightAmount;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const proposal = await prisma.proposal.update({
    where: { id: params.id },
    data: update,
    include: { user: true },
  });

  if (isOwner) {
    return NextResponse.json(toOwnerProposal(proposal));
  }
  return NextResponse.json(toPublicProposal(proposal));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  const existing = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

  await prisma.proposal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

function findProposal(id: string) {
  return prisma.proposal.findUnique({
    where: { id },
    include: { user: true },
  });
}
