/**
 * progress.ts — حفظ تقدم المتعلم داخل متصفحه
 *
 * القواعد:
 *  · البيانات لها إصدار واضح، وتُرقّى عند تغيير البنية
 *  · أي بيانات تالفة تُستبدل بقيم افتراضية سليمة بدل أن يتعطل الموقع
 *  · إذا تعذر التخزين المحلي يبقى المحتوى والتنقل يعملان وتتعطل ميزات التقدم بلطف
 *  · نسبة التقدم تُحسب من الدروس الأساسية فقط
 */

export const STORE_KEY = 'pa.course';
export const STORE_VERSION = 1;

export interface Snapshot {
  v: number;
  /** الدروس المنجزة: معرّف الدرس ← وقت الإنجاز */
  done: Record<string, number>;
  /** الدروس المحفوظة للرجوع إليها */
  saved: Record<string, number>;
  /** البرومبتات المفضلة */
  favPrompts: Record<string, number>;
  /** حالة عناصر قوائم الفحص */
  checks: Record<string, true>;
  /** التطبيقات التي بدأها */
  apps: Record<string, number>;
  /** آخر درس تمت زيارته فعلا */
  last: { id: string; title: string; href: string; stage: number; ts: number } | null;
}

function fresh(): Snapshot {
  return { v: STORE_VERSION, done: {}, saved: {}, favPrompts: {}, checks: {}, apps: {}, last: null };
}

let available: boolean | null = null;

/** هل التخزين المحلي متاح فعلا؟ يُفحص مرة واحدة */
export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const k = '__pa_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

/** نسخة في الذاكرة تعمل حين يكون التخزين معطلا، فلا تنكسر الواجهة */
let memory: Snapshot = fresh();

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function sanitizeMap(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isPlainRecord(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (typeof k === 'string' && k.length > 0 && k.length < 200 && typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeChecks(x: unknown): Record<string, true> {
  const out: Record<string, true> = {};
  if (!isPlainRecord(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (typeof k === 'string' && k.length > 0 && k.length < 240 && v === true) out[k] = true;
  }
  return out;
}

function sanitizeLast(x: unknown): Snapshot['last'] {
  if (!isPlainRecord(x)) return null;
  const { id, title, href, stage, ts } = x as Record<string, unknown>;
  if (typeof id !== 'string' || typeof title !== 'string' || typeof href !== 'string') return null;
  if (!id || !href) return null;
  return {
    id,
    title,
    href,
    stage: typeof stage === 'number' && Number.isFinite(stage) ? stage : 1,
    ts: typeof ts === 'number' && Number.isFinite(ts) ? ts : 0,
  };
}

/** ترقية البيانات من إصدار أقدم — نقطة التوسعة عند تغيير البنية مستقبلا */
function upgrade(raw: Record<string, unknown>): Snapshot {
  const v = typeof raw['v'] === 'number' ? raw['v'] : 0;
  // لا توجد إصدارات سابقة بعد؛ أي إصدار غير معروف يُقرأ بأفضل جهد ثم يُختم بالإصدار الحالي
  if (v > STORE_VERSION) return fresh();
  return {
    v: STORE_VERSION,
    done: sanitizeMap(raw['done']),
    saved: sanitizeMap(raw['saved']),
    favPrompts: sanitizeMap(raw['favPrompts']),
    checks: sanitizeChecks(raw['checks']),
    apps: sanitizeMap(raw['apps']),
    last: sanitizeLast(raw['last']),
  };
}

export function read(): Snapshot {
  if (!storageAvailable()) return memory;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return fresh();
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) return fresh();
    return upgrade(parsed);
  } catch {
    // بيانات تالفة: نبدأ من قيم سليمة بدل أن نترك الصفحة معطلة
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch {
      /* تجاهل */
    }
    return fresh();
  }
}

export function write(s: Snapshot): void {
  if (!storageAvailable()) {
    memory = s;
    return;
  }
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // امتلاء المساحة أو منع الكتابة: نكمل في الذاكرة فقط
    memory = s;
    available = false;
  }
}

export function update(fn: (s: Snapshot) => void): Snapshot {
  const s = read();
  fn(s);
  write(s);
  return s;
}

export function reset(): void {
  memory = fresh();
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* تجاهل */
  }
}

/** نسبة التقدم من الدروس الأساسية وحدها */
export function ratio(done: Record<string, number>, coreIds: string[]): number {
  if (coreIds.length === 0) return 0;
  let n = 0;
  for (const id of coreIds) if (done[id]) n += 1;
  return n / coreIds.length;
}
