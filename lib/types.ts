export type ProposalStatus = "PENDING" | "PREPAID" | "PAID" | "REJECTED";

export type ProposalItem = {
  name: string;
  price: number;
  cost: number;
  quantity: number;
};

export type CompanyProfile = {
  name: string;
  email: string;
  companyName: string;
};

export type ProposalListItem = {
  id: string;
  clientName: string;
  totalAmount: number;
  status: ProposalStatus;
  estimatedDays: number;
  createdAt: string;
  itemsCount: number;
};

export type PublicProposal = {
  id: string;
  clientName: string;
  description: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  status: ProposalStatus;
  estimatedDays: number;
  materialsNeeded: string;
  hasFreight: boolean;
  freightAmount: number;
  createdAt: string;
  companyName: string;
  providerName: string;
  providerEmail: string;
};

export type GeneratedProposal = {
  clientName: string;
  items: ProposalItem[];
  total: number;
  estimatedDays: number;
  materialsNeeded: string;
};

export type ProposalDraft = GeneratedProposal & {
  description: string;
  hasFreight: boolean;
  freightAmount: number;
};

export type FinanceProposal = {
  id: string;
  clientName: string;
  totalAmount: number;
  status: ProposalStatus;
  createdAt: string;
  items: ProposalItem[];
  hasFreight: boolean;
  freightAmount: number;
};

export type OwnerProposal = {
  id: string;
  clientName: string;
  description: string;
  items: ProposalItem[];
  totalAmount: number;
  status: ProposalStatus;
  estimatedDays: number;
  materialsNeeded: string;
  hasFreight: boolean;
  freightAmount: number;
  createdAt: string;
};

export type FinanceHighlight = {
  proposalId: string;
  clientName: string;
  title: string;
  value: number;
};

export type StockProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  unitPrice: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
