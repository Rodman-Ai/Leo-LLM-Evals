# Exports

Three ways to get evalbench data out: download a CSV, push it to Google
Sheets via the visitor's Google account, or upload it to OneDrive via the
visitor's Microsoft account.

## What you can export

Both run-detail and per-suite-leaderboard pages have an **Export ▾** menu.
The same three destinations apply:

| Source                | CSV                            | Google Sheets                                  | OneDrive (CSV)                                   |
| --------------------- | ------------------------------ | ---------------------------------------------- | ------------------------------------------------ |
| `/runs/{id}`          | per-case rows of one run       | new sheet in your Drive root                   | `/Evalbench/run_{id}_{suite}_{model}.csv`        |
| `/leaderboard/{name}` | per-model rankings for a suite | new sheet in your Drive root                   | `/Evalbench/leaderboard_{name}.csv`              |

CSV downloads are always available (no auth required). Sheets/OneDrive
require connecting the corresponding account at [`/connections`](#connections).

## Trust model

OAuth tokens live in an **HttpOnly + Secure + SameSite=Lax cookie**
encrypted with `SESSION_SECRET` via JWE-A256GCM. They never touch the
database. Each browser/visitor has their own connection — exporting goes
to *your* Drive, not the deploy operator's.

Disconnecting clears the cookie. Clearing browser cookies has the same
effect.

## Setup — Google

1. Go to https://console.cloud.google.com → create a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → External.
   - App name, your email, developer email — required.
   - Scopes: add `openid`, `.../auth/userinfo.email`, and
     `.../auth/drive.file`. The `drive.file` scope only allows our app to
     see files it has created — minimum-privilege.
   - Add your email as a Test User (until you publish the app).
4. **Credentials → Create Credentials → OAuth Client ID** → Web
   application:
   - Authorized redirect URIs:
     `https://<your-vercel-host>/api/auth/google/callback`
   - For local dev, also add `http://localhost:3000/api/auth/google/callback`.
5. Copy the Client ID and Secret into Vercel env vars:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
6. Set `SESSION_SECRET` in Vercel env vars too:
   `openssl rand -hex 32` and paste the result.
7. Redeploy. The "Connect Google" button on `/connections` becomes live.

## Setup — Microsoft

1. Go to https://entra.microsoft.com → **App registrations → New
   registration**.
2. Account types: **"Accounts in any organizational directory and personal
   Microsoft accounts"** for the broadest reach.
3. Redirect URI (Web): `https://<your-vercel-host>/api/auth/microsoft/callback`
   - For local dev, also add `http://localhost:3000/api/auth/microsoft/callback`.
4. After creation:
   - **API permissions → Microsoft Graph → Delegated**: add `Files.ReadWrite`,
     `User.Read`, `offline_access`, `openid`, `email`, `profile`.
   - Click **Grant admin consent** if you have it; otherwise users will
     consent on first sign-in.
   - **Certificates & secrets → New client secret**. Copy the **Value**
     (not the ID).
5. Set Vercel env vars:
   - `MICROSOFT_OAUTH_CLIENT_ID` (Application (client) ID from Overview)
   - `MICROSOFT_OAUTH_CLIENT_SECRET` (the Value from step 4)
   - `MICROSOFT_OAUTH_TENANT=common` (default; works with both
     organizational and personal accounts)
6. Redeploy. "Connect Microsoft" becomes live.

## Caveats

- **OAuth credentials are per-deployment** — each Vercel preview URL
  needs its callback registered. Easiest path: register only the
  production hostname and OAuth flow only on prod. Preview deploys still
  show the buttons but disable them with a "not configured" hint when env
  vars are missing.
- **`drive.file` scope** means we can only see/edit files our app
  created, not your existing Drive. Good for trust; means you can't pick
  a destination folder yet (everything lands in Drive root).
- **CSV opens in Excel** — Excel/Numbers/Sheets all open `.csv` natively.
  We don't convert to `.xlsx` (deferred per the shipped scope; opening a
  CSV in Excel and saving as xlsx is a one-click operation on your end).
- **SharePoint** — deferred. Same Microsoft Graph API; needs a site/drive
  picker in the UI which is a fair amount of additional work.
- **One file per export** — no folder picking yet. CSV in OneDrive lands
  at `/Evalbench/<filename>.csv`. Sheets land in Drive root.

## API endpoints

| Method | Path                                                       | Auth needed       |
| ------ | ---------------------------------------------------------- | ----------------- |
| GET    | `/api/runs/{id}/export.csv`                                | none              |
| POST   | `/api/runs/{id}/export/google-sheets`                      | Google session    |
| POST   | `/api/runs/{id}/export/onedrive`                           | Microsoft session |
| GET    | `/api/leaderboard/{name}/export.csv`                       | none              |
| POST   | `/api/leaderboard/{name}/export/google-sheets`             | Google session    |
| POST   | `/api/leaderboard/{name}/export/onedrive`                  | Microsoft session |

Successful Sheets export response:

```json
{ "id": "1AbCdEf...", "name": "code-review · ...", "webViewLink": "https://docs.google.com/spreadsheets/d/..." }
```

Successful OneDrive export response:

```json
{ "id": "01ABCDEF...", "name": "run_42_code-review_anthropic-...csv", "webUrl": "https://onedrive.live.com/..." }
```

`401 not_connected` indicates the corresponding provider isn't connected
in this browser session.

## Implementation summary

- `lib/exports/csv.ts` — RFC 4180 writer.
- `lib/exports/run.ts` — `buildRunCsv` and `buildLeaderboardCsv` that pull
  via existing `lib/db/queries.ts` and emit `{ csv, filename, title }`.
- `lib/auth/crypto.ts` — JWE-A256GCM encrypt/decrypt with
  `SESSION_SECRET`.
- `lib/auth/session.ts` — cookie-backed `Session` reader/writer.
- `lib/auth/google.ts`, `lib/auth/microsoft.ts` — OAuth flow built on
  `arctic`. PKCE, state cookies, refresh tokens.
- `lib/integrations/google.ts` — uploads CSV to Drive with mime
  `application/vnd.google-apps.spreadsheet` (auto-converts to Sheet).
- `lib/integrations/microsoft.ts` — PUT to Graph
  `/me/drive/root:/Evalbench/{filename}:/content`.
- `app/(dash)/connections/page.tsx` — connect/disconnect UI.
- `components/ExportMenu.tsx` — client component, used on
  `/runs/[id]` and `/leaderboard/[name]`.
