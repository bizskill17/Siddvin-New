
/** Capture the styled detail view, then save a PDF without a print window. */
export const downloadDetailPdf = async (elementId: string, filename: string): Promise<void> => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  const source = document.getElementById(elementId);
  if (!source) throw new Error('The details view is not available.');
  await document.fonts.ready;
  const canvas = await html2canvas(source, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: 1440,
    scrollX: 0,
    scrollY: 0,
    onclone: async (doc) => {
      const detail = doc.getElementById(elementId)!;
      detail.style.width = '1100px';
      detail.style.maxWidth = 'none';
      detail.style.margin = '0';
      detail.querySelectorAll('[data-export-ignore="true"], button, input').forEach(node => node.remove());
      detail.querySelectorAll<HTMLElement>('.overflow-x-auto').forEach(node => {
        node.style.overflow = 'visible';
        node.style.maxHeight = 'none';
      });
      const isBlank = (value: string | null) => ['', 'N/A', '—', '-'].includes((value || '').trim().toUpperCase());
      detail.querySelectorAll<HTMLTableElement>('table').forEach(table => {
        const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
        const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead tr:first-child th'));
        for (let index = headers.length - 1; index >= 0; index--) {
          const cells = rows.map(row => row.cells[index]).filter(Boolean);
          if (cells.length && cells.every(cell => cell.colSpan === 1 && isBlank(cell.textContent))) {
            headers[index].remove(); cells.forEach(cell => cell.remove());
          }
        }
        table.style.width = '100%';
        table.style.tableLayout = 'auto';
        table.querySelectorAll<HTMLElement>('th, td').forEach(cell => {
          cell.style.whiteSpace = 'normal'; cell.style.overflowWrap = 'anywhere';
          cell.style.fontSize = '14px'; cell.style.padding = '10px';
          cell.style.color = '#142b50'; cell.style.border = '1px solid #b8cbdc';
        });
      });
      // Keep section titles while excluding their interactive controls.
      detail.querySelectorAll<HTMLImageElement>('img').forEach(img => { img.loading = 'eager'; });
      await Promise.all(Array.from(detail.querySelectorAll<HTMLImageElement>('img')).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(resolve => {
          img.onload = () => resolve(); img.onerror = () => resolve();
          setTimeout(resolve, 5000);
        })
      ));
    },
  });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  const pixelsPerMm = canvas.width / pageWidth;
  const pagePixels = Math.floor(pageHeight * pixelsPerMm);
  const page = document.createElement('canvas');
  page.width = canvas.width;
  // Slice into separate page images, rather than repeating the entire tall image.
  for (let top = 0; top < canvas.height; top += pagePixels) {
    page.height = Math.min(pagePixels, canvas.height - top);
    const context = page.getContext('2d');
    if (!context) throw new Error('Could not create the PDF page.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, page.width, page.height);
    context.drawImage(canvas, 0, top, canvas.width, page.height, 0, 0, page.width, page.height);
    if (top > 0) pdf.addPage();
    pdf.addImage(page.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, pageWidth, page.height / pixelsPerMm);
  }
  pdf.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
};

