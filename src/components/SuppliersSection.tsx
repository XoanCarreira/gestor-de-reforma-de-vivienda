import React, { useState } from 'react';
import { Supplier } from '../types';
import { Plus, Edit2, Trash2, Check, X, Phone, Mail, MessageSquare, Eye, HardHat } from 'lucide-react';
import { useReformaDataContext } from '../context/ReformaDataContext';
import { useConfirm } from '../hooks/useConfirm';

export default function SuppliersSection() {
  const {
    suppliers,
    addSupplier: onAddSupplier,
    updateSupplier: onUpdateSupplier,
    deleteSupplier: onDeleteSupplier
  } = useReformaDataContext();

  const confirm = useConfirm();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contractedAmount, setContractedAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [rating, setRating] = useState('5');
  const [notes, setNotes] = useState('');

  // Estado para ver o provedor en detalle
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !service) return;

    const contractedVal = Number(contractedAmount) || 0;
    const paidVal = Number(paidAmount) || 0;

    onAddSupplier({
      name,
      service,
      phone: phone || '',
      email: email || '',
      contractedAmount: contractedVal,
      paidAmount: paidVal,
      pendingAmount: Math.max(0, contractedVal - paidVal),
      rating: Number(rating) || 5,
      notes: notes || undefined
    });

    resetForm();
    setIsAdding(false);
  };

  const handleStartEdit = (sup: Supplier) => {
    setEditingId(sup.id);
    setName(sup.name);
    setService(sup.service);
    setPhone(sup.phone);
    setEmail(sup.email);
    setContractedAmount(String(sup.contractedAmount));
    setPaidAmount(String(sup.paidAmount));
    setRating(String(sup.rating || 5));
    setNotes(sup.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!name || !service) return;

    const contractedVal = Number(contractedAmount) || 0;
    const paidVal = Number(paidAmount) || 0;

    onUpdateSupplier({
      id,
      name,
      service,
      phone,
      email,
      contractedAmount: contractedVal,
      paidAmount: paidVal,
      pendingAmount: Math.max(0, contractedVal - paidVal),
      rating: Number(rating) || 5,
      notes: notes || undefined
    });

    setEditingId(null);
  };

  const resetForm = () => {
    setName('');
    setService('');
    setPhone('');
    setEmail('');
    setContractedAmount('');
    setPaidAmount('');
    setRating('5');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Xestión de Provedores</h2>
          <p className="text-xs text-slate-500 mt-1">Xestiona os teus provedores e o contratado con cada un deles. O total destas contratacións móstrase no dashboard como <i>Total Contratado</i>.</p>
          <p className="text-xs text-slate-500 mt-1">Aquí so deberías incluir a cantidade contratada con cada provedor. Os pagos débense rexistrar na súa propia sección.</p>

        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); resetForm(); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar' : 'Novo Provedor'}</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Servicio Asociado</label>
        <select
          required
          value={service}
          onChange={e => setService(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none font-bold"
        >
          <option value="">-- Todos --</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.service}>{s.service}</option>
          ))}
        </select>
      </div>

      {/* Add Form (Expandable) */}
      {isAdding && (
        <form onSubmit={handleSaveAdd} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Rexistrar Novo Provedor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Nome Comercial / Empresa</label>
              <input
                type="text"
                required
                placeholder="Fontanería M. Rajoy"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Servicio / Oficio</label>
              <input
                type="text"
                required
                placeholder="Ej. Albañilería, Pintura..."
                value={service}
                onChange={e => setService(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Teléfono Móbil</label>
              <input
                type="tel"
                placeholder="600 000 000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Correo Electrónico</label>
              <input
                type="email"
                placeholder="provedor@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Importe Contratado (€)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={contractedAmount}
                onChange={e => setContractedAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Calificación (1-5 Estrelas)</label>
              <select
                value={rating}
                onChange={e => setRating(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none"
              >
                <option value="5">5 Estrelas (Excelente)</option>
                <option value="4">4 Estrelas (Moi Bo)</option>
                <option value="3">3 Estrelas (Correcto)</option>
                <option value="2">2 Estrelas (Insuficiente)</option>
                <option value="1">1 Estrella (Deficiente)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Comentarios / Observacións</label>
              <input
                type="text"
                placeholder="Suministra materiais pola súa conta..."
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
              Gardar Provedor
            </button>
          </div>
        </form>
      )}

      {/* Supplier Grid */}
      {suppliers.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-none">
          <HardHat className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-800 uppercase tracking-wide text-xs">Non existen partidas neste momento.</p>
          <p className="text-xs text-slate-500 mt-1">Engada unha nova partida co botón superior.</p>
        </div>
      ) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.filter(suplier => !service || suplier.service === service).map(sup => {
          const isEditing = editingId === sup.id;
          const paidPercent = sup.contractedAmount > 0 ? (sup.paidAmount / sup.contractedAmount) * 100 : 0;
          const isFullyPaid = sup.paidAmount >= sup.contractedAmount && sup.contractedAmount > 0;

          return (
            <div
              key={sup.id}
              className="p-5 bg-white border border-slate-200 border-l-4 border-l-slate-900 shadow-sm rounded-none flex flex-col justify-between space-y-4"
            >
              {isEditing ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Oficio/Servicio</label>
                      <input
                        type="text"
                        value={service}
                        onChange={e => setService(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Teléfono</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Contrato (€)</label>
                      <input
                        type="number"
                        value={contractedAmount}
                        onChange={e => setContractedAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pagado<span className='text-[14px] text-red-600'>*</span> (€)</label>
                      <input
                        type="number"
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Estrelas</label>
                      <select
                        value={rating}
                        onChange={e => setRating(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900 font-bold"
                      >
                        <option value="5">5 ★</option>
                        <option value="4">4 ★</option>
                        <option value="3">3 ★</option>
                        <option value="2">2 ★</option>
                        <option value="1">1 ★</option>
                      </select>
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
                    <span className="text-[14px] text-red-500">*</span> So deberías modificar a cantidade gastada para facer correccións. Para reverter un pago, elimina a factura correspondente ou o movemento manual do histórico de gastos.
                  </p>
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
                      onClick={() => handleSaveEdit(sup.id)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-none text-white transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-none inline-block mb-2 uppercase tracking-widest border border-slate-200">
                          {sup.service}
                        </span>
                        <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-none">
                          {sup.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewSupplier(sup)}
                          className="p-1.5 text-slate-400 hover:text-green-600 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                          title="Ver Provedor"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(sup)}
                          className="p-1.5 text-slate-400 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Eliminar Provedor',
                              description: `Esto eliminará o provedor "${sup.name}" e todos os seus datos asociados. ¿Desexas continuar?`,
                            })
                            if (ok) { onDeleteSupplier(sup.id); }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-slate-100 rounded-none transition-all active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex text-slate-900 text-xs tracking-tight">
                        {'★'.repeat(Math.round(sup.rating || 5))}
                        <span className="text-slate-300">{'★'.repeat(5 - Math.round(sup.rating || 5))}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold ml-1">({sup.rating} / 5)</span>
                    </div>

                    {sup.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-none border border-slate-200 mt-2.5 flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>{sup.notes}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-black tracking-wider">Acordado</span>
                        <span className="text-slate-900 font-bold">{sup.contractedAmount.toLocaleString('es-ES')} €</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-black tracking-wider">Pagado</span>
                        <span className="text-slate-900 font-black">{sup.paidAmount.toLocaleString('es-ES')} €</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block uppercase font-black tracking-wider">Pendente</span>
                        <span className={`font-black ${sup.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {sup.pendingAmount.toLocaleString('es-ES')} €
                        </span>
                      </div>
                    </div>

                    <div className="relative h-2.5 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${Math.min(paidPercent, 100)}%` }}
                        className={`h-full transition-all duration-500 ${isFullyPaid
                          ? 'bg-emerald-500'
                          : 'bg-slate-900'
                          }`}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-medium">Total liquidado: {paidPercent.toFixed(0)}%</span>
                      {isFullyPaid ? (
                        <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-none uppercase tracking-wider text-[9px] border border-emerald-100">
                          Liquidado
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Pendente de cobro final</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                    {sup.phone ? (
                      <a
                        href={`tel:${sup.phone}`}
                        className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-none text-xs font-black transition-colors border border-slate-200 active:scale-95 uppercase tracking-wider"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-900" />
                        <span>Chamar</span>
                      </a>
                    ) : (
                      <div className="py-2 bg-slate-50 text-slate-400 rounded-none text-xs text-center border border-slate-200 cursor-not-allowed font-black uppercase tracking-wider">
                        Sin teléfono
                      </div>
                    )}
                    {sup.email ? (
                      <a
                        href={`mailto:${sup.email}`}
                        className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-none text-xs font-black transition-colors border border-slate-200 active:scale-95 uppercase tracking-wider"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-900" />
                        <span>Email</span>
                      </a>
                    ) : (
                      <div className="py-2 bg-slate-50 text-slate-400 rounded-none text-xs text-center border border-slate-200 cursor-not-allowed font-black uppercase tracking-wider">
                        Sen correo
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>)}

      {/* View Supplier Modal */}
      {viewSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-none max-w-lg w-full max-h-[85vh] overflow-y-auto flex flex-col justify-between shadow-lg">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="font-black text-base text-slate-900 uppercase tracking-wide">{viewSupplier.name}</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">{viewSupplier.service}</p>
              </div>
              <button
                onClick={() => setViewSupplier(null)}
                className="p-1 bg-slate-50 hover:bg-slate-100 rounded-none text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-none border border-slate-200 text-center font-mono">
                <span className="text-xs text-slate-400 block uppercase font-black tracking-wider mb-1">Orzamento asignado</span>
                <span className="text-3xl font-black text-slate-900">{viewSupplier.contractedAmount.toLocaleString('es-ES')} €</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-none border border-slate-200 text-center font-mono">
                <span className="text-xs text-slate-400 block uppercase font-black tracking-wider mb-1">Pagado</span>
                <span className="text-3xl font-black text-slate-900">{viewSupplier.paidAmount.toLocaleString('es-ES')} €</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Teléfono</span>
                  <span className="text-slate-900 font-black">
                    {suppliers.find(s => s.id === viewSupplier.id)?.phone || 'Sen asignar'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Email</span>
                  <span className="text-slate-900 font-black">
                    {suppliers.find(s => s.id === viewSupplier.id)?.email || 'Sen asignar'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Notas</span>
                  <span className="text-slate-900 font-black">
                    {suppliers.find(s => s.id === viewSupplier.id)?.notes || 'Sen asignar'}
                  </span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setViewSupplier(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 font-black text-xs rounded-none text-white active:scale-95 transition-all uppercase tracking-wider"
              >
                Pechar Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
