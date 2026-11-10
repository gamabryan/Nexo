"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatPlanPrice,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/lib/subscription-plans";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [planId, setPlanId] = useState<SubscriptionPlanId>("quarterly");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      planId,
    };
    const confirmation = String(form.get("confirmation") ?? "");

    if (payload.password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      error?: string;
      checkoutUrl?: string;
    };

    if (!response.ok) {
      setPending(false);
      setError(data.error || "Não foi possível criar a conta.");
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    if (!result || result.error) {
      setPending(false);
      router.push("/login");
      return;
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    setPending(false);
    router.push("/subscribe");
    router.refresh();
  }

  return (
    <AuthFrame
      title="Criar conta"
      subtitle="Orçamentos, receita e estoque. Escolha um plano e pague com Pix para começar."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Plano de assinatura</legend>
          <div className="grid gap-2">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const selected = planId === plan.id;
              return (
                <label
                  key={plan.id}
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-input bg-card hover:bg-secondary/60",
                  )}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="planId"
                      value={plan.id}
                      checked={selected}
                      onChange={() => setPlanId(plan.id)}
                      className="mt-1"
                    />
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
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatPlanPrice(plan)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field id="name" label="Seu nome" type="text" autoComplete="name" />
        <Field id="companyName" label="Nome da empresa" type="text" autoComplete="organization" />
        <Field id="email" label="E-mail" type="email" autoComplete="email" />
        <Field id="password" label="Senha" type="password" autoComplete="new-password" />
        <Field id="confirmation" label="Confirmar senha" type="password" autoComplete="new-password" />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Redirecionando ao pagamento..." : "Criar conta e assinar"}
        </Button>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          Você será enviado à página segura da AbacatePay para pagar com Pix.
        </p>
      </form>
    </AuthFrame>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} autoComplete={autoComplete} required />
    </div>
  );
}
