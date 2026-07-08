import { Suspense, lazy, useState, useEffect } from 'react';
import { dbInstance } from './db';
import { BudgetCategory, Supplier, Milestone, Invoice, ProgressPhoto, SyncAction } from './types';
import Dashboard from './components/Dashboard';
import BudgetSection from './components/BudgetSection';
import SuppliersSection from './components/SuppliersSection';
import MilestonesSection from './components/MilestonesSection';
import DocumentsSection from './components/DocumentsSection';
import GallerySection from './components/GallerySection';
import SyncStatus from './components/SyncStatus';
import { LayoutDashboard, Wallet, Users, CalendarCheck, FileText, Camera, RefreshCw, HardHat, Cloud } from 'lucide-react';

const ReportGenerator = lazy(() => import('./components/ReportGenerator'));

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  
  // Sync states
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<SyncAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // PWA Register inside component lifecycle as well
  useEffect(() => {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            logEvent('[PWA] Service Worker registrado exitosamente con alcance: ' + reg.scope);
          })
          .catch((err) => {
            logEvent('[PWA] Error en registro de Service Worker: ' + err);
          });
      });
    }

    // Monitor physical network status
    const handleOnline = () => {
      setIsOnline(true);
      logEvent('[Red] Conexión de red restablecida. Estado: ONLINE.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logEvent('[Red] Conexión de red perdida. Estado: OFFLINE. Operando en base local.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(window.navigator.onLine);

    // Initial database load
    initData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const logEvent = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    setSyncLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  };

  const initData = async () => {
    try {
      logEvent('Inicializando IndexedDB local (ReformaGestDB)...');
      await dbInstance.init();
      logEvent('Base de datos conectada correctamente.');
      
      await reloadAllData();
    } catch (e) {
      logEvent('Error al abrir la base de datos: ' + e);
    }
  };

  const reloadAllData = async () => {
    const bData = await dbInstance.getAll<BudgetCategory>('budget');
    const sData = await dbInstance.getAll<Supplier>('suppliers');
    const mData = await dbInstance.getAll<Milestone>('milestones');
    const iData = await dbInstance.getAll<Invoice>('invoices');
    const pData = await dbInstance.getAll<ProgressPhoto>('photos');
    const queue = await dbInstance.getSyncQueue();

    // Sort milestones by date
    mData.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    setBudget(bData);
    setSuppliers(sData);
    setMilestones(mData);
    setInvoices(iData);
    setPhotos(pData);
    setSyncQueue(queue);
  };

  // Synchronization triggering
  const handleTriggerSync = async () => {
    if (!isOnline) {
      logEvent('[Sync] No se puede sincronizar mientras esté sin conexión.');
      return;
    }

    setSyncing(true);
    logEvent('[Sync] Iniciando proceso de sincronización con servidor en la nube...');
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await dbInstance.syncOfflineData();
      logEvent(`[Sync] Servidor consolidó ${result.totalActionsSynced} acciones exitosamente.`);
      if (result.syncedInvoicesCount > 0) logEvent(`[Sync] Facturas sincronizadas: ${result.syncedInvoicesCount}`);
      if (result.syncedPhotosCount > 0) logEvent(`[Sync] Fotos de avance sincronizadas: ${result.syncedPhotosCount}`);
      logEvent('[Sync] Sincronización finalizada. Base local al día.');

      await reloadAllData();
    } catch (e) {
      logEvent('[Sync] Error inesperado en canal: ' + e);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleOnlineMode = () => {
    const nextMode = !isOnline;
    setIsOnline(nextMode);
    if (nextMode) {
      logEvent('[Simulador] Red activada por el usuario. Listo para sincronizar.');
    } else {
      logEvent('[Simulador] Red desactivada por el usuario (Trabajando 100% Offline).');
    }
  };

  // --- CRUD ACTIONS ---

  // Budget
  const handleAddBudgetCategory = async (cat: Omit<BudgetCategory, 'id'>) => {
    const newCat: BudgetCategory = {
      ...cat,
      id: 'b_' + Math.random().toString(36).substring(2, 9)
    };
    await dbInstance.add('budget', newCat);
    logEvent(`[Database] Partida de presupuesto creada: "${newCat.name}" asignándole ${newCat.allocated}€`);
    await reloadAllData();
  };

  const handleUpdateBudgetCategory = async (cat: BudgetCategory) => {
    await dbInstance.update('budget', cat);
    logEvent(`[Database] Partida de presupuesto actualizada: "${cat.name}"`);
    await reloadAllData();
  };

  const handleDeleteBudgetCategory = async (id: string) => {
    const cat = budget.find(x => x.id === id);
    await dbInstance.delete('budget', id);
    logEvent(`[Database] Partida eliminada: "${cat?.name || id}"`);
    await reloadAllData();
  };

  // Suppliers
  const handleAddSupplier = async (sup: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...sup,
      id: 's_' + Math.random().toString(36).substring(2, 9)
    };
    await dbInstance.add('suppliers', newSup);
    logEvent(`[Database] Proveedor registrado: "${newSup.name}" para el servicio de "${newSup.service}"`);
    await reloadAllData();
  };

  const handleUpdateSupplier = async (sup: Supplier) => {
    await dbInstance.update('suppliers', sup);
    logEvent(`[Database] Proveedor actualizado: "${sup.name}"`);
    await reloadAllData();
  };

  const handleDeleteSupplier = async (id: string) => {
    const sup = suppliers.find(x => x.id === id);
    await dbInstance.delete('suppliers', id);
    logEvent(`[Database] Proveedor eliminado: "${sup?.name || id}"`);
    await reloadAllData();
  };

  // Milestones
  const handleAddMilestone = async (m: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = {
      ...m,
      id: 'm_' + Math.random().toString(36).substring(2, 9)
    };
    await dbInstance.add('milestones', newMilestone);
    logEvent(`[Database] Planificación de Hito agregada: "${newMilestone.title}" con límite al ${newMilestone.dueDate}`);
    await reloadAllData();
  };

  const handleUpdateMilestone = async (m: Milestone) => {
    await dbInstance.update('milestones', m);
    logEvent(`[Database] Hito modificado: "${m.title}" -> Estado: "${m.status}"`);
    await reloadAllData();
  };

  const handleDeleteMilestone = async (id: string) => {
    const m = milestones.find(x => x.id === id);
    await dbInstance.delete('milestones', id);
    logEvent(`[Database] Hito de planificación eliminado: "${m?.title || id}"`);
    await reloadAllData();
  };

  // Invoices & Accounting integration!
  const handleAddInvoice = async (invoice: Omit<Invoice, 'id' | 'isSynced' | 'isLocalOnly'>, updateFinancials: boolean) => {
    const newId = 'i_' + Math.random().toString(36).substring(2, 9);
    const newInvoice: Invoice = {
      ...invoice,
      id: newId,
      isSynced: isOnline,
      isLocalOnly: !isOnline
    };

    await dbInstance.add('invoices', newInvoice);
    logEvent(`[Database] Carga de Factura: "${newInvoice.title}" de ${newInvoice.amount}€`);

    // Intelligent financial consolidation
    if (updateFinancials) {
      const supplier = suppliers.find(s => s.id === invoice.supplierId);
      if (supplier) {
        // 1. Update supplier balance
        const updatedSupplier: Supplier = {
          ...supplier,
          paidAmount: supplier.paidAmount + invoice.amount,
          pendingAmount: Math.max(0, supplier.contractedAmount - (supplier.paidAmount + invoice.amount))
        };
        await dbInstance.update('suppliers', updatedSupplier);
        logEvent(`[Cuentas] Proveedor "${supplier.name}" actualizado: Pagado +${invoice.amount}€`);

        // 2. Link supplier service to corresponding budget category spent amount!
        // Try to match category name with supplier's service name
        const matchedCategory = budget.find(c => 
          c.name.toLowerCase().includes(supplier.service.toLowerCase()) || 
          supplier.service.toLowerCase().includes(c.name.toLowerCase()) ||
          (supplier.service === 'Albañilería y Tabiquería' && c.name.includes('Albañilería')) ||
          (supplier.service === 'Fontanería y Calefacción' && c.name.includes('Fontanería')) ||
          (supplier.service === 'Carpintería Exterior' && c.name.includes('Carpintería')) ||
          (supplier.service === 'Electricidad' && c.name.includes('Electricidad'))
        );

        if (matchedCategory) {
          const updatedCategory: BudgetCategory = {
            ...matchedCategory,
            spent: matchedCategory.spent + invoice.amount
          };
          await dbInstance.update('budget', updatedCategory);
          logEvent(`[Cuentas] Partida de obra "${matchedCategory.name}" aumentada: Gastado +${invoice.amount}€`);
        }
      }
    }

    await reloadAllData();
  };

  const handleDeleteInvoice = async (id: string) => {
    const inv = invoices.find(x => x.id === id);
    await dbInstance.delete('invoices', id);
    logEvent(`[Database] Factura eliminada: "${inv?.title || id}"`);
    await reloadAllData();
  };

  // Gallery Photos
  const handleAddPhoto = async (photo: Omit<ProgressPhoto, 'id' | 'isSynced' | 'isLocalOnly'>) => {
    const newPhoto: ProgressPhoto = {
      ...photo,
      id: 'p_' + Math.random().toString(36).substring(2, 9),
      isSynced: isOnline,
      isLocalOnly: !isOnline
    };

    await dbInstance.add('photos', newPhoto);
    logEvent(`[Database] Avance visual guardado: "${newPhoto.title}"`);
    await reloadAllData();
  };

  const handleDeletePhoto = async (id: string) => {
    const ph = photos.find(x => x.id === id);
    await dbInstance.delete('photos', id);
    logEvent(`[Database] Fotografía eliminada: "${ph?.title || id}"`);
    await reloadAllData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b-2 border-slate-200 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-sm flex items-center justify-center font-black text-white text-lg italic shadow-sm select-none">
              R
            </div>
            <div>
              <span className="font-black tracking-tighter text-slate-900 font-sans text-sm sm:text-base uppercase block">
                ReformaGest <span className="text-amber-600">Pro</span>
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest block leading-none mt-0.5">
                Gestión Integral de Obra
              </span>
            </div>
          </div>

          {/* Sync Button & Report download side-by-side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Connection state Indicator badge */}
            <button
              onClick={() => setActiveTab('sincronizacion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                isOnline 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="hidden xs:inline">{isOnline ? 'Sincronizado' : 'Sin Conexión'}</span>
              {syncQueue.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 rounded-full">
                  {syncQueue.length}
                </span>
              )}
            </button>

            {/* Downloader PDF component */}
            <Suspense
              fallback={
                <div className="hidden sm:block px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-400 text-xs font-semibold">
                  Cargando reporte...
                </div>
              }
            >
              <div className="hidden sm:block">
                <ReportGenerator
                  budget={budget}
                  suppliers={suppliers}
                  milestones={milestones}
                  invoices={invoices}
                />
              </div>
            </Suspense>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full pb-24">
        {activeTab === 'dashboard' && (
          <Dashboard
            budget={budget}
            suppliers={suppliers}
            milestones={milestones}
            onNavigate={setActiveTab}
            isOnline={isOnline}
            syncQueueLength={syncQueue.length}
            onSync={handleTriggerSync}
            syncing={syncing}
          />
        )}

        {activeTab === 'presupuesto' && (
          <BudgetSection
            budget={budget}
            onAddCategory={handleAddBudgetCategory}
            onUpdateCategory={handleUpdateBudgetCategory}
            onDeleteCategory={handleDeleteBudgetCategory}
          />
        )}

        {activeTab === 'proveedores' && (
          <SuppliersSection
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        )}

        {activeTab === 'hitos' && (
          <MilestonesSection
            milestones={milestones}
            onAddMilestone={handleAddMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />
        )}

        {activeTab === 'documentos' && (
          <DocumentsSection
            invoices={invoices}
            suppliers={suppliers}
            budget={budget}
            onAddInvoice={handleAddInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'galeria' && (
          <GallerySection
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
          />
        )}

        {activeTab === 'sincronizacion' && (
          <SyncStatus
            isOnline={isOnline}
            onToggleOnlineMode={handleToggleOnlineMode}
            syncQueue={syncQueue}
            onSync={handleTriggerSync}
            syncing={syncing}
            syncLogs={syncLogs}
          />
        )}
      </main>

      {/* Mobile-first bottom scrolling navigation bar (Highly intuitive on-site use!) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 py-2 sm:py-3 px-2 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          {/* Nav Tab Items */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('presupuesto')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'presupuesto' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Costos</span>
          </button>

          <button
            onClick={() => setActiveTab('proveedores')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'proveedores' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Empresas</span>
          </button>

          <button
            onClick={() => setActiveTab('hitos')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'hitos' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Hitos</span>
          </button>

          <button
            onClick={() => setActiveTab('documentos')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'documentos' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Facturas</span>
          </button>

          <button
            onClick={() => setActiveTab('galeria')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'galeria' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Fotos</span>
          </button>

          <button
            onClick={() => setActiveTab('sincronizacion')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${
              activeTab === 'sincronizacion' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${activeTab === 'sincronizacion' ? 'animate-spin-slow' : ''}`} />
            <span className="text-[10px] xs:text-[11px] font-medium font-sans">Sync</span>
            {syncQueue.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
            )}
          </button>
        </div>
      </nav>

      {/* Floating Action Button for Mobile PDF Report */}
      <div className="sm:hidden fixed bottom-18 right-4 z-40">
        <ReportGenerator
          budget={budget}
          suppliers={suppliers}
          milestones={milestones}
          invoices={invoices}
        />
      </div>
    </div>
  );
}

