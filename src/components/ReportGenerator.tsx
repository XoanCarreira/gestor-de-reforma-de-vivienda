import { jsPDF } from 'jspdf';
import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { getBudgetTotals, getBudgetStatusLabel, getBudgetStatus } from '../utils/budget';
import { useReformaDataContext } from '../context/ReformaDataContext';

export default function ReportGenerator() {
  const { budget, suppliers, milestones, invoices } = useReformaDataContext();
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor = [30, 41, 59];
      const accentColor = [245, 158, 11];
      const textColor = [51, 65, 85];
      const lightBg = [248, 250, 252];

      const { totalAllocated, totalSpent, totalDeviation, deviationPercent } = getBudgetTotals(budget);

      // --- PAGE 1: TITLE & SUMMARY ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 60, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('REPORTE DE REFORMA DE VIVENDA', 15, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(241, 245, 249);
      doc.text(`Fecha de xeración: ${new Date().toLocaleDateString('es-ES')}`, 15, 35);
      doc.text('Xenerado por ReformaVivenda - App creada por XoanCoder', 15, 41);

      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 57, 210, 3, 'F');

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Resumen Executivo do Proxecto', 15, 75);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('Este documento contén o estado financeiro, avance de hitos e balance de proveedores da obra en curso.', 15, 82);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, 90, 55, 30, 'F');
      doc.rect(77, 90, 55, 30, 'F');
      doc.rect(140, 90, 55, 30, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('ORZAMENTO ACORDADO', 20, 96);
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${totalAllocated.toLocaleString('es-ES')} EUR`, 20, 106);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('ACUMULADO GASTADO', 82, 96);
      doc.setFontSize(14);
      if (totalSpent > totalAllocated) {
        doc.setTextColor(239, 68, 68);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(`${totalSpent.toLocaleString('es-ES')} EUR`, 82, 106);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('DESVIACIÓN NETA', 145, 96);
      doc.setFontSize(14);
      if (totalDeviation > 0) {
        doc.setTextColor(239, 68, 68);
        doc.text(`+${totalDeviation.toLocaleString('es-ES')} EUR`, 145, 106);
        doc.setFontSize(8);
        doc.text(`(+${(deviationPercent - 100).toFixed(1)}% sobrecoste)`, 145, 112);
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text(`${totalDeviation.toLocaleString('es-ES')} EUR`, 145, 106);
        doc.setFontSize(8);
        doc.text(`(Ahorro del ${(100 - deviationPercent).toFixed(1)}%)`, 145, 112);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Desglose do Orzamento por Categoría', 15, 135);

      let y = 142;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Categoría', 18, y + 5);
      doc.text('Asignado', 90, y + 5, { align: 'right' });
      doc.text('Gastado', 125, y + 5, { align: 'right' });
      doc.text('Desviación', 160, y + 5, { align: 'right' });
      doc.text('Estado', 190, y + 5, { align: 'right' });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      budget.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 7, 'F');
        }

        const dev = getBudgetStatus(item).deviation;
        const status = getBudgetStatusLabel(item);

        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(item.name.substring(0, 36), 18, y + 5);
        doc.text(`${item.allocated.toLocaleString('es-ES')} €`, 90, y + 5, { align: 'right' });
        doc.text(`${item.spent.toLocaleString('es-ES')} €`, 125, y + 5, { align: 'right' });

        if (dev > 0) {
          doc.setTextColor(239, 68, 68);
          doc.text(`+${dev.toLocaleString('es-ES')} €`, 160, y + 5, { align: 'right' });
        } else {
          doc.setTextColor(16, 185, 129);
          doc.text(`${dev.toLocaleString('es-ES')} €`, 160, y + 5, { align: 'right' });
        }

        if (status === 'Excedido') {
          doc.setFillColor(254, 226, 226);
          doc.setTextColor(220, 38, 38);
        } else if (status === 'Límite') {
          doc.setFillColor(254, 243, 199);
          doc.setTextColor(217, 119, 6);
        } else {
          doc.setFillColor(209, 250, 229);
          doc.setTextColor(5, 150, 105);
        }

        doc.rect(173, y + 1.5, 20, 4, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(status, 183, y + 4.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        y += 7;
      });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Páxina 1 de 2 - ReformaVivenda Reporte Automatizado', 15, 285);

      // --- PAGE 2: PROVIDERS & TIMELINE ---
      doc.addPage();

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 15, 210, 1, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('REPORTE DETALLADO DE OBRA - CONTROL DE PROVEEDORES E HITOS', 15, 10);

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(14);
      doc.text('Control Financiero de Proveedores', 15, 28);

      y = 35;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Proveedor', 18, y + 5);
      doc.text('Contratado', 85, y + 5, { align: 'right' });
      doc.text('Pagado', 120, y + 5, { align: 'right' });
      doc.text('Pendiente', 155, y + 5, { align: 'right' });
      doc.text('Calificación', 190, y + 5, { align: 'right' });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      suppliers.forEach((sup, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 7, 'F');
        }

        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(sup.name.substring(0, 36), 18, y + 5);
        doc.text(`${sup.contractedAmount.toLocaleString('es-ES')} €`, 85, y + 5, { align: 'right' });
        doc.text(`${sup.paidAmount.toLocaleString('es-ES')} €`, 120, y + 5, { align: 'right' });

        if (sup.pendingAmount > 0) {
          doc.setTextColor(217, 119, 6);
        } else {
          doc.setTextColor(16, 185, 129);
        }
        doc.text(`${sup.pendingAmount.toLocaleString('es-ES')} €`, 155, y + 5, { align: 'right' });

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(`${sup.rating ? '★'.repeat(Math.round(sup.rating)) : 'Sen punt.'}`, 190, y + 5, { align: 'right' });

        y += 7;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Cronograma de Hitos e Planificación', 15, y + 15);

      y += 22;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Hito / Actividad', 18, y + 5);
      doc.text('Fecha Límite', 120, y + 5, { align: 'right' });
      doc.text('Estado', 160, y + 5, { align: 'right' });
      doc.text('Fecha Real', 190, y + 5, { align: 'right' });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      milestones.forEach((m, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 7, 'F');
        }

        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(m.title.substring(0, 48), 18, y + 5);
        doc.text(new Date(m.dueDate).toLocaleDateString('es-ES'), 120, y + 5, { align: 'right' });

        let statusText = 'Pendiente';
        if (m.status === 'completed') {
          statusText = 'Completado';
          doc.setTextColor(16, 185, 129);
        } else if (m.status === 'in_progress') {
          statusText = 'En Curso';
          doc.setTextColor(59, 130, 246);
        } else if (m.status === 'delayed') {
          statusText = 'Retrasado';
          doc.setTextColor(239, 68, 68);
        } else {
          doc.setTextColor(100, 116, 139);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(statusText, 160, y + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(m.completedDate ? new Date(m.completedDate).toLocaleDateString('es-ES') : '-', 190, y + 5, { align: 'right' });

        y += 7;
      });

      y += 12;
      doc.setFillColor(254, 243, 199);
      doc.rect(15, y, 180, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text('Nota de Auditoría:', 18, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text('Calquer cambio rexistrado sen conexión consolidarase no servidor o recuperar a sincronización.', 18, y + 9);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Página 2 de 2 - ReformaVivenda Reporte Automatizado', 15, 285);

      doc.save(`reporte_reforma_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Error o xenerar o PDF. Comprobe a conexión ou intente mais tarde.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      id="btn-generar-pdf"
      onClick={generatePDF}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-950/20 active:scale-95 transition-all text-sm w-full sm:w-auto justify-center"
    >
      <FileDown className={`w-4 height-4 ${generating ? 'animate-bounce' : ''}`} />
      <span>{generating ? 'Xenerando PDF...' : 'Descargar Reporte PDF'}</span>
    </button>
  );
}
