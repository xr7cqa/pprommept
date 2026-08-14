import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routes } from '../lib/url';
import { normalizeAr } from '../lib/normalize';

/**
 * فهرس نصي خفيف لمكتبة البرومبتات وحدها.
 * يُجلب عند أول كتابة في مربع البحث لا عند فتح الصفحة،
 * فتبقى الصفحة الأولى خفيفة ولا تُرسم 124 بطاقة قبل أن يطلبها أحد.
 */
export const GET: APIRoute = async () => {
  const items = (await getCollection('prompts')).sort((a, b) => a.data.order - b.data.order);

  const docs = items.map((p) => ({
    t: p.data.title,
    w: p.data.when,
    p: p.data.platform,
    k: p.data.task,
    h: routes.prompt(p.id),
    // نص مطبّع للمطابقة، يشمل المتغيرات ومعيار الجودة حتى يجد الباحث ما يقصده
    n: normalizeAr(
      [p.data.title, p.data.when, p.data.platform, p.data.task, p.data.quality].join(' '),
    ),
  }));

  return new Response(JSON.stringify({ v: 1, docs }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
