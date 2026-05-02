# Deployment — Vercel + Neon

The locked hosting story (CLAUDE.md §2). The whole stack runs on free
tiers for portfolio-scale traffic.

## First-time setup

### 1. Push the repo to GitHub

`main` is the production branch. Feature work happens on
`feat/<thing>` branches that get merged to `main` after one weekend.

### 2. Import to Vercel

1. https://vercel.com/new → **Import Git Repository** → pick the repo.
2. **Framework preset**: Next.js (auto-detected).
3. **Root directory**: leave as `./`.
4. **Build command** / **Install command**: leave defaults — Vercel
   reads `pnpm` from `packageManager` in `package.json`.
5. Expand **Environment Variables** before clicking Deploy if you
   already have provider keys. If you don't, the first deploy will
   succeed anyway (build tolerates missing `DATABASE_URL`).
6. Click **Deploy**. ~1 minute.

The build runs `node scripts/maybe-migrate.mjs && next build`. The
migrate script no-ops when `DATABASE_URL` is absent, so the first deploy
always succeeds.

### 3. Attach Neon

1. Project → **Storage** tab → **Create Database** → pick **Neon**.
2. Accept defaults; pick **Production, Preview, Development** for
   environment scopes.
3. This auto-injects `DATABASE_URL` (and `DATABASE_URL_POOLED`).

### 4. Add provider keys (optional)

Project → **Environments** → pick **Production** → scroll to
**Environment Variables**:

| Key                 | Required when                                                |
| ------------------- | ------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Running `anthropic:*` models                                 |
| `OPENAI_API_KEY`    | Running `openai:*` models                                    |
| `GOOGLE_API_KEY`    | Running `google:*` models                                    |
| `SEED_TOKEN`        | Want to use `/api/seed` (random ~48-char hex string)         |
| `PUBLIC_DEMO_MODE`  | `true` to show the demo banner                               |

Note: Vercel renamed "Environment Variables" → moved under
"Environments". Same thing.

### 5. Redeploy

After attaching Neon: Project → **Deployments** → pick the latest →
**Redeploy**. This time the build will run `db:migrate` against Neon
and create the four tables.

### 6. Seed the dashboard

If you set `SEED_TOKEN`, visit
`https://<your-url>/api/seed?token=<token>` to populate the dashboard
with synthetic data. Otherwise run `pnpm eval` locally with real keys.

## Local dev pulling Vercel env

```bash
npx vercel link              # one-time — link this folder to the project
npx vercel env pull .env.local
```

Local `pnpm dev` and `pnpm eval` now have the same DATABASE_URL as
production. Useful for seeding the prod DB from your laptop without
copy-pasting credentials.

## Function constraints

- Vercel Hobby: 60s function timeout. The `/api/seed` endpoint sets
  `maxDuration = 60` and the default seed completes in ~30s.
- Vercel Pro: 300s default. Bigger demo seeds, more expensive runs OK.

## Branches and previews

Vercel auto-creates a preview deployment for every push to a non-
production branch. Each PR has its own URL (`*-git-<branch>-…`).
Preview deployments share the production database by default — if you
want isolation, configure environment-scoped Neon branches via the
Vercel/Neon integration.

## Common gotchas

| Symptom                                                        | Fix                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `No Next.js version detected`                                  | Vercel built before code was pushed. Push, then redeploy.                  |
| `Can't find meta/_journal.json file`                           | `drizzle/meta/` was gitignored. Make sure it's committed.                  |
| Dashboard shows "Database not connected"                       | `DATABASE_URL` not set — attach Neon Storage and redeploy.                 |
| Costs all show `$0.5100` regardless of model (or `$0.0000`)    | Demo data hasn't been backfilled — hit `/api/seed?backfill=cost&token=…`.  |
| OG image is blank                                              | Suite has no completed runs yet — seed first.                              |

See [api.md](./api.md) for the full `/api/seed` reference.

## Production branch

`main` is the production branch by default. To preview a feature branch
in Vercel without merging, change Production Branch under Settings →
Git temporarily — but do flip back, otherwise the prod URL serves the
feature branch.
