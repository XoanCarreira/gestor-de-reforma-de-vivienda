import { useEffect, useState } from 'react';
import { dbInstance } from '../db';
import {
  AppBackup,
  BudgetCategory,
  Supplier,
  Milestone,
  Invoice,
  ProgressPhoto,
  FundEntry,
  BudgetExpense,
  ExpenseSource
} from '../types';

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
  budget: BudgetCategory[];
  suppliers: Supplier[];
  milestones: Milestone[];
  invoices: Invoice[];
  photos: ProgressPhoto[];
  funds: FundEntry[];
  budgetExpenses: BudgetExpense[];
  storageStats: StorageStats;
}

const EMPTY_STATE: DataState = {
  budget: [],
  suppliers: [],
  milestones: [],
  invoices: [],
  photos: [],
  funds: [],
  budgetExpenses: [],
  storageStats: { budget: 0, suppliers: 0, milestones: 0, invoices: 0, photos: 0, funds: 0, budgetExpenses: 0, total: 0 }
};

/**
 * Fuente única de verdad de los datos de la aplicación.
 *
 * Sustituye a la lógica que antes estaba dispersa dentro de App.tsx. La idea
 * central del refactor es doble:
 *
 *   1. Un único hook expone TODO el estado y TODAS las acciones CRUD, para
 *      que cualquier sección pueda consumirlo vía Context sin necesitar
 *      prop-drilling desde App.tsx.
 *   2. `reload` acepta qué stores releer. Antes cada acción (p. ej. añadir
 *      un fondo) releía las 7 stores completas de IndexedDB más las stats;
 *      ahora solo relee lo que esa acción realmente pudo modificar.
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
      // Cast puntual: `targets` y `results` están indexados en paralelo,
      // pero TypeScript no puede inferir la relación store -> tipo aquí sin
      // un mapeo explícito por cada store. Es más legible que un switch
      // gigante y el tipado real ya está garantizado por dbInstance.getAll.
      const next: DataState = { ...prev, storageStats: stats };
      targets.forEach((store, i) => {
        (next as unknown as Record<StoreName, unknown[]>)[store] = results[i] as unknown[];
      });

      // Orden estable tras cada recarga, igual que hacía el App.tsx original.
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

  // --- Mantemento / backup ---

  const clearDatabase = async () => {
    const confirmed = window.confirm('Esto eliminará todas as partidas, proveedores, hitos, facturas e fotos gardadas na base local. ¿Desexas continuar?');
    if (!confirmed) return;

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
    const confirmed = window.confirm('A importación substituirá todos os datos actuais pola información do backup. Continuar?');
    if (!confirmed) return;

    try {
      setBackupProcessing(true);
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as Partial<AppBackup>;

      if (!parsed || !Array.isArray(parsed.budget) || !Array.isArray(parsed.suppliers) || !Array.isArray(parsed.milestones) || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.photos) || !Array.isArray(parsed.funds)) {
        throw new Error('O ficheiro non é un backup válido.');
      }

      // budgetExpenses es opcional para mantener compatibilidad con backups
      // exportados antes de introducir o histórico de movementos.
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

  const addBudgetCategory = async (cat: Omit<BudgetCategory, 'id'>) => {
    const newCat: BudgetCategory = { ...cat, id: 'b_' + Math.random().toString(36).substring(2, 9) };
    await dbInstance.add('budget', newCat);
    logEvent(`[Database] Partida de presupuesto creada: "${newCat.name}" asignándolle ${newCat.allocated}€`);
    await reload(['budget']);
  };

  const updateBudgetCategory = async (cat: BudgetCategory) => {
    await dbInstance.update('budget', cat);
    logEvent(`[Database] Partida de presuposto actualizada: "${cat.name}"`);
    await reload(['budget']);
  };

  const deleteBudgetCategory = async (id: string) => {
    const cat = state.budget.find(x => x.id === id);
    const confirmed = window.confirm('Esto eliminará a partida \'' + cat?.name + '\'. ¿Desexas continuar?');
    if (!confirmed) return;

    // Consistencia: si borramos la partida, sus movementos de gasto quedarían
    // huérfanos (categoryId apuntando a un id inexistente). Los eliminamos antes.
    const orphanExpenses = state.budgetExpenses.filter(e => e.categoryId === id);
    await Promise.all(orphanExpenses.map(e => dbInstance.delete('budgetExpenses', e.id)));
    await dbInstance.delete('budget', id);

    logEvent(`[Database] Partida eliminada: "${cat?.name || id}" (${orphanExpenses.length} movemento(s) asociado(s) eliminados)`);
    await reload(['budget', 'budgetExpenses']);
  };

  // --- Movementos de gasto (histórico detallado por partida) ---

  const addBudgetExpense = async (
    categoryId: string,
    amount: number,
    source: ExpenseSource,
    description?: string,
    invoiceId?: string,
    date?: string
  ) => {
    const category = state.budget.find(c => c.id === categoryId);
    if (!category || isNaN(amount) || amount <= 0) return;

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
    await dbInstance.update('budget', { ...category, spent: category.spent + amount });

    logEvent(`[Cuentas] Movemento rexistrado en "${category.name}": +${amount}€ (${source})`);
    await reload(['budget', 'budgetExpenses']);
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

    if (isNaN(newAmount) || newAmount <= 0) return;

    const category = state.budget.find(c => c.id === expense.categoryId);
    if (!category) return;

    const delta = newAmount - expense.amount;
    const updatedExpense: BudgetExpense = {
      ...expense,
      amount: newAmount,
      description: newDescription || undefined,
      date: newDate || expense.date
    };

    await dbInstance.update('budgetExpenses', updatedExpense);
    await dbInstance.update('budget', { ...category, spent: Math.max(0, category.spent + delta) });

    logEvent(`[Cuentas] Movemento actualizado en "${category.name}": ${delta >= 0 ? '+' : ''}${delta}€`);
    await reload(['budget', 'budgetExpenses']);
  };

  const deleteBudgetExpense = async (expenseId: string) => {
    const expense = state.budgetExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    if (expense.source === 'invoice') {
      alert('Este movemento procede dunha factura. Elimínao desde a sección de Facturas para manter os pagos ao proveedor consistentes.');
      return;
    }

    const confirmed = window.confirm(`¿Eliminar o movemento de ${expense.amount.toLocaleString('es-ES')}€? Esta acción restará o importe do acumulado gastado da partida.`);
    if (!confirmed) return;

    const category = state.budget.find(c => c.id === expense.categoryId);
    if (category) {
      await dbInstance.update('budget', { ...category, spent: Math.max(0, category.spent - expense.amount) });
    }
    await dbInstance.delete('budgetExpenses', expenseId);

    logEvent(`[Cuentas] Movemento eliminado de "${category?.name || expense.categoryId}": -${expense.amount}€`);
    await reload(['budget', 'budgetExpenses']);
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
    const confirmed = window.confirm('Esto eliminará o proveedor \'' + sup?.name + '\'. ¿Desexas continuar?');
    if (!confirmed) return;

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
    const confirmed = window.confirm('Esto eliminará o hito \'' + m?.title + '\'. ¿Desexas continuar?');
    if (!confirmed) return;

    await dbInstance.delete('milestones', id);
    logEvent(`[Database] Hito de planificación eliminado: "${m?.title || id}"`);
    await reload(['milestones']);
  };

  // --- Invoices & Accounting integration ---

  const addInvoice = async (
    invoice: Omit<Invoice, 'id' | 'isSynced' | 'isLocalOnly' | 'financialsApplied'>,
    updateFinancials: boolean
  ) => {
    const newId = 'i_' + Math.random().toString(36).substring(2, 9);
    let financialsApplied = false;

    // Stores que esta acción puede llegar a tocar. Empieza solo con
    // 'invoices' y se amplía según la consolidación financiera aplicada.
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
          const updatedCategory: BudgetCategory = { ...matchedCategory, spent: matchedCategory.spent + invoice.amount };
          await dbInstance.update('budget', updatedCategory);

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
          touchedStores.add('budget');
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
    const confirmed = window.confirm('Esto eliminará a factura \'' + inv?.title + '\'. ¿Desexas continuar?');
    if (!confirmed || !inv) return;

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

    // Consistencia (2/2): revertir o movemento e o acumulado 'spent' da partida.
    const linkedExpense = state.budgetExpenses.find(e => e.invoiceId === id);
    if (linkedExpense) {
      const cat = state.budget.find(c => c.id === linkedExpense.categoryId);
      if (cat) {
        await dbInstance.update('budget', { ...cat, spent: Math.max(0, cat.spent - linkedExpense.amount) });
        touchedStores.add('budget');
      }
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
    const confirmed = window.confirm('Esto eliminará a fotografía \'' + ph?.title + '\'. ¿Desexas continuar?');
    if (!confirmed) return;

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
    const confirmed = window.confirm('Esto eliminará o fondo \'' + fund?.source + '\'. ¿Desexas continuar?');
    if (!confirmed) return;

    await dbInstance.delete('funds', id);
    logEvent(`[Database] Fondo eliminado: "${fund?.source || id}"`);
    await reload(['funds']);
  };

  return {
    // Estado
    ...state,
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
