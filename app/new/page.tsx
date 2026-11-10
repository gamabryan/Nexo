import { AppShell } from "@/components/app-shell";
import { NewProposalFlow } from "@/components/new-proposal-flow";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const user = await requireUser();

  return (
    <AppShell companyName={user.companyName}>
      <div className="mx-auto max-w-3xl">
        <NewProposalFlow />
      </div>
    </AppShell>
  );
}
