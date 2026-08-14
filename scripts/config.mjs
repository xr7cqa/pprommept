/** إعدادات مشتركة لكل فحوص الجودة */
export const BASE = process.env.SITE_BASE ?? '/pprommept-/';
export const PORT = Number(process.env.QA_PORT ?? 4321);
export const ORIGIN = `http://127.0.0.1:${PORT}`;
export const SITE = ORIGIN + BASE;
export const DIST = new URL('../dist/', import.meta.url).pathname;

/** الرابط الخارجي الوحيد المسموح داخل الموقع */
export const ALLOWED_EXTERNAL = ['https://t.me/PromptsArabic'];

/** مسار متصفح Chromium المتاح في البيئة */
export const CHROME =
  process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

/** الصفحات التمثيلية التي تُفحص بصريا وبالوصول */
export const SAMPLE_PAGES = [
  { path: '', name: 'home' },
  { path: 'dashboard/', name: 'dashboard' },
  { path: 'map/', name: 'map' },
  { path: 'course/01-empty-order/', name: 'lesson-first' },
  { path: 'prompts/', name: 'prompts' },
  { path: 'platforms/', name: 'platforms' },
  { path: 'toolkit/', name: 'toolkit' },
  { path: 'search/', name: 'search' },
  { path: 'finish/', name: 'finish' },
];

export function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}
export function fail(msg) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
}
export function info(msg) {
  console.log(`  ${msg}`);
}
