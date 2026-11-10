"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Copy, ExternalLink, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDays, formatShortDate } from "@/lib/money";
import type { ProposalListItem, ProposalStatus } from "@/lib/types";

export function ProposalList({ proposals }: { proposals: ProposalListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(proposals);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(proposals);
  }, [proposals]);

  const pending = items.filter((item) => item.status === "PENDING");
  const rejected = items.filter((item) => item.status === "REJECTED");
  const prepaidTotal = items
    .filter((item) => item.status === "PREPAID")
    .reduce((sum, item) => sum + item.totalAmount, 0);

  async function copyLink(id: string) {
    const url = `${window.location.origin}/proposal/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  async function markPaid(id: string) {
    setPayingId(id);
    try {
      const response = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" satisfies ProposalStatus }),
      });
      if (!response.ok) return;
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status: "PAID" } : item)),
      );
      router.refresh();
    } finally {
      setPayingId(null);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    const response = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!response.ok) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Painel</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Orçamentos</h1>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/new">
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Link>
        </Button>
      </div>

      <section className="mt-8 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
        <Stat label="Em aberto" value={String(pending.length)} hint="Aguardando o cliente" />
        <Stat label="Pré-pago" value={formatBRL(prepaidTotal)} hint="Aprovados, aguardando pagamento" />
        <Stat label="Recusados" value={String(rejected.length)} hint="Pedem ajuste ou novo envio" />
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Histórico</h2>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "orçamento" : "orçamentos"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="font-display text-3xl tracking-tight">Nenhum orçamento ainda</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Fale ou escreva o serviço. A IA separa itens, prazo e valor, e você envia um link com a cara da sua empresa.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/new">Criar o primeiro</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {items.map((proposal) => (
                <li key={proposal.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">{proposal.clientName}</h3>
                        <StatusBadge status={proposal.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatShortDate(proposal.createdAt)} · {formatDays(proposal.estimatedDays)} ·{" "}
                        {proposal.itemsCount} {proposal.itemsCount === 1 ? "item" : "itens"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{formatBRL(proposal.totalAmount)}</p>
                  </div>
                  <RowActions
                    proposal={proposal}
                    copied={copiedId === proposal.id}
                    confirming={pendingDelete === proposal.id}
                    deleting={deletingId === proposal.id}
                    paying={payingId === proposal.id}
                    onCopy={() => copyLink(proposal.id)}
                    onAskDelete={() => setPendingDelete(proposal.id)}
                    onDelete={() => remove(proposal.id)}
                    onMarkPaid={() => markPaid(proposal.id)}
                  />
                </li>
              ))}
            </ul>

            <table className="hidden w-full text-sm md:table">
              <thead className="bg-muted/70 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Prazo</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((proposal) => (
                  <tr key={proposal.id} className="border-t">
                    <td className="px-5 py-4">
                      <p className="font-medium">{proposal.clientName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatShortDate(proposal.createdAt)} · {proposal.itemsCount}{" "}
                        {proposal.itemsCount === 1 ? "item" : "itens"}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">{formatDays(proposal.estimatedDays)}</td>
                    <td className="px-3 py-4 text-right font-semibold tabular-nums">
                      {formatBRL(proposal.totalAmount)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <RowActions
                          proposal={proposal}
                          copied={copiedId === proposal.id}
                          confirming={pendingDelete === proposal.id}
                          deleting={deletingId === proposal.id}
                          paying={payingId === proposal.id}
                          onCopy={() => copyLink(proposal.id)}
                          onAskDelete={() => setPendingDelete(proposal.id)}
                          onDelete={() => remove(proposal.id)}
                          onMarkPaid={() => markPaid(proposal.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-4xl tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function RowActions({
  proposal,
  copied,
  confirming,
  deleting,
  paying,
  onCopy,
  onAskDelete,
  onDelete,
  onMarkPaid,
}: {
  proposal: ProposalListItem;
  copied: boolean;
  confirming: boolean;
  deleting: boolean;
  paying: boolean;
  onCopy: () => void;
  onAskDelete: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 md:mt-0">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/proposal/${proposal.id}`}>
          <ExternalLink className="h-4 w-4" />
          Abrir
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/proposals/${proposal.id}/edit`}>
          <Wallet className="h-4 w-4" />
          Meus custos
        </Link>
      </Button>
      <Button variant="outline" size="sm" onClick={onCopy}>
        <Copy className="h-4 w-4" />
        {copied ? "Copiado" : "Link"}
      </Button>
      {proposal.status === "PREPAID" ? (
        <Button variant="success" size="sm" onClick={onMarkPaid} disabled={paying}>
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          Marcar pago
        </Button>
      ) : null}
      {confirming ? (
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Confirmar
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={onAskDelete}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      )}
    </div>
  );
}
