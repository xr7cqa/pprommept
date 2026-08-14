import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';
import { normalizeAr, stripMdx } from '../lib/normalize';
import { routes } from '../lib/url';
import { stageByN } from '../lib/stages';

/**
 * فهرس بحث محلي خفيف يُبنى وقت البناء ويُحمَّل فقط عند فتح صفحة البحث.
 * فُضّل على مكتبة جاهزة لأننا نحتاج تطبيعا عربيا نتحكم فيه: الهمزات، والألف المقصورة،
 * والتاء المربوطة، والتشكيل — ولأن الفهرس هنا صغير ولا يحتاج WebAssembly.
 *
 * كل مستند يحمل رابطا يصل إلى موضعه الدقيق: عنوان القسم داخل الدرس لا رأس الصفحة.
 */

interface Doc {
  t: string; // العنوان
  x: string; // مقتطف
  h: string; // الرابط، وقد يحمل مرساة قسم
  k: string; // نوع المستند
  n: string; // النص المطبّع للمطابقة
}

export const GET: APIRoute = async () => {
  const docs: Doc[] = [];

  for (const l of await getCollection('course')) {
    const stage = stageByN(l.data.stage);
    const body = stripMdx(l.body ?? '');
    docs.push({
      t: l.data.title,
      x: l.data.summary,
      h: routes.lesson(l.id),
      k: `درس · المرحلة ${l.data.stage} — ${stage.title}`,
      // متن الدرس يُفهرس عبر أقسامه أدناه، فلا نكرره هنا ويبقى الفهرس خفيفا على الهاتف
      n: normalizeAr(
        [l.data.title, l.data.summary, l.data.outcome, l.data.keywords.join(' ')].join(' '),
      ),
    });

    /* أقسام الدرس تُفهرس مستقلة حتى ينتقل الباحث إلى الموضع الصحيح */
    const { headings } = await render(l);
    const sections = headings.filter((h) => h.depth === 2);
    for (let i = 0; i < sections.length; i += 1) {
      const h = sections[i]!;
      const start = body.indexOf(h.text);
      const nextStart = sections[i + 1] ? body.indexOf(sections[i + 1]!.text) : body.length;
      const end = nextStart > start ? Math.min(nextStart, start + 1200) : start + 900;
      const chunk = start >= 0 ? body.slice(start, end) : '';
      docs.push({
        t: h.text,
        x: chunk.slice(h.text.length, h.text.length + 150).trim(),
        h: `${routes.lesson(l.id)}#${h.slug}`,
        k: `قسم داخل: ${l.data.title}`,
        n: normalizeAr(`${h.text} ${chunk}`),
      });
    }
  }

  for (const g of await getCollection('glossary')) {
    docs.push({
      t: `${g.data.ar} (${g.data.en})`,
      x: g.data.short,
      h: `${routes.glossary()}#t-${g.id}`,
      k: 'مصطلح',
      n: normalizeAr([g.data.ar, g.data.en, g.data.short, g.body ?? ''].join(' ')),
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

  for (const c of await getCollection('cases')) {
    const body = stripMdx(c.body ?? '');
    docs.push({
      t: c.data.title,
      x: c.data.summary,
      h: routes.case(c.id),
      k: 'دراسة حالة',
      n: normalizeAr(
        [c.data.title, c.data.summary, c.data.subject, c.data.field, c.data.principle, c.data.keywords.join(' '), body].join(' '),
      ),
    });
  }

  return new Response(JSON.stringify({ v: 2, docs }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
