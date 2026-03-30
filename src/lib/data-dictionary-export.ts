import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { DataDictionaryTable, TABLE_CATEGORIES, type TableCategory } from '@/data/data-dictionary';

export function exportToExcel(tables: DataDictionaryTable[]) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = tables.map((t) => ({
    'Table Name': t.name,
    'Display Name': t.displayName,
    Category: t.category,
    Description: t.description,
    Purpose: t.purpose,
    'Field Count': t.fields.length,
    'Relationships': t.relationships.map((r) => `${r.type} → ${r.table}`).join('; '),
  }));
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [
    { wch: 28 }, { wch: 28 }, { wch: 20 }, { wch: 60 }, { wch: 60 }, { wch: 12 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // One sheet per category
  for (const category of TABLE_CATEGORIES) {
    const categoryTables = tables.filter((t) => t.category === category);
    if (categoryTables.length === 0) continue;

    const rows: Record<string, string>[] = [];
    for (const table of categoryTables) {
      for (const field of table.fields) {
        rows.push({
          Table: table.name,
          Field: field.name,
          Type: field.type,
          Description: field.description,
          Constraints: field.constraints.join(', '),
          Example: field.example,
          Source: field.source,
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 50 }, { wch: 35 }, { wch: 30 }, { wch: 18 },
    ];
    const sheetName = category.replace(/[&]/g, 'and').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, 'Aqademiq_Data_Dictionary.xlsx');
}

export function exportToPDF(tables: DataDictionaryTable[], generatedAt?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
      // Page header
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text('Aqademiq Data Dictionary', margin, 10);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, 10, { align: 'right' });
      y = 16;
    }
  };

  // ── Cover Page ──
  doc.setFontSize(28);
  doc.setTextColor(60, 20, 120);
  doc.text('Aqademiq', pageWidth / 2, 60, { align: 'center' });
  doc.setFontSize(20);
  doc.setTextColor(80);
  doc.text('Data Dictionary', pageWidth / 2, 75, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}`,
    pageWidth / 2, 90, { align: 'center' }
  );
  doc.text(`Total Tables: ${tables.length}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(
    `Total Fields: ${tables.reduce((sum, t) => sum + t.fields.length, 0)}`,
    pageWidth / 2, 108, { align: 'center' }
  );

  // ── Table of Contents ──
  doc.addPage();
  y = margin;
  doc.setFontSize(16);
  doc.setTextColor(60, 20, 120);
  doc.text('Table of Contents', margin, y);
  y += 10;

  for (const category of TABLE_CATEGORIES) {
    const catTables = tables.filter((t) => t.category === category);
    if (catTables.length === 0) continue;
    addPageIfNeeded(10);
    doc.setFontSize(11);
    doc.setTextColor(60, 20, 120);
    doc.text(category, margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(80);
    for (const t of catTables) {
      addPageIfNeeded(5);
      doc.text(`• ${t.displayName} (${t.name})`, margin + 6, y);
      y += 5;
    }
    y += 3;
  }

  // ── Table Details ──
  for (const table of tables) {
    doc.addPage();
    y = margin;

    // Table header
    doc.setFontSize(14);
    doc.setTextColor(60, 20, 120);
    doc.text(table.displayName, margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Table: ${table.name}  |  Category: ${table.category}`, margin, y);
    y += 8;

    // Description
    doc.setFontSize(10);
    doc.setTextColor(40);
    const descLines = doc.splitTextToSize(table.description, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 3;

    // Purpose
    doc.setFontSize(9);
    doc.setTextColor(80);
    const purposeLines = doc.splitTextToSize(`Purpose: ${table.purpose}`, contentWidth);
    doc.text(purposeLines, margin, y);
    y += purposeLines.length * 4.5 + 4;

    // Relationships
    if (table.relationships.length > 0) {
      addPageIfNeeded(12);
      doc.setFontSize(10);
      doc.setTextColor(60, 20, 120);
      doc.text('Relationships', margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(60);
      for (const rel of table.relationships) {
        addPageIfNeeded(5);
        doc.text(`→ ${rel.type} to ${rel.table} via ${rel.via}: ${rel.description}`, margin + 4, y);
        y += 4.5;
      }
      y += 3;
    }

    // Fields table header
    addPageIfNeeded(12);
    doc.setFontSize(10);
    doc.setTextColor(60, 20, 120);
    doc.text('Fields', margin, y);
    y += 6;

    // Column headers
    const cols = [
      { label: 'Field', x: margin, w: 32 },
      { label: 'Type', x: margin + 32, w: 20 },
      { label: 'Description', x: margin + 52, w: 62 },
      { label: 'Constraints', x: margin + 114, w: 38 },
      { label: 'Source', x: margin + 152, w: 22 },
    ];

    doc.setFillColor(240, 237, 250);
    doc.rect(margin, y - 3, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 20, 120);
    for (const col of cols) {
      doc.text(col.label, col.x + 1, y);
    }
    y += 5;

    // Field rows
    doc.setTextColor(40);
    doc.setFontSize(7);
    for (const field of table.fields) {
      addPageIfNeeded(8);
      const rowY = y;
      doc.text(field.name, cols[0].x + 1, rowY, { maxWidth: cols[0].w - 2 });
      doc.text(field.type, cols[1].x + 1, rowY, { maxWidth: cols[1].w - 2 });
      const descSplit = doc.splitTextToSize(field.description, cols[2].w - 2);
      doc.text(descSplit, cols[2].x + 1, rowY);
      const constrText = field.constraints.join(', ');
      const constrSplit = doc.splitTextToSize(constrText, cols[3].w - 2);
      doc.text(constrSplit, cols[3].x + 1, rowY);
      doc.text(field.source, cols[4].x + 1, rowY, { maxWidth: cols[4].w - 2 });
      const maxLines = Math.max(1, descSplit.length, constrSplit.length);
      y += maxLines * 3.5 + 1.5;

      // Light separator line
      doc.setDrawColor(230);
      doc.line(margin, y - 1, margin + contentWidth, y - 1);
    }
  }

  doc.save('Aqademiq_Data_Dictionary.pdf');
}
