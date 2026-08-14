/**
 * Lighthouse على الصفحات التمثيلية.
 * ملاحظة مقصودة: لا نستخدم Lighthouse لقياس INP لأنه لا يقيسه.
 * نقيس TBT مؤشرا مختبريا، ونترك INP لبيانات الاستخدام الفعلي.
 */
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import fs from 'node:fs';
import path from 'node:path';
import { withServer } from './serve.mjs';
import { SITE, CHROME, ok, fail, info } from './config.mjs';

const PAGES = [
  { path: '', name: 'home' },
  { path: 'course/01-empty-order/', name: 'lesson' },
  { path: 'dashboard/', name: 'dashboard' },
  { path: 'prompts/', name: 'prompts' },
];

const MIN = { performance: 90, accessibility: 95, 'best-practices': 95 };
const OUT = process.env.LH_DIR ?? path.join(process.cwd(), 'qa-lighthouse');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=9222'],
  });

  const wsUrl = new URL(browser.wsEndpoint());
  const port = Number(wsUrl.port);
  const rows = [];
  let bad = 0;

  for (const p of PAGES) {
    const result = await lighthouse(
      SITE + p.path,
      {
        port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
        formFactor: 'mobile',
      },
    );

    const lhr = result.lhr;
    const scores = Object.fromEntries(
      Object.entries(lhr.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]),
    );
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? 0;
    const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? 0;
    const tbt = lhr.audits['total-blocking-time']?.numericValue ?? 0;

    const row = {
      page: p.name,
      ...scores,
      lcpMs: Math.round(lcp),
      cls: Number(cls.toFixed(3)),
      tbtMs: Math.round(tbt),
    };
    rows.push(row);

    const problems = [];
    for (const [k, min] of Object.entries(MIN)) {
      if ((scores[k] ?? 0) < min) problems.push(`${k} ${scores[k]} < ${min}`);
    }
    if (lcp > 2500) problems.push(`LCP ${Math.round(lcp)}ms > 2500ms`);
    if (cls > 0.1) problems.push(`CLS ${cls.toFixed(3)} > 0.1`);

    if (problems.length) {
      bad += 1;
      fail(`${p.name}: ${problems.join(' · ')}`);
    } else {
      ok(
        `${p.name}: أداء ${scores.performance} · وصول ${scores.accessibility} · ممارسات ${scores['best-practices']} · LCP ${Math.round(lcp)}ms · CLS ${cls.toFixed(3)} · TBT ${Math.round(tbt)}ms`,
      );
    }

    fs.writeFileSync(path.join(OUT, `${p.name}.json`), JSON.stringify(lhr, null, 1));
  }

  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(rows, null, 2));
  await browser.close();

  info(`تقارير Lighthouse في ${OUT}`);
  return bad > 0 ? 1 : 0;
}

const code = await withServer(main);
process.exit(code);
