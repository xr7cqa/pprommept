# CONTENT_MODEL.md — نموذج المحتوى

المحتوى منفصل عن مكونات الواجهة. تعديل درس لا يمس الكود، والمخطط في `src/content.config.ts`.

## المجموعات
| المجموعة | المسار | الصيغة |
|---|---|---|
| `course` | `src/content/course/` | MDX |
| `platforms` | `src/content/platforms/` | MDX |
| `prompts` | `src/content/prompts/` | Markdown، والمتن هو نص البرومبت |
| `apps` | `src/content/apps/` | MDX |
| `glossary` | `src/content/glossary/` | Markdown |

## حقول الدرس
`title` · `stage` (1..7) · `order` · `outcome` · `minutes` · `core` · `summary` · `nextStep` · `keywords`

`core: true` يعني أن الدرس يدخل في حساب نسبة التقدم. المكتبات المرجعية لا تدخل فيها.

## المكونات المتاحة داخل المحتوى
تُستخدم بلا استيراد، وتُمرَّر من `src/components/content/index.ts`:

`Box` (kind: example · apply · warn · note · result · check) · `Compare` · `Prompt` ·
`Checklist` · `Term` · `T` · `Steps` · `Pull` · `Diagram` · `Support`

## المتغيرات داخل البرومبتات
تُكتب `{{اسم_المتغير}}` وتُعرض شرائح ملونة، لأن الأقواس المعقوفة تنعكس بصريا في النص العربي.
النص المنسوخ إلى الحافظة يبقى بالأقواس. التنفيذ في `src/lib/placeholders.ts`.

## المصطلحات
يُشرح المصطلح عند أول ظهور بمكون `Term`. وعند ذكره لاحقا يُلَف بـ`T` فيصير قابلا للضغط:
لوحة سفلية على الهاتف ونافذة على سطح المكتب، وبلا جافاسكربت ينتقل إلى `/glossary/`.

## كيف تضيف درسا
1. أنشئ `src/content/course/NN-slug.mdx` مع الحقول أعلاه
2. اكتب المتن، واستخدم `## ` للأقسام — قائمة المحتويات وفهرس البحث يُبنيان منها تلقائيا
3. `npm run qa`

## كيف تعدّل درسا
عدّل الملف نفسه ثم `npm run qa`. لا تلمس المكونات إلا إن أردت شكلا جديدا.
