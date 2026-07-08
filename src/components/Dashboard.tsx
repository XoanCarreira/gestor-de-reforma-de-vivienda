import { BudgetCategory, Milestone, Supplier } from '../types';
import { AlertTriangle, TrendingUp, CheckCircle, Clock, Users, HardHat, TrendingDown, Database } from 'lucide-react';

interface DashboardProps {
  budget: BudgetCategory[];
  suppliers: Supplier[];
  milestones: Milestone[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({
  budget,
  suppliers,
  milestones,
  onNavigate
}: DashboardProps) {
  const TODAY_STR = '2026-07-08'; // System reference date

  // Calculations
  const totalAllocated = budget.reduce((sum, c) => sum + c.allocated, 0);
  const totalSpent = budget.reduce((sum, c) => sum + c.spent, 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalContracted = suppliers.reduce((sum, s) => sum + s.contractedAmount, 0);
  
  const remainingBudget = totalAllocated - totalSpent;
  const progressPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // Milestones Progress
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const milestonesPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Deviation alerts
  const costDeviations = budget.filter(c => c.spent > c.allocated);
  const nearLimitCategories = budget.filter(c => c.spent > 0 && c.spent <= c.allocated && (c.spent / c.allocated) >= 0.9);

  // Time / milestone warnings
  const delayedMilestones = milestones.filter(m => {
    if (m.status === 'completed') return false;
    if (m.status === 'delayed') return true;
    return m.dueDate < TODAY_STR;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-none text-xs sm:text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-900" />
          <span><strong>Persistencia local activa.</strong> Todo lo que hagas se guarda en IndexedDB dentro de este navegador.</span>
        </div>
        <button
          onClick={() => onNavigate('datos')}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-none transition-all active:scale-95 uppercase tracking-wider shadow"
        >
          Ver base local
        </button>
      </div>

      {/* Alertas Automáticas */}
      {(costDeviations.length > 0 || delayedMilestones.length > 0) && (
        <div id="alert-container" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {costDeviations.length > 0 && (
            <div className="p-4 bg-red-50/50 border-l-4 border-red-500 shadow-sm text-slate-800 rounded-none">
              <div className="flex items-center gap-2 mb-2 font-black text-xs sm:text-sm text-red-700 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h3>Alerta de Desviación de Costos</h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm">
                {costDeviations.map(c => {
                  const dev = c.spent - c.allocated;
                  return (
                    <li key={c.id} className="flex justify-between items-center bg-white border border-slate-100 p-2 shadow-sm">
                      <span className="font-medium text-slate-700">{c.name}</span>
                      <span className="font-black text-red-600">
                        +{dev.toLocaleString('es-ES')} € ({Math.round((c.spent / c.allocated) * 100 - 100)}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {delayedMilestones.length > 0 && (
            <div className="p-4 bg-amber-50/50 border-l-4 border-amber-500 shadow-sm text-slate-800 rounded-none">
              <div className="flex items-center gap-2 mb-2 font-black text-xs sm:text-sm text-amber-700 uppercase tracking-wider">
                <Clock className="w-4 h-4 shrink-0" />
                <h3>Alerta de Desviación de Plazos</h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm">
                {delayedMilestones.map(m => (
                  <li key={m.id} className="flex flex-col bg-white border border-slate-100 p-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{m.title}</span>
                      <span className="font-black text-[9px] bg-red-100 text-red-700 px-2 py-0.5 uppercase tracking-wider">
                        {m.status === 'delayed' ? 'Retrasado' : 'Vencido'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Límite: {new Date(m.dueDate).toLocaleDateString('es-ES')} (Hace {Math.round((new Date(TODAY_STR).getTime() - new Date(m.dueDate).getTime()) / (1000 * 60 * 60 * 24))} días)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 bg-white border-l-4 border-amber-500 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Presupuesto Total</p>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {totalAllocated.toLocaleString('es-ES')} €
            </p>
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-2 block">Total acordado inicial</span>
        </div>

        {/* KPI 2 */}
        <div className="p-5 bg-white border-l-4 border-emerald-500 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Invertido / Ejecutado</p>
            <p className={`text-2xl font-black mt-2 ${totalSpent > totalAllocated ? 'text-red-600' : 'text-slate-900'}`}>
              {totalSpent.toLocaleString('es-ES')} €
            </p>
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-2 block">
            {progressPercent.toFixed(1)}% del asignado
          </span>
        </div>

        {/* KPI 3 */}
        <div className={`p-5 border-l-4 shadow-sm flex flex-col justify-between ${
          remainingBudget < 0 ? 'bg-red-50 border-red-500' : 'bg-white border-slate-950'
        }`}>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Restante</p>
            <p className={`text-2xl font-black mt-2 ${remainingBudget < 0 ? 'text-red-700' : 'text-slate-900'}`}>
              {remainingBudget.toLocaleString('es-ES')} €
            </p>
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-2 block">
            {remainingBudget < 0 ? 'Sobrecoste neto detectado' : 'Disponible en reserva'}
          </span>
        </div>

        {/* KPI 4 */}
        <div className="p-5 bg-white border-l-4 border-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Avance de Obra</p>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {completedMilestones} / {totalMilestones}
            </p>
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-2 block">
            {milestonesPercent}% del cronograma
          </span>
        </div>
      </div>

      {/* Main Charts & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Comparison Custom Chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200 shadow-sm rounded-none">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Comparativa Presupuesto vs Invertido
          </h3>

          <div className="space-y-4">
            {budget.map(cat => {
              const capPercent = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
              const isOver = cat.spent > cat.allocated;
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="font-bold text-slate-800">{cat.name}</span>
                    <div className="space-x-1.5">
                      <span className="text-slate-400 font-mono text-xs">Asignado: {cat.allocated}€</span>
                      <span className={`font-mono text-xs font-black ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
                        Gastado: {cat.spent}€
                      </span>
                    </div>
                  </div>
                  {/* Custom Dual Bar Chart representation */}
                  <div className="relative h-3.5 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                    {/* Spent Bar */}
                    <div
                      style={{ width: `${Math.min(capPercent, 100)}%` }}
                      className={`h-full transition-all duration-500 ${
                        isOver 
                          ? 'bg-red-500' 
                          : capPercent >= 90 
                            ? 'bg-amber-500' 
                            : 'bg-slate-900'
                      }`}
                    />
                    {/* If over-budget, draw a warning indicator at 100% */}
                    {isOver && (
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-red-700 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-[10px] sm:text-xs text-slate-400 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-900" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Correcto (&lt;90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Límite (90% - 100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-500" />
              <span className="font-bold uppercase tracking-wider text-[9px]">Excedido (&gt;100%)</span>
            </div>
          </div>
        </div>

        {/* Global Progress Radial Metric & Action Panel */}
        <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-none flex flex-col justify-between">
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <HardHat className="w-4 h-4 text-slate-900" />
              Progreso de Obra
            </h3>

            {/* Circular Progress Wheel */}
            <div className="flex flex-col items-center py-4">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="8"
                  />
                  {/* Foreground progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#0f172a"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - milestonesPercent / 100)}`}
                    strokeLinecap="butt"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-sans text-slate-900 tracking-tighter">
                    {milestonesPercent}%
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                    Completado
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accesos Rápidos Obra</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('documentos')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-none text-center text-xs font-bold transition-all active:scale-95 flex flex-col items-center gap-1 shadow-sm"
              >
                <span className="text-amber-600 font-black uppercase tracking-wider text-[10px]">Facturas</span>
                <span className="text-[9px] text-slate-400">Cargar Recibo</span>
              </button>
              <button
                onClick={() => onNavigate('galeria')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-none text-center text-xs font-bold transition-all active:scale-95 flex flex-col items-center gap-1 shadow-sm"
              >
                <span className="text-slate-900 font-black uppercase tracking-wider text-[10px]">Cámara</span>
                <span className="text-[9px] text-slate-400">Subir Avance</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
