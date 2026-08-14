import puppeteer from 'puppeteer';
import { withServer } from './serve.mjs';
import { SITE, CHROME, ok, fail } from './config.mjs';

async function main() {
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  let bad = 0;
  const t = (c, m) => (c ? ok(m) : (fail(m), bad++));

  // ── الحالة الأولى: طالب جديد عند 0% ──
  const p = await b.newPage();
  await p.setViewport({ width: 360, height: 800, deviceScaleFactor: 2 });
  await p.goto(SITE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  const s0 = await p.evaluate(() => {
    const btn = document.getElementById('start-btn');
    const card = document.getElementById('entry-card');
    const body = document.body.innerText;
    return {
      label: btn?.textContent?.trim(),
      cardHidden: card ? card.hasAttribute('hidden') : true,
      resume: (body.match(/أكمل من حيث توقفت/g) || []).length,
      start: (body.match(/ابدأ الكورس/g) || []).length,
      buttons: Array.from(document.querySelectorAll('.page-hero a.btn')).map((a) => a.textContent.trim()),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  t(s0.label === 'ابدأ الكورس', `عند 0% الزر: «${s0.label}»`);
  t(s0.cardHidden, 'بطاقة التقدم مخفية للطالب الجديد');
  t(s0.resume === 0, `«أكمل من حيث توقفت» لا تظهر (${s0.resume})`);
  t(s0.start === 1, `«ابدأ الكورس» مرة واحدة فقط (${s0.start})`);
  t(!s0.overflow, 'لا تمرير أفقي عند 360px');
  await p.screenshot({ path: 'qa-shots/intro/360-fresh.png', fullPage: false });

  // ── الحالة الثانية: طالب بدأ الدراسة ──
  const p2 = await b.newPage();
  await p2.setViewport({ width: 360, height: 800, deviceScaleFactor: 2 });
  await p2.goto(SITE, { waitUntil: 'networkidle0' });
  await p2.evaluate(() => localStorage.clear());
  // يفتح الدرس الأول فعلا فيُسجَّل كآخر درس، ثم ينجزه
  await p2.goto(SITE + 'course/01-empty-order/', { waitUntil: 'networkidle0' });
  await p2.click('.lesson-body [data-complete]');
  await p2.waitForFunction(
    () => Object.keys(JSON.parse(localStorage.getItem('pa.course')).done).length === 1,
    { timeout: 3000 },
  );
  await p2.goto(SITE, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  const s1 = await p2.evaluate(() => {
    const btn = document.getElementById('start-btn');
    const card = document.getElementById('entry-card');
    const body = document.body.innerText;
    return {
      label: btn?.textContent?.trim(),
      href: btn?.getAttribute('href'),
      cardHidden: card ? card.hasAttribute('hidden') : true,
      cardBtns: card ? card.querySelectorAll('a,button').length : -1,
      resume: (body.match(/أكمل من حيث توقفت/g) || []).length,
      start: (body.match(/ابدأ الكورس/g) || []).length,
      heroBtns: Array.from(document.querySelectorAll('.page-hero a.btn')).map((a) => a.textContent.trim()),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      pct: document.getElementById('ring-pct')?.textContent,
    };
  });
  t(s1.label === 'أكمل من حيث توقفت', `بعد البدء الزر: «${s1.label}»`);
  t(Boolean(s1.href && s1.href.includes('/course/')), `الزر يشير إلى درس: ${s1.href}`);
  t(!s1.cardHidden, 'بطاقة التقدم ظاهرة بعد البدء');
  t(s1.cardBtns === 0, `بطاقة التقدم بلا أزرار (${s1.cardBtns})`);
  t(s1.resume === 1, `«أكمل من حيث توقفت» مرة واحدة فقط (${s1.resume})`);
  t(s1.start === 0, `«ابدأ الكورس» اختفت (${s1.start})`);
  t(!s1.overflow, 'لا تمرير أفقي عند 360px');
  await p2.screenshot({ path: 'qa-shots/intro/360-started.png', fullPage: false });

  // ── وضوح النص على 360 ──
  const type = await p2.evaluate(() => {
    const h1 = document.querySelector('.page-hero h1');
    const lead = document.querySelector('.page-hero .lead');
    const cs = (el) => getComputedStyle(el);
    const r = (el) => el.getBoundingClientRect();
    return {
      h1Size: parseFloat(cs(h1).fontSize),
      leadSize: parseFloat(cs(lead).fontSize),
      leadLh: parseFloat(cs(lead).lineHeight) / parseFloat(cs(lead).fontSize),
      h1Right: r(h1).right, leadRight: r(lead).right,
      h1Left: r(h1).left, leadLeft: r(lead).left,
      w: window.innerWidth,
    };
  });
  t(type.leadSize >= 16, `حجم نص المقدمة ${type.leadSize}px`);
  t(type.h1Size >= 24, `حجم العنوان ${type.h1Size}px`);
  t(type.leadLh >= 1.5, `ارتفاع السطر ${type.leadLh.toFixed(2)}`);
  t(type.leadLeft >= 0 && type.leadRight <= type.w, 'المقدمة داخل حدود الشاشة');
  t(type.h1Left >= 0 && type.h1Right <= type.w, 'العنوان داخل حدود الشاشة');

  await b.close();
  console.log(bad === 0 ? '\nكل فحوص المقدمة نجحت' : `\n${bad} إخفاقا`);
  return bad ? 1 : 0;
}
process.exit(await withServer(main));
