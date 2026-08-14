/**
 * خادم ثابت يقدّم مجلد dist تحت المسار الفرعي الحقيقي.
 * الغرض أن تُختبر النسخة المبنية كما ستُنشر على GitHub Pages، لا على جذر localhost.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, PORT, DIST } from './config.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

export function createServer() {
  return http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://localhost');
    let p = decodeURIComponent(u.pathname);

    if (!p.startsWith(BASE)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('خارج مسار الموقع');
      return;
    }
    p = p.slice(BASE.length);
    let file = path.join(DIST, p);

    try {
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) {
        const notFound = path.join(DIST, '404.html');
        const body = fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'غير موجود';
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(body);
        return;
      }
      const ext = path.extname(file);
      res.writeHead(200, {
        'content-type': TYPES[ext] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(fs.readFileSync(file));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(err));
    }
  });
}

export async function withServer(fn) {
  const server = createServer();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  try {
    return await fn();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`الموقع يعمل على http://127.0.0.1:${PORT}${BASE}`);
  });
}
