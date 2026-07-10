import { Suspense, lazy, useState, useEffect } from 'react';
import { dbInstance } from './db';
import { AppBackup, BudgetCategory, Supplier, Milestone, Invoice, ProgressPhoto, FundEntry } from './types';
import Dashboard from './components/Dashboard';
import BudgetSection from './components/BudgetSection';
import FundsSection from './components/FundsSection';
import SuppliersSection from './components/SuppliersSection';
import MilestonesSection from './components/MilestonesSection';
import DocumentsSection from './components/DocumentsSection';
import GallerySection from './components/GallerySection';
import SyncStatus from './components/SyncStatus';
import { LayoutDashboard, Wallet, Users, CalendarCheck, FileText, Camera, HardDrive, Database, Landmark } from 'lucide-react';

const ReportGenerator = lazy(() => import('./components/ReportGenerator'));

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [funds, setFunds] = useState<FundEntry[]>([]);
  const [storageStats, setStorageStats] = useState({ budget: 0, suppliers: 0, milestones: 0, invoices: 0, photos: 0, funds: 0, total: 0 });
  
  // Local activity log
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [clearingData, setClearingData] = useState(false);
  const [backupProcessing, setBackupProcessing] = useState(false);

  // PWA Register inside component lifecycle as well
  useEffect(() => {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`)
          .then((reg) => {
            logEvent('[PWA] Service Worker rexistrado exitosamente con alcance: ' + reg.scope);
          })
          .catch((err) => {
            logEvent('[PWA] Erro no rexistro de Service Worker: ' + err);
          });
      });
    }

    // Initial database load
    initData();

    return () => {
    };
  }, []);

  const logEvent = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    setActivityLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  };

  const initData = async () => {
    try {
      logEvent('Inicializando IndexedDB local (ReformaGestDB)...');
      await dbInstance.init();
      logEvent('Base de datos conectada correctamente.');
      
      await reloadAllData();
      setStorageStats(await dbInstance.getStats());
    } catch (e) {
      logEvent('Erro o abrir a base de datos: ' + e);
    }
  };

  const reloadAllData = async () => {
    const bData = await dbInstance.getAll<BudgetCategory>('budget');
    const sData = await dbInstance.getAll<Supplier>('suppliers');
    const mData = await dbInstance.getAll<Milestone>('milestones');
    const iData = await dbInstance.getAll<Invoice>('invoices');
    const pData = await dbInstance.getAll<ProgressPhoto>('photos');
    const fData = await dbInstance.getAll<FundEntry>('funds');

    // Sort milestones by date
    mData.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    setBudget(bData);
    setSuppliers(sData);
    setMilestones(mData);
    setInvoices(iData);
    setPhotos(pData);
    setFunds(fData);
    setStorageStats(await dbInstance.getStats());
  };

  const handleClearDatabase = async () => {
    const confirmed = window.confirm('Esto eliminará todas as partidas, proveedores, hitos, facturas e fotos gardadas na base local. ¿Desexas continuar?');
    if (!confirmed) {
      return;
    }

    try {
      setClearingData(true);
      await dbInstance.clearAllData();
      await reloadAllData();
      logEvent('[Database] Base local vaciada e lista para novos datos.');
    } catch (e) {
      logEvent('[Database] Erro ao vaciar a base local: ' + e);
    } finally {
      setClearingData(false);
    }
  };

  const handleExportBackup = async () => {
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

  const handleImportBackupFile = async (file: File) => {
    const confirmed = window.confirm('A importación substituirá todos os datos actuais pola información do backup. Continuar?');
    if (!confirmed) return;

    try {
      setBackupProcessing(true);
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as Partial<AppBackup>;

      if (!parsed || !Array.isArray(parsed.budget) || !Array.isArray(parsed.suppliers) || !Array.isArray(parsed.milestones) || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.photos) || !Array.isArray(parsed.funds)) {
        throw new Error('O ficheiro non é un backup válido.');
      }

      await dbInstance.importBackup({
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        budget: parsed.budget,
        suppliers: parsed.suppliers,
        milestones: parsed.milestones,
        invoices: parsed.invoices,
        photos: parsed.photos,
        funds: parsed.funds
      });

      await reloadAllData();
      logEvent(`[Backup] Importado correctamente o ficheiro ${file.name}`);
    } catch (e) {
      logEvent('[Backup] Erro ao importar a copia de seguridade: ' + e);
      alert('Non se puido importar o backup. Verifica que o ficheiro sexa un JSON xerado pola aplicación.');
    } finally {
      setBackupProcessing(false);
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
    logEvent(`[Database] Partida de presuposto actualizada: "${cat.name}"`);
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
    logEvent(`[Database] Proveedor rexistrado: "${newSup.name}" para o servizo de "${newSup.service}"`);
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
    logEvent(`[Database] Planificación de Hito agregada: "${newMilestone.title}" con límite o ${newMilestone.dueDate}`);
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
      isSynced: false,
      isLocalOnly: true
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
      isSynced: false,
      isLocalOnly: true
    };

    await dbInstance.add('photos', newPhoto);
    logEvent(`[Database] Avance visual gardado: "${newPhoto.title}"`);
    await reloadAllData();
  };

  const handleDeletePhoto = async (id: string) => {
    const ph = photos.find(x => x.id === id);
    await dbInstance.delete('photos', id);
    logEvent(`[Database] Fotografía eliminada: "${ph?.title || id}"`);
    await reloadAllData();
  };

  // Funds
  const handleAddFund = async (fund: Omit<FundEntry, 'id'>) => {
    const newFund: FundEntry = {
      ...fund,
      id: 'f_' + Math.random().toString(36).substring(2, 9)
    };
    await dbInstance.add('funds', newFund);
    logEvent(`[Database] Fondo rexistrado: "${newFund.source}" por ${newFund.amount}€`);
    await reloadAllData();
  };

  const handleDeleteFund = async (id: string) => {
    const fund = funds.find(x => x.id === id);
    await dbInstance.delete('funds', id);
    logEvent(`[Database] Fondo eliminado: "${fund?.source || id}"`);
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
                ReformaVivenda <span className="text-amber-600">XC</span>
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest block leading-none mt-0.5">
                Xestión Integral de Obra
              </span>
            </div>
          </div>

          {/* Local data badge & report download side-by-side */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('datos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border bg-slate-50 border-slate-200 text-slate-700"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{storageStats.total} rexistros</span>
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
            funds={funds}
            onNavigate={setActiveTab}
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

        {activeTab === 'fondos' && (
          <FundsSection
            funds={funds}
            onAddFund={handleAddFund}
            onDeleteFund={handleDeleteFund}
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
          />
        )}

        {activeTab === 'galeria' && (
          <GallerySection
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
          />
        )}

        {activeTab === 'datos' && (
          <SyncStatus
            stats={storageStats}
            onClearData={handleClearDatabase}
            onExportBackup={handleExportBackup}
            onImportBackupFile={handleImportBackupFile}
            clearing={clearingData}
            backupProcessing={backupProcessing}
            activityLogs={activityLogs}
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
            onClick={() => setActiveTab('fondos')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'fondos' ? 'text-emerald-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Landmark className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium">Fondos</span>
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
            onClick={() => setActiveTab('datos')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'datos' ? 'text-amber-600 scale-110 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px] xs:text-[11px] font-medium font-sans">Datos</span>
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

