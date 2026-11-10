import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { PublicProposalView } from "@/components/public-proposal";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { toPublicProposal } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: true },
  });

  if (!proposal) {
    return { title: "Orçamento não encontrado — Nexos" };
  }

  const title = `Orçamento ${formatBRL(proposal.totalAmount)} — ${proposal.user.companyName}`;
  return {
    title,
    description: `Orçamento para ${proposal.clientName}, com prazo de ${proposal.estimatedDays} dias.`,
    openGraph: { title, description: `Proposta de ${proposal.user.companyName} para ${proposal.clientName}.` },
  };
}

export default async function ProposalPage({ params }: PageProps) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: true },
  });

  if (!proposal) notFound();

  return (
    <PageTransition>
      <PublicProposalView proposal={toPublicProposal(proposal)} />
    </PageTransition>
  );
}
