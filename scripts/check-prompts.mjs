/**
 * فحص مكتبة البرومبتات.
 * الغرض منع أن تكون البرومبتات نصا عاما مبدلا فيه اسم المنصة.
 * الفشل هنا يوقف البناء.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ok, fail, info } from './config.mjs';

const DIR = path.join(process.cwd(), 'src/content/prompts');

/** أقل عدد برومبت في المكتبة */
const MIN_TOTAL = 90;
/** أقل عدد تصنيف مهمة لكل منصة */
const MIN_TASKS_PER_PLATFORM = 10;
/** أعلى تشابه مقبول بين متن برومبتين */
const MAX_SIMILARITY = 0.72;

const platforms = ['TikTok', 'Instagram', 'YouTube', 'X', 'LinkedIn', 'Facebook', 'Snapchat', 'Telegram', 'WhatsApp Channels'];

function parse(file) {
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) meta[mm[1]] = mm[2].replace(/^["']|["']$/g, '').trim();
  }
  return { file, meta, body: m[2] };
}

/** مجموعة الكلمات الدالة في المتن، بعد حذف المتغيرات وعلامات الترقيم */
function tokens(body) {
  const s = body
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase();
  return new Set((s.match(/\S+/g) || []).filter((w) => w.length > 2));
}

function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function run() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
  const items = files.map(parse).filter(Boolean);
  const errors = [];

  if (items.length < MIN_TOTAL) {
    errors.push(`عدد البرومبتات ${items.length} وهو دون الحد ${MIN_TOTAL}`);
  }

  // تغطية التصنيفات لكل منصة
  for (const p of platforms) {
    const tasks = new Set(items.filter((i) => i.meta.platform === p).map((i) => i.meta.task));
    if (tasks.size < MIN_TASKS_PER_PLATFORM) {
      errors.push(`${p}: ${tasks.size} تصنيفا فقط، والحد ${MIN_TASKS_PER_PLATFORM}`);
    }
  }

  // التشابه بين المتون
  const toks = items.map((i) => ({ file: i.file, t: tokens(i.body), platform: i.meta.platform }));
  for (let a = 0; a < toks.length; a += 1) {
    for (let b = a + 1; b < toks.length; b += 1) {
      const sim = jaccard(toks[a].t, toks[b].t);
      if (sim > MAX_SIMILARITY) {
        errors.push(
          `تشابه ${(sim * 100).toFixed(0)}٪ بين ${toks[a].file} و${toks[b].file} — أعد كتابة أحدهما بمنطق منصته`,
        );
      }
    }
  }

  // كل برومبت منصة يجب أن يذكر شيئا خاصا بمنصته
  for (const i of items) {
    if (i.meta.platform === 'عام') continue;
    if (!i.body.includes('{{')) errors.push(`${i.file}: لا يحتوي أي متغير`);
    if (i.body.trim().length < 200) errors.push(`${i.file}: متن قصير جدا`);
  }

  if (errors.length) {
    fail(`فحص البرومبتات: ${errors.length} مخالفة`);
    errors.slice(0, 25).forEach((e) => info(e));
    if (errors.length > 25) info(`… و${errors.length - 25} أخرى`);
    return 1;
  }

  const tasks = new Set(items.map((i) => i.meta.task));
  ok(`فحص البرومبتات: ${items.length} برومبتا · ${tasks.size} تصنيفا · لا تشابه فوق ${MAX_SIMILARITY * 100}٪`);
  return 0;
}

process.exit(run());
