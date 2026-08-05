import React, { useState } from 'react';
import { BudgetCategory } from '../types';
import { Plus, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';

interface BudgetSectionProps {
  budget: BudgetCategory[];
  onAddCategory: (category: Omit<BudgetCategory, 'id'>) => void;
  onUpdateCategory: (category: BudgetCategory) => void;
  onDeleteCategory: (id: string) => void;
}

export default function BudgetSection({
  budget,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: BudgetSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [allocated, setAllocated] = useState('');
  const [spent, setSpent] = useState('');
  const [notes, setNotes] = useState('');

  // Edición rápida de gasto acumulado
  const [quickSpentIncrement, setQuickSpentIncrement] = useState<{ [id: string]: string }>({});

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isNaN(Number(allocated))) return;

    onAddCategory({
      name,
      allocated: Number(allocated),
      spent: Number(spent) || 0,
      notes: notes || undefined
    });

    // Reset
    resetForm();
    setIsAdding(false);
  };

  const handleStartEdit = (cat: BudgetCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setAllocated(String(cat.allocated));
    setSpent(String(cat.spent));
    setNotes(cat.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!name || isNaN(Number(allocated)) || isNaN(Number(spent))) return;

    onUpdateCategory({
      id,
      name,
      allocated: Number(allocated),
      spent: Number(spent),
      notes: notes || undefined
    });

    setEditingId(null);
  };

  const handleQuickAddSpent = (cat: BudgetCategory) => {
    const val = Number(quickSpentIncrement[cat.id]);
    if (isNaN(val) || val <= 0) return;

    onUpdateCategory({
      ...cat,
      spent: cat.spent + val
    });

    setQuickSpentIncrement(prev => ({ ...prev, [cat.id]: '' }));
  };

  const resetForm = () => {
    setName('');
    setAllocated('');
    setSpent('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Control de orzamento</h2>
          <p className="text-xs text-slate-500 mt-1">Segue as desviacións e xestiona as partidas da túa reforma.</p>
        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); resetForm(); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar' : 'Nova Partida'}</span>
        </button>
      </div>

      {/* Add Form (Expandable) */}
      {isAdding && (
        <form onSubmit={handleSaveAdd} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Nova partida de orzamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Nome da partida</label>
              <input
                type="text"
                required
                placeholder="Ej. Alicatado do baño, Climatización..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Orzamento asignado (€)</label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={allocated}
                onChange={e => setAllocated(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Gastado acumulado (€)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={spent}
                onChange={e => setSpent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Notas / Observacións</label>
              <input
                type="text"
                placeholder="Prazo de inicio..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => { setIsAdding(false); resetForm(); }}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-none text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none text-xs sm:text-sm active:scale-95 transition-all uppercase tracking-wider"
            >
              Gardar Partida
            </button>
          </div>
        </form>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budget.map(cat => {
          const isEditing = editingId === cat.id;
          const deviation = cat.spent - cat.allocated;
          const percentUsed = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
          const isOver = cat.spent > cat.allocated;

          return (
            <div
              key={cat.id}
              className={`p-5 rounded-none border transition-all ${
                isOver
                  ? 'bg-red-50/40 border border-red-200 border-l-4 border-l-red-500 shadow-sm'
                  : percentUsed >= 90
                    ? 'bg-amber-50/40 border border-amber-200 border-l-4 border-l-amber-500 shadow-sm'
                    : 'bg-white border border-slate-200 border-l-4 border-l-slate-900 shadow-sm'
              }`}
            >
              {isEditing ? (
                /* Edit Form Mode */
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Asignado (€)</label>
                      <input
                        type="number"
                        value={allocated}
                        onChange={e => setAllocated(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Gastado (€)</label>
                      <input
                        type="number"
                        value={spent}
                        onChange={e => setSpent(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Notas</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-none text-slate-700 transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-none text-white transition-colors"
                      title="Gardar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Card Display Mode */
                <div className="flex flex-col h-full justify-between space-y-4">
                  {/* Top: Name, Deviation Indicator and Actions */}
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-none">
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cat.notes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-none border border-slate-200/60 mt-2">
                        {cat.notes}
                      </p>
                    )}
                  </div>

                  {/* Mid: Progreso e desviacións */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-black tracking-wider">Asignado</span>
                        <span className="text-slate-900 font-bold">{cat.allocated.toLocaleString('es-ES')} €</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block uppercase font-black tracking-wider">Gastado</span>
                        <span className={`font-black ${isOver ? 'text-red-600' : 'text-slate-900'}`}>
                          {cat.spent.toLocaleString('es-ES')} €
                        </span>
                      </div>
                    </div>

                    {/* Cost Progress Bar */}
                    <div className="relative h-2.5 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        className={`h-full transition-all duration-500 ${
                          isOver 
                            ? 'bg-red-500' 
                            : percentUsed >= 90 
                              ? 'bg-amber-500' 
                              : 'bg-slate-900'
                        }`}
                      />
                    </div>

                    {/* Progress Indicator Texts */}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-black uppercase tracking-wider text-[10px] ${isOver ? 'text-red-600' : percentUsed >= 90 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {percentUsed.toFixed(1)}% utilizado
                      </span>
                      {deviation > 0 ? (
                        <div className="flex items-center gap-1 text-red-600 font-black uppercase tracking-wider text-[10px]">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Desviación: +{deviation.toLocaleString('es-ES')} €</span>
                        </div>
                      ) : deviation < 0 ? (
                        <span className="text-emerald-600 font-black uppercase tracking-wider text-[10px]">
                          Aforro: {Math.abs(deviation).toLocaleString('es-ES')} €
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Axustado</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Mobile on-site Quick Log of spent expenses */}
                  <div className="bg-slate-50 p-2.5 rounded-none flex items-center justify-between gap-2 border border-slate-200">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Sumar gasto rápido</label>
                      <div className="flex gap-1">
                        <span className="text-xs text-slate-400 self-center pl-1 font-bold">€</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={quickSpentIncrement[cat.id] || ''}
                          onChange={e => setQuickSpentIncrement({ ...quickSpentIncrement, [cat.id]: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-none text-xs p-1 text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickAddSpent(cat)}
                      disabled={!quickSpentIncrement[cat.id] || isNaN(Number(quickSpentIncrement[cat.id])) || Number(quickSpentIncrement[cat.id]) <= 0}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-none text-xs font-black transition-all shrink-0 uppercase tracking-wider"
                    >
                      Engadir
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
