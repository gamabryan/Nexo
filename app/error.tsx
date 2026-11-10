"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-4xl tracking-tight">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não conseguimos carregar esta tela. Tente novamente.
        </p>
        <Button className="mt-6" onClick={reset}>
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
