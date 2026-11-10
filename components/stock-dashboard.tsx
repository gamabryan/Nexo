"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, roundMoney } from "@/lib/money";
import type { StockProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProductForm = {
  name: string;
  sku: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  unitCost: string;
  unitPrice: string;
  notes: string;
};

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  unit: "un",
  quantity: "0",
  minQuantity: "0",
  unitCost: "0",
  unitPrice: "0",
  notes: "",
};

function toForm(product: StockProduct): ProductForm {
  return {
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    quantity: String(product.quantity),
    minQuantity: String(product.minQuantity),
    unitCost: String(product.unitCost),
    unitPrice: String(product.unitPrice),
    notes: product.notes,
  };
}

function isLowStock(product: StockProduct) {
  return product.minQuantity > 0 && product.quantity <= product.minQuantity;
}

export function StockDashboard({ products }: { products: StockProduct[] }) {
  const router = useRouter();
  const [items, setItems] = useState(products);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setItems(products);
  }, [products]);

  const summary = useMemo(() => {
    const totalSkus = items.length;
    const lowStock = items.filter(isLowStock).length;
    const stockValue = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0));
    const units = roundMoney(items.reduce((sum, item) => sum + item.quantity, 0));
    return { totalSkus, lowStock, stockValue, units };
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.sku.toLowerCase().includes(needle) ||
        item.notes.toLowerCase().includes(needle),
    );
  }, [items, query]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  }

  function startEdit(product: StockProduct) {
    setEditingId(product.id);
    setForm(toForm(product));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        unit: form.unit,
        quantity: form.quantity,
        minQuantity: form.minQuantity,
        unitCost: form.unitCost,
        unitPrice: form.unitPrice,
        notes: form.notes,
      };

      const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as StockProduct & { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o produto.");

      setItems((current) => {
        if (editingId) {
          return current
            .map((item) => (item.id === editingId ? data : item))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        }
        return [...current, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      });
      resetForm();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function adjust(id: string, delta: number) {
    setAdjustingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = (await response.json()) as StockProduct & { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível ajustar o estoque.");
      setItems((current) => current.map((item) => (item.id === id ? data : item)));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao ajustar estoque.");
    } finally {
      setAdjustingId(null);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir.");
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      setPendingDelete(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao excluir.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Estoque</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Produtos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre materiais e produtos, acompanhe quantidade, custo e alertas de estoque baixo.
        </p>
      </div>

      {summary.lowStock > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {summary.lowStock} {summary.lowStock === 1 ? "produto está" : "produtos estão"} no mínimo ou abaixo.
          Reponha para não faltar no serviço.
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <section className="mt-8 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Produtos" value={String(summary.totalSkus)} hint="Itens cadastrados" />
        <Kpi label="Unidades" value={formatQty(summary.units)} hint="Soma das quantidades" />
        <Kpi label="Valor em estoque" value={formatBRL(summary.stockValue)} hint="Qtd × custo" />
        <Kpi label="Estoque baixo" value={String(summary.lowStock)} hint="No mínimo ou abaixo" />
      </section>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">{editingId ? "Editar produto" : "Novo produto"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {editingId ? "Atualize os dados e salve." : "Preencha para incluir no estoque."}
          </p>
        </div>
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            id="name"
            label="Nome"
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
            className="sm:col-span-2"
            required
          />
          <Field
            id="sku"
            label="Código / SKU"
            value={form.sku}
            onChange={(sku) => setForm((current) => ({ ...current, sku }))}
          />
          <Field
            id="unit"
            label="Unidade"
            value={form.unit}
            onChange={(unit) => setForm((current) => ({ ...current, unit }))}
            required
          />
          <Field
            id="quantity"
            label="Quantidade"
            value={form.quantity}
            onChange={(quantity) => setForm((current) => ({ ...current, quantity }))}
            inputMode="decimal"
          />
          <Field
            id="minQuantity"
            label="Estoque mínimo"
            value={form.minQuantity}
            onChange={(minQuantity) => setForm((current) => ({ ...current, minQuantity }))}
            inputMode="decimal"
          />
          <Field
            id="unitCost"
            label="Custo unitário (R$)"
            value={form.unitCost}
            onChange={(unitCost) => setForm((current) => ({ ...current, unitCost }))}
            inputMode="decimal"
          />
          <Field
            id="unitPrice"
            label="Preço de venda (R$)"
            value={form.unitPrice}
            onChange={(unitPrice) => setForm((current) => ({ ...current, unitPrice }))}
            inputMode="decimal"
          />
          <div className="space-y-2 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={2}
              className="min-h-[88px]"
              placeholder="Fornecedor, localização na prateleira…"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar produto"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar edição
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Inventário</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
            </p>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, código…"
            className="sm:max-w-xs"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-display text-3xl tracking-tight">
              {items.length === 0 ? "Nenhum produto ainda" : "Nenhum resultado"}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {items.length === 0
                ? "Cadastre parafusos, tintas, peças e outros materiais que você usa nos serviços."
                : "Tente outro termo de busca."}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((product) => {
              const low = isLowStock(product);
              const busy = adjustingId === product.id || deletingId === product.id;
              return (
                <li key={product.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">{product.name}</h3>
                        {low ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950">
                            Estoque baixo
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {product.sku ? `SKU ${product.sku} · ` : ""}
                        Custo {formatBRL(product.unitCost)}
                        {product.unitPrice > 0 ? ` · Venda ${formatBRL(product.unitPrice)}` : ""}
                        {product.minQuantity > 0 ? ` · Mín. ${formatQty(product.minQuantity)} ${product.unit}` : ""}
                      </p>
                      {product.notes ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{product.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-1 py-1",
                          low ? "border-amber-300 bg-amber-50" : "bg-muted/40",
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={busy || product.quantity <= 0}
                          onClick={() => adjust(product.id, -1)}
                          aria-label="Remover 1 do estoque"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums">
                          {formatQty(product.quantity)} {product.unit}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={busy}
                          onClick={() => adjust(product.id, 1)}
                          aria-label="Adicionar 1 ao estoque"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => startEdit(product)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>

                      {pendingDelete === product.id ? (
                        <>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() => remove(product.id)}
                          >
                            {deletingId === product.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Confirmar"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => setPendingDelete(null)}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => setPendingDelete(product.id)}
                          aria-label="Excluir produto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
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

function Field({
  id,
  label,
  value,
  onChange,
  className,
  required,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        inputMode={inputMode}
      />
    </div>
  );
}

function formatQty(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

