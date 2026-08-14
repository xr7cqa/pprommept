/** بناء الروابط تحت المسار الفرعي للموقع — كل رابط داخلي يمر من هنا */
const BASE = import.meta.env.BASE_URL; // ينتهي دائما بشرطة مائلة في إعدادنا

export function url(path = ''): string {
  const clean = path.replace(/^\/+/, '');
  if (clean === '') return BASE;
  return BASE + (clean.endsWith('/') || clean.includes('#') || /\.\w+$/.test(clean) ? clean : clean + '/');
}

export const routes = {
  home: () => url(''),
  dashboard: () => url('dashboard'),
  map: () => url('map'),
  lesson: (id: string) => url(`course/${id}`),
  stage: (slug: string) => url(`map#stage-${slug}`),
  platforms: () => url('platforms'),
  platform: (id: string) => url(`platforms/${id}`),
  prompts: () => url('prompts'),
  prompt: (id: string) => url(`prompts/${id}`),
  apps: () => url('toolkit'),
  app: (id: string) => url(`toolkit/${id}`),
  search: () => url('search'),
  finish: () => url('finish'),
};
