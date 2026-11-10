import type { Product, Proposal, User } from "@prisma/client";
import { toProposalItems } from "@/lib/money";
import type { FinanceProposal, OwnerProposal, ProposalListItem, PublicProposal, StockProduct } from "@/lib/types";

export function toStockProduct(product: Product): StockProduct {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    quantity: product.quantity,
    minQuantity: product.minQuantity,
    unitCost: product.unitCost,
    unitPrice: product.unitPrice,
    notes: product.notes,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toListItem(proposal: Proposal): ProposalListItem {
  const items = toProposalItems(proposal.items);
  return {
    id: proposal.id,
    clientName: proposal.clientName,
    totalAmount: proposal.totalAmount,
    status: proposal.status,
    estimatedDays: proposal.estimatedDays,
    createdAt: proposal.createdAt.toISOString(),
    itemsCount: items.length,
  };
}

export function toFinanceProposal(proposal: Proposal): FinanceProposal {
  return {
    id: proposal.id,
    clientName: proposal.clientName,
    totalAmount: proposal.totalAmount,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
    items: toProposalItems(proposal.items),
    hasFreight: proposal.hasFreight,
    freightAmount: proposal.freightAmount,
  };
}

export function toOwnerProposal(proposal: Proposal): OwnerProposal {
  return {
    id: proposal.id,
    clientName: proposal.clientName,
    description: proposal.description,
    items: toProposalItems(proposal.items),
    totalAmount: proposal.totalAmount,
    status: proposal.status,
    estimatedDays: proposal.estimatedDays,
    materialsNeeded: proposal.materialsNeeded,
    hasFreight: proposal.hasFreight,
    freightAmount: proposal.freightAmount,
    createdAt: proposal.createdAt.toISOString(),
  };
}

export function toPublicProposal(proposal: Proposal & { user: User }): PublicProposal {
  return {
    id: proposal.id,
    clientName: proposal.clientName,
    description: proposal.description,
    items: toProposalItems(proposal.items).map(({ name, price, quantity }) => ({ name, price, quantity })),
    totalAmount: proposal.totalAmount,
    status: proposal.status,
    estimatedDays: proposal.estimatedDays,
    materialsNeeded: proposal.materialsNeeded,
    hasFreight: proposal.hasFreight,
    freightAmount: proposal.freightAmount,
    createdAt: proposal.createdAt.toISOString(),
    companyName: proposal.user.companyName,
    providerName: proposal.user.name,
    providerEmail: proposal.user.email,
  };
}
