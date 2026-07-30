/**
 * PDFxyfields - Local Server (Node.js)
 * Serves static web app and automatically saves JSON schemas & PDF files into the /maps/ directory.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8085;
const ROOT_DIR = __dirname;
const MAPS_DIR = path.join(ROOT_DIR, 'maps');

// Ensure /maps/ directory exists
if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
  console.log(`[PDFxyfields] Subpasta criada: ${MAPS_DIR}`);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // API ROUTE: SAVE JSON AND PDF TO /maps/
  if (pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let pdfName = payload.pdfName || 'formulario.pdf';
        
        // Ensure .pdf extension in name
        if (!pdfName.toLowerCase().endsWith('.pdf')) {
          pdfName += '.pdf';
        }

        const baseName = pdfName.replace(/\.pdf$/i, '');
        const jsonFileName = `${baseName}.json`;
        const pdfFileName = `${baseName}.pdf`;

        const jsonFilePath = path.join(MAPS_DIR, jsonFileName);
        const pdfFilePath = path.join(MAPS_DIR, pdfFileName);

        // 1. Save JSON File to /maps/<baseName>.json
        const jsonString = JSON.stringify(payload.jsonContent, null, 2);
        fs.writeFileSync(jsonFilePath, jsonString, 'utf-8');

        // 2. Save/Copy PDF File to /maps/<baseName>.pdf if provided
        let pdfSaved = false;
        if (payload.pdfBase64) {
          const base64Data = payload.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(pdfFilePath, buffer);
          pdfSaved = true;
        }

        console.log(`[PDFxyfields] Salvo em maps: ${jsonFileName} ${pdfSaved ? 'e ' + pdfFileName : ''}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Salvo com sucesso na pasta maps/`,
          jsonFile: jsonFileName,
          pdfFile: pdfSaved ? pdfFileName : null,
          jsonPath: path.relative(ROOT_DIR, jsonFilePath)
        }));
      } catch (err) {
        console.error('[PDFxyfields] Erro ao salvar:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API ROUTE: LIST MAPS
  if (pathname === '/api/maps' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(MAPS_DIR);
      const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, jsons: jsonFiles, pdfs: pdfFiles }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // STATIC FILE SERVING
  if (pathname === '/') pathname = '/index.html';

  let filePath = path.join(ROOT_DIR, pathname);
  
  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Acesso Negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Não Encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 PDFxyfields Server Ativo!`);
  console.log(`🌐 URL: http://localhost:${PORT}/`);
  console.log(`📁 Subpasta de Destino: ${MAPS_DIR}`);
  console.log(`==================================================\n`);
});
