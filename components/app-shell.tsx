import { AppNav } from "@/components/app-nav";
import { PageTransition } from "@/components/page-transition";

type AppShellProps = {
  companyName: string;
  children: React.ReactNode;
};

export function AppShell({ companyName, children }: AppShellProps) {
  return (
    <div className="min-h-screen lg:pl-64">
      <AppNav companyName={companyName} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
