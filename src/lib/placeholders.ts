/**
 * المتغيرات داخل البرومبتات تُكتب في المحتوى بالشكل {{اسم_المتغير}}
 * وتُعرض على الشاشة كشريحة ملونة، لأن الأقواس المعقوفة تنعكس بصريا داخل النص العربي.
 * النص المنسوخ إلى الحافظة يبقى بالأقواس كما هو حتى يعمل الاستبدال في الأدوات.
 */

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderPromptHtml(raw: string): string {
  return escapeHtml(raw).replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_m, name: string) => `<span class="ph">${name}</span>`,
  );
}

export function extractVariables(raw: string): string[] {
  const out: string[] = [];
  for (const m of raw.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
    const v = m[1]!.trim();
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
