/**
 * الرابط الخارجي الوحيد المسموح داخل الموقع هو قناة الدعم على تيليجرام.
 * هذا الفحص يفشل عند أي رابط خارجي آخر، وعند أي مورد يُطلب من شبكة خارجية.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, ALLOWED_EXTERNAL, ok, fail, info } from './config.mjs';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function run() {
  const files = walk(DIST).filter((f) => /\.(html|css|js|json|svg)$/i.test(f));
  const errors = [];
  const found = new Map();

  for (const file of files) {
    const rel = path.relative(DIST, file);
    const body = fs.readFileSync(file, 'utf8');

    for (const m of body.matchAll(/https?:\/\/[^\s"'<>()\\]+/g)) {
      let u = m[0].replace(/[.,;]+$/, '');
      // مساحات أسماء XML و SVG ليست طلبات شبكة
      if (/^https?:\/\/www\.w3\.org\//.test(u)) continue;
      if (ALLOWED_EXTERNAL.includes(u)) {
        found.set(u, (found.get(u) ?? 0) + 1);
        continue;
      }
      errors.push(`رابط خارجي غير مسموح في ${rel}: ${u}`);
    }

    // موارد تُطلب من نطاق خارجي
    for (const m of body.matchAll(/(?:src|href)="\/\/[^"]+"/g)) {
      errors.push(`مورد من نطاق خارجي في ${rel}: ${m[0]}`);
    }
  }

  if (errors.length) {
    fail(`فحص الروابط الخارجية: ${errors.length} مخالفة`);
    errors.slice(0, 30).forEach((e) => info(e));
    return 1;
  }

  if (found.size === 0) {
    fail('لم يُعثر على رابط قناة الدعم إطلاقا — يُفترض ظهوره في ثلاثة مواضع');
    return 1;
  }

  ok(`فحص الروابط الخارجية: الرابط الوحيد هو ${[...found.keys()].join(', ')} (${[...found.values()].reduce((a, b) => a + b, 0)} ظهورا)`);
  return 0;
}

process.exit(run());
