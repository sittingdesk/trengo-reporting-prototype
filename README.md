# Trengo Reporting — analytics prototype

An interactive prototype of Trengo's new in-product reporting & analytics experience:
a template-driven, question-led dashboard model with an onboarding flow for new and
existing customers.

**▶ Live demo:** https://sittingdesk.github.io/trengo-reporting-prototype/

> Prototype only — all data is mock/placeholder and the filters are visual (they don't
> filter real data yet).

## Highlights

- **Template-driven dashboards** — pick a template (a named, ordered set of widgets) from a
  compact picker; each becomes a tab.
- **Onboarding** — new customers start in the new question-led templates (Overview, Understand,
  Operate, Improve, Automate); existing customers get a reversible welcome step to keep their
  current reports or try the new ones.
- **Top-bar filters** — a real range date picker (presets + calendar) plus channel/team filters.

## Stack

Vue 3 + `<script setup>` + TypeScript · Vite · Tailwind CSS v4 (CSS-first) · shadcn-vue
(reka-ui) · Chart.js. The production build is a single self-contained `dist/index.html`
(via `vite-plugin-singlefile`).

## Run locally

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + bundle → dist/index.html (open by double-click)
```

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that builds the app and publishes
`dist/` to GitHub Pages.
