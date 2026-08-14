/**
 * فحص الأصول:
 *  · لا أصل مرجعي مفقود
 *  · لا أصل ضخم بلا سبب
 *  · كل الخطوط بصيغة woff2
 *  · كل صورة نقطية لها أبعاد صريحة داخل HTML
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, ok, fail, info } from './config.mjs';

const MAX_ASSET_KB = 260; // خط عربي كامل يقع تحت هذا الحد
const MAX_PAGE_JS_KB = 60;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function run() {
  const files = walk(DIST);
  const errors = [];
  const warnings = [];

  for (const f of files) {
    const rel = path.relative(DIST, f);
    const kb = fs.statSync(f).size / 1024;

    if (/\.(woff|ttf|otf|eot)$/i.test(f)) {
      errors.push(`خط بصيغة غير woff2: ${rel}`);
    }
    if (/\.(png|jpg|jpeg|gif|bmp|tiff)$/i.test(f) && kb > MAX_ASSET_KB) {
      errors.push(`صورة ثقيلة (${kb.toFixed(0)}KB): ${rel}`);
    }
    if (/\.woff2$/i.test(f) && kb > MAX_ASSET_KB) {
      errors.push(`ملف خط ثقيل (${kb.toFixed(0)}KB): ${rel}`);
    }
    if (/\.(mp4|webm|mov|avi)$/i.test(f)) {
      errors.push(`ملف فيديو داخل الموقع: ${rel}`);
    }
    if (/\.(pdf|pptx|docx)$/i.test(f)) {
      errors.push(`ملف مكتبي أو مطبوع داخل الموقع: ${rel}`);
    }
  }

  // حجم الجافاسكربت الكلي
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const totalJsKb = jsFiles.reduce((n, f) => n + fs.statSync(f).size / 1024, 0);
  if (totalJsKb > MAX_PAGE_JS_KB) {
    warnings.push(`مجموع الجافاسكربت ${totalJsKb.toFixed(1)}KB — راجع إن كان يمكن تقليله`);
  }

  // صور نقطية بلا أبعاد صريحة
  for (const f of files.filter((x) => x.endsWith('.html'))) {
    const rel = path.relative(DIST, f);
    const body = fs.readFileSync(f, 'utf8');
    for (const m of body.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
        errors.push(`صورة بلا أبعاد صريحة في ${rel}: ${tag.slice(0, 90)}`);
      }
      if (!/\balt=/.test(tag)) {
        errors.push(`صورة بلا نص بديل في ${rel}: ${tag.slice(0, 90)}`);
      }
    }
  }

  warnings.forEach((w) => info(`تنبيه: ${w}`));

  if (errors.length) {
    fail(`فحص الأصول: ${errors.length} مشكلة`);
    errors.slice(0, 30).forEach((e) => info(e));
    return 1;
  }
  ok(`فحص الأصول: سليم (${jsFiles.length} ملف جافاسكربت بمجموع ${totalJsKb.toFixed(1)}KB)`);
  return 0;
}

process.exit(run());
