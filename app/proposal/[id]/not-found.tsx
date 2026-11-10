import Link from "next/link";

export default function ProposalNotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-4xl tracking-tight">Orçamento não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esse link não existe ou o orçamento foi excluído.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
