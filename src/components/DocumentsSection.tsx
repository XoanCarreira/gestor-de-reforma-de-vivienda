import React, { useState, useRef } from 'react';
import { Invoice } from '../types';
import { Upload, FileText, Trash2, X, Eye, Loader2 } from 'lucide-react';
import { compressImage, estimateBase64Size, formatBytes } from '../utils/image';
import { useReformaDataContext } from '../context/ReformaDataContext';
import { utils } from '../utils/date';
import { useConfirm } from '../hooks/useConfirm';


// Límite para PDFs u otros archivos que no se pueden recomprimir en el
// cliente. Las imágenes no usan este límite directamente: se comprueba
// dentro de compressImage() (MAX_ORIGINAL_FILE_BYTES), que es más generoso
// porque de todas formas se van a redimensionar antes de guardarse.
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

export default function DocumentsSection() {
  const {
    invoices,
    suppliers,
    budget,
    addInvoice: onAddInvoice,
    deleteInvoice: onDeleteInvoice
  } = useReformaDataContext();

  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = utils.getToday(); // Get today's date in YYYY-MM-DD format

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState(''); // Partida de presuposto asociada explícitamente
  const [date, setDate] = useState(today);
  const [updateFinancials, setUpdateFinancials] = useState(true);
  const [base64Data, setBase64Data] = useState<string>('');
  const [fileName, setFileName] = useState('');

  const confirm = useConfirm();

  // Procesado del archivo: las imágenes se comprimen de forma asíncrona
  // (canvas), así que hay un intervalo en el que hay que bloquear el envío.
  const [processingFile, setProcessingFile] = useState(false);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [finalSize, setFinalSize] = useState<number | null>(null);

  // View modal state
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    if (!title) {
      // Auto-populate title with file name without extension
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(cleanName);
    }

    setProcessingFile(true);
    setOriginalSize(file.size);
    setFinalSize(null);

    try {
      if (file.type.startsWith('image/')) {
        // Fotos de facturas tomadas co móbil: comprimense igual que na
        // galería, mesmo motivo (poden pesar varios MB sen comprimir).
        const compressed = await compressImage(file);
        setBase64Data(compressed);
        setFinalSize(estimateBase64Size(compressed));
      } else {
        // PDF ou outro tipo: non se pode recomprimir en el cliente sen una
        // librería específica, así que so se valida o tamaño real. Antes
        // a UI prometía "Máx. 10MB" pero non o comprobaba en ningún sitio.
        if (file.size > MAX_PDF_BYTES) {
          throw new Error(`O arquivo pesa ${formatBytes(file.size)}. O máximo admitido son ${formatBytes(MAX_PDF_BYTES)}.`);
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) resolve(event.target.result as string);
            else reject(new Error('Non se puido ler o arquivo.'));
          };
          reader.onerror = () => reject(new Error('Non se puido ler o arquivo.'));
          reader.readAsDataURL(file);
        });

        setBase64Data(dataUrl);
        setFinalSize(file.size);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Non se puido procesar o arquivo.');
      setFileName('');
      setOriginalSize(null);
    } finally {
      setProcessingFile(false);
    }
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || isNaN(Number(amount)) || !supplierId) {
      alert('Por favor complete todos os campos obrigatorios.');
      return;
    }

    // Se o usuario quiere consolidación automática e existen partidas creadas,
    // exigimos elexir a cal se asocia o gasto. Así evitamos que o importe
    // quede "flotando" sen sumar a ningunha partida por falta de coincidencia
    // de texto (o problema orixinal do matching automático por nome de servizo).
    if (updateFinancials && budget.length > 0 && !categoryId) {
      alert('Selecciona a partida de presuposto á que se debe imputar este gasto.');
      return;
    }

    onAddInvoice({
      title,
      amount: Number(amount),
      supplierId,
      categoryId: categoryId || undefined,
      date,
      fileName: fileName || 'factura_digital.pdf',
      base64Data: base64Data || undefined
    }, updateFinancials);

    // Reset Form
    setTitle('');
    setAmount('');
    setSupplierId('');
    setCategoryId('');
    setDate(today);
    setUpdateFinancials(true);
    setBase64Data('');
    setFileName('');
    setOriginalSize(null);
    setFinalSize(null);
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Carga de Facturas e Gastos</h2>
          <p className="text-xs text-slate-500 mt-1">Rexistra recibos, asociados a un provedor e liquida partidas automáticamente.</p>
        </div>
        <button
          onClick={() => setIsUploading(!isUploading)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isUploading ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          <span>{isUploading ? 'Cancelar Carga' : 'Cargar Factura'}</span>
        </button>
      </div>

      {/* Upload/Carga Form */}
      {isUploading && (
        <form onSubmit={handleSaveInvoice} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Cargar Factura de Provedor</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* File Drag and Drop zone */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Arquivo da Factura (PDF ou Imaxe)</label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => !processingFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-none p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  dragActive 
                    ? 'border-slate-900 bg-slate-50 text-slate-900' 
                    : fileName && !processingFile
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  className="hidden"
                />

                {processingFile ? (
                  <>
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    <p className="text-sm font-black text-slate-700 uppercase tracking-wide text-xs">Procesando arquivo...</p>
                  </>
                ) : (
                  <>
                    <Upload className={`w-8 h-8 ${fileName ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {fileName ? (
                      <div>
                        <p className="text-sm font-black text-emerald-700">{fileName}</p>
                        <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider text-[9px]">Faga clic para cambiar de arquivo</p>
                        {originalSize !== null && finalSize !== null && (
                          <p className="text-[10px] text-emerald-700 font-bold mt-1.5 bg-emerald-100 border border-emerald-200 px-2 py-0.5 inline-block">
                            {originalSize === finalSize
                              ? formatBytes(finalSize)
                              : `${formatBytes(originalSize)} → ${formatBytes(finalSize)} (-${Math.round((1 - finalSize / originalSize) * 100)}%)`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-wide text-xs">Arrastre a factura aquí ou faga clic para examinar</p>
                        <p className="text-xs text-slate-500 mt-1">Soporta PDF, PNG e JPEG. As imaxes compriménse automaticamente; os PDF admiten ata 10MB.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Standard inputs */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Concepto / Título</label>
              <input
                type="text"
                required
                placeholder="Ej. Liquidación pladur salón..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Importe Factura (€)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Provedor Asociado</label>
              <select
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none font-bold"
              >
                <option value="">-- Seleccionar Provedor --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.service})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Partida de Presuposto Asociada</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                disabled={budget.length === 0}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {budget.length === 0 ? '-- Non hai partidas creadas --' : '-- Seleccionar Partida --'}
                </option>
                {budget.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {budget.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1 font-bold">Crea antes unha partida en "Costos" para poder imputar este gasto.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data Factura</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none font-bold"
              />
            </div>

            {/* Smart accounting integration toggle */}
            <div className="sm:col-span-2 bg-slate-50 p-3.5 border border-slate-200 rounded-none flex items-start gap-2">
              <input
                type="checkbox"
                id="updateFinancials"
                checked={updateFinancials}
                onChange={e => setUpdateFinancials(e.target.checked)}
                className="mt-1 w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 focus:ring-0"
              />
              <div className="text-xs">
                <label htmlFor="updateFinancials" className="font-black text-slate-900 cursor-pointer block uppercase tracking-wider text-[11px]">
                  Consolidación Automática de Contas (Recomendado)
                </label>
                <span className="text-slate-500 block mt-1">
                  Ao activar, sumará este importe ao GASTADO da partida de presuposto seleccionada arriba, e ao PAGADO do provedor automáticamente.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-none text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={processingFile}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-none text-xs sm:text-sm active:scale-95 transition-all uppercase tracking-wider"
            >
              Gardar Factura
            </button>
          </div>
        </form>
      )}

      {/* Invoice List */}
      <div className="space-y-3.5">
        <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">Facturas Rexistradas</h3>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Provedor Asociado</label>
          <select
            required
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none font-bold"
          >
            <option value="">-- Todos --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.service})</option>
            ))}
          </select>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-none">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-800 uppercase tracking-wide text-xs">Non hai facturas cargadas aínda.</p>
            <p className="text-xs text-slate-500 mt-1">Cargue a súa primeira factura de obra co botón superior.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoices.filter(invoice => !supplierId || invoice.supplierId === supplierId).map(invoice => {
              const matchedSupplier = suppliers.find(s => s.id === invoice.supplierId);
              const matchedCategory = invoice.categoryId ? budget.find(c => c.id === invoice.categoryId) : undefined;

              return (
                <div
                  key={invoice.id}
                  className="p-4 bg-white border border-slate-200 hover:border-slate-400 rounded-none flex items-center justify-between gap-4 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-none text-slate-900 shrink-0">
                      <FileText className="w-5 h-5 text-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900 text-sm truncate">{invoice.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Asociado a: <span className="text-slate-800 font-black">{matchedSupplier?.name || 'Desconocido'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Partida: <span className="text-slate-800 font-black">{matchedCategory?.name || 'Sen partida asociada'}</span>
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        <span>{new Date(invoice.date).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{invoice.fileName}</span>
                        {invoice.financialsApplied && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600">Consolidada</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-black tracking-wider">Monto</span>
                      <span className="font-mono font-black text-sm sm:text-base text-slate-900">
                        {invoice.amount.toLocaleString('es-ES')} €
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-none uppercase tracking-wider" title="Guardado en la base local">
                        Local
                      </span>

                      <button
                        onClick={() => setViewInvoice(invoice)}
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-none transition-colors"
                        title="Ver Documento"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                      
                        onClick={async () => {
                            const ok = await confirm({
                              title: 'Eliminar factura',
                              description: `¿Seguro que queres eliminar a factura ${invoice.title}?`
                            });
                            if(ok) onDeleteInvoice(invoice.id);
                          }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-none transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Viewer Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-none max-w-lg w-full max-h-[85vh] overflow-y-auto flex flex-col justify-between shadow-lg">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="font-black text-base text-slate-900 uppercase tracking-wide">{viewInvoice.title}</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">{viewInvoice.fileName}</p>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                className="p-1 bg-slate-50 hover:bg-slate-100 rounded-none text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-none border border-slate-200 text-center font-mono">
                <span className="text-xs text-slate-400 block uppercase font-black tracking-wider mb-1">Monto da Factura</span>
                <span className="text-3xl font-black text-slate-900">{viewInvoice.amount.toLocaleString('es-ES')} €</span>
              </div>

              {/* Displaying details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Provedor</span>
                  <span className="text-slate-900 font-black">
                    {suppliers.find(s => s.id === viewInvoice.supplierId)?.name || 'Sen asignar'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Data de Emisión</span>
                  <span className="text-slate-900 font-black">
                    {new Date(viewInvoice.date).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Partida Asociada</span>
                  <span className="text-slate-900 font-black">
                    {budget.find(c => c.id === viewInvoice.categoryId)?.name || 'Sen partida asociada'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-none border border-slate-200">
                  <span className="text-slate-400 block uppercase font-black tracking-wider text-[10px]">Consolidación de Contas</span>
                  <span className={`font-black ${viewInvoice.financialsApplied ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {viewInvoice.financialsApplied ? 'Aplicada' : 'Non aplicada'}
                  </span>
                </div>
              </div>

              {/* Image viewer / PDF preview */}
              <div className="bg-slate-50 p-3 rounded-none border border-slate-200 flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Vista previa do Documento</span>
                
                {/* Check if it is a base64 image */}
                {viewInvoice.base64Data && viewInvoice.base64Data.startsWith('data:image/') ? (
                  <img
                    src={viewInvoice.base64Data}
                    alt={viewInvoice.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[30vh] max-w-full rounded-none border border-slate-200 object-contain shadow-sm"
                  />
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 rounded-none text-center space-y-1.5 w-full bg-white animate-fadeIn">
                    <FileText className="w-10 h-10 text-slate-900 mx-auto" />
                    <span className="text-xs text-slate-900 block font-black uppercase tracking-wider">Documento Dixitalizado PDF</span>
                    <span className="text-[10px] text-slate-400 block">Cargado satisfactoriamente no almacenamento offline (IndexedDB).</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setViewInvoice(null)}
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
