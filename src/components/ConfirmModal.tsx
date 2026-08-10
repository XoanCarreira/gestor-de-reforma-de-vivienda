import React from 'react';
import { X, Check } from 'lucide-react';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open, title, description, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', onConfirm, onCancel
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="bg-white border border-slate-200 p-5 rounded-none shadow-sm z-10 w-full max-w-md">
        <h3 className="font-black text-slate-900 text-sm">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold">
            <X className="inline w-4 h-4 mr-1" />
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-black">
            <Check className="inline w-4 h-4 mr-1" /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}