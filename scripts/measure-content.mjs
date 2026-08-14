/**
 * قياس حجم المحتوى كما يقرؤه الطالب فعلا.
 * يقرأ من dist لا من المصدر، لأن المصدر فيه بنية JSX تفسد أي تقدير.
 * يستخرج نص المقال وحده، بلا ترويسة ولا تذييل ولا تنقل ولا فهرس.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, ok, info } from './config.mjs';

/** يزيل ما ليس نص قراءة ثم يحوّل الوسوم إلى فراغات */
function articleWords(html) {
  const m = html.match(/<article[\s\S]*?<\/article>/i);
  let s = m ? m[0] : html;
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
  return (s.trim().match(/[^\s]+/g) || []).length;
}

/** متوسط سرعة القراءة العربية المعتمدة في تقدير المدة */
const WPM = 190;

function collect(sub) {
  const dir = path.join(DIST, sub);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const f = path.join(dir, e.name, 'index.html');
    if (!fs.existsSync(f)) continue;
    out.push({ id: e.name, w: articleWords(fs.readFileSync(f, 'utf8')) });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

const groups = {
  الدروس: collect('course'),
  المنصات: collect('platforms'),
  البرومبتات: collect('prompts'),
  القوالب: collect('toolkit'),
  الحالات: collect('cases'),
};

let grand = 0;
const rows = [];
for (const [name, items] of Object.entries(groups)) {
  if (!items.length) continue;
  const tot = items.reduce((a, r) => a + r.w, 0);
  grand += tot;
  const ws = items.map((r) => r.w);
  rows.push({
    name,
    n: items.length,
    tot,
    avg: Math.round(tot / items.length),
    min: Math.min(...ws),
    max: Math.max(...ws),
  });
}

console.log('\nقياس المحتوى من الناتج المبني\n');
console.log('المجموعة        عدد   إجمالي  متوسط  أدنى  أعلى');
for (const r of rows) {
  console.log(
    `${r.name.padEnd(14)}${String(r.n).padStart(4)}${String(r.tot).padStart(9)}${String(r.avg).padStart(7)}${String(r.min).padStart(6)}${String(r.max).padStart(6)}`,
  );
}
console.log(`\nالإجمالي: ${grand} كلمة`);

// مطابقة المدة المعلنة لزمن القراءة الفعلي في الدروس
const src = path.join(process.cwd(), 'src/content/course');
const mismatched = [];
for (const r of groups.الدروس) {
  const f = path.join(src, `${r.id}.mdx`);
  if (!fs.existsSync(f)) continue;
  const mm = fs.readFileSync(f, 'utf8').match(/^minutes:\s*(\d+)/m);
  if (!mm) continue;
  const declared = Number(mm[1]);
  const actual = r.w / WPM;
  // تسامح: المدة المعلنة تشمل التطبيق لا القراءة وحدها، فيُقبل ضعف زمن القراءة
  if (declared > actual * 2.2) {
    mismatched.push({ id: r.id, declared, actual: actual.toFixed(1), w: r.w });
  }
}

if (mismatched.length) {
  console.log(`\nدروس مدتها المعلنة أعلى بكثير من زمن قراءتها (${mismatched.length}):`);
  for (const m of mismatched) {
    info(`${m.id}: معلن ${m.declared} دقائق · قراءة ${m.actual} دقيقة · ${m.w} كلمة`);
  }
} else {
  ok('المدة المعلنة متسقة مع زمن القراءة في كل الدروس');
}

process.exit(0);
