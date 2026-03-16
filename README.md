# Insight Forge 951

Insight Forge 951 is a Vite and React consulting platform for managing projects, assessments, research, tools, and client-facing delivery assets.

## Recent release

The latest UI refresh introduces an NTT DATA-inspired visual system across the shared shell and dashboard experience, including:

- Updated typography, color tokens, buttons, and layout styling for a more polished enterprise presentation
- A redesigned dashboard with stronger hierarchy, clearer summary cards, and a client-ready hero section
- A new reusable Automotive AI maturity dashboard asset at `/assets/automotive-ai-maturity`
- Built-in PDF export and share actions for the automotive maturity page

## Key areas

- `Dashboard`: operational overview for projects, assessments, team health, and delivery activity
- `Tool Library`: reusable consulting tools and canvases
- `Assessments`: structured maturity and discovery workflows
- `Projects`: engagement delivery management
- `Automotive AI maturity dashboard`: reusable client asset for executive readouts and benchmarking

## Local development

Requirements:

- Node.js
- npm

Run locally:

```sh
git clone https://github.com/ianbower/insight-forge-951
cd insight-forge-951
npm install
npm run dev
```

Production build:

```sh
npm run build
```

Linting:

```sh
npm run lint
```

Note: the repository currently has a broader backlog of existing ESLint issues outside this release work, so lint may report pre-existing failures even when the app builds successfully.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase

## Deployment

This project can still be managed and published through Lovable, and local Git pushes continue to sync back to the connected repository.
