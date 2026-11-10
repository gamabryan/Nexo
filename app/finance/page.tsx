import { AppShell } from "@/components/app-shell";
import { FinanceDashboard } from "@/components/finance-dashboard";
import { buildFinanceSummary } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { toFinanceProposal } from "@/lib/serialize";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const user = await requireUser();
  const proposals = await prisma.proposal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const summary = buildFinanceSummary(proposals.map(toFinanceProposal));

  return (
    <AppShell companyName={user.companyName}>
      <FinanceDashboard summary={summary} />
    </AppShell>
  );
}
