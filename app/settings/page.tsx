import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell companyName={user.companyName}>
      <div className="mx-auto max-w-xl">
        <SettingsForm
          initial={{
            name: user.name,
            email: user.email,
            companyName: user.companyName,
          }}
        />
      </div>
    </AppShell>
  );
}
