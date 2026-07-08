import { BudgetCategory, Supplier, Milestone, Invoice, ProgressPhoto, FundEntry } from './types';

const DB_NAME = 'ReformaGestDB';
const DB_VERSION = 3;

export class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject(new Error('No se pudo abrir la base de datos local.'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const storeNames = ['budget', 'suppliers', 'milestones', 'invoices', 'photos', 'funds'] as const;

        storeNames.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });

        if (db.objectStoreNames.contains('syncQueue')) {
          db.deleteObjectStore('syncQueue');
        }
      };
    });
  }

  // Generic Operations
  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Base de datos no inicializada.');
    }
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAll<T>(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds'): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds', item: T): Promise<void> {
    await this.init();
    
    // Add to main store
    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async update<T>(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds', item: T): Promise<void> {
    await this.init();

    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds', id: string): Promise<void> {
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
    const storeNames = ['budget', 'suppliers', 'milestones', 'invoices', 'photos', 'funds'] as const;

    await Promise.all(
      storeNames.map(
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

  async getStats(): Promise<{ budget: number; suppliers: number; milestones: number; invoices: number; photos: number; funds: number; total: number }> {
    await this.init();
    const [budget, suppliers, milestones, invoices, photos] = await Promise.all([
      this.count('budget'),
      this.count('suppliers'),
      this.count('milestones'),
      this.count('invoices'),
      this.count('photos')
    ]);
    const funds = await this.count('funds');

    return {
      budget,
      suppliers,
      milestones,
      invoices,
      photos,
      funds,
      total: budget + suppliers + milestones + invoices + photos + funds
    };
  }

  private async count(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos' | 'funds'): Promise<number> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbInstance = new Database();
