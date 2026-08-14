import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** دروس المسار الأساسي */
const course = defineCollection({
  loader: glob({ base: './src/content/course', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    /** رقم المرحلة 1..7 */
    stage: z.number().int().min(1).max(7),
    /** ترتيب الدرس داخل مرحلته */
    order: z.number().int(),
    /** ما الذي يملكه المتعلم بعد الدرس */
    outcome: z.string(),
    /** وقت القراءة التقريبي بالدقائق */
    minutes: z.number().int().min(2).max(15),
    /** أساسي يدخل في حساب التقدم، اختياري لا يدخل */
    core: z.boolean().default(true),
    /** جملة تصف الدرس في البحث والخريطة */
    summary: z.string(),
    /** الخطوة المقترحة بعد الدرس */
    nextStep: z.string(),
    /** مفاتيح بحث إضافية */
    keywords: z.array(z.string()).default([]),
  }),
});

/** مكتبة المنصات — مرجع يُفتح بحرية ولا يدخل في نسبة التقدم */
const platforms = defineCollection({
  loader: glob({ base: './src/content/platforms', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    /** اسم المنصة كما يُكتب باللاتينية */
    latin: z.string(),
    order: z.number().int(),
    /** جملة تصف موضع المنصة */
    summary: z.string(),
    /** الصيغة الأصلية للمنصة */
    nativeFormat: z.string(),
    /** كيف يكتشف الناس المحتوى */
    discovery: z.string(),
    /** لون البطاقة: مفتاح من ألوان المراحل */
    tone: z.enum(['s1', 's2', 's3', 's4', 's5', 's6', 's7']),
    keywords: z.array(z.string()).default([]),
  }),
});

/** مكتبة البرومبتات */
const prompts = defineCollection({
  loader: glob({ base: './src/content/prompts', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    /** المنصة: عام أو اسم منصة */
    platform: z.string(),
    /** المهمة: أفكار · هوك · كتابة · تكييف · تحرير · حساب · قياس · بحث */
    task: z.string(),
    /** متى يُستخدم */
    when: z.string(),
    /** المتغيرات التي يجب أن يملأها المستخدم */
    variables: z.array(z.string()),
    /** مثال إدخال */
    exampleInput: z.string(),
    /** مثال نتيجة */
    exampleOutput: z.string(),
    /** معيار الحكم على النتيجة */
    quality: z.string(),
    /** الدرس المرتبط بالمفهوم — معرّف درس داخل مجموعة course */
    concept: z.string().optional(),
    order: z.number().int().default(100),
  }),
});

/** مساحة التطبيقات والقوالب */
const apps = defineCollection({
  loader: glob({ base: './src/content/apps', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int(),
    summary: z.string(),
    /** ماذا يملك المتعلم بعد تعبئته */
    outcome: z.string(),
    tone: z.enum(['s1', 's2', 's3', 's4', 's5', 's6', 's7']),
    /** الدرس الذي يشرح المفهوم */
    concept: z.string().optional(),
    keywords: z.array(z.string()).default([]),
  }),
});

/** قاموس المصطلحات — يُشرح المصطلح داخل الدرس، وهذه الصفحة للمراجعة والبحث */
const glossary = defineCollection({
  loader: glob({ base: './src/content/glossary', pattern: '**/*.md' }),
  schema: z.object({
    /** الاسم العربي الواضح */
    ar: z.string(),
    /** المصطلح الإنجليزي كما هو شائع */
    en: z.string(),
    /** تعريف في جملة واحدة، وهو ما يظهر في اللوحة السريعة */
    short: z.string(),
    order: z.number().int(),
    /** مصطلحات مرتبطة */
    seeAlso: z.array(z.string()).default([]),
    /** الدرس الذي يشرح المفهوم كاملا */
    concept: z.string().optional(),
  }),
});

export const collections = { course, platforms, prompts, apps, glossary };
