import { Badge } from "@/components/ui/badge";
import type { ProposalStatus } from "@/lib/types";

const STATUS_META: Record<
  ProposalStatus,
  { label: string; variant: "warning" | "success" | "destructive" | "secondary" | "default" }
> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PREPAID: { label: "Pré-pago", variant: "secondary" },
  PAID: { label: "Pago", variant: "success" },
  REJECTED: { label: "Recusado", variant: "destructive" },
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
