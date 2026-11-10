"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Package, Plus, Wallet } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/finance", label: "Receita", icon: Wallet, exact: false },
  { href: "/stock", label: "Estoque", icon: Package, exact: false },
  { href: "/settings", label: "Empresa", icon: Building2, exact: false },
];

export function AppNav({ companyName }: { companyName: string }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-primary text-primary-foreground lg:flex">
        <div className="px-5 pb-2 pt-7">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark inverted />
            <span className="font-display text-[1.7rem] leading-none tracking-tight">Nexos</span>
          </Link>
          <Button
            asChild
            size="sm"
            className="mt-5 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link href="/new">
              <Plus className="h-4 w-4" />
              Novo orçamento
            </Link>
          </Button>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
          {links.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-5">
          <p className="truncate text-sm font-medium">{companyName}</p>
          <p className="mt-0.5 truncate text-xs text-primary-foreground/60">Conta do prestador</p>
          <LogoutButton className="mt-3 -ml-2 h-8 px-2 text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-2xl leading-none">Nexos</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/stock" aria-label="Estoque">
              <Package className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance" aria-label="Receita">
              <Wallet className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings" aria-label="Empresa">
              <Building2 className="h-4 w-4" />
            </Link>
          </Button>
          <LogoutButton iconOnly />
          <Button size="sm" asChild>
            <Link href="/new">
              <Plus className="h-4 w-4" />
              Novo
            </Link>
          </Button>
        </div>
      </header>
    </>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof Plus;
  exact: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-primary-foreground"
          : "text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
