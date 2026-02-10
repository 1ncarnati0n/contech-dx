# Repository Guidelines

## Project Structure & Module Organization
This repository is an npm workspaces monorepo.
- `apps/web/`: Next.js 16 App Router app (`@contech/web`) with source in `apps/web/src`.
- `packages/sa-gantt-lib/`: shared Gantt library built with Vite/TypeScript.
- `apps/web/sql/`: Supabase schema, migrations, and seed SQL.
- `docs/`: planning and refactoring notes.

Within `apps/web/src`, keep route files in `app/`, reusable UI in `components/`, and domain logic in `lib/` (`services/`, `utils/`, `hooks/`, `types/`).

## Build, Test, and Development Commands
Use workspace-root commands unless package-specific behavior is needed.
- `npm run dev`: start web app locally on `http://localhost:3000`.
- `npm run dev:lib`: watch-build `sa-gantt-lib` while editing the library.
- `npm run build:lib`: build library artifacts in `packages/sa-gantt-lib/dist`.
- `npm run build`: production build for web app.
- `npm run lint`: run ESLint across workspaces.
- `npm run test`: run Jest (web) and Vitest (library).
- `npm -w @contech/web run test:coverage`: coverage report with thresholds.

When changing library APIs used by web, run `npm run build:lib` before `npm run build`.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict`), React function components.
- Indentation: 2 spaces in `apps/web`, 4 spaces in `packages/sa-gantt-lib` (match existing file style).
- Components/files: `PascalCase.tsx` for React components, `camelCase.ts` for utilities/hooks.
- Tests: `*.test.ts` or `*.test.tsx` under `__tests__` or adjacent test folders.
- Linting: ESLint required in both workspaces; fix warnings before opening a PR.

## Testing Guidelines
- Web app uses Jest + Testing Library (`apps/web/jest.config.ts`).
- Gantt library uses Vitest + jsdom (`packages/sa-gantt-lib/vitest.config.ts`).
- Web coverage threshold is 50% global (branches/functions/lines/statements).
- Add regression tests for bug fixes and core utility changes.

## Commit & Pull Request Guidelines
Recent history includes broad messages like `update all`; prefer clear, scoped commits such as `web: fix project status badge render`.
- Keep commits focused and runnable.
- PRs should include: purpose, key changes, test commands run, and screenshots/GIFs for UI updates.
- Link related issues or task IDs, and note any schema/env var changes explicitly.

## Security & Configuration Tips
- Keep secrets in `.env.local` only (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`).
- Never commit credentials or generated local artifacts (`.next/`, `dist/`, coverage outputs).
