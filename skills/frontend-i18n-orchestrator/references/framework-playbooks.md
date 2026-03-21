# Framework Playbooks

## Next.js

Preferred library: `next-intl`.

Execution notes:
- set locale routing in App Router or Pages Router consistently
- maintain middleware and route segment locale handling
- localize metadata and SEO tags

## React (Vite/CRA/custom)

Preferred library: `react-i18next` (+ `i18next`).

Execution notes:
- initialize i18n entrypoint once
- use namespaces by feature/page
- enforce no-literal-text linting where practical

## Vue 3 (Vite/custom)

Preferred library: `vue-i18n`.

Execution notes:
- set global i18n plugin in app bootstrap
- use composition API style (`useI18n`) in components
- split locale files by domain/module

## Nuxt

Preferred library/module: `@nuxtjs/i18n`.

Execution notes:
- configure locale strategy centrally in `nuxt.config`
- standardize localized routes and fallback behavior
- verify SSR output includes correct `lang` and alternate links

## Common Migration Order

1. Foundation setup
2. Key extraction and replacement
3. Formatter localization
4. Routing/SEO localization
5. CI quality gates
