export const exportRowsToCsv = (
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) => {
  const escapeValue = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.map(escapeValue).join(','),
    ...rows.map((row) => row.map(escapeValue).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const downloadTableAsPdf = (tableId: string, title: string) => {
  const table = document.getElementById(tableId);
  if (!table) return;

  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; }
          h1 { font-size: 20px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #999; padding: 8px; font-size: 12px; text-align: left; }
          thead { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${table.outerHTML}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};

export const downloadElementAsPdf = (elementId: string, title: string) => {
  const el = document.getElementById(elementId);
  if (!el) return;

  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button, input, [data-export-ignore="true"]').forEach((n) => n.remove());

  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #000; }
          h1, h2, h3, p, li, span, div { color: #000 !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #000; padding: 8px; font-size: 12px; text-align: left; }
          .sr-only { display: none; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};
