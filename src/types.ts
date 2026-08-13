// --- Presuposto ---

// Registro tal cual se persiste en IndexedDB. NO incluye 'spent': el gasto
// acumulado ya no se guarda como número redundante. Se deriva SIEMPRE a
// partir del histórico real de movementos (BudgetExpense[]), para que sea
// estructuralmente imposible que se desincronice de la verdad auditable.
// Ver utils/money.ts y hooks/useReformaData.ts.
export interface BudgetCategoryRecord {
  id: string;
  name: string;
  allocated: number;
  notes?: string;
}

// Versión enriquecida que consume la UI: añade 'spent', calculado en tiempo
// de lectura sumando BudgetExpense[] filtrados por categoryId. Nunca se
// persiste tal cual; solo BudgetCategoryRecord llega a la base de datos.
export interface BudgetCategory extends BudgetCategoryRecord {
  spent: number;
}

// Origen del movimiento de gasto: de dónde procede el registro.
// 'invoice' se crea automáticamente al consolidar una factura, 'quick' desde
// el cargo rápido de la partida, y 'manual' desde un axuste directo do
// histórico (é o único que admite importes negativos, para correccións).
export type ExpenseSource = 'invoice' | 'quick' | 'manual';

// Movimiento individual de gasto asociado a una partida de presupuesto.
// Es la ÚNICA fuente de verdad del gasto: BudgetCategory.spent se deriva
// siempre de sumar estos registros, nunca al revés.
export interface BudgetExpense {
  id: string;
  categoryId: string;      // Referencia a BudgetCategoryRecord.id
  amount: number;           // Positivo salvo para axustes manuais de corrección
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
  categoryId?: string;        // Partida de presupuesto asociada explícitamente por el usuario.
  date: string; // YYYY-MM-DD
  base64Data?: string; // File contents (PDF or Image)
  fileName: string;
  isSynced: boolean;
  isLocalOnly: boolean;
  financialsApplied: boolean; // true si esta factura llegó a sumar efectivamente al proveedor
                               // (paidAmount). Es la fuente de verdad para saber si hay que
                               // revertir ese pago al eliminar la factura.
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
  budget: BudgetCategoryRecord[];
  suppliers: Supplier[];
  milestones: Milestone[];
  invoices: Invoice[];
  photos: ProgressPhoto[];
  funds: FundEntry[];
  budgetExpenses: BudgetExpense[]; // Movimientos detallados de gasto por partida
}
