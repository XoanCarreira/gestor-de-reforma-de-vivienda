import { useEffect, useMemo, useState } from 'react';
import { dbInstance } from '../db';
import {
  AppBackup,
  BudgetCategory,
  BudgetCategoryRecord,
  Supplier,
  Milestone,
  Invoice,
  ProgressPhoto,
  FundEntry,
  BudgetExpense,
  ExpenseSource
} from '../types';
import { sumEuros } from '../utils/money';

// Nombres de las 7 stores de IndexedDB. Se usa para tipar qué stores debe
// releer cada acción (ver `reload`), en vez de releer siempre las 7 como
// hacía reloadAllData() en el App.tsx original.
type StoreName = 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds' | 'budgetExpenses';

interface StorageStats {
  budget: number;
  suppliers: number;
  milestones: number;
  invoices: number;
  photos: number;
  funds: number;
  budgetExpenses: number;
  total: number;
}

interface DataState {
  // 'budget' guarda el registro TAL CUAL se persiste (sin 'spent'). El
  // 'spent' que consume la UI se calcula aparte, ver `budgetWithSpent` más
  // abajo — así queda imposible que ambos se desincronicen.
  budget: BudgetCategoryRecord[];
  suppliers: Supplier[];
  milestones: Milestone[];
  invoices: Invoice[];
  photos: ProgressPhoto[];
  funds: FundEntry[];
  budgetExpenses: BudgetExpense[];
  storageStats: StorageStats;
}

const EMPTY_STATE: DataState = {
  budget: [], suppliers: [], milestones: [], invoices: [], photos: [], funds: [], budgetExpenses: [],
  storageStats: { budget: 0, suppliers: 0, milestones: 0, invoices: 0, photos: 0, funds: 0, budgetExpenses: 0, total: 0 }
};

/**
 * Fuente única de verdad de los datos de la aplicación.
 *
 * Punto clave de este hook: BudgetCategory.spent NUNCA se guarda ni se
 * incrementa/decrementa a mano. Se calcula siempre sumando BudgetExpense[]
 * filtrados por categoría (ver `budgetWithSpent`), usando aritmética en
 * céntimos (utils/money.ts) para que la suma sea exacta.
 *
 * Esto elimina de raíz la clase de bug más delicada que tenía la versión
 * anterior: cualquier operación que tocara el gasto (factura, cargo rápido,
 * edición, borrado...) tenía que escribir DOS veces —el movimiento en
 * budgetExpenses Y el acumulado en budget.spent— y bastaba con que una de
 * esas dos escrituras fallara, se saltara o arrastrara un error de
 * redondeo para que quedaran desincronizados sin que nada lo detectara.
 * Ahora solo hay una escritura (el movimiento); el acumulado es una vista.
 */
export function useReformaData() {
  const [state, setState] = useState<DataState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [clearingData, setClearingData] = useState(false);
  const [backupProcessing, setBackupProcessing] = useState(false);

  const logEvent = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    setActivityLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  };

  // Recarga selectiva. Si no se indica `stores`, relee todo (usado solo en
  // el arranque inicial, en el vaciado y en la importación de backup, casos
  // donde de verdad puede haber cambiado cualquier cosa).
  const reload = async (stores?: StoreName[]) => {
    const targets: StoreName[] = stores ?? ['budget', 'suppliers', 'milestones', 'invoices', 'photos', 'funds', 'budgetExpenses'];
    const results = await Promise.all(targets.map(store => dbInstance.getAll<unknown>(store)));
    const stats = await dbInstance.getStats();

    setState(prev => {
      const next: DataState = { ...prev, storageStats: stats };
      targets.forEach((store, i) => {
        (next as unknown as Record<StoreName, unknown[]>)[store] = results[i] as unknown[];
      });

      if (targets.includes('milestones')) {
        next.milestones = [...next.milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      }
      if (targets.includes('budgetExpenses')) {
        next.budgetExpenses = [...next.budgetExpenses].sort(
          (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
        );
      }

      return next;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        logEvent('Inicializando IndexedDB local (ReformaGestDB)...');
        await dbInstance.init();
        logEvent('Base de datos conectada correctamente.');
        await reload();
      } catch (e) {
        logEvent('Erro o abrir a base de datos: ' + e);
      } finally {
        setReady(true);
      }
    })();
    // Solo se ejecuta una vez al montar el provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Derivación de 'spent' ---
  // Único lugar de toda la app donde se calcula el gasto acumulado de una
  // partida. Se recalcula solo cuando cambian los registros base
  // (memoizado), nunca se guarda en IndexedDB.
  const budgetWithSpent: BudgetCategory[] = useMemo(() => {
    return state.budget.map(cat => {
      const amounts = state.budgetExpenses
        .filter(e => e.categoryId === cat.id)
        .map(e => e.amount);
      return { ...cat, spent: sumEuros(amounts) };
    });
  }, [state.budget, state.budgetExpenses]);

  // --- Mantemento / backup ---

  const clearDatabase = async () => {
    
    try {
      setClearingData(true);
      await dbInstance.clearAllData();
      await reload();
      logEvent('[Database] Base local vaciada e lista para novos datos.');
    } catch (e) {
      logEvent('[Database] Erro ao vaciar a base local: ' + e);
    } finally {
      setClearingData(false);
    }
  };

  const exportBackup = async () => {
    try {
      setBackupProcessing(true);
      const backup = await dbInstance.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fileName = `reforma-gest-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
      logEvent(`[Backup] Copia de seguridade exportada: ${fileName}`);
    } catch (e) {
      logEvent('[Backup] Erro ao exportar a copia de seguridade: ' + e);
    } finally {
      setBackupProcessing(false);
    }
  };

  const importBackupFile = async (file: File) => {
    
    try {
      setBackupProcessing(true);
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as Partial<AppBackup>;

      if (!parsed || !Array.isArray(parsed.budget) || !Array.isArray(parsed.suppliers) || !Array.isArray(parsed.milestones) || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.photos) || !Array.isArray(parsed.funds)) {
        throw new Error('O ficheiro non é un backup válido.');
      }

      const parsedExpenses = Array.isArray(parsed.budgetExpenses) ? parsed.budgetExpenses : [];

      await dbInstance.importBackup({
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        budget: parsed.budget,
        suppliers: parsed.suppliers,
        milestones: parsed.milestones,
        invoices: parsed.invoices,
        photos: parsed.photos,
        funds: parsed.funds,
        budgetExpenses: parsedExpenses
      });

      await reload();
      logEvent(`[Backup] Importado correctamente o ficheiro ${file.name}`);
    } catch (e) {
      logEvent('[Backup] Erro ao importar a copia de seguridade: ' + e);
      alert('Non se puido importar o backup. Verifica que o ficheiro sexa un JSON xerado pola aplicación.');
    } finally {
      setBackupProcessing(false);
    }
  };

  // --- Budget ---
  // Ya no manejan 'spent' en absoluto: solo name/allocated/notes. El gasto
  // se gestiona exclusivamente a través de los movimientos (más abajo).

  const addBudgetCategory = async (cat: Omit<BudgetCategoryRecord, 'id'>) => {
    const newCat: BudgetCategoryRecord = { ...cat, id: 'b_' + Math.random().toString(36).substring(2, 9) };
    await dbInstance.add('budget', newCat);
    logEvent(`[Database] Partida de presupuesto creada: "${newCat.name}" asignándolle ${newCat.allocated}€`);
    await reload(['budget']);
  };

  const updateBudgetCategory = async (cat: BudgetCategoryRecord) => {
    await dbInstance.update('budget', cat);
    logEvent(`[Database] Partida de presuposto actualizada: "${cat.name}"`);
    await reload(['budget']);
  };

  const deleteBudgetCategory = async (id: string) => {
    const cat = state.budget.find(x => x.id === id);
    
    // Consistencia: si borramos la partida, sus movementos de gasto quedarían
    // huérfanos (categoryId apuntando a un id inexistente). Los eliminamos antes.
    const orphanExpenses = state.budgetExpenses.filter(e => e.categoryId === id);
    await Promise.all(orphanExpenses.map(e => dbInstance.delete('budgetExpenses', e.id)));
    await dbInstance.delete('budget', id);

    logEvent(`[Database] Partida eliminada: "${cat?.name || id}" (${orphanExpenses.length} movemento(s) asociado(s) eliminados)`);
    await reload(['budget', 'budgetExpenses']);
  };

  // --- Movementos de gasto (histórico detallado por partida) ---
  //
  // Ahora que 'spent' se deriva, estas funciones ya NO tocan el store
  // 'budget' en absoluto: solo gestionan el movimiento. El acumulado se
  // recalcula solo (vía budgetWithSpent) en cuanto cambia budgetExpenses.
  // Esto también simplifica la recarga: solo hace falta releer
  // 'budgetExpenses', nunca 'budget'.

  const addBudgetExpense = async (
    categoryId: string,
    amount: number,
    source: ExpenseSource,
    description?: string,
    invoiceId?: string,
    date?: string
  ) => {
    const category = state.budget.find(c => c.id === categoryId);
    if (!category || isNaN(amount) || amount === 0) return;

    // Solo los axustes manuais poden ser negativos (correccións). Un cargo
    // rápido ou unha factura sempre representan un gasto real, positivo.
    if (source !== 'manual' && amount < 0) return;

    const newExpense: BudgetExpense = {
      id: 'e_' + Math.random().toString(36).substring(2, 9),
      categoryId,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      source,
      description,
      invoiceId,
      createdAt: new Date().toISOString()
    };

    await dbInstance.add('budgetExpenses', newExpense);

    logEvent(`[Cuentas] Movemento rexistrado en "${category.name}": ${amount >= 0 ? '+' : ''}${amount}€ (${source})`);
    await reload(['budgetExpenses']);
  };

  const updateBudgetExpense = async (
    expenseId: string,
    newAmount: number,
    newDescription: string,
    newDate: string
  ) => {
    const expense = state.budgetExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    if (expense.source === 'invoice') {
      alert('Este movemento procede dunha factura. Edítao desde a sección de Facturas para manter os pagos ao proveedor consistentes.');
      return;
    }

    if (isNaN(newAmount) || newAmount === 0) return;
    if (expense.source !== 'manual' && newAmount < 0) return;

    const category = state.budget.find(c => c.id === expense.categoryId);
    if (!category) return;

    const updatedExpense: BudgetExpense = {
      ...expense,
      amount: newAmount,
      description: newDescription || undefined,
      date: newDate || expense.date
    };

    await dbInstance.update('budgetExpenses', updatedExpense);

    logEvent(`[Cuentas] Movemento actualizado en "${category.name}": ${newAmount >= 0 ? '+' : ''}${newAmount}€`);
    await reload(['budgetExpenses']);
  };

  const deleteBudgetExpense = async (expenseId: string) => {
    const expense = state.budgetExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    if (expense.source === 'invoice') {
      alert('Este movemento procede dunha factura. Elimínao desde a sección de Facturas para manter os pagos ao proveedor consistentes.');
      return;
    }

    const category = state.budget.find(c => c.id === expense.categoryId);
    
    await dbInstance.delete('budgetExpenses', expenseId);

    logEvent(`[Cuentas] Movemento eliminado de "${category?.name || expense.categoryId}": -${expense.amount}€`);
    await reload(['budgetExpenses']);
  };

  // --- Suppliers ---

  const addSupplier = async (sup: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = { ...sup, id: 's_' + Math.random().toString(36).substring(2, 9) };
    await dbInstance.add('suppliers', newSup);
    logEvent(`[Database] Proveedor rexistrado: "${newSup.name}" para o servizo de "${newSup.service}"`);
    await reload(['suppliers']);
  };

  const updateSupplier = async (sup: Supplier) => {
    await dbInstance.update('suppliers', sup);
    logEvent(`[Database] Proveedor actualizado: "${sup.name}"`);
    await reload(['suppliers']);
  };

  const deleteSupplier = async (id: string) => {
    const sup = state.suppliers.find(x => x.id === id);
    
    await dbInstance.delete('suppliers', id);
    logEvent(`[Database] Proveedor eliminado: "${sup?.name || id}"`);
    await reload(['suppliers']);
  };

  // --- Milestones ---

  const addMilestone = async (m: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = { ...m, id: 'm_' + Math.random().toString(36).substring(2, 9) };
    await dbInstance.add('milestones', newMilestone);
    logEvent(`[Database] Planificación de Hito agregada: "${newMilestone.title}" con límite o ${newMilestone.dueDate}`);
    await reload(['milestones']);
  };

  const updateMilestone = async (m: Milestone) => {
    await dbInstance.update('milestones', m);
    logEvent(`[Database] Hito modificado: "${m.title}" -> Estado: "${m.status}"`);
    await reload(['milestones']);
  };

  const deleteMilestone = async (id: string) => {
    const m = state.milestones.find(x => x.id === id);
    
    await dbInstance.delete('milestones', id);
    logEvent(`[Database] Hito de planificación eliminado: "${m?.title || id}"`);
    await reload(['milestones']);
  };

  // --- Invoices & Accounting integration ---
  //
  // Ya no actualizan 'budget' para nada: solo crean/eliminan el movimiento
  // vinculado (source: 'invoice') en budgetExpenses. El acumulado de la
  // partida se recalcula solo. Sí se sigue actualizando 'suppliers.paidAmount',
  // porque ese campo no tiene un histórico detrás del que derivarlo (sería
  // una mejora futura equivalente a esta, aplicada a proveedores).

  const addInvoice = async (
    invoice: Omit<Invoice, 'id' | 'isSynced' | 'isLocalOnly' | 'financialsApplied'>,
    updateFinancials: boolean
  ) => {
    const newId = 'i_' + Math.random().toString(36).substring(2, 9);
    let financialsApplied = false;

    const touchedStores = new Set<StoreName>(['invoices']);

    if (updateFinancials) {
      const supplier = state.suppliers.find(s => s.id === invoice.supplierId);
      if (supplier) {
        const updatedSupplier: Supplier = {
          ...supplier,
          paidAmount: supplier.paidAmount + invoice.amount,
          pendingAmount: Math.max(0, supplier.contractedAmount - (supplier.paidAmount + invoice.amount))
        };
        await dbInstance.update('suppliers', updatedSupplier);
        logEvent(`[Cuentas] Proveedor "${supplier.name}" actualizado: Pagado +${invoice.amount}€`);
        financialsApplied = true;
        touchedStores.add('suppliers');

        // Se usa SEMPRE a partida elixida explícitamente polo usuario
        // (invoice.categoryId), nunca coincidencia de texto por nome de servizo.
        const matchedCategory = invoice.categoryId ? state.budget.find(c => c.id === invoice.categoryId) : undefined;

        if (matchedCategory) {
          const linkedExpense: BudgetExpense = {
            id: 'e_' + Math.random().toString(36).substring(2, 9),
            categoryId: matchedCategory.id,
            amount: invoice.amount,
            date: invoice.date,
            source: 'invoice',
            description: `Factura: ${invoice.title}`,
            invoiceId: newId,
            createdAt: new Date().toISOString()
          };
          await dbInstance.add('budgetExpenses', linkedExpense);
          touchedStores.add('budgetExpenses');

          logEvent(`[Cuentas] Partida de obra "${matchedCategory.name}" aumentada: Gastado +${invoice.amount}€`);
        } else {
          logEvent(`[Cuentas] Factura "${invoice.title}" sen partida asociada: ${invoice.amount}€ non se sumaron a ningunha partida de presuposto.`);
        }
      } else {
        logEvent(`[Cuentas] Non se atopou o proveedor da factura "${invoice.title}"; non se aplicou consolidación de contas.`);
      }
    }

    const newInvoice: Invoice = { ...invoice, id: newId, isSynced: false, isLocalOnly: true, financialsApplied };
    await dbInstance.add('invoices', newInvoice);
    logEvent(`[Database] Carga de Factura: "${newInvoice.title}" de ${newInvoice.amount}€`);

    await reload(Array.from(touchedStores));
  };

  const deleteInvoice = async (id: string) => {
    const inv = state.invoices.find(x => x.id === id);
    if (!inv) return;

    const touchedStores = new Set<StoreName>(['invoices']);

    // Consistencia (1/2): revertir o PAGADO do proveedor se esta factura o afectou.
    if (inv.financialsApplied) {
      const supplier = state.suppliers.find(s => s.id === inv.supplierId);
      if (supplier) {
        const revertedPaid = Math.max(0, supplier.paidAmount - inv.amount);
        const updatedSupplier: Supplier = {
          ...supplier,
          paidAmount: revertedPaid,
          pendingAmount: Math.max(0, supplier.contractedAmount - revertedPaid)
        };
        await dbInstance.update('suppliers', updatedSupplier);
        logEvent(`[Cuentas] Proveedor "${supplier.name}" actualizado: Pagado -${inv.amount}€ (factura eliminada)`);
        touchedStores.add('suppliers');
      }
    }

    // Consistencia (2/2): eliminar o movemento vinculado. O acumulado da
    // partida recalcúlase só en canto desaparece o movemento.
    const linkedExpense = state.budgetExpenses.find(e => e.invoiceId === id);
    if (linkedExpense) {
      await dbInstance.delete('budgetExpenses', linkedExpense.id);
      touchedStores.add('budgetExpenses');
    }

    await dbInstance.delete('invoices', id);
    logEvent(`[Database] Factura eliminada: "${inv.title}"${linkedExpense ? ' (movemento de partida revertido)' : ''}`);
    await reload(Array.from(touchedStores));
  };

  // --- Gallery Photos ---

  const addPhoto = async (photo: Omit<ProgressPhoto, 'id' | 'isSynced' | 'isLocalOnly'>) => {
    const newPhoto: ProgressPhoto = { ...photo, id: 'p_' + Math.random().toString(36).substring(2, 9), isSynced: false, isLocalOnly: true };
    await dbInstance.add('photos', newPhoto);
    logEvent(`[Database] Avance visual gardado: "${newPhoto.title}"`);
    await reload(['photos']);
  };

  const deletePhoto = async (id: string) => {
    const ph = state.photos.find(x => x.id === id);

    await dbInstance.delete('photos', id);
    logEvent(`[Database] Fotografía eliminada: "${ph?.title || id}"`);
    await reload(['photos']);
  };

  // --- Funds ---

  const addFund = async (fund: Omit<FundEntry, 'id'>) => {
    const newFund: FundEntry = { ...fund, id: 'f_' + Math.random().toString(36).substring(2, 9) };
    await dbInstance.add('funds', newFund);
    logEvent(`[Database] Fondo rexistrado: "${newFund.source}" por ${newFund.amount}€`);
    await reload(['funds']);
  };

  const deleteFund = async (id: string) => {
    const fund = state.funds.find(x => x.id === id);

    await dbInstance.delete('funds', id);
    logEvent(`[Database] Fondo eliminado: "${fund?.source || id}"`);
    await reload(['funds']);
  };

  return {
    // Estado (budget aquí ya incluye 'spent' calculado)
    ...state,
    budget: budgetWithSpent,
    ready,
    activityLogs,
    clearingData,
    backupProcessing,
    // Mantemento / backup
    clearDatabase,
    exportBackup,
    importBackupFile,
    // Budget
    addBudgetCategory,
    updateBudgetCategory,
    deleteBudgetCategory,
    addBudgetExpense,
    updateBudgetExpense,
    deleteBudgetExpense,
    // Suppliers
    addSupplier,
    updateSupplier,
    deleteSupplier,
    // Milestones
    addMilestone,
    updateMilestone,
    deleteMilestone,
    // Invoices
    addInvoice,
    deleteInvoice,
    // Photos
    addPhoto,
    deletePhoto,
    // Funds
    addFund,
    deleteFund
  };
}

export type ReformaData = ReturnType<typeof useReformaData>;
