/**
 * تطبيع عربي خفيف للبحث فقط — لا يغيّر النص الظاهر للمستخدم إطلاقا.
 * يعالج: التشكيل، والتطويل، وأشكال الألف والهمزة، والألف المقصورة، والتاء المربوطة.
 */
export function normalizeAr(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // تشكيل وتطويل
    .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ ← ا
    .replace(/ى/g, 'ي') // ى ← ي
    .replace(/ة/g, 'ه') // ة ← ه
    .replace(/ؤ/g, 'و') // ؤ ← و
    .replace(/ئ/g, 'ي') // ئ ← ي
    .replace(/[​-‏؜]/g, '') // محارف اتجاه غير مرئية
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** تحويل نص MDX إلى نص عادي صالح للفهرسة */
export function stripMdx(src: string): string {
  return src
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
