// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// موقع الكورس يُنشر على GitHub Pages تحت مسار فرعي باسم المستودع.
// المسار الافتراضي هو اسم المستودع xr7cqa/pprommept، ويُشتق في سير النشر من اسم المستودع نفسه
// وإذا أعيدت تسمية المستودع يكفي تغيير هذين المتغيرين أو تمريرهما من بيئة البناء.
const SITE = process.env.SITE_ORIGIN ?? 'https://xr7cqa.github.io';
const BASE = process.env.SITE_BASE ?? '/pprommept/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: false,
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
