import { useRef } from 'react';
import { Database, HardDrive, Info, Clock, Download, Upload, Trash2 } from 'lucide-react';

interface LocalDataStats {
  budget: number;
  suppliers: number;
  milestones: number;
  invoices: number;
  photos: number;
  funds: number;
  total: number;
}

interface SyncStatusProps {
  stats: LocalDataStats;
  activityLogs: string[];
  onClearData: () => void;
  onExportBackup: () => void;
  onImportBackupFile: (file: File) => void;
  clearing: boolean;
  backupProcessing: boolean;
}

export default function SyncStatus({ stats, activityLogs, onClearData, onExportBackup, onImportBackupFile, clearing, backupProcessing }: SyncStatusProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div className="p-5 bg-slate-800/100 border border-slate-700/50 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-100/10 text-slate-200">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Base de datos local</span>
              <span className="text-slate-400">IndexedDB</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              A aplicación garda e le toda a información directamente en este navegador.
            </p>
          </div>
        </div>

        <button
          onClick={onClearData}
          disabled={clearing}
          className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow border bg-red-500 hover:bg-red-600 border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? 'Vaciando...' : 'Vaciar base local'}
        </button>
      </div>

      <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-2">Backup de datos</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Descarga un archivo JSON con todos os datos actuais e recárgao máis tarde desde outro dispositivo ou desde Android.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onExportBackup}
            disabled={backupProcessing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow border bg-slate-900 hover:bg-slate-800 border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {backupProcessing ? 'Procesando...' : 'Descargar backup'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={backupProcessing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow border bg-emerald-500 hover:bg-emerald-600 border-transparent text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Cargar backup
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onImportBackupFile(file);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>O formato é un JSON estándar, lixeiro e compatible con ficheiros descargados e recuperados en Android.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total registros', value: stats.total },
          { label: 'Presupuestos', value: stats.budget },
          { label: 'Fondos', value: stats.funds },
          { label: 'Proveedores', value: stats.suppliers },
          { label: 'Hitos', value: stats.milestones },
          { label: 'Facturas', value: stats.invoices },
          { label: 'Fotos', value: stats.photos }
        ].map(item => (
          <div key={item.label} className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{item.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col h-[48vh] lg:h-auto justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Rexistro de actividade da base local
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Eventos de carga, gardado e limpeza da base de datos.</p>
          </div>

          <div className="bg-slate-950 font-mono text-xs text-slate-300 p-4 rounded-2xl border border-slate-900 overflow-y-auto h-[28vh] flex-1 flex flex-col space-y-1.5 select-all">
            {activityLogs.length === 0 ? (
              <span className="text-slate-600 italic">Esperando actividade da base local...</span>
            ) : (
              activityLogs.map((log, index) => (
                <div key={index} className="leading-relaxed break-all">
                  <span className="text-emerald-500 font-bold">&gt;</span> {log}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500 bg-slate-950/30 p-2 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Todo queda almacenado localmente en IndexedDB. No existe sincronización externa en esta versión.</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-3xl">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Mantenimiento de datos
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Si quieres empezar desde cero, puedes vaciar la base local y volver a introducir datos reales.
            Esto elimina fondos, presupuestos, proveedores, hitos, facturas y fotos guardadas en este navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
