# Contributing

A pragmatic guide for getting set up locally and respecting the
project's house rules.

## Prerequisites

- Node 20 or newer (Vercel uses 22).
- pnpm 10+ (`npm install -g pnpm` if you don't have it).
- A Neon Postgres connection string for non-`--no-db` runs. Free tier
  is plenty.
- An Anthropic API key for non-mock evals — `console.anthropic.com`.

Other provider keys (OpenAI, Google) are optional; suites can run
against any subset of their declared models.

## First-time setup

```bash
git clone https://github.com/Rodman-Ai/Leo-LLM-Evals.git
cd Leo-LLM-Evals
pnpm install
cp .env.example .env.local
# Fill in DATABASE_URL + ANTHROPIC_API_KEY (or pull from Vercel below)
pnpm db:push
pnpm test          # vitest — should pass without env
pnpm dev           # http://localhost:3000
```

If the project is already linked to a Vercel project, prefer:

```bash
npx vercel link
npx vercel env pull .env.local
```

## Common tasks

```bash
pnpm dev              # next dev
pnpm build            # next build (runs migrations first if DATABASE_URL set)
pnpm test             # vitest run
pnpm test:watch       # vitest watch
pnpm typecheck        # tsc --noEmit
pnpm lint             # next lint
pnpm format           # prettier --write .
pnpm eval --suite=toy --model=mock:smart --no-db
pnpm db:generate      # diff schema → new migration
pnpm db:push          # apply schema to Neon
pnpm db:studio        # open Drizzle Studio
pnpm db:seed          # populate via mock provider
```

## House rules (from CLAUDE.md §4 + §9)

- **TypeScript strict, no `any`.** Use `unknown` and narrow.
- **Tabs, single quotes, no semis.** Prettier enforces.
- **`@/` import alias.** No deep relatives.
- **Server Components by default.** Client components only when there's
  interactivity (charts, copy-to-clipboard).
- **Drizzle migrations are append-only.** Never edit a shipped
  migration; add a new one.
- **Errors are data.** A failed eval is a row with `status='error'`,
  not a thrown exception.
- **Cost is a first-class column.** Always integer cents (sub-cent
  precision is roadmap, not yet shipped).

## Commit / PR conventions

- **Conventional Commits.** `feat(eval): ...`, `fix(api): ...`,
  `chore: ...`, `docs: ...`.
- **One feature per branch.** `feat/<short-name>` from `main`.
- **Always run** `pnpm typecheck && pnpm lint && pnpm test` before
  committing.
- **Update [CLAUDE.md](../CLAUDE.md) §7** when you complete a numbered
  feature. Move it to a `CHANGELOG.md` entry with the PR link.

## Adding a scorer

1. Add the implementation to `lib/eval/scorer.ts` (or a new file under
   `lib/eval/scorers/` if it gets large).
2. Re-export from `lib/eval/index.ts` so it's importable from
   `@/lib/eval`.
3. Add a Vitest unit test at `tests/_fixtures/<name>.test.ts`.
4. Document in [docs/scorers.md](./scorers.md).

## Adding a provider

1. Install the AI SDK package: `pnpm add @ai-sdk/<provider>` (pin to
   the major version compatible with `ai@4`).
2. Add the provider id to `ProviderId` and the `SUPPORTED` array in
   `lib/eval/provider.ts`.
3. Add the `case 'provider'` branch in `buildModel()`.
4. Add a pricing entry in `lib/eval/pricing.ts`.
5. Add the env-var name to `.env.example`.

## Adding a dashboard page

1. Create the route under `app/(dash)/<path>/page.tsx`.
2. Server Component by default. If you need a chart, add it as a
   `'use client'` file under `components/charts/`.
3. Server-side query goes in `lib/db/queries.ts`.
4. Wrap the query in try/catch and render a friendly error block on
   failure (the existing pages have the pattern).
5. Update [docs/dashboard.md](./dashboard.md).

## Schema changes

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration:
pnpm db:generate
# 3. Inspect drizzle/<new>.sql
# 4. Apply locally:
pnpm db:migrate
# 5. Commit BOTH the schema change and the new migration + meta files.
```

The deploy build will run `db:migrate` automatically.

## Don't add

- Tracing / observability (CLAUDE.md §1.2 explicitly out of scope).
- Auth, RBAC, multi-tenant features.
- New top-level frameworks (no tRPC, NextAuth, Zustand, etc.) without
  a CLAUDE.md update first.
- Features that aren't in the strategic plan unless you're prepared to
  argue why they earn their slot.

## Where to ask

Open an issue. There's no Slack / Discord — by design.
