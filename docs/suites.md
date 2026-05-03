# Suites — create + import

A suite is a named collection of cases (test inputs + expected outputs)
that runs against one or more models. There are now four ways to bring
a suite into the dashboard:

| How                              | Where                            | What it creates                              |
| -------------------------------- | -------------------------------- | -------------------------------------------- |
| Code-defined (`*.eval.ts` file)  | `pnpm eval` CLI                  | Suite + tests + run + results                |
| `/api/seed`                      | Browser / curl                   | Suite + tests + synthetic runs + results     |
| **Manual create** (`/suites/new`)| Dashboard form                   | Suite metadata only                          |
| **JSON import** (`/suites/new`)  | Dashboard file upload            | Suite metadata + tests (no runs)             |

This doc covers the last two — the new entry points. For results
import (a CSV that creates a run), see [imports.md](./imports.md).

## Manual create

`/suites/new` → **Manual** tab.

Fill in:
- **Name** — required. Lowercase / numbers / dashes / dots / underscores. Used
  in URLs as `/suites/<name>`.
- **Description** — optional, shown on the suite + leaderboard pages.
- **Tags** — optional, comma-separated.

Submit creates a metadata-only suite row. To add cases later, either
JSON-import them, write a `tests/<name>.eval.ts` file and `pnpm eval`,
or CSV-import a run via [`/import`](./imports.md) (which also creates
`tests` rows as a side effect).

## JSON import

`/suites/new` → **Import from file** tab.

Upload a JSON file matching this shape:

```jsonc
{
  "name": "my-suite",
  "description": "Short description for the suite + leaderboard pages.",
  "tags": ["english", "classification"],
  "cases": [
    {
      "input": "What is the capital of France?",
      "expected": "paris",
      "tags": ["geography"],
      "metadata": { "difficulty": 1 }
    },
    {
      "input": "Translate \"hello\" to Spanish.",
      "expected": "hola"
    }
  ]
}
```

| Field           | Required | Notes                                                      |
| --------------- | -------- | ---------------------------------------------------------- |
| `name`          | **yes**  | `^[a-zA-Z0-9][a-zA-Z0-9._-]*$`                             |
| `description`   | no       | Up to 2000 chars                                           |
| `tags`          | no       | Up to 20 strings, each ≤ 64 chars                          |
| `cases`         | no       | Array of `{ input, expected?, tags?, metadata? }`. Each `input` is required and non-empty. |

A pre-filled template is downloadable from the page header
(**Template JSON** button) or directly:

```bash
curl -O https://<your-host>/api/suites/template.json
```

### Idempotency

Re-importing the same JSON file is safe:

- The suite row is upserted by name. Description and tags are replaced
  with whatever the file says.
- Cases are upserted by `sha256(input + expected)` per suite. Editing
  a case's input or expected creates a new row; only the latest tags
  and metadata for that hash are kept.
- **No runs are created.** No results are inserted. This is purely a
  case-inventory import.

## Programmatic API

```bash
curl -X POST -H 'content-type: application/json' \
     -d '{"name":"my-suite","cases":[{"input":"Q1","expected":"A1"}]}' \
     https://<your-host>/api/suites
```

Returns:

```json
{ "suiteId": 42, "name": "my-suite", "casesInserted": 1 }
```

Errors follow the standard `{ error, code, details? }` envelope.
Validation errors (`code=invalid_request`) include a `details.fieldErrors`
object pointing at the specific failing field.

## What this does NOT do

- **Doesn't run the suite.** Running is a separate action — `pnpm eval`
  or running via API (Sprint 11). Cases just sit in the `tests` table
  until something runs them.
- **Doesn't define the prompt or model list.** Those live in the
  `*.eval.ts` file or are passed to `runSuite()` at execution time.
  This is by design — you can have multiple `.eval.ts` files (or
  prompts, or models) running the same case inventory.
- **Doesn't replace existing cases.** Imports add to or update what's
  there. To remove cases, delete them via the database directly.

## Implementation summary

- `lib/suites/schema.ts` — Zod schemas for `SuiteDefinitionInput` +
  `SuiteCaseInput`.
- `lib/suites/create.ts` — `createOrUpdateSuite()` upsert pipeline.
- `lib/suites/template.ts` — the example JSON template used by the
  download button.
- `app/api/suites/route.ts` — `GET` lists, `POST` creates/updates.
- `app/api/suites/template.json/route.ts` — template download.
- `app/(dash)/suites/new/page.tsx` + `actions.ts` — UI form.
- `components/SuiteCreateForms.tsx` — manual / import tab switcher.
