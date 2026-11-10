"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/money";
import type { FinanceSummary } from "@/lib/finance";
import type { FinanceHighlight } from "@/lib/types";

const PIE_COLORS = ["#c4a574", "#5b7c6a", "#1f3d34", "#b45353"];

type FinanceDashboardProps = {
  summary: FinanceSummary;
};

export function FinanceDashboard({ summary }: FinanceDashboardProps) {
  return (
    <div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Receita</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Finanças</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Números vindos dos custos de entrega e do status de pagamento de cada orçamento.
        </p>
      </div>

      {summary.missingCostCount > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {summary.missingCostCount}{" "}
          {summary.missingCostCount === 1 ? "orçamento está" : "orçamentos estão"} sem o seu custo do
          produto. Abra o orçamento e preencha para o lucro ficar correto.
        </div>
      ) : null}

      <section className="mt-8 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Receita paga" value={formatBRL(summary.paidRevenue)} hint={`${summary.paidCount} orçamentos`} />
        <Kpi label="A receber" value={formatBRL(summary.receivable)} hint="Pré-pago" />
        <Kpi label="Custo estimado" value={formatBRL(summary.estimatedCost)} hint="Meu custo · pré-pago + pago" />
        <Kpi label="Lucro realizado" value={formatBRL(summary.realizedProfit)} hint="Pago − meu custo" />
        <Kpi label="Ticket médio" value={formatBRL(summary.paidAverageTicket)} hint="Só pagos" />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <HighlightCard
          label="Item mais caro (venda)"
          highlight={summary.mostExpensiveSaleItem}
          empty="Cadastre itens nos orçamentos"
        />
        <HighlightCard
          label="Maior custo (meu)"
          highlight={summary.highestDeliveryCost}
          empty="Preencha o seu custo do produto nos orçamentos"
          hrefSuffix="/edit"
        />
        <HighlightCard
          label="Maior orçamento pago"
          highlight={summary.largestPaidProposal}
          empty="Marque um orçamento como pago"
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Receita paga por mês">
          {summary.revenueByMonth.length === 0 ? (
            <EmptyChart text="Marque orçamentos como pagos para ver a evolução." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => formatCompact(Number(value))} width={56} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Bar dataKey="total" fill="#1f3d34" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Orçamentos por status">
          {summary.statusBreakdown.every((item) => item.count === 0) ? (
            <EmptyChart text="Ainda não há orçamentos para montar o gráfico." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.statusBreakdown.filter((item) => item.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {summary.statusBreakdown
                      .filter((item) => item.count > 0)
                      .map((entry, index) => (
                        <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${value} · ${formatBRL(Number(item.payload.total))}`,
                      item.payload.label,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>

      <section className="mt-4">
        <ChartCard title="Top itens por valor de venda">
          {summary.topSaleItems.length === 0 ? (
            <EmptyChart text="Cadastre itens nos orçamentos para ver o ranking." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.topSaleItems} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCompact(Number(value))} />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatBRL(Number(value))} />
                  <Bar dataKey="total" fill="#5b7c6a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function HighlightCard({
  label,
  highlight,
  empty,
  hrefSuffix = "/edit",
}: {
  label: string;
  highlight: FinanceHighlight | null;
  empty: string;
  hrefSuffix?: string;
}) {
  if (!highlight) {
    return (
      <div className="rounded-xl border bg-card px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-3 font-medium">—</p>
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <Link
      href={`/proposals/${highlight.proposalId}${hrefSuffix}`}
      className="rounded-xl border bg-card px-5 py-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 truncate font-medium">{highlight.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{highlight.clientName}</p>
      <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{formatBRL(highlight.value)}</p>
      <p className="mt-3 text-xs font-medium text-primary">Abrir orçamento</p>
    </Link>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card px-4 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid h-64 place-items-center rounded-lg bg-muted/50 px-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
