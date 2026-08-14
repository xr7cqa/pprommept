import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { normalizeAr, stripMdx } from '../lib/normalize';
import { routes } from '../lib/url';
import { stageByN } from '../lib/stages';

/**
 * فهرس بحث محلي خفيف يُبنى وقت البناء ويُحمَّل فقط عند فتح صفحة البحث.
 * فُضّل على مكتبة جاهزة لأننا نحتاج تطبيعا عربيا نتحكم فيه: الهمزات، والألف المقصورة،
 * والتاء المربوطة، والتشكيل — ولأن الفهرس هنا صغير ولا يحتاج WebAssembly.
 */
export const GET: APIRoute = async () => {
  const docs: Array<{
    t: string; // العنوان
    x: string; // مقتطف
    h: string; // الرابط
    k: string; // نوع المستند
    n: string; // النص المطبّع للمطابقة
  }> = [];

  for (const l of await getCollection('course')) {
    const body = stripMdx(l.body ?? '');
    docs.push({
      t: l.data.title,
      x: l.data.summary,
      h: routes.lesson(l.id),
      k: `درس · المرحلة ${l.data.stage} — ${stageByN(l.data.stage).title}`,
      n: normalizeAr(
        [l.data.title, l.data.summary, l.data.outcome, l.data.keywords.join(' '), body].join(' '),
      ),
    });
  }

  for (const p of await getCollection('platforms')) {
    const body = stripMdx(p.body ?? '');
    docs.push({
      t: p.data.title,
      x: p.data.summary,
      h: routes.platform(p.id),
      k: 'منصة',
      n: normalizeAr(
        [p.data.title, p.data.latin, p.data.summary, p.data.nativeFormat, p.data.discovery, p.data.keywords.join(' '), body].join(' '),
      ),
    });
  }

  for (const p of await getCollection('prompts')) {
    docs.push({
      t: p.data.title,
      x: p.data.when,
      h: routes.prompt(p.id),
      k: `برومبت · ${p.data.platform}`,
      n: normalizeAr(
        [p.data.title, p.data.when, p.data.platform, p.data.task, p.data.quality, p.body ?? ''].join(' '),
      ),
    });
  }

  for (const a of await getCollection('apps')) {
    const body = stripMdx(a.body ?? '');
    docs.push({
      t: a.data.title,
      x: a.data.summary,
      h: routes.app(a.id),
      k: 'قالب',
      n: normalizeAr([a.data.title, a.data.summary, a.data.outcome, a.data.keywords.join(' '), body].join(' ')),
    });
  }

  return new Response(JSON.stringify({ v: 1, docs }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
