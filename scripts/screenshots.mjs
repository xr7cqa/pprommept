/**
 * التقاط معاينات فعلية لكل شاشة أساسية على الهاتف وسطح المكتب،
 * لأن نجاح البناء ليس دليلا على نجاح التصميم.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { withServer } from './serve.mjs';
import { SITE, CHROME, SAMPLE_PAGES, ok, info } from './config.mjs';

const OUT = process.env.SHOTS_DIR ?? path.join(process.cwd(), 'qa-shots');
const SETS = [
  { name: 'mobile-390', width: 390, height: 844, full: true },
  { name: 'mobile-360', width: 360, height: 800, full: false },
  { name: 'desktop-1280', width: 1280, height: 900, full: true },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });

  let n = 0;
  for (const set of SETS) {
    const dir = path.join(OUT, set.name);
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage();
    await page.setViewport({ width: set.width, height: set.height, deviceScaleFactor: 2 });

    for (const p of SAMPLE_PAGES) {
      await page.goto(SITE + p.path, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, 120));
      await page.screenshot({
        path: path.join(dir, `${p.name}.png`),
        fullPage: set.full,
      });
      n += 1;
    }
    await page.close();
  }

  await browser.close();
  ok(`التقاط المعاينات: ${n} صورة في ${OUT}`);
  info(`راجعها يدويا قبل اعتماد أي تغيير في التصميم`);
  return 0;
}

const code = await withServer(main);
process.exit(code);
