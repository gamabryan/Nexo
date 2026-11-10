"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { ProposalReviewForm } from "@/components/proposal-review-form";
import { VoiceComposer } from "@/components/voice-composer";
import { Button } from "@/components/ui/button";
import { proposalSaleTotal } from "@/lib/money";
import type { GeneratedProposal, ProposalDraft } from "@/lib/types";

type Step = "input" | "loading" | "review" | "saved";

export function NewProposalFlow() {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setError("Descreva o serviço com um pouco mais de detalhe antes de gerar.");
      return;
    }

    setError(null);
    setStep("loading");

    try {
      const response = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = (await response.json()) as GeneratedProposal & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível gerar o orçamento.");
      }

      setDraft({
        clientName: data.clientName,
        items: data.items.map((item) => ({
          name: item.name,
          price: item.price,
          cost: Number.isFinite(item.cost) ? item.cost : 0,
          quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? Math.round(item.quantity) : 1,
        })),
        total: data.total,
        estimatedDays: data.estimatedDays,
        materialsNeeded: data.materialsNeeded,
        description: trimmed,
        hasFreight: false,
        freightAmount: 0,
      });
      setStep("review");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "TimeoutError") {
        setError("A geração demorou demais. Tente de novo em alguns segundos.");
      } else {
        setError(cause instanceof Error ? cause.message : "Falha ao falar com o Gemini.");
      }
      setStep("input");
    }
  }

  async function save() {
    if (!draft) return;
    const items = draft.items
      .map((item) => ({
        name: item.name.trim(),
        price: item.price,
        cost: Number.isFinite(item.cost) && item.cost >= 0 ? item.cost : 0,
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? Math.round(item.quantity) : 1,
      }))
      .filter((item) => item.name);

    if (!draft.clientName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (items.length === 0) {
      setError("Adicione pelo menos um item com nome.");
      return;
    }
    if (items.some((item) => item.price < 0 || Number.isNaN(item.price) || item.cost < 0 || Number.isNaN(item.cost))) {
      setError("Os valores e custos dos itens precisam ser números válidos.");
      return;
    }
    if (draft.hasFreight && (!Number.isFinite(draft.freightAmount) || draft.freightAmount <= 0)) {
      setError("Informe o valor do frete ou desative a opção.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: draft.clientName.trim(),
          description: draft.description,
          items,
          estimatedDays: draft.estimatedDays,
          materialsNeeded: draft.materialsNeeded.trim(),
          hasFreight: draft.hasFreight,
          freightAmount: draft.hasFreight ? draft.freightAmount : 0,
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.error || "Não foi possível salvar o orçamento.");
      }
      setSavedPath(`/proposal/${data.id}`);
      setSavedUrl(`${window.location.origin}/proposal/${data.id}`);
      setStep("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(savedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (step === "loading") {
    return (
      <div className="space-y-8">
        <Steps current={1} />
        <div className="border bg-card px-6 py-20 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-5 font-display text-3xl tracking-tight">Montando o orçamento</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Se a IA estiver lenta, tentamos de novo automaticamente.
          </p>
        </div>
      </div>
    );
  }

  if (step === "saved") {
    return (
      <div className="space-y-8">
        <Steps current={3} />
        <div className="border bg-card px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-800">
            <Check className="h-5 w-5" />
          </span>
          <h1 className="mt-5 font-display text-4xl tracking-tight">Link pronto para enviar</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            O cliente abre o orçamento, aprova ou recusa. Na página também dá para salvar em PDF.
          </p>
          <div className="mx-auto mt-6 max-w-xl border bg-muted px-4 py-3 text-left text-sm break-all">{savedUrl}</div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={copy}>
              <Copy className="h-4 w-4" />
              {copied ? "Copiado" : "Copiar link"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={savedPath}>Abrir orçamento</Link>
            </Button>
            <Button type="button" variant="secondary" asChild>
              <Link href="/">Voltar ao painel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "review" && draft) {
    return (
      <div className="space-y-6">
        <Steps current={2} />
        {error ? <ErrorBanner message={error} /> : null}
        <ProposalReviewForm
          draft={{
            ...draft,
            total: proposalSaleTotal(draft.items, draft.hasFreight, draft.freightAmount),
          }}
          saving={saving}
          onChange={setDraft}
          onBack={() => {
            setError(null);
            setStep("input");
          }}
          onSave={save}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Steps current={1} />
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">Conte o serviço</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Pode ser bagunçado. Fale ou escreva materiais, prazo, mão de obra e o nome do cliente.
        </p>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="border bg-card p-4 sm:p-6">
        <VoiceComposer value={text} onChange={setText} onError={setError} />
        <Button type="button" className="mt-4 w-full" size="lg" onClick={generate} disabled={!text.trim()}>
          <Sparkles className="h-4 w-4" />
          Gerar orçamento
        </Button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/25 bg-red-50 px-4 py-3 text-sm text-destructive" role="alert">
      {message}
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Relato", "Revisão", "Envio"];
  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = number === current;
        return (
          <li key={label} className={active ? "text-foreground" : undefined}>
            <span className="mr-2 tabular-nums">{String(number).padStart(2, "0")}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
