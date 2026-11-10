"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
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
import type { ProposalDraft, ProposalItem } from "@/lib/types";

type ProposalReviewFormProps = {
  draft: ProposalDraft;
  saving: boolean;
  onChange: (draft: ProposalDraft) => void;
  onBack: () => void;
  onSave: () => void;
};

export function ProposalReviewForm({ draft, saving, onChange, onBack, onSave }: ProposalReviewFormProps) {
  const itemsTotal = sumItems(draft.items);
  const myCost = sumItemCosts(draft.items);
  const saleTotal = proposalSaleTotal(draft.items, draft.hasFreight, draft.freightAmount);
  const margin = Math.round((saleTotal - myCost) * 100) / 100;

  function updateItem(index: number, patch: Partial<ProposalItem>) {
    const items = draft.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );
    onChange({ ...draft, items, total: proposalSaleTotal(items, draft.hasFreight, draft.freightAmount) });
  }

  function updateMoney(index: number, field: "price" | "cost", raw: string) {
    const value = raw === "" ? 0 : parseMoney(raw);
    updateItem(index, { [field]: Number.isFinite(value) ? value : 0 });
  }

  function changeQuantity(index: number, delta: number) {
    const current = itemQuantity(draft.items[index]?.quantity);
    updateItem(index, { quantity: Math.max(1, current + delta) });
  }

  function removeItem(index: number) {
    const items = draft.items.filter((_, itemIndex) => itemIndex !== index);
    onChange({ ...draft, items, total: proposalSaleTotal(items, draft.hasFreight, draft.freightAmount) });
  }

  function addItem() {
    const items = [...draft.items, { name: "", price: 0, cost: 0, quantity: 1 }];
    onChange({ ...draft, items, total: proposalSaleTotal(items, draft.hasFreight, draft.freightAmount) });
  }

  function setFreight(hasFreight: boolean, freightAmount = draft.freightAmount) {
    onChange({
      ...draft,
      hasFreight,
      freightAmount: hasFreight ? freightAmount : 0,
      total: proposalSaleTotal(draft.items, hasFreight, hasFreight ? freightAmount : 0),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Revisão</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Confira antes de enviar</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Ajuste quantidade, venda e o seu custo. O cliente vê quantidade e venda; o custo alimenta a
          Receita. Frete é opcional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">Cliente</Label>
        <Input
          id="clientName"
          value={draft.clientName}
          onChange={(event) => onChange({ ...draft, clientName: event.target.value })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Itens</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {draft.items.map((item, index) => (
            <li key={index} className="space-y-3 p-3">
              <Input
                aria-label={`Nome do item ${index + 1}`}
                value={item.name}
                placeholder="Descrição do item"
                onChange={(event) => updateItem(index, { name: event.target.value })}
              />
              <div className="grid gap-2 sm:grid-cols-[auto_8rem_8rem_auto] sm:items-center">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => changeQuantity(index, -1)}
                    disabled={itemQuantity(item.quantity) <= 1}
                    aria-label={`Diminuir quantidade do item ${index + 1}`}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                    {itemQuantity(item.quantity)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => changeQuantity(index, 1)}
                    aria-label={`Aumentar quantidade do item ${index + 1}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  aria-label={`Valor unitário de venda do item ${index + 1}`}
                  inputMode="decimal"
                  value={String(item.price)}
                  placeholder="Valor da venda"
                  onChange={(event) => updateMoney(index, "price", event.target.value)}
                />
                <Input
                  aria-label={`Meu custo unitário do item ${index + 1}`}
                  inputMode="decimal"
                  value={String(item.cost ?? 0)}
                  placeholder="Meu custo un."
                  onChange={(event) => updateMoney(index, "cost", event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Subtotal venda {formatBRL(item.price * itemQuantity(item.quantity))} · meu custo{" "}
                {formatBRL((item.cost ?? 0) * itemQuantity(item.quantity))}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="days">Prazo (dias)</Label>
          <Input
            id="days"
            inputMode="numeric"
            value={String(draft.estimatedDays)}
            onChange={(event) =>
              onChange({
                ...draft,
                estimatedDays: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="materials">Materiais</Label>
          <Input
            id="materials"
            value={draft.materialsNeeded}
            onChange={(event) => onChange({ ...draft, materialsNeeded: event.target.value })}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Frete</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Opcional. Se ativar, o valor aparece no orçamento do cliente e entra no total.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.hasFreight}
            onClick={() => setFreight(!draft.hasFreight, draft.freightAmount || 0)}
            className={
              draft.hasFreight
                ? "relative h-7 w-12 shrink-0 rounded-full bg-primary transition-colors"
                : "relative h-7 w-12 shrink-0 rounded-full bg-muted transition-colors"
            }
          >
            <span
              className={
                draft.hasFreight
                  ? "absolute left-6 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
                  : "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all"
              }
            />
          </button>
        </div>
        {draft.hasFreight ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="freight">Valor do frete</Label>
            <Input
              id="freight"
              inputMode="decimal"
              value={String(draft.freightAmount || 0)}
              onChange={(event) => {
                const value = event.target.value === "" ? 0 : parseMoney(event.target.value);
                setFreight(true, Number.isFinite(value) ? value : 0);
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
            {draft.hasFreight ? formatBRL(draft.freightAmount) : "—"}
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

      <details className="rounded-xl bg-muted px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Relato original</summary>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{draft.description}</p>
      </details>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          Voltar ao texto
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar e gerar link"}
        </Button>
      </div>
    </div>
  );
}
