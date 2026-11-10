"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyProfile } from "@/lib/types";

export function SettingsForm({ initial }: { initial: CompanyProfile }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      setMessage("Dados salvos. O nome da empresa aparece no link do cliente.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Cadastro</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Sua empresa</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Esses dados vão no cabeçalho do orçamento que o cliente recebe.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <Field
            id="companyName"
            label="Nome da empresa"
            value={form.companyName}
            onChange={(companyName) => setForm((current) => ({ ...current, companyName }))}
          />
          <Field
            id="name"
            label="Seu nome"
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
          />
          <Field
            id="email"
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(email) => setForm((current) => ({ ...current, email }))}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar dados"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}
