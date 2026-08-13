import { AppBackup, BudgetCategoryRecord, Supplier, Milestone, Invoice, ProgressPhoto, FundEntry, BudgetExpense } from './types';

const DB_NAME = 'ReformaGestDB';
// v4: se añade el store 'budgetExpenses' (histórico de movimientos por partida)
// v5: 'spent' deixa de persistirse en 'budget'. Agora derívase sempre a partir
//     de 'budgetExpenses' (ver utils/money.ts + hooks/useReformaData.ts), para
//     que non poida desincronizarse do histórico real de movementos.
const DB_VERSION = 5;

// Centralizamos el nombre de los stores en un solo tipo. Antes este union
// literal se repetía en cada método (getAll, add, update, delete, count...)
// y era fácil olvidar añadir un store nuevo en alguno de ellos.
type StoreName = 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds' | 'budgetExpenses';
const ALL_STORES: StoreName[] = ['budget', 'suppliers', 'milestones', 'invoices', 'photos', 'funds', 'budgetExpenses'];

export class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject(new Error('Non se puido abrir a base de datos local.'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // La transacción de upgrade cubre TODOS los stores de la BD, incluidos
        // los que ya existían en versiones anteriores. La usamos para migrar datos.
        const upgradeTx = (event.target as IDBOpenDBRequest).transaction!;

        ALL_STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });

        if (db.objectStoreNames.contains('syncQueue')) {
          db.deleteObjectStore('syncQueue');
        }

        // --- Migración v4: saldo inicial de partidas previas ---
        // Si el usuario ya tenía partidas con `spent > 0` creadas antes de v4,
        // el store 'budgetExpenses' estaría vacío para ellas y el histórico
        // no cuadraría con el acumulado. Generamos un movimiento "manual" de
        // saldo inicial por cada partida afectada, una sola vez.
        if (event.oldVersion > 0 && event.oldVersion < 4) {
          const budgetStore = upgradeTx.objectStore('budget');
          const expensesStore = upgradeTx.objectStore('budgetExpenses');
          const getAllReq = budgetStore.getAll();

          getAllReq.onsuccess = () => {
            const categories = (getAllReq.result || []) as Array<BudgetCategoryRecord & { spent?: number }>;
            categories.forEach((cat) => {
              if (cat.spent && cat.spent > 0) {
                const migratedExpense: BudgetExpense = {
                  id: 'e_migrated_' + cat.id,
                  categoryId: cat.id,
                  amount: cat.spent,
                  date: new Date().toISOString().split('T')[0],
                  source: 'manual',
                  description: 'Saldo inicial migrado (gasto previo á incorporación do histórico)',
                  createdAt: new Date().toISOString()
                };
                // Id determinista (e_migrated_<catId>): si la migración se
                // ejecutara más de una vez por error, 'add' fallaría en vez
                // de duplicar el saldo inicial.
                expensesStore.add(migratedExpense);
              }
            });
          };
        }

        // --- Migración v5: eliminar 'spent' persistido en 'budget' ---
        // A partir de ahora 'spent' se calcula siempre a partir de
        // 'budgetExpenses' (que ya quedó completo tras la migración v4
        // anterior). El campo 'spent' que pudiera quedar en los registros
        // antiguos se limpia aquí para que no quede un dato muerto y
        // potencialmente confuso si se inspecciona la base directamente.
        if (event.oldVersion > 0 && event.oldVersion < 5) {
          const budgetStore = upgradeTx.objectStore('budget');
          const getAllReq = budgetStore.getAll();

          getAllReq.onsuccess = () => {
            const categories = (getAllReq.result || []) as Array<BudgetCategoryRecord & { spent?: number }>;
            categories.forEach((cat) => {
              if ('spent' in cat) {
                const { spent: _spent, ...cleanCat } = cat as BudgetCategoryRecord & { spent?: number };
                budgetStore.put(cleanCat);
              }
            });
          };
        }
      };
    });
  }

  // Generic Operations
  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Base de datos non inicializada.');
    }
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: StoreName, item: T): Promise<void> {
    await this.init();

    // Add to main store
    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async update<T>(storeName: StoreName, item: T): Promise<void> {
    await this.init();

    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: StoreName, id: string): Promise<void> {
    await this.init();

    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    await this.init();

    await Promise.all(
      ALL_STORES.map(
        (storeName) =>
          new Promise<void>((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      )
    );
  }

  async exportBackup(): Promise<AppBackup> {
    await this.init();

    const [budget, suppliers, milestones, invoices, photos, funds, budgetExpenses] = await Promise.all([
      this.getAll<BudgetCategoryRecord>('budget'),
      this.getAll<Supplier>('suppliers'),
      this.getAll<Milestone>('milestones'),
      this.getAll<Invoice>('invoices'),
      this.getAll<ProgressPhoto>('photos'),
      this.getAll<FundEntry>('funds'),
      this.getAll<BudgetExpense>('budgetExpenses')
    ]);

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      budget,
      suppliers,
      milestones,
      invoices,
      photos,
      funds,
      budgetExpenses
    };
  }

  async importBackup(backup: AppBackup): Promise<void> {
    await this.init();
    await this.clearAllData();

    const insertAll = async <T>(storeName: StoreName, items: T[]) => {
      for (const item of items) {
        await this.add(storeName, item);
      }
    };

    // Los backups antiguos (pre-v5) pueden traer un campo 'spent' colgando
    // en cada categoría; se ignora sin más (nunca se lee de ahí), así que no
    // hace falta limpiarlo explícitamente al importar.
    await insertAll('budget', backup.budget || []);
    await insertAll('suppliers', backup.suppliers || []);
    await insertAll('milestones', backup.milestones || []);
    await insertAll('invoices', backup.invoices || []);
    await insertAll('photos', backup.photos || []);
    await insertAll('funds', backup.funds || []);
    // backup.budgetExpenses puede no existir en copias de seguridade xeradas
    // con versións anteriores da app (antes de introducir o histórico)
    await insertAll('budgetExpenses', backup.budgetExpenses || []);
  }

  async getStats(): Promise<{ budget: number; suppliers: number; milestones: number; invoices: number; photos: number; funds: number; budgetExpenses: number; total: number }> {
    await this.init();
    const [budget, suppliers, milestones, invoices, photos, funds, budgetExpenses] = await Promise.all([
      this.count('budget'),
      this.count('suppliers'),
      this.count('milestones'),
      this.count('invoices'),
      this.count('photos'),
      this.count('funds'),
      this.count('budgetExpenses')
    ]);

    return {
      budget,
      suppliers,
      milestones,
      invoices,
      photos,
      funds,
      budgetExpenses,
      total: budget + suppliers + milestones + invoices + photos + funds + budgetExpenses
    };
  }

  private async count(storeName: StoreName): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbInstance = new Database();
