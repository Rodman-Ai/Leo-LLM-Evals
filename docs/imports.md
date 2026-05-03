# CSV import

A third entry point alongside the CLI runner and `/api/seed`. Upload a
CSV of eval results and it becomes a new run on the dashboard, tagged
with `source=import` so it's distinguishable from app-generated data.

## When to use it

- You have an existing internal eval that doesn't (yet) live in this app
  and you want to compare against the leaderboard.
- You want to backfill historical results from another tool (LangSmith
  export, LM-Eval-Harness output, your own CSV-friendly pipeline).
- A teammate ran a one-off eval and emailed you the results.
- You exported a run from this app, edited a few cells, and want to
  re-import — round-tripping the export format works without
  modification.

## Two ways to import

### From the dashboard

`/import`. Pick or create a suite, type a model name, optionally paste a
prompt template + notes, choose a CSV file, click **Import CSV**. On
success you land on `/runs/{newRunId}` with the `Imported` chip in the
header and an `(I)` badge on every result row.

### Programmatically

```bash
curl -F file=@run.csv \
     -F suite=imported \
     -F model=custom:my-finetune \
     https://<your-host>/api/import
```

Returns `{ runId, suiteId, suiteName, model, total, inserted, skipped }`.
Status `400 invalid_request` for bad form fields, `400 invalid_csv` for
malformed CSVs, `413 payload_too_large` for files over 4 MB (Vercel
Hobby cap; raise the plan or split the file).

## CSV format

Same shape as `/api/runs/{id}/export.csv` so import → export round-trips
natively.

| Column          | Required | Notes                                                    |
| --------------- | -------- | -------------------------------------------------------- |
| `case_id`       | no       | Ignored. Kept in the export for round-trip identity.     |
| `input`         | **yes**  | Becomes `tests.input`.                                   |
| `expected`      | no       | Becomes `tests.expected`. Empty string → null.           |
| `output`        | no       | The model's response. Empty string → null.               |
| `passed`        | no       | `'true' / 'false' / '1' / '0' / 'yes'`. Default `false`. |
| `scores_json`   | no       | JSON array of `ScoreRecord`. Default `[]`.               |
| `cost_cents`    | no       | Integer. Default `0`.                                    |
| `latency_ms`    | no       | Integer. Default `0`.                                    |
| `input_tokens`  | no       | Integer. Default `0`.                                    |
| `output_tokens` | no       | Integer. Default `0`.                                    |
| `error_message` | no       | Empty string → null.                                     |

Headers are case-insensitive and normalized to snake_case
(`Pass Rate` → `pass_rate`).

CSV parser handles RFC 4180 quoting, escaped quotes (`""` → `"`),
embedded newlines inside quoted cells, CRLF line endings, and an
optional UTF-8 BOM.

## What the import does

1. **Upserts the suite** — creates the suite row if `suite` doesn't
   already exist; otherwise reuses it.
2. **Upserts test rows** — deduplicated by `sha256(input + expected)`
   per suite, so re-importing the same CSV doesn't double the case
   inventory.
3. **Inserts a new `runs` row** — `triggered_by='import'`,
   `status='complete'`, `finished_at=now()`. The optional `prompt` and
   `notes` form fields land on this row.
4. **Inserts `results` rows** — one per CSV row, with
   `source='import'`. Rows with empty `input` are skipped (and counted
   in the response's `skipped` field).

## What the import does NOT do

- **Does not fire webhooks.** `triggered_by='import'` is in the same
  skip set as `'seed'` and `'api-seed'` — imports are backfills, not
  events. See [webhooks.md](./webhooks.md).
- **Does not validate the model id** against any provider list. Free-
  text by design — type whatever distinguishes the run.
- **Does not run scorers**. Scores have to be in the `scores_json`
  column; the import doesn't recompute pass/fail. The `passed` column
  is what shows up in the dashboard.
- **Does not modify existing runs**. Every import creates a new
  `runs` row.

## The `source` field

A new column on `results` distinguishes app-generated from imported
rows:

- `app` — produced by `runSuite()` (CLI, GH Action, `/api/seed`).
  Default for all existing rows after the migration.
- `import` — inserted by this endpoint.

Surfaced on the dashboard:

- **`/runs/[id]` header** — shows an `Imported` chip when every result
  row has `source='import'`.
- **`/runs/[id]` results table** — `Src` column shows an `A` or `I`
  pill on each row, with a tooltip explaining the meaning.
- **API** — `GET /api/runs/{id}` returns `source` on every result.

The column allows future use cases like merging mixed-source runs
without losing provenance.

## Caveats

- **4 MB hard limit** on Vercel Hobby. ~50,000 typical eval rows fit
  comfortably; very large suites need to be split or upgraded.
- **No partial imports** — if any row's input is empty, it's skipped
  silently and counted in `skipped`. CSV parse errors fail the whole
  import.
- **Cost integer-cents quirk** — fractional sub-cent costs round to
  the integer floor. Same caveat as the export, see
  [database.md](./database.md).
- **Demo mode** — imports are enabled even in `PUBLIC_DEMO_MODE`.
  Same trust model as webhooks: the visitor decides what data to
  upload to their own session.

## See also

- [api.md](./api.md) — full API reference with request/response shapes.
- [database.md](./database.md) — schema reference, including the
  `source` column.
- [webhooks.md](./webhooks.md) — why imports skip webhook delivery.
