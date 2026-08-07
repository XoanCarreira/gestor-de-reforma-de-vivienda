// Presuposto
export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  notes?: string;
}

// Origen del movimiento de gasto: de dónde procede el registro.
// 'invoice' se crea automáticamente al consolidar una factura, 'quick' desde
// el cargo rápido de la partida, y 'manual' desde un ajuste directo del histórico.
export type ExpenseSource = 'invoice' | 'quick' | 'manual';

// Movimiento individual de gasto asociado a una partida de presupuesto.
// Es la fuente de verdad del detalle: BudgetCategory.spent sigue siendo el
// acumulado rápido usado para cálculos (barras de progreso, KPIs...), pero
// cada BudgetExpense permite reconstruir de dónde salió cada euro gastado.
export interface BudgetExpense {
  id: string;
  categoryId: string;      // Referencia a BudgetCategory.id
  amount: number;
  date: string;             // YYYY-MM-DD, fecha del gasto (no de creación del registro)
  source: ExpenseSource;
  description?: string;     // Ej. "Factura: Alicatado baño" o nota manual
  invoiceId?: string;       // Solo si source === 'invoice', para trazabilidad con la factura origen
  createdAt: string;        // Timestamp ISO de creación del registro (auditoría)
}

// Proveedores
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

// Estado Hitos
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

// Hitos
export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  status: MilestoneStatus;
  completedDate?: string; // YYYY-MM-DD
}

// Facturas
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

// Fotos de Progreso
export interface ProgressPhoto {
  id: string;
  title: string;
  notes: string;
  date: string; // YYYY-MM-DD
  base64Data: string; // Base64 encoded image
  isSynced: boolean;
  isLocalOnly: boolean;
}

// Entradas de Fondos
export interface FundEntry {
  id: string;
  source: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

// Backup da aplicación
export interface AppBackup {
  version: number;
  exportedAt: string;
  budget: BudgetCategory[];
  suppliers: Supplier[];
  milestones: Milestone[];
  invoices: Invoice[];
  photos: ProgressPhoto[];
  funds: FundEntry[];
  budgetExpenses: BudgetExpense[]; // Movimientos detallados de gasto por partida
}
