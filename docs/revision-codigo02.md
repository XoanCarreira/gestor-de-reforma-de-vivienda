# 📋 Checklist de Revisión Técnica — Xestor de Reforma de Vivenda

Revisión completa de `App.tsx`, `db.ts`, `types.ts`, secciones (`BudgetSection`, `FundsSection`, `SuppliersSection`, `MilestonesSection`, `DocumentsSection`, `GallerySection`, `SyncStatus`, `Dashboard`, `ReportGenerator`), utilidades (`budget.ts`, `date.ts`) y ficheros base (`index.html`, `main.tsx`, `index.css`).

Leyenda de severidad: 🔴 Alta (afecta datos/integridad) · 🟡 Media (bug funcional o UX) · 🟢 Baja (estilo, deuda técnica, mejora opcional)

---

## 1. 🔴 Consistencia de datos — el hallazgo más importante

### 1.1 `BudgetCategory.spent` puede desincronizarse del histórico de `BudgetExpense`
El propio código deja claro (comentarios en `App.tsx`) que `handleAddBudgetExpense` debe ser **el único punto** que incrementa `spent` fuera de la edición manual, para que todo gasto quede rastreado. Sin embargo, hay dos vías que rompen esa invariante:

- [X] **`BudgetSection.tsx` → "Nueva Partida"**: el formulario de alta permite introducir un `Gastado acumulado (€)` inicial (`spent`) que se guarda directamente en `BudgetCategory` **sin crear ningún `BudgetExpense`**. El histórico de esa partida nace vacío aunque `spent > 0`.
- [X] **`BudgetSection.tsx` → "Editar partida" (`handleSaveEdit`)**: permite sobrescribir `spent` libremente. Aunque hay un aviso textual ("*Para reverter un pago, elimina a factura ou o movemento manual*"), la edición **no genera ningún movimiento** en `budgetExpenses`, así que `sum(budgetExpenses de la categoría) !== category.spent` después de cualquier edición manual.
- Consecuencia: el histórico de movimientos deja de ser la "fuente de verdad" que el propio diseño pretende (ver comentarios en `db.ts` sobre la migración v4, que sí generan un "Saldo inicial migrado" para resolver justo este problema en datos antiguos, pero no se aplica a datos nuevos).

**Recomendación:** al crear una partida con `spent` inicial > 0, o al editar `spent` manualmente, generar automáticamente un `BudgetExpense` con `source: 'manual'` (delta) igual que ya hace `handleQuickAddSpent`. Alternativa más estricta: eliminar la posibilidad de editar `spent` a mano y forzar todos los ajustes a pasar por el histórico.
**Solucionado** en el primer caso se elimina la posibilidad de asignar gasto y en el segundo caso se puede pero queda el aviso

### 1.2 Borrado de partida con facturas vinculadas
En `handleDeleteBudgetCategory`, se eliminan **todos** los `budgetExpenses` de la categoría, incluidos los de `source: 'invoice'`. Pero la factura origen (`Invoice`) no se toca:
- [ ] La factura queda con `categoryId` apuntando a una partida inexistente y `financialsApplied: true`, mostrándose como "Sen partida asociada" (se degrada con gracia en la UI, pero el dato queda huérfano de forma permanente).
- [ ] Si luego se borra esa factura, `handleDeleteInvoice` no encuentra el `budgetExpense` vinculado (ya se borró junto a la partida) y no puede revertir nada en presupuesto — no rompe nada visualmente, pero es un rastro de inconsistencia silenciosa.

**Recomendación:** antes de borrar una partida, avisar si existen facturas con `categoryId` asociado (no solo `budgetExpenses`), o bien limpiar explícitamente `invoice.categoryId` a `undefined` al borrar la partida.

### 1.3 Validaciones numéricas incompletas
- [ ] `FundsSection.handleSaveAdd`: solo valida `isNaN(Number(amount))`, **no** rechaza `amount <= 0`. Se pueden crear fondos con importe 0 o negativo, descuadrando `totalFunds` del Dashboard. El resto de formularios (gastos, facturas) sí validan `> 0`.
- [ ] `BudgetSection` (alta y edición de partida): no se valida que `allocated`/`spent` sean `>= 0` en JS (solo `min="0"` en el HTML, que no bloquea entradas negativas escritas manualmente en algunos navegadores).
- [ ] `SuppliersSection`: `contractedAmount`/`paidAmount` sin guardas contra negativos en JS.

---

## 2. 🟡 Bugs funcionales concretos

- [ ] **Breakpoint `xs:` no existe.** Se usa `xs:inline`, `xs:text-[11px]`, etc. en `App.tsx` (badge de "rexistros", nav inferior) pero `index.css` solo define `--font-sans`/`--font-mono` en `@theme`, sin `--breakpoint-xs`. Sin ese breakpoint, Tailwind no genera la variante y clases como `hidden xs:inline` se quedan **siempre ocultas** (el `hidden` nunca se revierte). Revisar si es un breakpoint personalizado olvidado y añadirlo a `@theme` (`--breakpoint-xs: 400px;` o el valor deseado).
- [ ] **`ReportGenerator.tsx`**: `className="w-4 height-4 ..."` en el icono `FileDown` — `height-4` no es una clase válida de Tailwind (debería ser `h-4`). El icono puede no dimensionarse correctamente.
- [ ] **Registro duplicado del Service Worker.** Se registra dos veces: en `main.tsx` (`navigator.serviceWorker.register('/service-worker.js')`, ruta absoluta fija) y en `App.tsx` (`register(`${import.meta.env.BASE_URL}service-worker.js`)`, respetando el base path). Si la app se despliega bajo una subruta (lo que sugiere el uso de `BASE_URL`), el registro de `main.tsx` apuntará a una ruta incorrecta y además se duplica la lógica de registro. **Eliminar el bloque de `main.tsx`** y dejar solo el de `App.tsx`.
- [ ] **`index.html`**: `<img src="../icons/Logo-reformas-48.png" .../>` dentro del `<div id="root">` (realmente se renderiza desde `App.tsx`) usa una ruta relativa `../icons/...`, mientras que el `<link>` del manifest/favicon usa `./icons/...`. Si el proyecto se sirve desde una subcarpeta, `../icons` probablemente resuelva mal. Sustituir por `${import.meta.env.BASE_URL}icons/...` como se hace con el Service Worker.
- [ ] **Tamaño máximo de fichero no validado.** `DocumentsSection.tsx` indica en la UI "Máx. 10MB" para las facturas, pero `handleFile` no comprueba `file.size` antes de convertir a base64. Igual ocurre en `GallerySection.tsx` (sin límite indicado ni validado). Archivos grandes pueden degradar el rendimiento o acercarse a los límites de cuota de IndexedDB.
- [ ] **Falta de confirmación en acciones destructivas irregulares.** Solo `handleClearDatabase`, `handleImportBackupFile` y `handleDeleteBudgetExpense` piden confirmación (`window.confirm`). El borrado de **partida de presupuesto** (con efecto cascada sobre movimientos), **factura** (con reversión de pagos a proveedor), **proveedor**, **hito** y **foto** se ejecutan de forma inmediata sin confirmación. Es una inconsistencia de UX/seguridad — al menos partida y factura deberían confirmarse por su impacto en cascada.

---

## 3. 🧹 Código duplicado / sobrante

- [ ] **Cálculo de estado de partida duplicado.** `budget.ts` ya centraliza `getBudgetStatus()` (percentUsed, deviation, isOver, isNearLimit), pero `BudgetSection.tsx` sigue calculando `deviation`, `percentUsed` e `isOver` manualmente en línea (no usa el helper). Igual pasa parcialmente en `ReportGenerator.tsx` (`const dev = item.spent - item.allocated`) en vez de reutilizar `getBudgetStatus`. Consolidar todo el uso en el helper para evitar que las tres vistas puedan desincronizarse si cambia la lógica.
- [ ] **Generación de IDs repetida 7 veces** (`'b_' + Math.random()...`, `'s_' + ...`, `'m_' + ...`, `'e_' + ...`, `'p_' + ...`, `'f_' + ...`, `'i_' + ...`) en `App.tsx`. Extraer a un helper único, p. ej. `generateId(prefix: string)`, e idealmente usar `crypto.randomUUID()` (soportado en navegadores modernos) en lugar de `Math.random().toString(36)`, que tiene mayor riesgo de colisión.
- [ ] **`LocalDataStats` / stats de `getStats()` duplicados.** El shape `{ budget, suppliers, milestones, invoices, photos, funds, budgetExpenses, total }` está definido de forma implícita en `db.ts` (tipo de retorno), inline en el `useState` de `App.tsx`, y de nuevo como interfaz local `LocalDataStats` en `SyncStatus.tsx`. Si se añade un store nuevo hay que tocar 3 sitios coherentemente. Mover esta interfaz a `types.ts` y reutilizarla en los tres lugares.
- [ ] **`useEffect` con cleanup vacío** en `App.tsx` (`return () => {};`) — código muerto, se puede eliminar el `return`.
- [ ] Los dos `<ReportGenerator />` (header desktop y FAB móvil) están duplicados intencionadamente para diseño responsive — no es un bug, pero merece un comentario explicando por qué existen dos instancias (para quien lea el código no resulte confuso).

---

## 4. 🌍 Consistencia de idioma (galego / castelán)

El `<html lang="gl">` indica galego, pero el texto de la app mezcla constantemente galego y castellano:

- [ ] **`ReportGenerator.tsx` — mismo fichero, dos idiomas en la misma función:** pie de página 1 usa *"Páxina 1 de 2..."* (galego) y pie de página 2 usa *"Página 2 de 2..."* (castellano). Igual de inconsistente: *"Fecha de xeración"* mezcla "Fecha" (ES) con "xeración" (GL); *"Calificación"* (ES) vs. resto de etiquetas en GL; *"(Ahorro del X%)"* (ES) mientras `Dashboard.tsx`/`BudgetSection.tsx` usan **"Aforro"** (GL) para el mismo concepto.
- [ ] **`GallerySection.tsx`**: `"Por favor ingrese un título y tome/cargue una fotografía."` — íntegramente en castellano, sin ninguna palabra en galego, rompiendo con el resto de la sección.
- [ ] **`DocumentsSection.tsx`**: `"Por favor complete todos los campos obligatorios."` — castellano ("los campos obligatorios" vs. galego "os campos obrigatorios").
- [ ] **`SuppliersSection.tsx`**: `"Sin teléfono"`, `"Sin correo"`, `"Sin asignar"` — castellano ("Sin") mientras el resto de la app usa consistentemente "Sen" (galego), incluso dentro del mismo componente en otras cadenas.

**Recomendación:** definir un pequeño diccionario de términos clave (Aforro/Ahorro, Sen/Sin, Páxina/Página, etc.) y pasar una revisión de textos para unificar todo a galego, ya que es el idioma declarado en `<html lang="gl">`.

---

## 5. ♿ Accesibilidad / UX

- [ ] `index.html`: `maximum-scale=1.0, user-scalable=no` en el `<meta viewport>` desactiva el zoom táctil. Es un patrón desaconsejado por WCAG (impide a usuarios con baja visión hacer zoom). Recomendado quitar `maximum-scale` y `user-scalable=no`.
- [ ] Botones de icono (`Trash2`, `Edit2`, etc.) usan `title` pero no `aria-label`; los lectores de pantalla no siempre exponen `title`. Añadir `aria-label` explícito en botones solo-icono.
- [ ] No hay ningún `ErrorBoundary` alrededor de `<App />` en `main.tsx`. Si un componente lanza una excepción en render, toda la app cae en pantalla en blanco sin mensaje. Recomendado envolver con un boundary sencillo que muestre un mensaje y opción de recarga.

---

## 6. 🏗️ Arquitectura y buenas prácticas

- [ ] **Escrituras no transaccionales "atómicas" solo en apariencia.** Comentarios como *"actualiza atomicamente o acumulado"* en `handleAddBudgetExpense` son optimistas: son dos llamadas `await dbInstance.add(...)` / `await dbInstance.update(...)` **independientes** (dos transacciones IndexedDB distintas). Si la segunda falla (o el usuario cierra la pestaña entre medias), el histórico y el acumulado quedan desincronizados. Si se quiere atomicidad real, habría que abrir una única transacción IndexedDB que cubra ambos `objectStore`.
- [ ] **Manejo de errores inconsistente en el CRUD.** `handleClearDatabase`, `handleExportBackup` e `handleImportBackupFile` están en `try/catch` con log y/o `alert`. El resto de *handlers* (`handleAddBudgetCategory`, `handleAddSupplier`, `handleAddInvoice`, etc.) no capturan errores — si `dbInstance` lanza (p. ej. cuota excedida), la promesa rechaza sin feedback visible al usuario, solo consola. Uniformar con try/catch + `logEvent`/`alert` en todos los handlers de escritura.
- [ ] `db.ts` expone un tipo `StoreName` bien centralizado — buena práctica ya aplicada, siguiendo esa misma idea sería bueno centralizar también el tipo de estadísticas (punto 3).

---

## 7. ⚡ Rendimiento y escalabilidad (a futuro)

- [ ] Fotos y PDFs se guardan como base64 directamente en IndexedDB sin compresión ni límite real (ver punto 2). A medida que crezca el número de fotos de obra, el tamaño de la base local puede crecer rápido. Considerar comprimir imágenes en cliente antes de guardarlas (canvas resize) o usar `Blob`/`ArrayBuffer` en lugar de base64 (más eficiente en espacio).
- [ ] Listas (`invoices`, `photos`, histórico de `budgetExpenses`) se renderizan completas sin paginación/virtualización. No es un problema con el volumen actual esperado, pero si el proyecto crece a cientos de registros convendría paginar o virtualizar.
- [ ] `importBackup` inserta elementos uno a uno con `for...await` en vez de en paralelo — correcto para evitar sobrecargar IndexedDB, pero puede ser lento con backups grandes; aceptable tal cual, solo a vigilar.

---

## 8. ✅ Checklist priorizado de acciones

### Prioridad alta (integridad de datos)
- [ ] Generar un `BudgetExpense` automático (source `manual`) al crear una partida con `spent` inicial > 0.
- [ ] Generar un `BudgetExpense` de ajuste (delta) al editar `spent` manualmente desde "Editar partida", en vez de sobrescribir sin rastro.
- [ ] Añadir validación `amount > 0` en `FundsSection`.
- [ ] Decidir qué hacer con facturas cuyo `categoryId` apunta a una partida borrada (avisar, bloquear borrado o limpiar el campo).

### Prioridad media (bugs visibles / UX)
- [ ] Definir el breakpoint `xs` en `@theme` (index.css) o eliminar su uso si no es intencional.
- [ ] Corregir `height-4` → `h-4` en `ReportGenerator.tsx`.
- [ ] Eliminar el registro duplicado del Service Worker en `main.tsx`.
- [ ] Corregir la ruta del logo en `index.html` (`../icons` → `${import.meta.env.BASE_URL}icons/...`).
- [ ] Validar tamaño real de archivo (10MB) en `DocumentsSection` y `GallerySection`.
- [ ] Añadir `window.confirm` al borrar partida de presupuesto y factura, como ya existe para movimientos y backup.

### Prioridad baja (limpieza / deuda técnica)
- [ ] Reutilizar `getBudgetStatus()` de `budget.ts` en `BudgetSection.tsx` y `ReportGenerator.tsx` en vez de recalcular inline.
- [ ] Centralizar generación de IDs en un helper (`generateId(prefix)`), valorar `crypto.randomUUID()`.
- [ ] Mover el tipo de estadísticas (`getStats()`) a `types.ts` y reutilizarlo en `db.ts`, `App.tsx` y `SyncStatus.tsx`.
- [ ] Uniformar el idioma (galego) en todas las cadenas de texto, especialmente en `ReportGenerator.tsx`, `GallerySection.tsx`, `DocumentsSection.tsx` y `SuppliersSection.tsx`.
- [ ] Quitar `user-scalable=no`/`maximum-scale=1.0` del viewport.
- [ ] Añadir `aria-label` a botones solo-icono.
- [ ] Añadir un `ErrorBoundary` en `main.tsx`.
- [ ] Uniformar manejo de errores (try/catch) en todos los handlers CRUD de `App.tsx`.

---

## 9. Cosas que están **bien hechas** y merece la pena mantener

- El diseño de `BudgetExpense` como histórico auditable, con `source` diferenciado (`invoice`/`quick`/`manual`) y bloqueo de edición para movimientos de factura, es una buena decisión de arquitectura.
- La migración de IndexedDB v4 (`db.ts`) resolviendo el `spent` heredado con movimientos "Saldo inicial migrado" es un patrón correcto — justo el mismo patrón que falta aplicar en el alta/edición manual de partidas (ver punto 1.1).
- `budget.ts` como capa de cálculo centralizada es la dirección correcta; solo falta que todos los consumidores la usen.
- La lógica de reversión en `handleDeleteInvoice` (revertir proveedor y partida por separado, usando `financialsApplied` como fuente de verdad) está bien pensada y desacoplada.
- Comentarios en español explicando decisiones de diseño (por qué se usa `invoice.categoryId` explícito y no matching por texto, por qué `financialsApplied` es la fuente de verdad, etc.) — muy buena práctica para mantenibilidad futura.