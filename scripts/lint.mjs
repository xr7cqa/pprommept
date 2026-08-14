/**
 * فحص لغوي وتحريري آلي — مساعد لا بديل عن مراجعة بشرية.
 * يفحص مصادر المحتوى والصفحات، ثم يفحص النسخة المبنية إن وُجدت.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ok, fail, info } from './config.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

/** عبارات ممنوعة نهائيا في متن الكورس */
const BANNED = [
  'لا شك أن',
  'مما لا شك فيه',
  'تجدر الإشارة',
  'من الجدير بالذكر',
  'حجر الزاوية',
  'نقلة نوعية',
  'ثورة حقيقية',
  'استعد لرحلة',
  'دعنا نغوص',
  'أطلق العنان',
  'الوصفة السحرية',
  'في عالمنا الرقمي',
  'في الختام',
  'خلاصة القول',
  'أهلا بك في عالم',
  'يسعدنا انضمامك',
  'الخوارزمية تحب',
  'الخوارزمية تكره',
  'نتيجة مضمونة',
  'بشري 100%',
  'دخل مضمون',
  'شهادة معتمدة',
  'بدون مجهود',
];

/** كلمات ممنوعة عن الجمهور */
const BANNED_AUDIENCE = ['فقير', 'فقراء', 'دول فقيرة', 'ما عندهم فلوس', 'لا يملكون المال'];

/** علامة تسمح بذكر عبارة ممنوعة في سياق تعليم تجنبها */
const ALLOW_MARK = 'lint-allow';

const ARABIC_INDIC = /[٠-٩۰-۹]/;

function walk(dir, out = [], filter = () => true) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out, filter);
    else if (filter(full)) out.push(full);
  }
  return out;
}

function lineOf(body, index) {
  return body.slice(0, index).split('\n').length;
}

function run() {
  const errors = [];
  const warnings = [];

  const sourceFiles = walk(SRC, [], (f) => /\.(mdx|md|astro|ts)$/.test(f));

  for (const f of sourceFiles) {
    const rel = path.relative(ROOT, f);
    const body = fs.readFileSync(f, 'utf8');

    // العبارة الممنوعة قد تُذكر عمدا لتعليم تجنبها؛ السطر الذي يحمل العلامة يُستثنى
    const lines = body.split('\n');
    const scan = (list, label) => {
      lines.forEach((line, i) => {
        if (line.includes(ALLOW_MARK)) return;
        for (const phrase of list) {
          if (line.includes(phrase)) errors.push(`${rel}:${i + 1} ${label} «${phrase}»`);
        }
      });
    };
    scan(BANNED, 'عبارة ممنوعة');
    scan(BANNED_AUDIENCE, 'وصف ممنوع للجمهور');

    const ai = body.match(ARABIC_INDIC);
    if (ai) {
      const at = body.indexOf(ai[0]);
      errors.push(`${rel}:${lineOf(body, at)} رقم عربي هندي «${ai[0]}» — الأرقام اللاتينية فقط`);
    }

    // إيموجي داخل محتوى الكورس
    if (/\.(mdx|md)$/.test(f)) {
      const emoji = body.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      if (emoji) {
        const at = body.indexOf(emoji[0]);
        errors.push(`${rel}:${lineOf(body, at)} إيموجي داخل متن الكورس`);
      }
    }

    // عناوين markdown تنتهي بنقطة
    for (const m of body.matchAll(/^#{1,4}\s+(.+?)\s*$/gm)) {
      if (/[.。]$/.test(m[1])) {
        errors.push(`${path.relative(ROOT, f)}:${lineOf(body, m.index)} عنوان ينتهي بنقطة: ${m[1]}`);
      }
    }

    // عناصر قوائم قصيرة تنتهي بنقطة
    for (const m of body.matchAll(/^[-*]\s+(.{1,80}?)\.\s*$/gm)) {
      warnings.push(`${path.relative(ROOT, f)}:${lineOf(body, m.index)} عنصر قائمة ينتهي بنقطة: ${m[1].slice(0, 40)}`);
    }

    // جملة طويلة جدا داخل المحتوى
    if (/\.mdx$/.test(f)) {
      const text = body.replace(/^---[\s\S]*?---/m, '').replace(/<[^>]*>/g, ' ');
      for (const sentence of text.split(/[.،؟!\n]/)) {
        const words = sentence.trim().split(/\s+/).filter(Boolean);
        if (words.length > 45) {
          warnings.push(`${path.relative(ROOT, f)} جملة من ${words.length} كلمة — اقسمها`);
          break;
        }
      }
    }
  }

  // فحص النسخة المبنية: أرقام عربية هندية داخل الواجهة
  if (fs.existsSync(DIST)) {
    for (const f of walk(DIST, [], (x) => x.endsWith('.html'))) {
      const body = fs.readFileSync(f, 'utf8');
      const m = body.match(ARABIC_INDIC);
      if (m) errors.push(`dist/${path.relative(DIST, f)} رقم عربي هندي في الواجهة «${m[0]}»`);
    }
  }

  warnings.slice(0, 20).forEach((w) => info(`تنبيه: ${w}`));
  if (warnings.length > 20) info(`… و${warnings.length - 20} تنبيها آخر`);

  if (errors.length) {
    fail(`الفحص اللغوي: ${errors.length} مخالفة`);
    errors.slice(0, 40).forEach((e) => info(e));
    return 1;
  }
  ok(`الفحص اللغوي: نظيف (${sourceFiles.length} ملفا، ${warnings.length} تنبيها غير حاجب)`);
  return 0;
}

process.exit(run());
