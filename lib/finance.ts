import { lineCostTotal, lineSaleTotal, roundMoney, sumItemCosts } from "@/lib/money";
import type { FinanceHighlight, FinanceProposal, ProposalItem, ProposalStatus } from "@/lib/types";

export type FinanceSummary = {
  paidRevenue: number;
  receivable: number;
  estimatedCost: number;
  realizedProfit: number;
  paidAverageTicket: number;
  paidCount: number;
  missingCostCount: number;
  mostExpensiveSaleItem: FinanceHighlight | null;
  highestDeliveryCost: FinanceHighlight | null;
  largestPaidProposal: FinanceHighlight | null;
  revenueByMonth: Array<{ month: string; label: string; total: number }>;
  statusBreakdown: Array<{ status: ProposalStatus; label: string; count: number; total: number }>;
  topSaleItems: Array<{ name: string; total: number }>;
};

const STATUS_LABEL: Record<ProposalStatus, string> = {
  PENDING: "Pendente",
  PREPAID: "Pré-pago",
  PAID: "Pago",
  REJECTED: "Recusado",
};

export function buildFinanceSummary(proposals: FinanceProposal[]): FinanceSummary {
  const paid = proposals.filter((proposal) => proposal.status === "PAID");
  const prepaid = proposals.filter((proposal) => proposal.status === "PREPAID");
  const costBase = proposals.filter(
    (proposal) => proposal.status === "PREPAID" || proposal.status === "PAID",
  );

  const paidRevenue = roundMoney(paid.reduce((sum, proposal) => sum + proposal.totalAmount, 0));
  const receivable = roundMoney(prepaid.reduce((sum, proposal) => sum + proposal.totalAmount, 0));
  const estimatedCost = roundMoney(
    costBase.reduce((sum, proposal) => sum + sumItemCosts(proposal.items), 0),
  );
  const paidCost = roundMoney(paid.reduce((sum, proposal) => sum + sumItemCosts(proposal.items), 0));
  const realizedProfit = roundMoney(paidRevenue - paidCost);
  const paidAverageTicket = paid.length ? roundMoney(paidRevenue / paid.length) : 0;
  const missingCostCount = proposals.filter(
    (proposal) => proposal.items.length > 0 && sumItemCosts(proposal.items) === 0,
  ).length;

  return {
    paidRevenue,
    receivable,
    estimatedCost,
    realizedProfit,
    paidAverageTicket,
    paidCount: paid.length,
    missingCostCount,
    mostExpensiveSaleItem: findMostExpensiveSaleItem(proposals),
    highestDeliveryCost: findHighestDeliveryCost(proposals),
    largestPaidProposal: findLargestPaid(paid),
    revenueByMonth: buildRevenueByMonth(paid),
    statusBreakdown: buildStatusBreakdown(proposals),
    topSaleItems: buildTopSaleItems(proposals.flatMap((proposal) => proposal.items)),
  };
}

function findMostExpensiveSaleItem(proposals: FinanceProposal[]): FinanceHighlight | null {
  let best: FinanceHighlight | null = null;
  for (const proposal of proposals) {
    for (const item of proposal.items) {
      const value = lineSaleTotal(item);
      if (!best || value > best.value) {
        best = {
          proposalId: proposal.id,
          clientName: proposal.clientName,
          title: item.quantity > 1 ? `${item.name} (${item.quantity}x)` : item.name,
          value,
        };
      }
    }
  }
  return best;
}

function findHighestDeliveryCost(proposals: FinanceProposal[]): FinanceHighlight | null {
  let best: FinanceHighlight | null = null;
  for (const proposal of proposals) {
    const deliveryCost = sumItemCosts(proposal.items);
    if (deliveryCost <= 0) continue;
    const topItem =
      proposal.items.reduce<ProposalItem | null>((current, item) => {
        if (!current || lineCostTotal(item) > lineCostTotal(current)) return item;
        return current;
      }, null)?.name ?? "Itens";
    if (!best || deliveryCost > best.value) {
      best = {
        proposalId: proposal.id,
        clientName: proposal.clientName,
        title: topItem,
        value: deliveryCost,
      };
    }
  }
  return best;
}

function findLargestPaid(paid: FinanceProposal[]): FinanceHighlight | null {
  return paid.reduce<FinanceHighlight | null>((best, proposal) => {
    if (!best || proposal.totalAmount > best.value) {
      return {
        proposalId: proposal.id,
        clientName: proposal.clientName,
        title: proposal.clientName,
        value: proposal.totalAmount,
      };
    }
    return best;
  }, null);
}

function buildRevenueByMonth(paid: FinanceProposal[]) {
  const map = new Map<string, number>();
  for (const proposal of paid) {
    const date = new Date(proposal.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, roundMoney((map.get(key) ?? 0) + proposal.totalAmount));
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, total]) => {
      const [year, monthNumber] = month.split("-");
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
        new Date(Number(year), Number(monthNumber) - 1, 1),
      );
      return { month, label, total };
    });
}

function buildStatusBreakdown(proposals: FinanceProposal[]) {
  const order: ProposalStatus[] = ["PENDING", "PREPAID", "PAID", "REJECTED"];
  return order.map((status) => {
    const matched = proposals.filter((proposal) => proposal.status === status);
    return {
      status,
      label: STATUS_LABEL[status],
      count: matched.length,
      total: roundMoney(matched.reduce((sum, proposal) => sum + proposal.totalAmount, 0)),
    };
  });
}

function buildTopSaleItems(items: ProposalItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.name.trim() || "Item";
    map.set(key, roundMoney((map.get(key) ?? 0) + lineSaleTotal(item)));
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
