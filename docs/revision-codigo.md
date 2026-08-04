# Informe de Revisión — ReformaVivenda XC

> Revisión del código React/TypeScript de la app de seguimiento de reforma.
> Marca cada casilla `[x]` conforme vayas solucionando o descartando el punto.

---

## 🔴 Bugs reales (rompen algo o dan datos incorrectos)

- [x] **1. Fecha "hoy" inconsistente entre componentes**
  `Dashboard.tsx` usa `new Date().toISOString().split('T')[0]`, pero `MilestonesSection.tsx` y `FundsSection.tsx` tienen la fecha **hardcodeada** `'2026-07-08'`. Un mismo hito puede aparecer "vencido" en un sitio y "al día" en otro.
  **Solución:** crear un helper único `getToday()` en `utils/date.ts` y usarlo en todos los componentes.

- [x] **2. Formato de fecha incorrecto en `GallerySection.tsx`**
  ```ts
  const dataHoxe = new Date().toLocaleDateString('es-ES'); // "08/07/2026" ❌
  ```
  Un `<input type="date">` necesita `YYYY-MM-DD`. Corregir a:
  ```ts
  const dataHoxe = new Date().toISOString().split('T')[0];
  ```

- [ ] **3. Doble registro del Service Worker**
  Se registra tanto en `main.tsx` como en el `useEffect` de `App.tsx`. Dejarlo en un único sitio (recomendado: `main.tsx`).

- [x] **4. Estado de formulario compartido entre "añadir" y "editar" sin resetear**
  En `BudgetSection.tsx`, `SuppliersSection.tsx` y `MilestonesSection.tsx`, cancelar una edición no limpia los campos (`name`, `allocated`, `spent`, `notes`...). Si luego se abre el formulario de alta, aparecen datos residuales.
  **Solución:**
  ```ts
  const handleCancelEdit = () => {
    setEditingId(null);
    setName(''); setAllocated(''); setSpent(''); setNotes('');
  };
  ```
  Solucionado creando `resetForm()` y añadiendolo en botones `Cancelar`.

---

## 🟠 Riesgos de datos / UX

- [ ] **5. Sin confirmación al eliminar registros individuales**
  `handleClearDatabase` sí pide `window.confirm(...)`, pero borrar una partida, proveedor, hito, factura o foto es inmediato. Añadir confirmación (nativa o modal reutilizable) antes de cada borrado individual.

- [ ] **6. Vinculación factura → partida de presupuesto por coincidencia de texto (frágil)**
  En `App.tsx`, `handleAddInvoice` enlaza proveedor y categoría mediante comparación de strings hardcodeados (`c.name.includes(supplier.service)` + casos especiales). Si el texto no coincide exactamente, la consolidación falla en silencio.
  **Solución:** añadir campo explícito `categoryId?: string` en `Invoice` y que el usuario seleccione la partida en un `<select>`, igual que ya hace con el proveedor.

- [ ] **7. Validación de formularios permisiva**
  `isNaN(Number(allocated))` no descarta negativos; el `min="0"` del HTML no siempre lo impide (teclado en móvil, pegar texto). Validar explícitamente `Number(x) < 0` en `BudgetSection`, `FundsSection` y `SuppliersSection`.

- [ ] **8. Sin límite real de tamaño de archivo**
  `DocumentsSection.tsx` anuncia "Máx. 10MB" pero no comprueba `file.size`. Añadir:
  ```ts
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    alert('El archivo supera los 10MB permitidos.');
    return;
  }
  ```

- [ ] **9. Fotos guardadas sin comprimir**
  `GallerySection` guarda el base64 tal cual desde la cámara (puede ser varios MB por foto). Comprimir/redimensionar con `<canvas>` antes de guardar (p. ej. máx. 1600px de ancho, JPEG calidad ~0.7) para no saturar IndexedDB.

---

## 🟡 Consistencia y mantenibilidad

- [ ] **10. Lógica de cálculo de presupuesto duplicada en 3 sitios**
  `percentUsed`, `isOver`, `deviation` se repiten en `BudgetSection.tsx`, `Dashboard.tsx` y `ReportGenerator.tsx`. Extraer a `utils/budget.ts`:
  ```ts
  export function getBudgetStatus(cat: BudgetCategory) {
    const percentUsed = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
    const deviation = cat.spent - cat.allocated;
    const isOver = cat.spent > cat.allocated;
    return { percentUsed, deviation, isOver };
  }
  ```

- [ ] **11. Mezcla de idiomas (galego/castellano) inconsistente**
  El UI mezcla gallego ("Xestión", "Rexistro", "Non hai...") y castellano ("Presuposto asignado", "Calificación") en la misma pantalla. Unificar idioma o implementar i18n real (`react-i18next`).

- [ ] **12. Ruta de imagen frágil**
  ```html
  <img src="../icons/Logo-reformas-48.png" alt="" />
  ```
  Usar `${import.meta.env.BASE_URL}icons/Logo-reformas-48.png` o importar el asset directamente para que Vite lo valide en build time.

- [ ] **13. Formato de moneda manual**
  Sustituir `.toLocaleString('es-ES') + " €"` repetido por todas partes por `Intl.NumberFormat`:
  ```ts
  const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  eur.format(cat.allocated); // "1.250,00 €"
  ```

- [ ] **14. Validación superficial al importar backup**
  `handleImportBackupFile` solo comprueba que los campos sean arrays, no la forma de cada objeto. Usar `zod` (u otra librería de validación de esquemas) antes de importar.

- [ ] **15. Accesibilidad**
  Muchos botones de icono solo tienen `title`, no `aria-label`. Añadir `aria-label` igual al `title` en botones de icono (editar, eliminar, cerrar, etc.).

---

## 💡 Ideas para ampliar funcionalidades

- [ ] Exportar a Excel/CSV además del PDF (presupuesto, proveedores, facturas).
- [ ] Recordatorios de hitos con la Notification API (aviso X días antes de la fecha límite).
- [ ] Comparador de fotos "antes/después" con slider, usando la fecha ya almacenada.
- [ ] Papelera de reciclaje (soft-delete) con recuperación temporal, en vez de borrado permanente.
- [ ] Filtros y buscador en Presupuesto/Proveedores/Facturas/Fotos (nombre, rango de fechas, estado).
- [ ] Vinculación explícita factura↔partida (ver punto 6) en vez de heurística por texto.
- [ ] Soporte multi-obra (`projectId` en cada store) para gestionar más de una reforma.
- [ ] Modo oscuro (ya hay buena base de utilidades Tailwind).
- [ ] Tests unitarios (Vitest) para la lógica de cálculo de presupuesto/desviaciones, especialmente tras extraer `utils/budget.ts`.

---

### Progreso

`0 / 24` puntos completados

*(Actualiza este contador manualmente o cuenta las casillas marcadas conforme avances.)*
