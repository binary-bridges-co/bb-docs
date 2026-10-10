// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import { SITE_URL, HOMEPAGE_URL } from './src/config/site.ts';
import { PRODUCTS, topicFor, openApiFor } from './src/config/products.ts';

// starlight-openapi fills `openAPISidebarGroups` when it is instantiated, so it
// must be created before the topics read it.
const openApi = starlightOpenAPI(PRODUCTS.flatMap(openApiFor));

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    starlight({
      title: { 'es-CO': 'Documentación de Binary Bridges', en: 'Binary Bridges Docs' },
      description: 'Documentación de los productos de Binary Bridges.',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Español', lang: 'es-CO' },
        en: { label: 'English', lang: 'en' },
      },
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        alt: 'Binary Bridges',
      },
      favicon: '/favicon.svg',
      customCss: ['@fontsource-variable/geist', '@fontsource-variable/geist-mono', './src/styles/global.css'],
      head: [
        // Meta tags cannot read CSS variables: these copy --color-paper and --color-ink from tokens.css.
        { tag: 'meta', attrs: { name: 'theme-color', content: '#FBFAF8', media: '(prefers-color-scheme: light)' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#16192B', media: '(prefers-color-scheme: dark)' } },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon-16.svg', type: 'image/svg+xml', sizes: '16x16' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
      ],
      social: [{ icon: 'external', label: 'binarybridges.co', href: HOMEPAGE_URL }],
      components: {
        Footer: './src/components/overrides/Footer.astro',
        Hero: './src/components/overrides/Hero.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',
      },
      plugins: [
        openApi,
        starlightSidebarTopics(
          PRODUCTS.map((product) => topicFor(product, product.sync.openapi ? openAPISidebarGroups : [])),
          {
            exclude: ['/', '/en', '/en/'],
            // Generated API pages are not listed in a topic's items: attach them by path.
            topics: Object.fromEntries(
              PRODUCTS.filter((p) => p.sync.openapi).map((p) => [p.id, [`/${p.id}/api`, `/${p.id}/api/**/*`, `/en/${p.id}/api`, `/en/${p.id}/api/**/*`]]),
            ),
          },
        ),
        starlightLinksValidator(),
        starlightLlmsTxt(),
      ],
      // High-contrast code themes, as on the homepage: the standard GitHub themes fail AA on comments (axe).
      expressiveCode: { themes: ['github-dark-high-contrast', 'github-light-high-contrast'] },
      pagefind: true,
      lastUpdated: true,
      credits: false,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
