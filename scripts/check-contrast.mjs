/**
 * حساب التباين برمجيا لكل تركيبة لون معتمدة في نظام التصميم.
 * المرجع: WCAG 2.2 — نسبة 4.5:1 للنص العادي و3:1 للنص الكبير.
 * نشترط 7:1 لمتن الدروس لأنه نص طويل يُقرأ على شاشة هاتف.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ok, fail, info } from './config.mjs';

const TOKENS = path.join(new URL('../', import.meta.url).pathname, 'src/styles/tokens.css');

function readTokens() {
  const css = fs.readFileSync(TOKENS, 'utf8');
  const map = {};
  for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) map[m[1]] = m[2];
  return map;
}

function hex2rgb(h) {
  const s = h.replace('#', '');
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}

function lum(hex) {
  const [r, g, b] = hex2rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const T = readTokens();

/** كل تركيبة مستخدمة فعلا في الموقع: [نص, خلفية, الحد الأدنى, الوصف] */
const PAIRS = [
  ['ink', 'paper', 7, 'متن الدروس على الخلفية العامة'],
  ['ink', 'paper-2', 7, 'متن على السطح الثاني'],
  ['ink-soft', 'paper', 4.5, 'نص ثانوي'],
  ['ink-mute', 'paper', 4.5, 'تسميات صغيرة'],
  ['ink-invert', 'ink', 7, 'نص على البطاقة الداكنة'],
  ['acc', 'paper', 4.5, 'لون الإبراز على الخلفية'],
  ['acc-deep', 'paper', 4.5, 'الروابط'],
];

for (const n of [1, 2, 3, 4, 5, 6, 7]) {
  PAIRS.push([`s${n}-ink`, `s${n}-bg`, 4.5, `عنوان المرحلة ${n} على خلفيتها`]);
  PAIRS.push(['ink', `s${n}-bg`, 7, `متن على خلفية المرحلة ${n}`]);
  PAIRS.push(['ink-soft', `s${n}-bg`, 4.5, `نص ثانوي على خلفية المرحلة ${n}`]);
  PAIRS.push(['ink-mute', `s${n}-bg`, 4.5, `تسمية صغيرة على خلفية المرحلة ${n}`]);
}

const CARD_PAIRS = [
  ['gold', 'c-example', 4.5, 'رأس بطاقة المثال'],
  ['sage', 'c-apply', 4.5, 'رأس بطاقة التطبيق'],
  ['rose', 'c-warn', 4.5, 'رأس بطاقة التنبيه'],
  ['violet', 'c-prompt', 4.5, 'رأس بطاقة البرومبت'],
  ['blue', 'c-note', 4.5, 'رأس ملاحظة الخبير'],
  ['teal', 'c-compare', 4.5, 'رأس المقارنة'],
  ['ink', 'c-example', 7, 'متن داخل بطاقة المثال'],
  ['ink', 'c-apply', 7, 'متن داخل بطاقة التطبيق'],
  ['ink', 'c-warn', 7, 'متن داخل بطاقة التنبيه'],
  ['ink', 'c-prompt', 7, 'متن داخل بطاقة البرومبت'],
  ['ink', 'c-check', 7, 'متن داخل قائمة الفحص'],
  ['ok', 'ok-bg', 4.5, 'حالة النجاح'],
];

const all = [...PAIRS, ...CARD_PAIRS];
const errors = [];
const table = [];

for (const [fg, bg, min, desc] of all) {
  const a = T[fg];
  const b = T[bg];
  if (!a || !b) {
    errors.push(`رمز غير موجود: --${fg} أو --${bg}`);
    continue;
  }
  const r = ratio(a, b);
  table.push({ desc, fg: `--${fg}`, bg: `--${bg}`, ratio: Number(r.toFixed(2)), min });
  if (r < min) errors.push(`${desc}: --${fg} على --${bg} = ${r.toFixed(2)}:1 (المطلوب ${min}:1)`);
}

// الخلفية العامة ليست بيضاء خالصة
if (T.paper?.toUpperCase() === '#FFFFFF') errors.push('الخلفية العامة بيضاء خالصة');
if (lum(T.paper) < 0.6) errors.push('الخلفية العامة داكنة أكثر من اللازم');

fs.writeFileSync(
  path.join(process.cwd(), 'qa-contrast.json'),
  JSON.stringify(table.sort((x, y) => x.ratio - y.ratio), null, 2),
);

if (errors.length) {
  fail(`فحص التباين: ${errors.length} تركيبة تحت الحد`);
  errors.forEach((e) => info(e));
  process.exit(1);
}
const worst = table.reduce((a, b) => (a.ratio < b.ratio ? a : b));
ok(`فحص التباين: ${table.length} تركيبة تمر — أضعفها ${worst.ratio}:1 (${worst.desc})`);
process.exit(0);
