import React, { useState } from 'react';
import { BudgetCategoryRecord, BudgetExpense } from '../types';
import { Plus, Edit2, Trash2, Check, X, AlertTriangle, Lock, ChevronDown, ChevronUp, SlidersHorizontal, ReceiptText } from 'lucide-react';
import { getBudgetStatus } from '../utils/budget';
import { useReformaDataContext } from '../context/ReformaDataContext';
import { useConfirm } from '../hooks/useConfirm';


// Este componente ya no recibe props: budget, expenses y todos los handlers
// CRUD se leen directamente del contexto de datos.
export default function BudgetSection() {
  const {
    budget,
    budgetExpenses: expenses,
    addBudgetCategory: onAddCategory,
    updateBudgetCategory: onUpdateCategory,
    deleteBudgetCategory: onDeleteCategory,
    addBudgetExpense: onAddExpense,
    updateBudgetExpense: onUpdateExpense,
    deleteBudgetExpense: onDeleteExpense
  } = useReformaDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states (nota: xa NON hai 'spent' aquí — é un valor derivado, non editable)
  const [name, setName] = useState('');
  const [allocated, setAllocated] = useState('');
  const [notes, setNotes] = useState('');

  // Edición rápida de gasto acumulado (cargo rápido, sempre positivo)
  const [quickSpentIncrement, setQuickSpentIncrement] = useState<{ [id: string]: string }>({});

  // Axuste manual (pode ser positivo ou negativo, para correccións)
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');

  // Histórico de movimientos: partida actualmente desplegada
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edición inline de un movimiento individual del histórico
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseSource, setEditingExpenseSource] = useState<BudgetExpense['source'] | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  const confirm = useConfirm();

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isNaN(Number(allocated))) return;

    onAddCategory({
      name,
      allocated: Number(allocated),
      notes: notes || undefined
    });

    setName('');
    setAllocated('');
    setNotes('');
    setIsAdding(false);
  };

  const handleStartEdit = (cat: BudgetCategoryRecord) => {
    setEditingId(cat.id);
    setName(cat.name);
    setAllocated(String(cat.allocated));
    setNotes(cat.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!name || isNaN(Number(allocated))) return;

    onUpdateCategory({
      id,
      name,
      allocated: Number(allocated),
      notes: notes || undefined
    });

    setEditingId(null);
  };

  const handleQuickAddSpent = (cat: BudgetCategoryRecord) => {
    const val = Number(quickSpentIncrement[cat.id]);
    if (isNaN(val) || val <= 0) return;

    onAddExpense(cat.id, val, 'quick', 'Cargo rápido en obra');
    setQuickSpentIncrement(prev => ({ ...prev, [cat.id]: '' }));
  };

  // --- Axuste manual: substitúe á antiga edición directa de 'spent'. Queda
  // rexistrado no histórico como calquera outro movemento, así que nunca se
  // perde a trazabilidade de por que cambiou o acumulado. Admite importes
  // negativos (p. ex. -50 para corrixir un exceso rexistrado por erro). ---

  const handleStartAdjust = (catId: string) => {
    setAdjustingId(catId);
    setAdjustAmount('');
    setAdjustDescription('');
  };

  const handleCancelAdjust = () => {
    setAdjustingId(null);
    setAdjustAmount('');
    setAdjustDescription('');
  };

  const handleSaveAdjust = () => {
    if (!adjustingId) return;
    const val = Number(adjustAmount);
    if (isNaN(val) || val === 0) return;

    onAddExpense(adjustingId, val, 'manual', adjustDescription || 'Axuste manual');
    handleCancelAdjust();
  };

  const handleStartEditExpense = (exp: BudgetExpense) => {
    setEditingExpenseId(exp.id);
    setEditingExpenseSource(exp.source);
    setExpenseAmount(String(exp.amount));
    setExpenseDescription(exp.description || '');
    setExpenseDate(exp.date);
  };

  const handleCancelEditExpense = () => {
    setEditingExpenseId(null);
    setEditingExpenseSource(null);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseDate('');
  };

  const handleSaveEditExpense = () => {
    const val = Number(expenseAmount);
    if (!editingExpenseId || isNaN(val) || val === 0) return;
    // Só os axustes manuais poden gardarse en negativo; un cargo rápido
    // sempre representa un gasto real.
    if (editingExpenseSource !== 'manual' && val <= 0) return;

    onUpdateExpense(editingExpenseId, val, expenseDescription, expenseDate);
    handleCancelEditExpense();
  };

  return (
    <div className="space-y-6">
      {/* Header e Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Control do Orzamento</h2>
          <p className="text-xs text-slate-500 mt-1">Inclue aquí as distintas partidas do orzamento para facer un seguimento individual de cada unha. O total destas partidas móstrase no dashboard como <i>Orzamento Total</i>.</p>
          <p className="text-xs text-slate-500 mt-1">Aquí so deberías incluir a cantidade asignada a cada partida. Os pagos débense rexistrar na súa propia sección.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar' : 'Nova Partida'}</span>
        </button>
      </div>

      {/* Engadir partida (Expansible) */}
      {isAdding && (
        <form onSubmit={handleSaveAdd} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Nueva Partida de Presuposto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Nombre de partida</label>
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
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Presuposto asignado (€)</label>
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
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Notas / Observacións</label>
              <input
                type="text"
                placeholder="Opcional. Ej. Prazo de inicio..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
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

      {/* Categorías */}
      {budget.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-none">
            <ReceiptText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-800 uppercase tracking-wide text-xs">Non existen partidas neste momento.</p>
            <p className="text-xs text-slate-500 mt-1">Engada unha nova partida co botón superior.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budget.map(cat => {
            const isEditing = editingId === cat.id;
            const { percentUsed, deviation, isOver } = getBudgetStatus(cat);

            return (
              <div
                key={cat.id}
                className={`p-5 rounded-none border transition-all ${isOver
                  ? 'bg-red-50/40 border border-red-200 border-l-4 border-l-red-500 shadow-sm'
                  : percentUsed >= 90
                    ? 'bg-amber-50/40 border border-amber-200 border-l-4 border-l-amber-500 shadow-sm'
                    : 'bg-white border border-slate-200 border-l-4 border-l-slate-900 shadow-sm'
                  }`}
              >
                {isEditing ? (
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
                        {/* Xa non é editable: é un valor calculado a partir do
                          histórico de movementos. Para corrixilo hai que
                          engadir un axuste manual (ver abaixo), non
                          sobrescribir este número directamente. */}
                        <input
                          type="text"
                          value={`${cat.spent.toLocaleString('es-ES')} €`}
                          disabled
                          className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-none text-xs text-slate-500 cursor-not-allowed"
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
                    <p className="text-[10px] text-slate-500">
                      O importe gastado calcúlase automaticamente sumando o histórico de movementos desta partida. Para corrixilo, pecha esta edición e engade un <strong>axuste manual</strong> no histórico (podes usar un importe negativo).
                    </p>
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
                  /* Visualizador de partida */
                  <div className="flex flex-col h-full justify-between space-y-4">
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
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Eliminar partida de orzamento',
                                description: `¿Seguro que queres eliminar a partida ${cat.name}?`
                              });
                              if (ok) onDeleteCategory(cat.id);
                            }}
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

                      <div className="relative h-2.5 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                        <div
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                          className={`h-full transition-all duration-500 ${isOver
                            ? 'bg-red-500'
                            : percentUsed >= 90
                              ? 'bg-amber-500'
                              : 'bg-slate-900'
                            }`}
                        />
                      </div>

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

                    {(() => {
                      const categoryExpenses = expenses.filter(e => e.categoryId === cat.id);
                      const isExpanded = expandedId === cat.id;
                      const isAdjusting = adjustingId === cat.id;

                      return (
                        <div className="border-t border-slate-100 pt-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                              className="flex-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
                            >
                              <span>Histórico de gastos ({categoryExpenses.length})</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => { setExpandedId(cat.id); handleStartAdjust(cat.id); }}
                              className="p-1 text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                              title="Engadir axuste manual (permite importes negativos para corrixir)"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5">
                              {isAdjusting && (
                                <div className="bg-blue-50 border border-blue-200 p-2 space-y-1.5">
                                  <p className="text-[10px] text-blue-800 font-bold">Axuste manual (admite importes negativos, ex. -50, para corrixir)</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={adjustAmount}
                                      onChange={e => setAdjustAmount(e.target.value)}
                                      placeholder="Importe (€), pode ser negativo"
                                      className="px-2 py-1 bg-white border border-slate-200 rounded-none text-[11px] text-slate-900"
                                    />
                                    <input
                                      type="text"
                                      value={adjustDescription}
                                      onChange={e => setAdjustDescription(e.target.value)}
                                      placeholder="Motivo do axuste"
                                      className="px-2 py-1 bg-white border border-slate-200 rounded-none text-[11px] text-slate-900"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={handleCancelAdjust}
                                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded-none text-slate-700 transition-colors"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={handleSaveAdjust}
                                      className="p-1 bg-slate-900 hover:bg-slate-800 rounded-none text-white transition-colors"
                                      title="Gardar axuste"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="max-h-56 overflow-y-auto pr-0.5 space-y-1.5">
                                {categoryExpenses.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic py-1">Aínda non hai movementos rexistrados para esta partida.</p>
                                ) : (
                                  categoryExpenses.map(exp => {
                                    const isLocked = exp.source === 'invoice';
                                    const isEditingExpense = editingExpenseId === exp.id;

                                    if (isEditingExpense) {
                                      return (
                                        <div key={exp.id} className="bg-slate-50 border border-slate-200 p-2 space-y-1.5">
                                          <div className="grid grid-cols-2 gap-1.5">
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={expenseAmount}
                                              onChange={e => setExpenseAmount(e.target.value)}
                                              placeholder="Importe (€)"
                                              className="px-2 py-1 bg-white border border-slate-200 rounded-none text-[11px] text-slate-900"
                                            />
                                            <input
                                              type="date"
                                              value={expenseDate}
                                              onChange={e => setExpenseDate(e.target.value)}
                                              className="px-2 py-1 bg-white border border-slate-200 rounded-none text-[11px] text-slate-900"
                                            />
                                          </div>
                                          <input
                                            type="text"
                                            value={expenseDescription}
                                            onChange={e => setExpenseDescription(e.target.value)}
                                            placeholder="Descrición do gasto"
                                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-none text-[11px] text-slate-900"
                                          />
                                          <div className="flex justify-end gap-1.5">
                                            <button
                                              onClick={handleCancelEditExpense}
                                              className="p-1 bg-slate-100 hover:bg-slate-200 rounded-none text-slate-700 transition-colors"
                                              title="Cancelar"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={handleSaveEditExpense}
                                              className="p-1 bg-slate-900 hover:bg-slate-800 rounded-none text-white transition-colors"
                                              title="Gardar"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={exp.id}
                                        className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 border border-slate-100 px-2 py-1.5"
                                      >
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-bold text-slate-800 truncate">{exp.description || 'Sen descrición'}</span>
                                          <span className="text-slate-400">{new Date(exp.date).toLocaleDateString('es-ES')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span
                                            className={`text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-1 border ${exp.source === 'invoice'
                                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                                              : exp.source === 'quick'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                              }`}
                                          >
                                            {isLocked && <Lock className="w-2.5 h-2.5" />}
                                            {exp.source === 'invoice' ? 'Factura' : exp.source === 'quick' ? 'Gasto rápido' : 'Manual'}
                                          </span>
                                          <span className={`font-mono font-black ${exp.amount < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                                            {exp.amount >= 0 ? '' : '−'}{Math.abs(exp.amount).toLocaleString('es-ES')} €
                                          </span>

                                          {!isLocked && (
                                            <div className="flex items-center gap-0.5">
                                              <button
                                                onClick={() => handleStartEditExpense(exp)}
                                                className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                                                title="Editar movemento"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={async () => {
                                                  const ok = await confirm({
                                                    title: 'Eliminar movemento',
                                                    description: `¿Seguro que queres eliminar o movemento ${exp.source}?`
                                                  });
                                                  if (ok) onDeleteExpense(exp.id);
                                                }}
                                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                title="Eliminar movemento"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
