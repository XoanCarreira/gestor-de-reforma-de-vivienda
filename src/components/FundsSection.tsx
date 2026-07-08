import React, { useState } from 'react';
import { FundEntry } from '../types';
import { Plus, Trash2, X, PiggyBank, Landmark } from 'lucide-react';

interface FundsSectionProps {
  funds: FundEntry[];
  onAddFund: (fund: Omit<FundEntry, 'id'>) => void;
  onDeleteFund: (id: string) => void;
}

export default function FundsSection({ funds, onAddFund, onDeleteFund }: FundsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);

  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-07-08');
  const [notes, setNotes] = useState('');

  const totalFunds = funds.reduce((sum, fund) => sum + fund.amount, 0);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || isNaN(Number(amount))) return;

    onAddFund({
      source,
      amount: Number(amount),
      date,
      notes: notes || undefined
    });

    setSource('');
    setAmount('');
    setDate('2026-07-08');
    setNotes('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Fondos dispoñibles</h2>
          <p className="text-xs text-slate-500 mt-1">Rexistra cada achega, préstamo, subvención ou entrada de diñeiro coa súa orixe.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar' : 'Novo fondo'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border-l-4 border-emerald-500 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total fondos</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalFunds.toLocaleString('es-ES')} €</p>
        </div>
        <div className="p-5 bg-white border-l-4 border-slate-900 shadow-sm md:col-span-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Número de entradas</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{funds.length}</p>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSaveAdd} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Engadir novo fondo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Procedencia</label>
              <input value={source} onChange={e => setSource(e.target.value)} required type="text" placeholder="Ex. Aporte propio, préstamo, subvención..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Importe (€)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} required type="number" min="0.01" step="0.01" placeholder="0.00" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data</label>
              <input value={date} onChange={e => setDate(e.target.value)} required type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Notas</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} type="text" placeholder="Ex. tramo inicial da obra..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-none text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition-all">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none text-xs sm:text-sm active:scale-95 transition-all uppercase tracking-wider">Gardar fondo</button>
          </div>
        </form>
      )}

      <div className="space-y-3.5">
        <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">Entradas rexistradas</h3>

        {funds.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-none">
            <PiggyBank className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-800 uppercase tracking-wide text-xs">Aínda non hai fondos rexistrados.</p>
            <p className="text-xs text-slate-500 mt-1">Engade a primeira entrada para ver o balance fronte ao gasto previsto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funds.map((fund) => (
              <div key={fund.id} className="p-4 bg-white border border-slate-200 hover:border-slate-400 rounded-none flex items-start justify-between gap-4 transition-all shadow-sm">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-none text-slate-900 shrink-0">
                    <Landmark className="w-5 h-5 text-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-sm truncate">{fund.source}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                      <span>{new Date(fund.date).toLocaleDateString('es-ES')}</span>
                      <span>•</span>
                      <span className="truncate max-w-[160px]">{fund.notes || 'Sen notas'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-black tracking-wider">Importe</span>
                    <span className="font-mono font-black text-sm sm:text-base text-slate-900">{fund.amount.toLocaleString('es-ES')} €</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onDeleteFund(fund.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-none transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}