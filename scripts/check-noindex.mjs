/**
 * فحص المراجعة الختامية على النسخة المبنية:
 *
 *  1. كل صفحة HTML تحمل noindex و nofollow — الموقع كورس مدفوع بلا تسجيل دخول،
 *     ولا يُراد إدراجه في محركات البحث. هذا منع فهرسة لا حماية للرابط.
 *  2. robots.txt موجود ويمنع الزحف إلى الموقع كله.
 *  3. لا تظهر تسمية «دراسة حالة» في أي صفحة يراها الطالب — الاسم المعتمد
 *     «تفكيك تطبيقي»، والتسمية القديمة توحي بحالات موثقة لأشخاص أو مشاريع حقيقية.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, ok, fail, info } from './config.mjs';

/** الصيغ الممنوعة في أي صفحة ظاهرة للطالب */
const FORBIDDEN_LABELS = [/دراس(?:ة|ات)\s+(?:ال)?حالة/];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** يقرأ وسم robots من رأس الصفحة بلا افتراض ترتيب السمات */
function robotsContent(html) {
  const m = html.match(
    /<meta[^>]*\bname=["']robots["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i,
  );
  if (m) return m[1];
  const alt = html.match(
    /<meta[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']robots["'][^>]*>/i,
  );
  return alt ? alt[1] : null;
}

function run() {
  const errors = [];
  const files = walk(DIST).filter((f) => f.endsWith('.html'));

  if (files.length === 0) {
    fail('لا توجد صفحات مبنية — شغّل npm run build أولا');
    return 1;
  }

  let checked = 0;
  for (const f of files) {
    const rel = path.relative(DIST, f);
    const html = fs.readFileSync(f, 'utf8');
    const robots = robotsContent(html);

    if (robots === null) {
      errors.push(`بلا وسم robots: ${rel}`);
    } else {
      const v = robots.toLowerCase();
      if (!v.includes('noindex')) errors.push(`robots بلا noindex (${robots}): ${rel}`);
      if (!v.includes('nofollow')) errors.push(`robots بلا nofollow (${robots}): ${rel}`);
    }

    for (const re of FORBIDDEN_LABELS) {
      const hit = html.match(re);
      if (hit) errors.push(`تسمية قديمة «${hit[0]}» ظاهرة في: ${rel}`);
    }
    checked += 1;
  }

  const robotsFile = path.join(DIST, 'robots.txt');
  if (!fs.existsSync(robotsFile)) {
    errors.push('robots.txt غير موجود في dist');
  } else {
    const txt = fs.readFileSync(robotsFile, 'utf8');
    const hasAgent = /^\s*User-agent:\s*\*\s*$/im.test(txt);
    const hasDisallowAll = /^\s*Disallow:\s*\/\s*$/im.test(txt);
    if (!hasAgent) errors.push('robots.txt بلا سطر User-agent: *');
    if (!hasDisallowAll) errors.push('robots.txt بلا سطر Disallow: /');
  }

  if (errors.length) {
    for (const e of errors.slice(0, 30)) fail(e);
    if (errors.length > 30) info(`و${errors.length - 30} خطأ آخر`);
    fail(`${errors.length} خطأ في فحص الفهرسة والتسمية`);
    return 1;
  }

  ok(`${checked} صفحة تحمل noindex و nofollow`);
  ok('robots.txt يمنع الزحف إلى الموقع كله');
  ok('لا أثر لتسمية «دراسة حالة» في الصفحات المبنية');
  info('robots.txt تحت مسار فرعي لا تقرؤه محركات البحث — وسم robots في كل صفحة هو المانع الفعلي');
  return 0;
}

process.exit(run());
