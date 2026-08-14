/**
 * اختبارات الواجهة على النسخة المبنية الحقيقية تحت المسار الفرعي.
 * تغطي السيناريوهات الإلزامية من فتح الموقع أول مرة إلى صفحة الإتمام.
 */
import puppeteer from 'puppeteer';
import { withServer } from './serve.mjs';
import { SITE, CHROME, ok, fail, info } from './config.mjs';

let pass = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    pass += 1;
    ok(name);
  } catch (err) {
    failures.push(`${name} — ${err.message}`);
    fail(`${name} — ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function newPage(browser, { width = 390, height = 844, js = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setJavaScriptEnabled(js);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const external = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('about:')) {
      external.push(u);
    }
  });
  page.__errors = errors;
  page.__external = external;
  return page;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  // ── 1 · فتح الموقع لأول مرة ──
  await check('1 · فتح الموقع لأول مرة بلا أخطاء ولا طلبات خارجية', async () => {
    const page = await newPage(browser);
    const res = await page.goto(SITE, { waitUntil: 'networkidle0' });
    assert(res.status() === 200, `حالة ${res.status()}`);
    assert(page.__errors.length === 0, `أخطاء: ${page.__errors.join(' | ')}`);
    assert(page.__external.length === 0, `طلبات خارجية: ${page.__external.join(', ')}`);
    const dir = await page.$eval('html', (el) => el.getAttribute('dir'));
    const lang = await page.$eval('html', (el) => el.getAttribute('lang'));
    assert(dir === 'rtl' && lang === 'ar', `اتجاه أو لغة خاطئة: ${dir} / ${lang}`);
    await page.close();
  });

  // ── 2 · بدء الكورس ──
  let firstLessonUrl = '';
  await check('2 · زر «ابدأ الكورس» يفتح أول درس', async () => {
    const page = await newPage(browser);
    await page.goto(SITE, { waitUntil: 'networkidle0' });
    const href = await page.$$eval('a', (as) => {
      const a = as.find((x) => x.textContent.trim() === 'ابدأ الكورس');
      return a ? a.href : null;
    });
    assert(href, 'لم يوجد زر ابدأ الكورس');
    firstLessonUrl = href;
    await page.goto(href, { waitUntil: 'networkidle0' });
    assert(await page.$('[data-lesson-page]'), 'الصفحة ليست صفحة درس');
    await page.close();
  });

  // ── 3 و4 و5 و6 و7 · فتح درس وإنجازه وبقاء التقدم بعد العودة ──
  await check('3-7 · إنجاز درس، وحفظ التقدم، وظهور آخر درس بعد العودة', async () => {
    const page = await newPage(browser);
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });

    const before = await page.evaluate(() => localStorage.getItem('pa.course'));
    assert(before && before.includes('last'), 'لم يُسجَّل آخر درس تمت زيارته');

    await page.click('[data-complete]');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('pa.course');
      return raw && Object.keys(JSON.parse(raw).done).length === 1;
    }, { timeout: 3000 });

    // إغلاق الصفحة ثم العودة
    await page.goto(SITE + 'dashboard/', { waitUntil: 'networkidle0' });
    const resume = await page.$eval('#resume', (el) => el.textContent);
    assert(resume.includes('تابع من حيث توقفت'), 'بطاقة المتابعة لم تظهر');

    const progress = await page.$eval('[data-progress-text]', (el) => el.textContent);
    assert(/1 من \d+/.test(progress), `نص التقدم غير متوقع: ${progress}`);
    await page.close();
  });

  // ── 8 · حفظ درس ──
  await check('8 · حفظ الدرس يظهر في لوحة المتعلم', async () => {
    const page = await newPage(browser);
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    await page.click('[data-save]');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('pa.course');
      return raw && Object.keys(JSON.parse(raw).saved).length === 1;
    }, { timeout: 3000 });
    await page.goto(SITE + 'dashboard/', { waitUntil: 'networkidle0' });
    const saved = await page.$eval('#saved', (el) => el.textContent);
    assert(!saved.includes('لا توجد دروس محفوظة'), 'الدرس المحفوظ لم يظهر');
    await page.close();
  });

  // ── 9 و10 · حفظ برومبت ونسخه ──
  await check('9-10 · حفظ برومبت في المفضلة ونسخ نصه', async () => {
    const page = await newPage(browser);
    const ctx = browser.defaultBrowserContext();
    await ctx.overridePermissions(SITE, ['clipboard-read', 'clipboard-write']);
    await page.goto(SITE + 'prompts/', { waitUntil: 'networkidle0' });
    const href = await page.$eval('#list > a', (a) => a.href);
    await page.goto(href, { waitUntil: 'networkidle0' });

    await page.click('[data-fav]');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('pa.course');
      return raw && Object.keys(JSON.parse(raw).favPrompts).length === 1;
    }, { timeout: 3000 });

    await page.click('[data-copy]');
    await page.waitForFunction(
      () => document.querySelector('[data-copy-label]').textContent === 'تم النسخ',
      { timeout: 3000 },
    );
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert(copied.length > 30, 'النص المنسوخ قصير جدا');
    assert(copied.includes('{{'), 'المتغيرات لم تُنسخ بأقواسها');
    await page.close();
  });

  // ── 11 · البحث بالعربية ──
  await check('11 · البحث العربي يعمل مع اختلاف الهمزة والتاء المربوطة والتشكيل', async () => {
    const page = await newPage(browser);
    await page.goto(SITE + 'search/', { waitUntil: 'networkidle0' });

    const queries = ['الهوك', 'استراتيجية', 'إستراتيجية', 'تيك توك', 'الجمهور', 'التموضع', 'TikTok'];
    for (const q of queries) {
      await page.$eval('#q', (el) => (el.value = ''));
      await page.type('#q', q);
      await page.waitForFunction(
        () => document.getElementById('status').textContent.trim().length > 0,
        { timeout: 4000 },
      );
      await new Promise((r) => setTimeout(r, 260));
      const n = await page.$$eval('#results > a', (a) => a.length);
      assert(n > 0, `لا نتائج للكلمة «${q}»`);
    }
    await page.close();
  });

  // ── 12 · درج المسار ──
  await check('12 · درج المسار يفتح ويغلق', async () => {
    const page = await newPage(browser);
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    await page.click('[data-open-drawer]');
    await page.waitForFunction(() => document.getElementById('path-drawer').open, { timeout: 2000 });
    const links = await page.$$eval('#path-drawer a[data-lesson-id]', (a) => a.length);
    assert(links > 1, 'الدرج لا يعرض دروسا');
    await page.click('[data-close-drawer]');
    await page.waitForFunction(() => !document.getElementById('path-drawer').open, { timeout: 2000 });
    await page.close();
  });

  // ── 13 · السابق والتالي ──
  await check('13 · التنقل بالسابق والتالي', async () => {
    const page = await newPage(browser);
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    const next = await page.$eval('.bottom-bar a[rel="next"]', (a) => a.href);
    await page.goto(next, { waitUntil: 'networkidle0' });
    const prev = await page.$eval('.bottom-bar a[rel="prev"]', (a) => a.href);
    assert(prev === firstLessonUrl, `السابق لا يعود إلى الدرس الأول: ${prev}`);
    await page.close();
  });

  // ── 14 و15 · إكمال مرحلة والوصول إلى صفحة الإتمام ──
  await check('14-15 · إكمال كل الدروس يوصل إلى صفحة الإتمام بحالة مكتملة', async () => {
    const page = await newPage(browser);
    await page.goto(SITE + 'map/', { waitUntil: 'networkidle0' });
    const ids = await page.$$eval('.lesson-card[data-lesson-id]', (as) =>
      as.map((a) => a.dataset.lessonId),
    );
    await page.evaluate((all) => {
      const done = {};
      for (const id of all) done[id] = Date.now();
      localStorage.setItem(
        'pa.course',
        JSON.stringify({ v: 1, done, saved: {}, favPrompts: {}, checks: {}, apps: {}, last: null }),
      );
    }, ids);
    await page.goto(SITE + 'map/', { waitUntil: 'networkidle0' });
    const txt = await page.$eval('[data-progress-text]', (el) => el.textContent);
    assert(txt.includes('100%'), `التقدم ليس 100%: ${txt}`);

    await page.goto(SITE + 'finish/', { waitUntil: 'networkidle0' });
    const owned = await page.$eval('#owned', (el) => el.textContent);
    assert(owned.includes('مكتملة'), 'صفحة الإتمام لا تعرض المراحل المكتملة');
    await page.close();
  });

  // ── 16 · فتح رابط درس مباشرة ──
  await check('16 · فتح رابط درس داخلي مباشرة يعمل بكل أصوله', async () => {
    const page = await newPage(browser);
    const res = await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    assert(res.status() === 200, `حالة ${res.status()}`);
    const fontLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px Naskh');
    });
    assert(fontLoaded, 'خط المتن لم يُحمَّل عند الفتح المباشر');
    assert(page.__errors.length === 0, `أخطاء: ${page.__errors.join(' | ')}`);
    await page.close();
  });

  // ── 17 · تشغيل المحتوى مع تعطيل الجافاسكربت ──
  await check('17 · متن الدرس والتنقل يعملان مع تعطيل الجافاسكربت', async () => {
    const page = await newPage(browser, { js: false });
    await page.goto(firstLessonUrl, { waitUntil: 'domcontentloaded' });
    const text = await page.$eval('.lesson-body', (el) => el.innerText.trim());
    assert(text.length > 800, `متن الدرس قصير جدا بلا جافاسكربت: ${text.length}`);
    const navLinks = await page.$$eval('.bottom-bar a', (as) => as.map((a) => a.getAttribute('href')));
    assert(navLinks.length >= 2 && navLinks.every(Boolean), 'روابط التنقل لا تعمل بلا جافاسكربت');
    const h1 = await page.$eval('h1', (el) => el.textContent.trim());
    assert(h1.length > 3, 'العنوان غير ظاهر');
    await page.close();
  });

  // ── 18 · العمل تحت مسار GitHub Pages ──
  await check('18 · كل الروابط والأصول تحت المسار الفرعي', async () => {
    const page = await newPage(browser);
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    const bad = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('[href],[src]').forEach((el) => {
        const v = el.getAttribute('href') ?? el.getAttribute('src');
        if (!v) return;
        if (/^(https?:|mailto:|data:|#)/.test(v)) return;
        if (!v.startsWith('/pprommept-/')) out.push(v);
      });
      return out;
    });
    assert(bad.length === 0, `روابط خارج المسار: ${bad.join(', ')}`);
    await page.close();
  });

  // ── 19 و20 و21 و22 · العروض الثلاثة وعدم وجود تمرير أفقي ──
  for (const w of [360, 390, 412]) {
    await check(`19-22 · عرض ${w}px بلا تمرير أفقي ولا عنصر خارج الشاشة`, async () => {
      const page = await newPage(browser, { width: w, height: 800 });
      for (const p of ['', 'dashboard/', 'map/', 'prompts/', 'platforms/', 'toolkit/', 'finish/', 'search/']) {
        await page.goto(SITE + p, { waitUntil: 'networkidle0' });
        const over = await page.evaluate(() => {
          const de = document.documentElement;
          const overflow = de.scrollWidth - de.clientWidth;
          const wide = [];
          document.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
              const s = getComputedStyle(el);
              const inScroller = el.closest('.table-scroll,[style*="overflow-x"]');
              if (!inScroller && s.position !== 'fixed' && s.overflowX !== 'auto') {
                wide.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40));
              }
            }
          });
          return { overflow, wide: wide.slice(0, 4) };
        });
        assert(over.overflow <= 1, `تمرير أفقي ${over.overflow}px في /${p} — ${over.wide.join(', ')}`);
      }
      await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(over <= 1, `تمرير أفقي ${over}px في صفحة الدرس`);
      await page.close();
    });
  }

  // ── مساحة اللمس والشريط السفلي ──
  await check('مساحة لمس الأزرار لا تقل عن 48px والشريط السفلي لا يغطي المحتوى', async () => {
    const page = await newPage(browser, { width: 390, height: 844 });
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    const small = await page.$$eval('.bottom-bar a, .bottom-bar button, .btn, .hbtn', (els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { t: (el.textContent || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) };
        })
        .filter((x) => x.h < 48 || x.w < 44),
    );
    assert(small.length === 0, `أزرار صغيرة: ${JSON.stringify(small)}`);

    const covered = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      const bar = document.querySelector('.bottom-bar').getBoundingClientRect();
      const last = document.querySelector('.lesson-body').lastElementChild.getBoundingClientRect();
      return last.bottom > bar.top;
    });
    assert(!covered, 'الشريط السفلي يغطي آخر المحتوى');
    await page.close();
  });

  // ── 23 و24 و25 و26 على مستوى الواجهة ──
  await check('25 · يوزر القناة يظهر بالاتجاه الصحيح غير معكوس', async () => {
    const page = await newPage(browser);
    await page.goto(SITE, { waitUntil: 'networkidle0' });
    const info = await page.$eval('.tg-link bdi', (el) => ({
      text: el.textContent.trim(),
      dir: getComputedStyle(el).direction,
      bidi: getComputedStyle(el).unicodeBidi,
    }));
    assert(info.text === '@PromptsArabic', `النص غير صحيح: ${info.text}`);
    assert(info.dir === 'ltr', `الاتجاه ${info.dir}`);
    assert(info.bidi.includes('isolate'), `العزل ${info.bidi}`);
    await page.close();
  });

  await check('26 · الأرقام في الواجهة لاتينية', async () => {
    const page = await newPage(browser);
    for (const p of ['', 'map/', 'dashboard/', 'prompts/']) {
      await page.goto(SITE + p, { waitUntil: 'networkidle0' });
      const bad = await page.evaluate(() => /[٠-٩۰-۹]/.test(document.body.innerText));
      assert(!bad, `رقم عربي هندي في /${p}`);
    }
    await page.close();
  });

  await check('الخلفية ليست بيضاء خالصة ولا داكنة', async () => {
    const page = await newPage(browser);
    await page.goto(SITE, { waitUntil: 'networkidle0' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [r, g, b] = bg.match(/\d+/g).map(Number);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    assert(!(r === 255 && g === 255 && b === 255), 'الخلفية بيضاء خالصة');
    assert(lum > 0.6, `الخلفية داكنة (${lum.toFixed(2)})`);
    await page.close();
  });

  await check('حالة التخزين المعطل: المحتوى والتنقل يعملان', async () => {
    const page = await newPage(browser);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('storage disabled');
        },
      });
    });
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    const text = await page.$eval('.lesson-body', (el) => el.innerText.trim());
    assert(text.length > 800, 'المتن لم يظهر مع تعطيل التخزين');
    const warn = await page.$eval('[data-storage-warning]', (el) => el.hidden);
    assert(warn === false, 'لم تظهر رسالة تعطل الحفظ');
    await page.close();
  });

  await check('صفحة غير موجودة تعرض 404 عربية بأزرار عودة', async () => {
    const page = await newPage(browser);
    const res = await page.goto(SITE + 'no-such-page/', { waitUntil: 'networkidle0' });
    assert(res.status() === 404, `حالة ${res.status()}`);
    const t = await page.$eval('h1', (el) => el.textContent);
    assert(t.includes('غير موجودة'), `عنوان غير متوقع: ${t}`);
    const btns = await page.$$eval('.btn', (a) => a.length);
    assert(btns >= 2, 'أزرار العودة ناقصة');
    await page.close();
  });

  await check('التنقل بلوحة المفاتيح: رابط التخطي أول عنصر ويظهر عند التركيز', async () => {
    const page = await newPage(browser, { width: 1280, height: 900 });
    await page.goto(firstLessonUrl, { waitUntil: 'networkidle0' });
    await page.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 320)); // انتظار انتهاء انتقال ظهور الرابط
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      const r = el.getBoundingClientRect();
      return { cls: el.className, text: el.textContent.trim(), top: r.top };
    });
    assert(active.cls.includes('skip'), `أول عنصر بالتركيز: ${active.cls}`);
    assert(active.top >= 0, 'رابط التخطي لا يظهر عند التركيز');
    await page.close();
  });

  await browser.close();

  console.log('');
  if (failures.length) {
    fail(`اختبارات الواجهة: ${pass} نجح، ${failures.length} فشل`);
    return 1;
  }
  ok(`اختبارات الواجهة: ${pass} فحصا ناجحا`);
  return 0;
}

const code = await withServer(main);
process.exit(code);
