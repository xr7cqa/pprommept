/**
 * npm run qa — كل فحوص الجودة بأمر واحد على النسخة المبنية الحقيقية.
 * ترتيب الخطوات مقصود: ما يفشل سريعا يُفحص أولا.
 */
import { spawnSync } from 'node:child_process';
import { ok, fail, info } from './config.mjs';

const STEPS = [
  ['فحص الأنواع', 'npm', ['run', 'typecheck']],
  ['الفحص اللغوي', 'node', ['scripts/lint.mjs']],
  ['فحص التباين', 'node', ['scripts/check-contrast.mjs']],
  ['بناء الإنتاج', 'npm', ['run', 'build']],
  ['فحص الملفات الممنوعة', 'node', ['scripts/check-forbidden.mjs']],
  ['فحص الروابط الداخلية', 'node', ['scripts/check-links.mjs']],
  ['فحص الروابط الخارجية', 'node', ['scripts/check-external.mjs']],
  ['فحص مكتبة البرومبتات', 'node', ['scripts/check-prompts.mjs']],
  ['فحص الأصول', 'node', ['scripts/check-assets.mjs']],
  ['اختبارات الواجهة', 'node', ['scripts/test-ui.mjs']],
  ['اختبارات القوالب التفاعلية', 'node', ['scripts/test-templates.mjs']],
  ['اختبار المقدمة', 'node', ['scripts/test-intro.mjs']],
  ['اختبارات الوصول', 'node', ['scripts/test-a11y.mjs']],
];

const SKIP_HEAVY = process.env.QA_SKIP_HEAVY === '1';
if (!SKIP_HEAVY) {
  STEPS.push(['Lighthouse', 'node', ['scripts/lighthouse.mjs']]);
  STEPS.push(['التقاط المعاينات', 'node', ['scripts/screenshots.mjs']]);
}

let failed = 0;
const summary = [];

for (const [name, cmd, args] of STEPS) {
  console.log(`\n\x1b[1m▸ ${name}\x1b[0m`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  const good = r.status === 0;
  if (!good) failed += 1;
  summary.push([good, name]);
}

console.log('\n\x1b[1m── الخلاصة ──\x1b[0m');
for (const [good, name] of summary) (good ? ok : fail)(name);

if (failed) {
  fail(`${failed} خطوة فاشلة من ${summary.length}`);
  process.exit(1);
}
ok(`كل الخطوات نجحت (${summary.length})`);
info('نجاح الأوامر لا يغني عن النظر في المعاينات داخل qa-shots');
