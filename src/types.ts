export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  service: string; // E.g., 'Fontanería', 'Albañilería'
  phone: string;
  email: string;
  contractedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  rating?: number; // 1-5 stars
  notes?: string;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  status: MilestoneStatus;
  completedDate?: string; // YYYY-MM-DD
}

export interface Invoice {
  id: string;
  title: string;
  amount: number;
  supplierId: string;
  date: string; // YYYY-MM-DD
  base64Data?: string; // File contents (PDF or Image)
  fileName: string;
  isSynced: boolean;
  isLocalOnly: boolean;
}

export interface ProgressPhoto {
  id: string;
  title: string;
  notes: string;
  date: string; // YYYY-MM-DD
  base64Data: string; // Base64 encoded image
  isSynced: boolean;
  isLocalOnly: boolean;
}

export interface FundEntry {
  id: string;
  source: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface AppBackup {
  version: number;
  exportedAt: string;
  budget: BudgetCategory[];
  suppliers: Supplier[];
  milestones: Milestone[];
  invoices: Invoice[];
  photos: ProgressPhoto[];
  funds: FundEntry[];
}
