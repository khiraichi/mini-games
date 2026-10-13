// Server statis sederhana tanpa dependency.
// Jalankan: node server.js  (atau: npm start)
// Ganti port: PORT=5152 node server.js  atau ubah DEFAULT_PORT di bawah.
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 5252;
const PORT = process.env.PORT || DEFAULT_PORT;
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  // Cegah akses di luar folder public
  let filePath = path.normalize(path.join(ROOT, urlPath));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  const notFound = () => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 - Tidak ditemukan: ${urlPath}`);
  };

  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) {
      // /games/tennis  ->  /games/tennis/  (supaya link relatif di dalamnya benar)
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { Location: urlPath + '/' });
        return res.end();
      }
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) return notFound();
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah dipakai. Coba port lain: PORT=5152 node server.js`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Mini Games jalan di http://localhost:${PORT}`);
  console.log(`Menyajikan file dari: ${ROOT}`);
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.warn('PERINGATAN: public/index.html tidak ditemukan.');
  }
});
