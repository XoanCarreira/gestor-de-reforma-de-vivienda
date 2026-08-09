import { Suspense, lazy, useState } from 'react';
import { useReformaDataContext } from './context/ReformaDataContext';
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

// App.tsx ya no mantiene estado de datos ni handlers CRUD: eso vive por
// completo en useReformaData / ReformaDataContext. Este componente se
// limita a la navegación entre secciones y al layout general.
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Único dato que el layout necesita directamente: el contador de
  // rexistros para la badge del header. El resto de secciones consultan
  // el contexto por sí mismas.
  const { storageStats } = useReformaDataContext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b-2 border-slate-200 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-sm flex items-center justify-center font-black text-white text-lg italic shadow-sm select-none">
              <img src="../icons/Logo-reformas-48.png" alt="" />
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

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('datos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border bg-slate-50 border-slate-200 text-slate-700"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{storageStats.total} rexistros</span>
            </button>

            <Suspense
              fallback={
                <div className="hidden sm:block px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-400 text-xs font-semibold">
                  Cargando reporte...
                </div>
              }
            >
              <div className="hidden sm:block">
                <ReportGenerator />
              </div>
            </Suspense>
          </div>
        </div>
      </header>

      {/* Main Layout Area: cada sección lee sus datos directamente del contexto */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full pb-24">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'presupuesto' && <BudgetSection />}
        {activeTab === 'fondos' && <FundsSection />}
        {activeTab === 'proveedores' && <SuppliersSection />}
        {activeTab === 'hitos' && <MilestonesSection />}
        {activeTab === 'documentos' && <DocumentsSection />}
        {activeTab === 'galeria' && <GallerySection />}
        {activeTab === 'datos' && <SyncStatus />}
      </main>

      {/* Mobile-first bottom scrolling navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 py-2 sm:py-3 px-2 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
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
            <span className="text-[10px] xs:text-[11px] font-medium">Partidas</span>
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
            <span className="text-[10px] xs:text-[11px] font-medium">Pagos</span>
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
            className={`hidden sm:block flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
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
        <ReportGenerator />
      </div>
    </div>
  );
}
