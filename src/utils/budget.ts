import { BudgetCategory } from '../types';
import { sumEuros, subtractEuros } from './money';

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
 * `cat.spent` xa chega aquí calculado de forma exacta (ver useReformaData),
 * así que esta función só fai as comparacións, sen preocuparse de posibles
 * erros de coma flotante acumulados.
 */
export function getBudgetStatus(cat: BudgetCategory): BudgetStatus {
  const percentUsed = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
  const deviation = subtractEuros(cat.spent, cat.allocated);
  const isOver = cat.spent > cat.allocated;
  const isNearLimit = !isOver && cat.allocated > 0 && percentUsed >= 90;

  return { percentUsed, deviation, isOver, isNearLimit};
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
 *
 * Usa sumEuros (aritmética en céntimos) en vez de reduce((a,b)=>a+b,0):
 * sumar moitas partidas con decimais directamente en coma flotante pode
 * arrastrar o mesmo tipo de erro de redondeo que se evitou en 'spent'.
 */
export function getBudgetTotals(budget: BudgetCategory[]) {
  const totalAllocated = sumEuros(budget.map(c => c.allocated));
  const totalSpent = sumEuros(budget.map(c => c.spent));
  const totalDeviation = subtractEuros(totalSpent, totalAllocated);
  const deviationPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return { totalAllocated, totalSpent, totalDeviation, deviationPercent };
}
