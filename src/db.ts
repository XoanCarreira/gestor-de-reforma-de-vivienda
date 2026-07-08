import { BudgetCategory, Supplier, Milestone, Invoice, ProgressPhoto, SyncAction } from './types';

const DB_NAME = 'ReformaGestDB';
const DB_VERSION = 1;

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

        // Create Object Stores
        if (!db.objectStoreNames.contains('budget')) {
          db.createObjectStore('budget', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('milestones')) {
          db.createObjectStore('milestones', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('invoices')) {
          db.createObjectStore('invoices', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }

        // Add seed data
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          this.seedInitialData(transaction);
        }
      };
    });
  }

  private seedInitialData(transaction: IDBTransaction): void {
    const budgetStore = transaction.objectStore('budget');
    const suppliersStore = transaction.objectStore('suppliers');
    const milestonesStore = transaction.objectStore('milestones');
    const invoicesStore = transaction.objectStore('invoices');
    const photosStore = transaction.objectStore('photos');

    // Seed Budget Categories
    const seedBudget: BudgetCategory[] = [
      { id: 'b1', name: 'Demolición y Desescombro', allocated: 3500, spent: 3500, notes: 'Completo. Contenedores retirados.' },
      { id: 'b2', name: 'Albañilería y Tabiquería', allocated: 12000, spent: 10500, notes: 'Tabiques listos, enyesado en curso.' },
      { id: 'b3', name: 'Fontanería y Calefacción', allocated: 6000, spent: 6350, notes: 'Desviación por cambio de tuberías de calefacción no previstas.' },
      { id: 'b4', name: 'Electricidad e Iluminación', allocated: 5000, spent: 2200, notes: 'Preinstalación hecha, falta mecanismos.' },
      { id: 'b5', name: 'Carpintería Exterior e Interior', allocated: 9500, spent: 4500, notes: 'Ventanas instaladas. Puertas en fabricación.' },
      { id: 'b6', name: 'Pintura y Acabados', allocated: 4000, spent: 0, notes: 'Pendiente de finalizar albañilería.' }
    ];

    // Seed Suppliers
    const seedSuppliers: Supplier[] = [
      { id: 's1', name: 'Albañilería Hnos. Ruiz', service: 'Albañilería y Tabiquería', phone: '612 345 678', email: 'ruiz.reformas@email.com', contractedAmount: 12000, paidAmount: 8000, pendingAmount: 4000, rating: 5, notes: 'Profesional rápido y muy limpio.' },
      { id: 's2', name: 'Instalaciones TecnoAgua', service: 'Fontanería y Calefacción', phone: '623 456 789', email: 'contacto@tecnoagua.com', contractedAmount: 6000, paidAmount: 5000, pendingAmount: 1000, rating: 4, notes: 'Instalación impecable, cobraron extra por acometida de calefacción.' },
      { id: 's3', name: 'Electricidad Voltio S.L.', service: 'Electricidad', phone: '634 567 890', email: 'voltio@email.com', contractedAmount: 5000, paidAmount: 2200, pendingAmount: 2800, rating: 4, notes: 'Técnicos certificados, buen trabajo con las rozas.' },
      { id: 's4', name: 'Carpintería San José', service: 'Carpintería Exterior', phone: '645 678 901', email: 'ventas@sanjosecarp.com', contractedAmount: 9500, paidAmount: 4500, pendingAmount: 5000, rating: 5, notes: 'Carpintería de aluminio con rotura de puente térmico de excelente calidad.' }
    ];

    // Seed Milestones
    const seedMilestones: Milestone[] = [
      { id: 'm1', title: 'Demolición de muros', description: 'Tirar tabiques de cocina y salón para concepto abierto', dueDate: '2026-06-15', status: 'completed', completedDate: '2026-06-14' },
      { id: 'm2', title: 'Instalación de tuberías', description: 'Renovación completa de bajantes y desagües en baño y cocina', dueDate: '2026-06-25', status: 'completed', completedDate: '2026-06-27' },
      { id: 'm3', title: 'Rozas y cableado', description: 'Aberturas en paredes para conductos eléctricos e instalación de hilos', dueDate: '2026-07-05', status: 'completed', completedDate: '2026-07-04' },
      { id: 'm4', title: 'Falso techo de yeso', description: 'Montaje de estructura y placas de pladur en techos de toda la casa', dueDate: '2026-07-15', status: 'in_progress' },
      { id: 'm5', title: 'Alicatado e hidráulico', description: 'Colocación de azulejos en baño e instalación de suelo porcelánico', dueDate: '2026-07-25', status: 'pending' },
      { id: 'm6', title: 'Montaje de carpintería', description: 'Montar marcos, puertas interiores de madera y ventanas de aluminio', dueDate: '2026-08-05', status: 'pending' },
      { id: 'm7', title: 'Pintura general', description: 'Pintar techos y paredes con pintura plástica lavable antimoho', dueDate: '2026-08-15', status: 'pending' }
    ];

    // Seed Invoices
    const seedInvoices: Invoice[] = [
      { id: 'i1', title: 'Factura Desescombro Inicial', amount: 1500, supplierId: 's1', date: '2026-06-12', fileName: 'factura_desescombro.pdf', isSynced: true, isLocalOnly: false },
      { id: 'i2', title: 'Factura Tuberías Cobre y PPR', amount: 3500, supplierId: 's2', date: '2026-06-26', fileName: 'factura_tuberias.pdf', isSynced: true, isLocalOnly: false },
      { id: 'i3', title: 'Pago Anticipo Carpintería Alum.', amount: 4500, supplierId: 's4', date: '2026-07-02', fileName: 'anticipo_aluminio.pdf', isSynced: true, isLocalOnly: false }
    ];

    // Seed standard progress photos (placeholders base64, simple low-res mock image overlays to save space and represent content)
    // Blue building outline SVG encoded as low-res base64 to keep file compact but perfectly valid
    const placeholderImg = "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22 width=%22400%22 height=%22300%22><rect width=%22100%%22 height=%22100%%22 fill=%22%23334155%22/><path d=%22M150 100 L250 100 L250 200 L150 200 Z%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%228%22/><path d=%22M130 110 L200 50 L270 110%22 fill=%22none%22 stroke=%22%23f59e0b%22 stroke-width=%228%22/><text x=%22200%22 y=%22250%22 fill=%22%23f8fafc%22 font-family=%22sans-serif%22 font-size=%2218%22 text-anchor=%22middle%22>Avance Obra</text></svg>";

    const seedPhotos: ProgressPhoto[] = [
      { id: 'p1', title: 'Estado del salón tras tirar tabiques', notes: 'Gran espacio conseguido al integrar el salón y la cocina en un solo ambiente.', date: '2026-06-15', base64Data: placeholderImg, isSynced: true, isLocalOnly: false },
      { id: 'p2', title: 'Preinstalación fontanería baño', notes: 'Se han colocado los tubos de polibutileno y los desagües en pared.', date: '2026-06-27', base64Data: placeholderImg, isSynced: true, isLocalOnly: false }
    ];

    seedBudget.forEach(x => budgetStore.add(x));
    seedSuppliers.forEach(x => suppliersStore.add(x));
    seedMilestones.forEach(x => milestonesStore.add(x));
    seedInvoices.forEach(x => invoicesStore.add(x));
    seedPhotos.forEach(x => photosStore.add(x));
  }

  // Generic Operations
  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Base de datos no inicializada.');
    }
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAll<T>(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos'): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos', item: T): Promise<void> {
    await this.init();
    
    // Add to main store
    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Create sync queue action
    await this.queueAction('insert', storeName, item);
  }

  async update<T>(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos', item: T): Promise<void> {
    await this.init();

    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await this.queueAction('update', storeName, item);
  }

  async delete(storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos', id: string): Promise<void> {
    await this.init();

    await new Promise<void>((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await this.queueAction('delete', storeName, { id });
  }

  // Sync Queue
  private async queueAction(
    actionType: 'insert' | 'update' | 'delete',
    storeName: 'budget' | 'suppliers' | 'milestones' | 'invoices' | 'photos',
    payload: any
  ): Promise<void> {
    await this.init();
    const action: SyncAction = {
      id: Math.random().toString(36).substring(2, 9),
      actionType,
      storeName,
      payload,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const store = this.getStore('syncQueue', 'readwrite');
      const request = store.add(action);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncAction[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('syncQueue', 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as SyncAction[]);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const store = this.getStore('syncQueue', 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Custom synchronization function simulating offline-online sync
  async syncOfflineData(): Promise<{ syncedInvoicesCount: number; syncedPhotosCount: number; totalActionsSynced: number }> {
    await this.init();
    const queue = await this.getSyncQueue();
    let syncedInvoicesCount = 0;
    let syncedPhotosCount = 0;

    if (queue.length === 0) {
      return { syncedInvoicesCount, syncedPhotosCount, totalActionsSynced: 0 };
    }

    // Process queue items - we update the isSynced state to simulate sending to server
    for (const action of queue) {
      if (action.storeName === 'invoices') {
        const item = action.payload as Invoice;
        item.isSynced = true;
        item.isLocalOnly = false;
        await this.directPut('invoices', item);
        syncedInvoicesCount++;
      } else if (action.storeName === 'photos') {
        const item = action.payload as ProgressPhoto;
        item.isSynced = true;
        item.isLocalOnly = false;
        await this.directPut('photos', item);
        syncedPhotosCount++;
      } else if (action.storeName === 'budget') {
        // Just general data updates
      } else if (action.storeName === 'suppliers') {
        // Just general data updates
      } else if (action.storeName === 'milestones') {
        // Just general data updates
      }
    }

    const totalSynced = queue.length;
    await this.clearSyncQueue();
    return { syncedInvoicesCount, syncedPhotosCount, totalActionsSynced: totalSynced };
  }

  private async directPut(storeName: string, item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbInstance = new Database();
