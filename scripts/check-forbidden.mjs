/**
 * فحص الملفات والكلمات الممنوعة داخل النسخة المنشورة.
 * الغرض منع تسرب أي مادة داخلية أو تسويقية من المستودع الخاص إلى موقع المشتري.
 * الفشل هنا يوقف البناء، ولا يكتفي بتحذير.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, ok, fail, info } from './config.mjs';

/** مجلدات وملفات ممنوعة تماما داخل dist */
const FORBIDDEN_PATHS = [
  /(^|\/)marketing(\/|$)/i,
  /(^|\/)owner(\/|$)/i,
  /(^|\/)research(\/|$)/i,
  /(^|\/)sources?(\/|$)/i,
  /(^|\/)claims?(\/|$)/i,
  /(^|\/)pricing(\/|$)/i,
  /(^|\/)internal(\/|$)/i,
  /(^|\/)previews?(\/|$)/i,
  /SOURCES\.md$/i,
  /CLAIMS\.md$/i,
  /DECISIONS\.md$/i,
  /BRIEF\.md$/i,
  /NEEDS_HUMAN_REVIEW\.md$/i,
  /REQUIREMENTS\.json$/i,
  /TASKS\.json$/i,
  /RESUME\.md$/i,
  /\.env(\.|$)/i,
  /\.pem$/i,
  /id_rsa/i,
];

/** عبارات لا يجوز أن تظهر للمشتري داخل صفحات الموقع */
const FORBIDDEN_TEXT = [
  { re: /\bmarketing\b/i, why: 'إشارة إلى مواد التسويق' },
  { re: /خطة\s*(البيع|التسويق)/, why: 'خطة بيع أو تسويق' },
  { re: /صفحة\s*(البيع|الشراء)/, why: 'صفحة بيع' },
  { re: /(اشتر|اشترِ)\s*الآن/, why: 'دعوة شراء' },
  { re: /سعر\s*(الكورس|الحزمة|الدورة)/, why: 'سعر معروض' },
  { re: /\b(ريال|جنيه|درهم|دينار)\b/, why: 'عملة — مؤشر تسعير' },
  { re: /\bSAR\b|\bEGP\b|\bUSD\b/, why: 'رمز عملة' },
  { re: /خصم\s*(خاص|لفترة|محدود|على\s*الكورس|على\s*الحزمة)/, why: 'عرض خصم على المنتج' },
  { re: /كوبون|كود\s*خصم/, why: 'كوبون خصم' },
  { re: /عرض\s*محدود/, why: 'ندرة تسويقية' },
  { re: /بوابة\s*دفع|وسيلة\s*دفع|وسائل\s*الدفع/, why: 'وسيلة دفع' },
  { re: /\bPayPal\b|\bStripe\b|\bPaymob\b|\bFawry\b/i, why: 'مزود دفع' },
  { re: /عدد\s*المشتركين\s*[:：]?\s*\d{3,}/, why: 'إحصاء جمهور' },
  { re: /\bAI_News_AR\b/, why: 'حساب داخلي للمالك' },
  { re: /المصدر\s*[:：]/, why: 'إحالة إلى مصدر — ممنوعة في ملفات المشتري' },
  { re: /قائمة\s*المصادر|قائمة\s*المراجع/, why: 'قائمة مصادر' },
  { re: /github\.com|githubusercontent/i, why: 'رابط مستودع' },
  { re: /\{\{رابط_[^}]*\}\}/, why: 'متغير نائب لم يُستبدل' },
  { re: /\bTODO\b|\bFIXME\b/, why: 'أثر عمل داخلي' },
  { re: /(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]/i, why: 'مفتاح أو سر' },
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function run() {
  if (!fs.existsSync(DIST)) {
    fail('مجلد dist غير موجود — شغّل البناء أولا');
    return 1;
  }
  const files = walk(DIST);
  const errors = [];

  for (const f of files) {
    const rel = path.relative(DIST, f);
    for (const re of FORBIDDEN_PATHS) {
      if (re.test(rel)) errors.push(`ملف ممنوع في dist: ${rel} (${re})`);
    }
  }

  const textFiles = files.filter((f) => /\.(html|json|txt|js|css|svg)$/i.test(f));
  for (const f of textFiles) {
    const rel = path.relative(DIST, f);
    const body = fs.readFileSync(f, 'utf8');
    for (const { re, why } of FORBIDDEN_TEXT) {
      const m = body.match(re);
      if (m) {
        const at = body.indexOf(m[0]);
        const around = body.slice(Math.max(0, at - 60), at + 80).replace(/\s+/g, ' ');
        errors.push(`عبارة ممنوعة (${why}) في ${rel}: «${m[0]}» ← …${around}…`);
      }
    }
  }

  if (errors.length) {
    fail(`فحص الملفات الممنوعة: ${errors.length} مخالفة`);
    errors.forEach((e) => info(e));
    return 1;
  }
  ok(`فحص الملفات الممنوعة: نظيف (${files.length} ملفا)`);
  return 0;
}

process.exit(run());
