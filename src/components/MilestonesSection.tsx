import React, { useState } from 'react';
import { Milestone, MilestoneStatus } from '../types';
import { Plus, Edit2, Trash2, Check, X, Calendar, AlertTriangle, PlayCircle, CheckCircle2 } from 'lucide-react';
import { utils } from '../utils/date';

interface MilestonesSectionProps {
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  onUpdateMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
}

export default function MilestonesSection({
  milestones,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone
}: MilestonesSectionProps) {
  const TODAY_STR = utils.getToday(); // Reference System Date

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(utils.getToday());
  const [status, setStatus] = useState<MilestoneStatus>('pending');
  const [completedDate, setCompletedDate] = useState('');

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    onAddMilestone({
      title,
      description,
      dueDate,
      status,
      completedDate: status === 'completed' ? (completedDate || TODAY_STR) : undefined
    });

    // Reset
    resetForm();
    setIsAdding(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(utils.getToday());
    setStatus('pending');
    setCompletedDate('');
  };

  const handleStartEdit = (m: Milestone) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description);
    setDueDate(m.dueDate);
    setStatus(m.status);
    setCompletedDate(m.completedDate || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!title || !dueDate) return;

    onUpdateMilestone({
      id,
      title,
      description,
      dueDate,
      status,
      completedDate: status === 'completed' ? (completedDate || TODAY_STR) : undefined
    });

    setEditingId(null);
  };

  const handleQuickStatusChange = (m: Milestone, newStatus: MilestoneStatus) => {
    onUpdateMilestone({
      ...m,
      status: newStatus,
      completedDate: newStatus === 'completed' ? TODAY_STR : undefined
    });
  };

  // Helper to determine if a milestone is delayed/overdue
  const isOverdue = (m: Milestone) => {
    if (m.status === 'completed') return false;
    if (m.status === 'delayed') return true;
    return m.dueDate < TODAY_STR;
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Planificación e Hitos</h2>
          <p className="text-xs text-slate-500 mt-1">Monitorea o cronograma do proxecto e detecta retrasos en prazos de entrega.</p>
        </div>
        <button
          onClick={() => {setIsAdding(!isAdding); resetForm();}}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar' : 'Engadir Hito'}</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleSaveAdd} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Novo Hito de Obra</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Nome do Hito / Tarea</label>
              <input
                type="text"
                required
                placeholder="Ej. Alicatado do baño, Falso Teito..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data Límite</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Descripción / Alcance</label>
              <input
                type="text"
                placeholder="Ej. Colocación de baldosas de gres e selado de xuntas..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Estado Inicial</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as MilestoneStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none"
              >
                <option value="pending">Pendente</option>
                <option value="in_progress">En Curso</option>
                <option value="completed">Completado</option>
                <option value="delayed">Retrasado</option>
              </select>
            </div>
            {status === 'completed' && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data de Finalización Real</label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={e => setCompletedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none"
                />
              </div>
            )}
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
              Gardar Hito
            </button>
          </div>
        </form>
      )}

      {/* Interactive Timeline Layout */}
      <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
        {milestones.map(m => {
          const isEditing = editingId === m.id;
          const delayed = isOverdue(m);

          return (
            <div key={m.id} className="relative group">
              {/* Timeline dot */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-4 bg-white ${
                  m.status === 'completed'
                    ? 'border-slate-900'
                    : m.status === 'in_progress'
                      ? 'border-blue-500'
                      : delayed
                        ? 'border-red-500 animate-pulse'
                        : 'border-slate-400'
                }`}
              />

              {/* Edit Form */}
              {isEditing ? (
                <div className="p-4 bg-white border border-slate-200 rounded-none shadow-sm space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Título</label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Data Límite</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Descripción</label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Estado</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as MilestoneStatus)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900 font-bold"
                      >
                        <option value="pending">Pendente</option>
                        <option value="in_progress">En Curso</option>
                        <option value="completed">Completado</option>
                        <option value="delayed">Retrasado</option>
                      </select>
                    </div>
                    {status === 'completed' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Data Final Real</label>
                        <input
                          type="date"
                          value={completedDate}
                          onChange={e => setCompletedDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-none text-slate-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(m.id)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-none text-white transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Card Display */
                <div className="p-4 bg-white border border-slate-200 rounded-none flex flex-col sm:flex-row justify-between gap-4 shadow-sm group-hover:border-slate-400 transition-all">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base leading-none">
                        {m.title}
                      </h3>
                      {/* State Pill */}
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider border ${
                          m.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : delayed
                                ? 'bg-red-50 text-red-800 border-red-200 animate-pulse'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m.status === 'completed'
                          ? 'Completado'
                          : m.status === 'in_progress'
                            ? 'En Curso'
                            : m.status === 'delayed'
                              ? 'Retrasado'
                              : 'Pendiente'}
                      </span>
                    </div>

                    {m.description && (
                      <p className="text-xs sm:text-sm text-slate-500">
                        {m.description}
                      </p>
                    )}

                    {/* Due Dates / Delayed Banner */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Data Límite: {new Date(m.dueDate).toLocaleDateString('es-ES')}</span>
                      </span>

                      {m.completedDate && (
                        <span className="text-emerald-700 font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finalizado: {new Date(m.completedDate).toLocaleDateString('es-ES')}</span>
                        </span>
                      )}

                      {delayed && (
                        <span className="text-red-700 font-black flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>¡Vencido fai {Math.round((new Date(TODAY_STR).getTime() - new Date(m.dueDate).getTime()) / (1000 * 60 * 60 * 24))} días!</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Quick status transition pills and Edit actions */}
                  <div className="flex sm:flex-col justify-between items-end gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 shrink-0">
                    <div className="flex items-center gap-1.5 self-start sm:self-end">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteMilestone(m.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick State Toggle for Site workers */}
                    {m.status !== 'completed' && (
                      <div className="flex gap-1.5">
                        {m.status !== 'in_progress' && (
                          <button
                            onClick={() => handleQuickStatusChange(m, 'in_progress')}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[10px] rounded-none transition-all flex items-center gap-1 uppercase tracking-wider"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Iniciar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleQuickStatusChange(m, 'completed')}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] rounded-none transition-all flex items-center gap-1 uppercase tracking-wider"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completar</span>
                        </button>
                      </div>
                    )}
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
