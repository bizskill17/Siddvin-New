import { BACKEND_URL } from '../../services/dataService';
/** Build a searchable landscape PDF with real text and paginated tables. */
export const downloadDetailPdf = async (elementId: string, filename: string): Promise<void> => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const source = document.getElementById(elementId);
  if (!source) throw new Error('The details view is not available.');
  const detail = source.cloneNode(true) as HTMLElement;
  detail.querySelectorAll('[data-export-ignore="true"], button, input, [role="dialog"]').forEach(node => node.remove());
  const text = (node: Element | null) => (node?.textContent || '').replace(/₹/g, 'INR ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').trim();
  const blank = (value: string) => ['', 'N/A', '-'].includes(value.trim().toUpperCase());
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12, width = 273, bottom = 195;
  let y = 16;
  const space = (height: number) => { if (y + height > bottom) { pdf.addPage(); y = 16; } };
  const write = (value: string, size = 10) => {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(size); pdf.setTextColor(20, 43, 80);
    const lines = pdf.splitTextToSize(value, width);
    for (const line of lines) { space(5); pdf.text(line, margin, y); y += 5; }
    y += 2;
  };
  const table = (head: string[], body: string[][], summary = false) => {
    autoTable(pdf, { startY: y, head: head.length ? [head] : undefined, body,
      margin: { left: margin, right: margin, top: 16, bottom: 15 }, tableWidth: width,
      theme: 'grid', pageBreak: 'auto', rowPageBreak: 'avoid', showHead: 'everyPage',
      styles: { font: 'helvetica', fontSize: summary ? 10 : 9, cellPadding: 3, overflow: 'linebreak', textColor: [20,43,80], lineColor: [200,218,233], lineWidth: 0.2 },
      headStyles: { fillColor: [232,242,249], textColor: [20,43,80], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248,251,253] },
      didParseCell: data => { if (!summary && /^\d{2}\/\d{2}\/\d{4}$/.test(String(data.cell.raw))) data.cell.styles.cellWidth = 27; },
    });
    y = (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  };
  const photo = source.querySelector<HTMLImageElement>('img');
  // Fetch bytes before rendering. This avoids lazy-image and canvas CORS capture failures.
  const rawPhoto = source.querySelector<HTMLElement>('[data-property-photo-url]')?.dataset.propertyPhotoUrl || '';
  if (photo || rawPhoto) {
    try {
      const candidates = [photo?.currentSrc || photo?.src, rawPhoto].filter(Boolean) as string[];
      try {
        const url = new URL(rawPhoto);
        if (url.hostname === 'drive.google.com') {
          const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
          if (id) candidates.unshift(new URL(`property_photo.php?id=${encodeURIComponent(id)}`, new URL(BACKEND_URL, location.origin)).toString());
        }
      } catch { /* A regular image URL can still be fetched above. */ }
      // Public images may render in an <img> while browser fetch is blocked by CORS.
      // Request the displayed URL through the same-origin, host-restricted image endpoint.
      const proxyBase = new URL('property_photo.php', new URL(BACKEND_URL, location.origin));
      for (const candidate of [...candidates]) {
        try {
          const url = new URL(candidate, location.origin);
          if (url.protocol === 'https:' && url.origin !== location.origin) {
            const proxy = new URL(proxyBase); proxy.searchParams.set('url', url.toString()); candidates.unshift(proxy.toString());
          }
        } catch { /* Keep other available sources. */ }
      }
      let blob: Blob | undefined;
      for (const candidate of new Set(candidates)) {
        try {
          const response = await fetch(candidate, { signal: AbortSignal.timeout(15000) });
          if (!response.ok) continue;
          const result = await response.blob();
          if (!result.type.startsWith('image/')) continue;
          blob = result; break;
        } catch { /* Try the next public image source. */ }
      }
      if (!blob) throw new Error('Photo request failed');
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      const image = new Image(); image.src = dataUrl; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Image conversion failed');
      context.drawImage(image, 0, 0);
      const height = Math.min(42, 65 * canvas.height / canvas.width);
      pdf.addImage(canvas.toDataURL('image/jpeg', .92), 'JPEG', margin, y, Math.min(65, height * canvas.width / canvas.height), height);
      y += height + 6;
    } catch { /* Omit unavailable photos from the PDF. */ }
  }
  const walk = (node: Element) => {
    if (/^H[1-4]$/.test(node.tagName)) { space(25); write(text(node), node.tagName === 'H1' ? 17 : 12); return; }
    if (node.tagName === 'TABLE') {
      const headers = Array.from(node.querySelectorAll('thead tr:first-child th')).map(text);
      const rows = Array.from(node.querySelectorAll('tbody tr')).map(row => Array.from(row.children).map(text));
      const keep = headers.map((_, index) => index).filter(index => rows.some(row => !blank(row[index] || '')));
      if (keep.length) table(keep.map(i => headers[i]), rows.map(row => keep.map(i => row[i] || '')));
      return;
    }
    if (node.classList.contains('grid')) {
      const fields = Array.from(node.children);
      if (fields.every(field => field.firstElementChild?.tagName === 'P')) {
        const cells = fields.map(field => { const label = text(field.firstElementChild); const values = Array.from(field.children).slice(1).map(text).filter(v => !blank(v)); return values.length ? label + '\n' + values.join('\n') : ''; }).filter(Boolean);
        const rows: string[][] = []; for (let i = 0; i < cells.length; i += 3) rows.push([cells[i], cells[i+1] || '', cells[i+2] || '']);
        if (rows.length) table([], rows, true); return;
      }
    }
    if (['P', 'UL'].includes(node.tagName)) { if (!blank(text(node))) write(text(node)); return; }
    if (node.tagName === 'IMG') return;
    Array.from(node.children).forEach(walk);
  };
  Array.from(detail.children).forEach(walk);
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { pdf.setPage(page); pdf.setFontSize(8); pdf.setTextColor(100); pdf.text(`${page} / ${pages}`, 285, 204, { align: 'right' }); }
  pdf.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
};
