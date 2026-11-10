"use client";

import { useState } from "react";
import { CheckCircle2, Printer, XCircle } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDays, formatLongDate, proposalCode } from "@/lib/money";
import type { ProposalStatus, PublicProposal } from "@/lib/types";

export function PublicProposalView({ proposal }: { proposal: PublicProposal }) {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [submitting, setSubmitting] = useState<"PREPAID" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState<ProposalStatus | null>(null);

  async function updateStatus(next: "PREPAID" | "REJECTED") {
    setSubmitting(next);
    setError(null);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o orçamento.");
      setStatus(next);
      setJustUpdated(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar.");
    } finally {
      setSubmitting(null);
    }
  }

  if (justUpdated === "PREPAID") {
    return (
      <ResultScreen
        tone="success"
        title="Orçamento aprovado"
        text={`${proposal.companyName} já pode ver a sua aprovação. Obrigado, ${proposal.clientName}.`}
        onBack={() => setJustUpdated(null)}
      />
    );
  }

  if (justUpdated === "REJECTED") {
    return (
      <ResultScreen
        tone="danger"
        title="Orçamento recusado"
        text="Sua resposta foi registrada. Se quiser, fale com o prestador para ajustar o serviço."
        onBack={() => setJustUpdated(null)}
      />
    );
  }

  return (
    <div className="min-h-screen px-3 py-8 pb-40 sm:px-6 sm:py-14 sm:pb-14 print:bg-white print:p-0">
      <article className="print-sheet mx-auto max-w-3xl overflow-hidden border bg-card shadow-[0_30px_70px_-36px_rgba(22,32,28,0.55)] print:max-w-none print:border-0 print:shadow-none">
        <div className="h-1.5 bg-primary print:bg-slate-900" />
        <div className="px-5 py-8 sm:px-12 sm:py-12">
          <header className="flex items-start justify-between gap-6">
            <div className="flex gap-4">
              <BrandMark className="h-12 w-12" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Orçamento</p>
                <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">{proposal.companyName}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {proposal.providerName}
                  {proposal.providerEmail.endsWith("@nexos.local") ||
                  proposal.providerEmail.endsWith("@nexo.local")
                    ? ""
                    : ` · ${proposal.providerEmail}`}
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium tracking-wide">{proposalCode(proposal.id)}</p>
              <p className="mt-1 text-muted-foreground">{formatLongDate(proposal.createdAt)}</p>
            </div>
          </header>

          {status !== "PENDING" ? (
            <div
              className={
                status === "REJECTED"
                  ? "mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                  : "mt-8 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
              }
            >
              {status === "REJECTED"
                ? "Este orçamento foi recusado."
                : status === "PAID"
                  ? "Este orçamento foi aprovado e o pagamento foi confirmado."
                  : "Este orçamento foi aprovado."}
            </div>
          ) : null}

          <section className="mt-10 grid border sm:grid-cols-3">
            <Info label="Cliente" value={proposal.clientName} />
            <Info label="Prazo" value={formatDays(proposal.estimatedDays)} />
            <Info label="Validade" value="15 dias" />
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Itens e valores
            </h2>
            <table className="w-full border-t text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="py-3 font-medium">Descrição</th>
                  <th className="py-3 text-center font-medium">Qtd</th>
                  <th className="py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {proposal.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-t">
                    <td className="py-3.5 pr-4">{item.name}</td>
                    <td className="py-3.5 text-center tabular-nums">{item.quantity}</td>
                    <td className="py-3.5 text-right tabular-nums">
                      {formatBRL(item.price * Math.max(1, item.quantity))}
                    </td>
                  </tr>
                ))}
                {proposal.hasFreight && proposal.freightAmount > 0 ? (
                  <tr className="border-t">
                    <td className="py-3.5 pr-4">Frete</td>
                    <td className="py-3.5 text-center tabular-nums">—</td>
                    <td className="py-3.5 text-right tabular-nums">{formatBRL(proposal.freightAmount)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="mt-8 border-t pt-5 text-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Materiais</p>
            <p className="mt-2 leading-6">{proposal.materialsNeeded}</p>
          </section>

          <section className="mt-10 flex flex-col gap-3 bg-primary px-5 py-6 text-primary-foreground sm:flex-row sm:items-end sm:justify-between print:bg-slate-900 print:text-white">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/70 print:text-slate-300">
                Valor total
              </p>
              <p className="mt-1 text-sm text-primary-foreground/75 print:text-slate-300">
                Pagamento a combinar com {proposal.companyName}
              </p>
            </div>
            <p className="font-display text-4xl tracking-tight tabular-nums sm:text-5xl">
              {formatBRL(proposal.totalAmount)}
            </p>
          </section>
        </div>

        <footer className="border-t px-5 py-4 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:px-12 print:hidden">
          Documento gerado no Nexos
        </footer>
      </article>

      <div className="no-print mx-auto mt-5 hidden max-w-3xl items-center gap-3 sm:flex">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <ActionButtons
            status={status}
            submitting={submitting}
            onApprove={() => updateStatus("PREPAID")}
            onReject={() => updateStatus("REJECTED")}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Salvar PDF
        </Button>
      </div>
      {error ? (
        <p className="no-print mx-auto mt-3 hidden max-w-3xl text-sm text-destructive sm:block" role="alert">
          {error}
        </p>
      ) : null}

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          <ActionButtons
            status={status}
            submitting={submitting}
            onApprove={() => updateStatus("PREPAID")}
            onReject={() => updateStatus("REJECTED")}
          />
        </div>
        <Button type="button" variant="ghost" className="mt-1 w-full" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Salvar PDF
        </Button>
        {error ? <p className="mt-2 text-center text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function ActionButtons({
  status,
  submitting,
  onApprove,
  onReject,
}: {
  status: ProposalStatus;
  submitting: "PREPAID" | "REJECTED" | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (status !== "PENDING") return null;

  return (
    <>
      <Button
        type="button"
        variant="success"
        size="lg"
        className="w-full"
        disabled={submitting !== null}
        onClick={onApprove}
      >
        <CheckCircle2 className="h-5 w-5" />
        {submitting === "PREPAID" ? "Aprovando..." : "Aprovar orçamento"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="w-full"
        disabled={submitting !== null}
        onClick={onReject}
      >
        <XCircle className="h-5 w-5" />
        {submitting === "REJECTED" ? "Recusando..." : "Recusar"}
      </Button>
    </>
  );
}

function ResultScreen({
  tone,
  title,
  text,
  onBack,
}: {
  tone: "success" | "danger";
  title: string;
  text: string;
  onBack: () => void;
}) {
  const success = tone === "success";
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md border bg-card px-8 py-12 text-center shadow-[0_30px_70px_-36px_rgba(22,32,28,0.45)]">
        {success ? (
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        ) : (
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
        )}
        <h1 className="mt-5 font-display text-4xl tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
        <Button type="button" className="mt-8 w-full" variant={success ? "success" : "outline"} onClick={onBack}>
          Ver orçamento
        </Button>
      </div>
    </div>
  );
}
