"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatPlanPrice,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
  isSubscriptionPlanId,
} from "@/lib/subscription-plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubscribeFormProps = {
  initialPlanId: string;
  status: string;
};

export function SubscribeForm({ initialPlanId, status }: SubscribeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paidReturn = searchParams.get("paid") === "1";
  const [planId, setPlanId] = useState<SubscriptionPlanId>(
    isSubscriptionPlanId(initialPlanId) ? initialPlanId : "quarterly",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(paidReturn);
  const [message, setMessage] = useState<string | null>(
    paidReturn
      ? "Pagamento recebido. Confirmando sua assinatura..."
      : status === "PENDING"
        ? "Sua conta está pronta. Finalize o pagamento para liberar o acesso."
        : status === "CANCELLED"
          ? "Sua assinatura foi cancelada. Escolha um plano para reativar."
          : "Escolha um plano para continuar usando o Nexos.",
  );

  useEffect(() => {
    if (!paidReturn) return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      const response = await fetch("/api/subscription/status", { method: "POST" });
      const data = (await response.json()) as { status?: string };
      if (cancelled) return;

      if (data.status === "ACTIVE") {
        setChecking(false);
        setMessage("Assinatura ativa. Entrando...");
        router.replace("/");
        router.refresh();
        return;
      }

      if (attempts < 8) {
        window.setTimeout(poll, 1500);
        return;
      }

      setChecking(false);
      setMessage(
        "Ainda não confirmamos o pagamento. Se você já pagou, aguarde alguns segundos e atualize a página.",
      );
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [paidReturn, router]);

  async function startCheckout() {
    setError(null);
    setPending(true);
    const response = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = (await response.json()) as {
      error?: string;
      checkoutUrl?: string;
      alreadyActive?: boolean;
    };
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Não foi possível abrir o pagamento.");
      return;
    }

    if (data.alreadyActive) {
      router.replace("/");
      router.refresh();
      return;
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    setError("Link de pagamento indisponível.");
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-xl border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="grid gap-2">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const selected = planId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlanId(plan.id)}
              disabled={checking}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-input bg-card hover:bg-secondary/60",
              )}
            >
              <span>
                <span className="block text-sm font-semibold">
                  {plan.name}
                  {plan.highlight ? (
                    <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-primary">
                      Popular
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {plan.description}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatPlanPrice(plan)}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        className="w-full"
        disabled={pending || checking}
        onClick={() => void startCheckout()}
      >
        {checking
          ? "Confirmando..."
          : pending
            ? "Abrindo pagamento..."
            : "Pagar assinatura"}
      </Button>
    </div>
  );
}
