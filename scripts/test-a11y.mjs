/**
 * اختبارات الوصول عبر axe على الصفحات التمثيلية، بالإضافة إلى فحوص يدوية
 * لا يغطيها axe مثل بنية العناوين وأسماء الأزرار وحجم النص الأدنى.
 */
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { withServer } from './serve.mjs';
import { SITE, CHROME, SAMPLE_PAGES, VIEWPORTS, ok, fail, info } from './config.mjs';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const violations = [];
  const manual = [];

  for (const p of SAMPLE_PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(SITE + p.path, { waitUntil: 'networkidle0' });

    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .disableRules(['region']) // الهيكل يعتمد main وheader وfooter، والقاعدة تعطي إنذارات على المحتوى النصي المباشر
      .analyze();

    for (const v of results.violations) {
      if (v.impact === 'minor') continue;
      violations.push(
        `${p.name}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} عنصرا)\n      ${v.nodes[0]?.html?.slice(0, 140) ?? ''}`,
      );
    }

    // بنية العناوين: لا قفز بأكثر من مستوى، وh1 واحد
    const heads = await page.$$eval('h1,h2,h3,h4', (els) =>
      els.map((e) => ({ n: Number(e.tagName[1]), t: e.textContent.trim().slice(0, 40) })),
    );
    const h1s = heads.filter((h) => h.n === 1).length;
    if (h1s !== 1) manual.push(`${p.name}: عدد عناوين h1 = ${h1s}`);
    for (let i = 1; i < heads.length; i += 1) {
      if (heads[i].n - heads[i - 1].n > 1) {
        manual.push(`${p.name}: قفز في مستويات العناوين قبل «${heads[i].t}»`);
      }
    }

    // لا نص أساسي تحت 16px
    const tiny = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('p, li, td, dd').forEach((el) => {
        if (!el.textContent.trim()) return;
        const s = getComputedStyle(el);
        const px = parseFloat(s.fontSize);
        if (px < 15.5 && el.textContent.trim().length > 60) {
          out.push(`${px}px — ${el.textContent.trim().slice(0, 40)}`);
        }
      });
      return out.slice(0, 3);
    });
    tiny.forEach((t) => manual.push(`${p.name}: نص صغير ${t}`));

    // كل زر وكل رابط له اسم يمكن نطقه
    const unnamed = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, a'))
        .filter((el) => el.offsetParent !== null)
        .filter((el) => {
          const t = (el.textContent || '').trim();
          return !t && !el.getAttribute('aria-label') && !el.querySelector('[aria-label], title');
        })
        .map((el) => el.outerHTML.slice(0, 90))
        .slice(0, 3),
    );
    unnamed.forEach((u) => manual.push(`${p.name}: عنصر تفاعلي بلا اسم — ${u}`));

    await page.close();
  }

  // إعادة تدفق المحتوى عند التكبير 200%
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(SITE + 'course/01-empty-order/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 2) manual.push(`تكبير النص 200% يسبب تمريرا أفقيا ${overflow}px`);
  await page.close();

  await browser.close();

  if (violations.length) {
    fail(`اختبارات الوصول: ${violations.length} مخالفة axe`);
    violations.slice(0, 25).forEach((v) => info(v));
  } else {
    ok(`اختبارات الوصول: لا مخالفات axe على ${SAMPLE_PAGES.length} صفحات`);
  }

  if (manual.length) {
    fail(`فحوص الوصول اليدوية: ${manual.length} ملاحظة`);
    manual.slice(0, 25).forEach((m) => info(m));
  } else {
    ok('فحوص الوصول اليدوية: بنية العناوين وأسماء الأزرار وحجم النص سليمة');
  }

  return violations.length + manual.length > 0 ? 1 : 0;
}

const code = await withServer(main);
process.exit(code);
