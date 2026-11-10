import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PageTransition } from "@/components/page-transition";

type AuthFrameProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthFrame({ title, subtitle, children, footer }: AuthFrameProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary px-12 py-12 text-primary-foreground lg:flex xl:px-16">
        <div className="flex items-center gap-3">
          <BrandMark inverted />
          <span className="text-sm font-medium tracking-wide">Nexos</span>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-5xl leading-[0.95] tracking-tight xl:text-6xl">
            Orçamento, receita e estoque no mesmo lugar.
          </h2>
          <ul className="mt-10 space-y-3 text-sm leading-6 text-primary-foreground/75">
            <li>Monte orçamentos com IA e envie o link para o cliente.</li>
            <li>Acompanhe a receita do que foi aprovado e pago.</li>
            <li>Controle estoque de produtos e materiais no dia a dia.</li>
          </ul>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/50">
          Para quem vive de prestar serviço
        </p>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-10">
        <PageTransition className="mx-auto w-full max-w-md">
          <Link href="/login" className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <span className="font-display text-3xl leading-none">Nexos</span>
          </Link>
          <h1 className="font-display text-4xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
        </PageTransition>
      </section>
    </div>
  );
}
