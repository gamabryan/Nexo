"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatBRL,
  itemQuantity,
  parseMoney,
  proposalSaleTotal,
  sumItemCosts,
  sumItems,
} from "@/lib/money";
import type { OwnerProposal, ProposalItem } from "@/lib/types";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function ProposalCostEditor({ proposal }: { proposal: OwnerProposal }) {
  const router = useRouter();
  const [items, setItems] = useState<ProposalItem[]>(
    proposal.items.map((item) => ({ ...item, quantity: itemQuantity(item.quantity) })),
  );
  const [hasFreight, setHasFreight] = useState(proposal.hasFreight);
  const [freightAmount, setFreightAmount] = useState(proposal.freightAmount);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const skipAutoSaveRef = useRef(true);
  const saveRequestRef = useRef(0);

  const itemsTotal = sumItems(items);
  const myCost = sumItemCosts(items);
  const saleTotal = proposalSaleTotal(items, hasFreight, freightAmount);
  const margin = Math.round((saleTotal - myCost) * 100) / 100;

  function updateMoney(index: number, field: "price" | "cost", raw: string) {
    const value = raw === "" ? 0 : parseMoney(raw);
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: Number.isFinite(value) ? value : 0 }
          : item,
      ),
    );
  }

  function changeQuantity(index: number, delta: number) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, quantity: Math.max(1, itemQuantity(item.quantity) + delta) };
      }),
    );
  }

  useEffect(() => {
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    if (
      items.some(
        (item) =>
          item.price < 0 ||
          Number.isNaN(item.price) ||
          item.cost < 0 ||
          Number.isNaN(item.cost),
      )
    ) {
      setError("Os valores de venda e custo precisam ser números válidos.");
      setStatus("error");
      return;
    }
    if (hasFreight && (!Number.isFinite(freightAmount) || freightAmount <= 0)) {
      setError("Informe o valor do frete ou desative a opção.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("pending");
    const requestId = ++saveRequestRef.current;
    const timer = window.setTimeout(async () => {
      setStatus("saving");
      try {
        const response = await fetch(`/api/proposals/${proposal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: proposal.clientName,
            description: proposal.description,
            materialsNeeded: proposal.materialsNeeded,
            estimatedDays: proposal.estimatedDays,
            items,
            hasFreight,
            freightAmount: hasFreight ? freightAmount : 0,
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Não foi possível salvar.");
        }
        if (requestId !== saveRequestRef.current) return;
        setStatus("saved");
        router.refresh();
      } catch (cause) {
        if (requestId !== saveRequestRef.current) return;
        setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
        setStatus("error");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    items,
    hasFreight,
    freightAmount,
    proposal.id,
    proposal.clientName,
    proposal.description,
    proposal.materialsNeeded,
    proposal.estimatedDays,
    router,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Orçamento
          </p>
          <StatusBadge status={proposal.status} />
          <SaveFeedback status={status} />
        </div>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Meu custo e frete</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Ajuste o valor da venda e quanto cada produto custa para você e, se quiser, um frete no
          orçamento de <span className="font-medium text-foreground">{proposal.clientName}</span>. Os
          totais atualizam na hora e as alterações são salvas automaticamente.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-[1fr_auto_9rem_8rem] gap-3 border-b bg-muted/50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>Item</span>
          <span className="text-center">Qtd</span>
          <span className="text-right">Valor da venda</span>
          <span className="text-right">Meu custo</span>
        </div>
        <ul className="divide-y">
          {items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="grid grid-cols-[1fr_auto_9rem_8rem] items-center gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <Label className="sr-only" htmlFor={`price-${index}`}>
                  Valor da venda de {item.name}
                </Label>
                <Label className="sr-only" htmlFor={`cost-${index}`}>
                  Meu custo de {item.name}
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => changeQuantity(index, -1)}
                  disabled={itemQuantity(item.quantity) <= 1}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                  {itemQuantity(item.quantity)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => changeQuantity(index, 1)}
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Input
                id={`price-${index}`}
                className="text-right"
                inputMode="decimal"
                value={String(item.price)}
                onChange={(event) => updateMoney(index, "price", event.target.value)}
              />
              <Input
                id={`cost-${index}`}
                className="text-right"
                inputMode="decimal"
                value={String(item.cost ?? 0)}
                onChange={(event) => updateMoney(index, "cost", event.target.value)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Frete</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Opcional. Se ativar, aparece no orçamento do cliente e soma no total.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hasFreight}
            onClick={() => setHasFreight((current) => !current)}
            className={
              hasFreight
                ? "relative h-7 w-12 shrink-0 rounded-full bg-primary transition-colors"
                : "relative h-7 w-12 shrink-0 rounded-full bg-muted transition-colors"
            }
          >
            <span
              className={
                hasFreight
                  ? "absolute left-6 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
                  : "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
              }
            />
          </button>
        </div>
        {hasFreight ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="freight">Valor do frete</Label>
            <Input
              id="freight"
              inputMode="decimal"
              value={String(freightAmount || 0)}
              onChange={(event) => {
                const value = event.target.value === "" ? 0 : parseMoney(event.target.value);
                setFreightAmount(Number.isFinite(value) ? value : 0);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Itens</p>
          <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{formatBRL(itemsTotal)}</p>
        </div>
        <div className="bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Frete</p>
          <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">
            {hasFreight ? formatBRL(freightAmount) : "—"}
          </p>
        </div>
        <div className="bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Meu custo</p>
          <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{formatBRL(myCost)}</p>
        </div>
        <div className="bg-primary px-4 py-4 text-primary-foreground">
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/70">
            Total · margem {formatBRL(margin)}
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{formatBRL(saleTotal)}</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {status === "saved" ? (
        <p className="text-sm text-emerald-800">
          Atualizado.{" "}
          <Link href="/finance" className="underline underline-offset-2">
            Ver na Receita
          </Link>
        </p>
      ) : null}

      <Button type="button" variant="outline" asChild>
        <Link href="/finance">Ir para Receita</Link>
      </Button>
    </div>
  );
}

function SaveFeedback({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const label =
    status === "pending"
      ? "Alterando…"
      : status === "saving"
        ? "Salvando…"
        : status === "saved"
          ? "Salvo"
          : "Erro ao salvar";

  return (
    <span
      className={
        status === "error"
          ? "text-[11px] font-medium uppercase tracking-[0.14em] text-destructive"
          : status === "saved"
            ? "text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700"
            : "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
      }
      aria-live="polite"
    >
      {label}
    </span>
  );
}
