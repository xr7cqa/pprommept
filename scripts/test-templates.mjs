import puppeteer from 'puppeteer';
import { SITE, CHROME, ok, fail, info } from './config.mjs';

const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844 });
let bad = 0;
p.on('pageerror', (e) => { fail('خطأ جافاسكربت: ' + e.message); bad++; });

const url = SITE + 'toolkit/positioning/';
await p.goto(url, { waitUntil: 'networkidle0' });

// 1) الحقول موجودة والأدوات ظاهرة
const n = await p.$$eval('[data-field]', (e) => e.length);
n >= 5 ? ok(`الحقول ظاهرة (${n})`) : (fail(`حقول ناقصة: ${n}`), bad++);

const toolsVisible = await p.$eval('[data-copy-fields]', (e) => getComputedStyle(e).display !== 'none');
toolsVisible ? ok('شريط الأدوات ظاهر') : (fail('شريط الأدوات مخفي'), bad++);

// 2) الكتابة تُحفظ
await p.type('[data-field="who"]', 'من يبيع منتجات مصنوعة يدويا');
await new Promise((r) => setTimeout(r, 900));
const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('pa.course') || '{}'));
stored?.fields?.['positioning:who'] === 'من يبيع منتجات مصنوعة يدويا'
  ? ok('الحفظ التلقائي يعمل')
  : (fail('لم يُحفظ الحقل: ' + JSON.stringify(stored?.fields)), bad++);

stored?.v === 3 ? ok('إصدار التخزين 3') : (fail('إصدار خاطئ: ' + stored?.v), bad++);
stored?.apps?.positioning ? ok('الكتابة علّمت القالب كمبدوء') : (fail('لم يُعلَّم كمبدوء'), bad++);

// 3) القيمة ترجع بعد إعادة التحميل
await p.reload({ waitUntil: 'networkidle0' });
const back = await p.$eval('[data-field="who"]', (e) => e.value);
back === 'من يبيع منتجات مصنوعة يدويا' ? ok('القيمة ترجع بعد إعادة التحميل') : (fail('لم ترجع: ' + back), bad++);

// 4) المسح يطلب تأكيدا ولا يمسح قبله
await p.click('[data-clear-fields]');
const confirmShown = await p.$eval('[data-confirm-clear]', (e) => !e.hasAttribute('hidden'));
confirmShown ? ok('المسح يطلب تأكيدا') : (fail('لا يوجد تأكيد'), bad++);
const stillThere = await p.$eval('[data-field="who"]', (e) => e.value);
stillThere !== '' ? ok('لا يمسح قبل التأكيد') : (fail('مسح قبل التأكيد'), bad++);

await p.click('[data-clear-no]');
const afterNo = await p.$eval('[data-field="who"]', (e) => e.value);
afterNo !== '' ? ok('التراجع يحفظ المكتوب') : (fail('التراجع مسح'), bad++);

// 5) التأكيد يمسح هذا القالب وحده ولا يمس بقية التقدم
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pa.course'));
  s.done = { '01-empty-order': 111 };
  localStorage.setItem('pa.course', JSON.stringify(s));
});
await p.click('[data-clear-fields]');
await p.click('[data-clear-yes]');
await new Promise((r) => setTimeout(r, 200));
const after = await p.evaluate(() => JSON.parse(localStorage.getItem('pa.course')));
!after.fields['positioning:who'] ? ok('التأكيد يمسح الحقل') : (fail('لم يُمسح'), bad++);
after.done['01-empty-order'] ? ok('بقية التقدم لم تتأثر') : (fail('مُسح تقدم آخر'), bad++);

// 6) ترقية من الإصدار 2 تحفظ البيانات
await p.evaluate(() => {
  localStorage.setItem('pa.course', JSON.stringify({ v: 2, done: { 'x-lesson': 5 }, saved: {}, favPrompts: {}, checks: {}, apps: {}, pos: {}, last: null }));
});
await p.reload({ waitUntil: 'networkidle0' });
// القراءة وحدها لا تكتب في التخزين، فالترقية تُفحص بعد أول كتابة
await p.type('[data-field="who"]', 'اختبار');
await new Promise((r) => setTimeout(r, 900));
const up2 = await p.evaluate(() => JSON.parse(localStorage.getItem('pa.course')));
up2.v === 3 && up2.done['x-lesson'] === 5
  ? ok('الترقية من الإصدار 2 حفظت التقدم القديم')
  : (fail('الترقية أفقدت بيانات: ' + JSON.stringify(up2.done)), bad++);

await b.close();
console.log(bad === 0 ? '\nكل فحوص القوالب نجحت' : `\n${bad} إخفاقا`);
process.exit(bad ? 1 : 0);
