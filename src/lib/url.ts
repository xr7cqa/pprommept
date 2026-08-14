/** بناء الروابط تحت المسار الفرعي للموقع — كل رابط داخلي يمر من هنا */
const BASE = import.meta.env.BASE_URL; // ينتهي دائما بشرطة مائلة في إعدادنا

export function url(path = ''): string {
  const raw = path.replace(/^\/+/, '');
  if (raw === '') return BASE;
  // المرساة تُفصل أولا حتى تبقى الشرطة المائلة في نهاية المسار قبلها
  const hashAt = raw.indexOf('#');
  const hash = hashAt >= 0 ? raw.slice(hashAt) : '';
  const clean = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  if (clean === '') return BASE + hash;
  const withSlash = clean.endsWith('/') || /\.\w+$/.test(clean) ? clean : clean + '/';
  return BASE + withSlash + hash;
}

export const routes = {
  home: () => url(''),
  dashboard: () => url('dashboard'),
  map: () => url('map'),
  lesson: (id: string) => url(`course/${id}`),
  stage: (slug: string) => url(`map#stage-${slug}`),
  platforms: () => url('platforms'),
  platform: (id: string) => url(`platforms/${id}`),
  start: () => url('start'),
  library: () => url('library'),
  prompts: () => url('prompts'),
  prompt: (id: string) => url(`prompts/${id}`),
  promptPlatform: (slug: string) => url(`prompts/platform/${slug}`),
  promptTask: (slug: string) => url(`prompts/task/${slug}`),
  cases: () => url('cases'),
  case: (id: string) => url(`cases/${id}`),
  apps: () => url('toolkit'),
  app: (id: string) => url(`toolkit/${id}`),
  search: () => url('search'),
  glossary: () => url('glossary'),
  term: (id: string) => url(`glossary#t-${id}`),
  settings: () => url('settings'),
  finish: () => url('finish'),
};
