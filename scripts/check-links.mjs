/**
 * فحص كل رابط داخلي وكل أصل داخل dist:
 *  · لا رابط داخلي مكسور
 *  · لا صورة أو خط أو ملف مفقود
 *  · لا رابط بلا مسار الموقع الفرعي
 *  · كل معرّف مرساة موجود فعلا في الصفحة الهدف
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, BASE, ok, fail, info } from './config.mjs';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const exists = (p) => fs.existsSync(p);

function resolveTarget(href) {
  // href يبدأ بـ BASE
  const rel = href.slice(BASE.length).split('#')[0].split('?')[0];
  if (rel === '' || rel.endsWith('/')) return path.join(DIST, rel, 'index.html');
  const direct = path.join(DIST, rel);
  if (exists(direct) && fs.statSync(direct).isFile()) return direct;
  return path.join(DIST, rel, 'index.html');
}

function run() {
  const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
  const errors = [];
  let checked = 0;

  const idCache = new Map();
  const idsOf = (file) => {
    if (idCache.has(file)) return idCache.get(file);
    const set = new Set();
    if (exists(file) && fs.statSync(file).isFile()) {
      const body = fs.readFileSync(file, 'utf8');
      for (const m of body.matchAll(/\sid="([^"]+)"/g)) set.add(m[1]);
    }
    idCache.set(file, set);
    return set;
  };

  for (const file of htmlFiles) {
    const rel = path.relative(DIST, file);
    const body = fs.readFileSync(file, 'utf8');
    const refs = [
      ...body.matchAll(/\shref="([^"]+)"/g),
      ...body.matchAll(/\ssrc="([^"]+)"/g),
    ].map((m) => m[1]);

    for (const raw of refs) {
      if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(raw)) continue;
      checked += 1;

      if (!raw.startsWith(BASE)) {
        errors.push(`رابط بلا مسار الموقع في ${rel}: ${raw}`);
        continue;
      }
      const target = resolveTarget(raw);
      if (!exists(target)) {
        errors.push(`رابط داخلي مكسور في ${rel}: ${raw}`);
        continue;
      }
      const hash = raw.includes('#') ? raw.split('#')[1] : '';
      if (hash && !idsOf(target).has(hash)) {
        errors.push(`مرساة غير موجودة في ${rel}: ${raw}`);
      }
    }
  }

  if (errors.length) {
    fail(`فحص الروابط: ${errors.length} مشكلة من ${checked} رابطا`);
    errors.slice(0, 40).forEach((e) => info(e));
    if (errors.length > 40) info(`… و${errors.length - 40} أخرى`);
    return 1;
  }
  ok(`فحص الروابط: ${checked} رابطا داخليا سليما في ${htmlFiles.length} صفحة`);
  return 0;
}

process.exit(run());
