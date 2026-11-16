/**
 * Genera el **manual de usuario en PDF** a partir de docs/MANUAL_USUARIO.md.
 *
 * Pipeline: Markdown (marked) → HTML con estilos de impresión → PDF con
 * `printToPDF` de Electron (no hace falta ninguna dependencia extra).
 *
 * Salidas:
 *  - docs/MANUAL_USUARIO.pdf
 *  - apps/landing/public/MANUAL_USUARIO.pdf (descarga desde la landing)
 *
 * Uso: npm run manual:pdf
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { marked } = require('marked');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const RAIZ = path.resolve(__dirname, '..');
const MD = path.join(RAIZ, 'docs', 'MANUAL_USUARIO.md');
const PDF = path.join(RAIZ, 'docs', 'MANUAL_USUARIO.pdf');
const PDF_LANDING = path.join(RAIZ, 'apps', 'landing', 'public', 'MANUAL_USUARIO.pdf');

/** Hoja de estilos para impresión (A4, márgenes y tipografía legible). */
const ESTILOS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937; line-height: 1.6; font-size: 11pt; margin: 0;
  }
  h1 {
    font-size: 24pt; color: #0369a1; border-bottom: 3px solid #f59e0b;
    padding-bottom: 8px; margin: 0 0 4pt;
  }
  h2 {
    font-size: 15pt; color: #0c4a6e; margin: 18pt 0 6pt;
    break-after: avoid; page-break-after: avoid;
  }
  h3 { font-size: 12.5pt; color: #075985; margin: 12pt 0 4pt; break-after: avoid; }
  p { margin: 0 0 7pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
  li { margin-bottom: 3pt; }
  code {
    background: #f1f5f9; border-radius: 4px; padding: 1px 5px;
    font-family: Consolas, "Courier New", monospace; font-size: 10pt;
  }
  pre {
    background: #0f172a; color: #e2e8f0; padding: 10pt 12pt; border-radius: 8px;
    overflow: hidden; white-space: pre-wrap; font-size: 9.5pt;
    break-inside: avoid; page-break-inside: avoid;
  }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote {
    border-left: 4px solid #f59e0b; background: #fffbeb; margin: 0 0 10pt;
    padding: 8pt 12pt; border-radius: 0 8px 8px 0;
  }
  table { width: 100%; border-collapse: collapse; margin: 0 0 10pt; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 5pt 7pt; text-align: left; }
  th { background: #e0f2fe; color: #0c4a6e; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 12pt 0; }
  a { color: #0369a1; text-decoration: none; }
  strong { color: #0f172a; }
`;

app.whenReady().then(async () => {
  const markdown = fs.readFileSync(MD, 'utf8');
  const cuerpo = await marked.parse(markdown);

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Manual de usuario — SazónLab</title>
<style>${ESTILOS}</style></head>
<body>${cuerpo}</body></html>`;

  const win = new BrowserWindow({
    width: 900,
    height: 1200,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await dormir(700);

  const pdf = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#64748b;padding:0 12px;display:flex;justify-content:space-between;">' +
      '<span>SazónLab — Manual de usuario</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>',
  });

  fs.writeFileSync(PDF, pdf);
  fs.mkdirSync(path.dirname(PDF_LANDING), { recursive: true });
  fs.copyFileSync(PDF, PDF_LANDING);

  const kb = (fs.statSync(PDF).size / 1024).toFixed(0);
  console.log(`OK: docs/MANUAL_USUARIO.pdf (${kb} KB) + apps/landing/public/MANUAL_USUARIO.pdf`);
  app.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('FATAL:', err.message);
  app.exit(1);
});
