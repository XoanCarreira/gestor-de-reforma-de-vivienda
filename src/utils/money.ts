/**
 * Aritmética monetaria segura.
 *
 * JavaScript representa los números como IEEE-754 de doble precisión, así
 * que sumar decimales repetidamente acumula error de redondeo
 * (0.1 + 0.2 !== 0.3). Para una partida con cientos de movimientos a lo
 * largo de una obra, ese error microscópico se va arrastrando sin que nada
 * lo corrija.
 *
 * La solución estándar es trabajar en céntimos (enteros) para cualquier
 * operación aritmética, y usar euros (decimales) solo en los dos extremos
 * del sistema: lo que teclea el usuario y lo que se muestra en pantalla.
 */

/** Convierte euros (posiblemente con error de flotante) a céntimos exactos. */
export function toCents(euros: number): number {
  // Math.round es la clave: sin él, 19.99 * 100 puede dar 1998.9999999999998
  // en vez de 1999, y ese error ya sería un entero "sucio".
  return Math.round(euros * 100);
}

/** Convierte céntimos (enteros) de vuelta a euros para mostrar/almacenar. */
export function toEuros(cents: number): number {
  return cents / 100;
}

/**
 * Suma un array de importes en euros con precisión exacta, pasando por
 * céntimos internamente. Sustituye a `amounts.reduce((a, b) => a + b, 0)`
 * en cualquier sitio donde se agreguen varios importes monetarios.
 */
export function sumEuros(amounts: number[]): number {
  const totalCents = amounts.reduce((sum, euros) => sum + toCents(euros), 0);
  return toEuros(totalCents);
}

/** Resta segura de dos importes en euros (a - b), vía céntimos. */
export function subtractEuros(a: number, b: number): number {
  return toEuros(toCents(a) - toCents(b));
}
