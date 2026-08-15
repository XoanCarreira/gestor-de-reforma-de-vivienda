import React, { useState, useRef } from 'react';
import { ProgressPhoto } from '../types';
import { Camera, Image, Trash2, Calendar, ZoomIn, X, Loader2 } from 'lucide-react';
import { utils } from '../utils/date';
import { compressImage, estimateBase64Size, formatBytes } from '../utils/image';
import { useReformaDataContext } from '../context/ReformaDataContext';
import { useConfirm } from '../hooks/useConfirm';

export default function GallerySection() {
  const { photos, addPhoto: onAddPhoto, deletePhoto: onDeletePhoto } = useReformaDataContext();

  const confirm = useConfirm();

  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(utils.getToday());
  const [base64Data, setBase64Data] = useState('');

  // Estado de compresión: la foto se comprime de forma asíncrona (canvas)
  // antes de quedar lista para guardar, así que hay un pequeño intervalo
  // en el que hay que bloquear el envío y mostrar feedback.
  const [compressing, setCompressing] = useState(false);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  // Zoom view state
  const [activePhoto, setActivePhoto] = useState<ProgressPhoto | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
    }

    setCompressing(true);
    setOriginalSize(file.size);
    setCompressedSize(null);

    try {
      const compressed = await compressImage(file);
      setBase64Data(compressed);
      setCompressedSize(estimateBase64Size(compressed));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Non se puido procesar a imaxe.');
      setOriginalSize(null);
    } finally {
      setCompressing(false);
      // Permite volver a seleccionar o mesmo arquivo tras un erro.
      e.target.value = '';
    }
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !base64Data) {
      alert('Por favor ingrese un título e tome/cargue unha fotografía.');
      return;
    }

    onAddPhoto({
      title,
      notes,
      date,
      base64Data
    });

    resetForm();
    setIsAdding(false);
  };

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setDate(utils.getToday());
    setBase64Data('');
    setOriginalSize(null);
    setCompressedSize(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-5 rounded-none shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Fotos de Avance de Obra</h2>
          <p className="text-xs text-slate-500 mt-1">Rexistra de forma visual o progreso, engade anotacións e consulta o histórico. Para optimizar o rendemento, as imaxes serán comprimidas antes de ser gardadas.</p>
        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); resetForm(); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-none transition-all active:scale-95 text-xs uppercase tracking-wider shadow"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span>{isAdding ? 'Cancelar Captura' : 'Subir Avance'}</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleSavePhoto} className="p-5 bg-white border border-slate-200 shadow-sm rounded-none space-y-4 animate-fadeIn">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Engadir Fotografía de Obra</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">Capturar Fotografía</label>
              
              <div className="flex flex-wrap gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={compressing}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 rounded-none hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-black text-slate-900 transition-all active:scale-95 uppercase tracking-wider"
                >
                  <Image className="w-4 h-4 text-slate-900" />
                  <span>Examinar Galería</span>
                </button>

                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment" // Forces back camera on smartphones! Extremely clean on-site feature
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={compressing}
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 border border-slate-200 rounded-none hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-black text-slate-900 transition-all active:scale-95 uppercase tracking-wider"
                >
                  <Camera className="w-4 h-4 text-slate-900" />
                  <span>Capturar con Cámara</span>
                </button>
              </div>

              {/* Estado de compresión */}
              {compressing && (
                <div className="mt-4 bg-slate-50 p-4 rounded-none border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Comprimindo imaxe...</span>
                </div>
              )}

              {/* Photo preview container */}
              {!compressing && base64Data && (
                <div className="mt-4 bg-slate-50 p-3 rounded-none border border-slate-200 flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-2">Vista previa da captura</span>
                  <img
                    src={base64Data}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[30vh] rounded-none object-contain border border-slate-200 shadow-sm"
                  />
                  {originalSize !== null && compressedSize !== null && (
                    <span className="text-[10px] text-emerald-700 font-bold mt-2 bg-emerald-50 border border-emerald-200 px-2 py-1">
                      {formatBytes(originalSize)} → {formatBytes(compressedSize)}
                      {' '}(-{Math.round((1 - compressedSize / originalSize) * 100)}%)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Title & metadata */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Título do avance</label>
              <input
                type="text"
                required
                placeholder="Ej. Tuberías de cocina instaladas..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Data da Toma</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 text-sm focus:border-slate-900 outline-none font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase mb-1 tracking-wider">Notas adicionais / Detalles</label>
              <input
                type="text"
                placeholder="Ej. Se usó tubería multicapa, pendiente de recibir inspection..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-slate-900 placeholder:text-slate-400 text-sm focus:border-slate-900 focus:ring-0 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {setIsAdding(false); resetForm();}}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-none text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={compressing || !base64Data}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-none text-xs sm:text-sm active:scale-95 transition-all uppercase tracking-wider"
            >
              Gardar Fotografía
            </button>
          </div>
        </form>
      )}

      {/* Grid gallery */}
      {photos.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-none">
          <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-black text-slate-800 uppercase tracking-wide text-xs">Non hai fotos de avance cargadas.</p>
          <p className="text-xs text-slate-500 mt-1">Utilice a cámara do seu móbil ou cargue fotos co botón superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="bg-white border border-slate-200 rounded-none overflow-hidden flex flex-col justify-between hover:border-slate-400 transition-all shadow-sm group"
            >
              {/* Picture area with zoom icon */}
              <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                <img
                  src={photo.base64Data}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Hover overlay with zoom button */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-100 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setActivePhoto(photo)}
                    className="p-2 bg-white text-slate-900 rounded-none border border-slate-200 shadow hover:bg-slate-50 transition-all active:scale-90"
                    title="Zoom Foto"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Eliminar foto',
                        description: `¿Seguro que queres eliminar a foto ${photo.title}?`
                      });
                      if (ok) onDeletePhoto(photo.id);
                    }}
                    className="p-2 bg-slate-900 text-white rounded-none shadow hover:bg-slate-800 transition-all active:scale-90"
                    title="Eliminar Foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Top left corner: Date badge */}
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-none text-[9px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-900" />
                  <span>{new Date(photo.date).toLocaleDateString('es-ES')}</span>
                </div>

                {/* Top right corner: Local storage badge */}
                <div className="absolute top-2.5 right-2.5">
                  <span className="px-2 py-1 bg-white/95 border border-slate-200 text-slate-700 rounded-none flex items-center justify-center text-[9px] font-black uppercase tracking-wider" title="Guardado en IndexedDB local">
                    Local
                  </span>
                </div>
              </div>

              {/* Text Area */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm leading-snug group-hover:text-slate-700 transition-colors">
                    {photo.title}
                  </h4>
                  {photo.notes && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {photo.notes}
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-100">
                  <span className="font-bold">Formato: JPG comprimido</span>
                  <span className="text-slate-700 font-black">Almacenado localmente</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Zoom Modal */}
      {activePhoto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50 animate-fadeIn">
          {/* Top Panel */}
          <div className="w-full max-w-4xl flex justify-between items-center mb-4">
            <div className="text-left">
              <span className="text-xs text-slate-500 font-black uppercase tracking-wider">{new Date(activePhoto.date).toLocaleDateString('es-ES')}</span>
              <h3 className="font-black text-lg text-slate-900 leading-tight uppercase">{activePhoto.title}</h3>
            </div>
            <button
              onClick={() => setActivePhoto(null)}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-none text-slate-400 hover:text-slate-900 transition-all active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Central image view */}
          <div className="w-full max-w-4xl flex-1 flex items-center justify-center overflow-hidden max-h-[70vh]">
            <img
              src={activePhoto.base64Data}
              alt={activePhoto.title}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded-none object-contain border border-slate-200 shadow-lg bg-white"
            />
          </div>

          {/* Bottom Panel: notes */}
          {activePhoto.notes && (
            <div className="w-full max-w-4xl mt-4 bg-white border border-slate-200 p-4 rounded-none text-center">
              <p className="text-sm text-slate-700 italic font-medium">“{activePhoto.notes}”</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
