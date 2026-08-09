import { createContext, useContext, ReactNode } from 'react';
import { useReformaData, ReformaData } from '../hooks/useReformaData';

const ReformaDataContext = createContext<ReformaData | null>(null);

/**
 * Envuelve la aplicación (ver main.tsx) y hace disponible el estado y las
 * acciones CRUD de useReformaData a cualquier componente descendiente, sin
 * necesidad de pasarlas por props a través de App.tsx.
 */
export function ReformaDataProvider({ children }: { children: ReactNode }) {
  const data = useReformaData();
  return <ReformaDataContext.Provider value={data}>{children}</ReformaDataContext.Provider>;
}

/**
 * Hook de consumo. Cada sección (BudgetSection, Dashboard, etc.) lo llama
 * para acceder directamente a los datos que necesita, en vez de recibirlos
 * por props desde App.tsx.
 */
export function useReformaDataContext(): ReformaData {
  const ctx = useContext(ReformaDataContext);
  if (!ctx) {
    throw new Error('useReformaDataContext debe usarse dentro de <ReformaDataProvider>');
  }
  return ctx;
}
