import Link from "next/link";
import { ProposalList } from "@/components/proposal-list";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { toListItem } from "@/lib/serialize";
import { isPlaceholderCompany, requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const proposals = await prisma.proposal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell companyName={user.companyName}>
      {isPlaceholderCompany(user) ? (
        <div className="mb-8 flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>Defina o nome da empresa para ele aparecer no orçamento do cliente.</p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings">Completar cadastro</Link>
          </Button>
        </div>
      ) : null}
      <ProposalList proposals={proposals.map(toListItem)} />
    </AppShell>
  );
}
