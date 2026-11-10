import { cn } from "@/lib/utils";

/**
 * Marca Nexos: lettermark em nós e ligações (nexo = conexão).
 * Usa currentColor para funcionar no painel escuro e no claro.
 */
export function BrandMark({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
        inverted ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-[70%] w-[70%]" fill="none">
        {/* Hastes do N */}
        <path
          d="M9.5 8.5 V23.5 M22.5 8.5 V23.5 M9.5 8.5 L22.5 23.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Nós nas extremidades e no cruzamento */}
        <circle cx="9.5" cy="8.5" r="2.4" fill="currentColor" />
        <circle cx="9.5" cy="23.5" r="2.4" fill="currentColor" />
        <circle cx="22.5" cy="8.5" r="2.4" fill="currentColor" />
        <circle cx="22.5" cy="23.5" r="2.4" fill="currentColor" />
        <circle cx="16" cy="16" r="2.55" fill="currentColor" />
      </svg>
    </span>
  );
}
