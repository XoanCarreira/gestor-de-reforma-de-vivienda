import { BudgetCategory } from '../types';

/**
 * Estado financeiro calculado dunha partida individual de presuposto.
 */
export interface BudgetStatus {
  /** Porcentaxe do presuposto xa gastado (pode superar 100 se hai sobrecosto) */
  percentUsed: number;
  /** Diferencia entre gastado e asignado. Positivo = sobrecosto, negativo = aforro */
  deviation: number;
  /** true se o gasto supera o asignado */
  isOver: boolean;
  /** true se está entre o 90% e o 100% do asignado (zona de aviso, sen chegar a excederse) */
  isNearLimit: boolean;
}

/**
 * Calcula o estado financeiro dunha partida de presuposto: porcentaxe usado,
 * desviación (sobrecosto/aforro) e flags de estado (excedido / preto do límite).
 *
 * Esta función centraliza a lóxica que antes estaba duplicada en
 * BudgetSection, Dashboard e ReportGenerator, evitando que cada un calcule
 * unha versión lixeiramente distinta e queden desincronizados.
 */
export function getBudgetStatus(cat: BudgetCategory): BudgetStatus {
  const percentUsed = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
  const deviation = cat.spent - cat.allocated;
  const isOver = cat.spent > cat.allocated;
  const isNearLimit = !isOver && cat.allocated > 0 && percentUsed >= 90;

  return { percentUsed, deviation, isOver, isNearLimit };
}

export type BudgetStatusLabel = 'Excedido' | 'Límite' | 'Correcto';

/**
 * Etiqueta textual do estado dunha partida, empregada por exemplo
 * na táboa do informe PDF (ReportGenerator).
 */
export function getBudgetStatusLabel(cat: BudgetCategory): BudgetStatusLabel {
  if (cat.spent > cat.allocated) return 'Excedido';
  if (cat.spent === cat.allocated && cat.spent > 0) return 'Límite';
  return 'Correcto';
}

/**
 * Totais agregados dun conxunto de partidas de presuposto.
 * Útil para o Dashboard e para a portada do informe PDF.
 */
export function getBudgetTotals(budget: BudgetCategory[]) {
  const totalAllocated = budget.reduce((sum, c) => sum + c.allocated, 0);
  const totalSpent = budget.reduce((sum, c) => sum + c.spent, 0);
  const totalDeviation = totalSpent - totalAllocated;
  const deviationPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return { totalAllocated, totalSpent, totalDeviation, deviationPercent };
}