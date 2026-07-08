import { useState, useEffect } from 'react';
import { SyncAction } from '../types';
import { Cloud, CloudOff, RefreshCw, Layers, Wifi, WifiOff, Terminal, Info } from 'lucide-react';

interface SyncStatusProps {
  isOnline: boolean;
  onToggleOnlineMode: () => void;
  syncQueue: SyncAction[];
  onSync: () => void;
  syncing: boolean;
  syncLogs: string[];
}

export default function SyncStatus({
  isOnline,
  onToggleOnlineMode,
  syncQueue,
  onSync,
  syncing,
  syncLogs
}: SyncStatusProps) {
  return (
    <div className="space-y-6">
      {/* Network Status Toggle Header */}
      <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400 animate-pulse'}`}>
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Estado de Conexión:</span>
              <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                {isOnline ? 'En Línea (Online)' : 'Sin Conexión (Offline Simulado)'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isOnline 
                ? 'La aplicación se comunicará directamente con el servidor para consolidar datos.' 
                : 'La base de datos local (IndexedDB) acumulará cambios para sincronizarlos al conectar.'}
            </p>
          </div>
        </div>

        {/* Action Toggle Button */}
        <button
          onClick={onToggleOnlineMode}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow border ${
            isOnline 
              ? 'bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border-amber-500/30 text-amber-300' 
              : 'bg-emerald-500 hover:bg-emerald-600 border-transparent text-slate-950'
          }`}
        >
          {isOnline ? 'Simular Modo Sin Conexión' : 'Activar Conexión (Volver Online)'}
        </button>
      </div>

      {/* Sync Queue Visualizer & Logging Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Queue Card */}
        <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-3xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider mb-3.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Cola de Acciones Pendientes ({syncQueue.length})
            </h3>

            {syncQueue.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <Cloud className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">Todo Sincronizado</p>
                <p className="text-xs text-slate-500 mt-1">No hay operaciones de base de datos pendientes en la cola local.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-2">
                {syncQueue.map(action => (
                  <div key={action.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          action.actionType === 'insert' 
                            ? 'bg-teal-500/10 text-teal-400' 
                            : action.actionType === 'update' 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : 'bg-red-500/10 text-red-400'
                        }`}>
                          {action.actionType === 'insert' ? 'Añadir' : action.actionType === 'update' ? 'Modificar' : 'Eliminar'}
                        </span>
                        <span className="font-semibold text-slate-300 capitalize">{action.storeName}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        ID Registro: {action.payload?.id || 'Desconocido'} • {new Date(action.timestamp).toLocaleTimeString('es-ES')}
                      </p>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10">
                      Pendiente
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Force Sync actions */}
          {syncQueue.length > 0 && (
            <button
              onClick={onSync}
              disabled={syncing || !isOnline}
              className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-30 disabled:text-slate-500 disabled:cursor-not-allowed font-bold text-xs sm:text-sm rounded-xl text-slate-950 transition-all active:scale-95 shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>
                {!isOnline 
                  ? 'Debes estar "En Línea" para Sincronizar' 
                  : syncing 
                    ? 'Sincronizando...' 
                    : `Sincronizar ${syncQueue.length} cambios locales`}
              </span>
            </button>
          )}
        </div>

        {/* Sync Simulation Terminal Logs */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col h-[48vh] lg:h-auto justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Consola del Motor de Sincronización
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Registro de eventos del Service Worker y sincronización de datos.</p>
          </div>

          <div className="bg-slate-950 font-mono text-xs text-slate-300 p-4 rounded-2xl border border-slate-900 overflow-y-auto h-[28vh] flex-1 flex flex-col space-y-1.5 select-all">
            {syncLogs.length === 0 ? (
              <span className="text-slate-600 italic">Esperando eventos de base de datos o de red...</span>
            ) : (
              syncLogs.map((log, index) => (
                <div key={index} className="leading-relaxed break-all">
                  <span className="text-emerald-500 font-bold">&gt;</span> {log}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500 bg-slate-950/30 p-2 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Este simulador demuestra las capacidades PWA de fondo, consolidando la cola de IndexedDB sin pérdida de esfuerzo del usuario.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
