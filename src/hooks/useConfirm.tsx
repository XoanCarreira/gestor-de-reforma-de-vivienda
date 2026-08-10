import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

type Options = { title?: string; description?: string; };

type ContextType = {
  confirm: (opts?: Options) => Promise<boolean>;
};

const ConfirmContext = createContext<ContextType | null>(null);

export const ConfirmProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [state, setState] = useState<{open: boolean; opts?: Options; resolver?: (v: boolean) => void}>({ open:false });

  const confirm = useCallback((opts?: Options) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, resolver: resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.resolver?.(true);
    setState({ open: false });
  };
  const handleCancel = () => {
    state.resolver?.(false);
    setState({ open: false });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        open={state.open}
        title={state.opts?.title}
        description={state.opts?.description}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx.confirm;
};