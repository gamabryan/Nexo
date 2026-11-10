import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProposalCostEditor } from "@/components/proposal-cost-editor";
import { prisma } from "@/lib/prisma";
import { toOwnerProposal } from "@/lib/serialize";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function ProposalEditPage({ params }: PageProps) {
  const user = await requireUser();
  const proposal = await prisma.proposal.findUnique({ where: { id: params.id } });
  if (!proposal || proposal.userId !== user.id) notFound();

  return (
    <AppShell companyName={user.companyName}>
      <ProposalCostEditor proposal={toOwnerProposal(proposal)} />
    </AppShell>
  );
}
