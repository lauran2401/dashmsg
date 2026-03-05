# DashMsg — Session Handoff Context

Use this document to bootstrap a brand-new ChatGPT session with full context of the current project state.

## 1) What this project is

DashMsg is a lightweight mobile-first web app for delivery drivers to quickly send prewritten customer messages (pickup, en route, shopping, delivered), copy them to clipboard, and optionally return them to another app via URL parameter.

It includes:
- Static frontend (Cloudflare Pages `public/`)
- Cloudflare Pages Functions API endpoints for telemetry + feedback (`functions/api/`)
- Cloudflare D1 for analytics/feedback storage (`schema.sql`)
- Optional Cloudflare R2 endpoint for richer beta reports with screenshots (`/api/beta-report`)

## 2) Current architecture

### Frontend
- Entry page: `public/index.html`
- App modules:
  - `public/app/core.js` → app state, defaults loading, template rendering, clipboard, logging, feedback, import/export, nav stack
  - `public/app/ui.js` → rendering, action dispatch, menu navigation, toasts, feedback form, beta/help screen
  - `public/app/menus.js` → menu definitions and action wiring
  - `public/app/editors.js` → template editor + store management + reset-all flow
- Styling: `public/styles.css`
- Configurable defaults: `public/defaults.json`

### Backend
- `/api/log` → stores template usage events in D1 (`functions/api/log.js`)
- `/api/error` → stores JS/client errors in D1 (`functions/api/error.js`)
- `/api/feedback` → stores text feedback in D1 (`functions/api/feedback.js`)
- `/api/beta-report` → stores text/screenshot reports in R2 (`functions/api/beta-report.js`)

### Infra config
- Cloudflare config in `wrangler.toml`
- D1 schema in `schema.sql`

## 3) Runtime behavior details

- Defaults are fetched from `./defaults.json` with `cache: "no-store"` at app init.
- Persistent user data is saved in localStorage key `dashmsg_state`.
- Tester identity is generated/stored once in localStorage key `dashmsg_tester_id`.
- Debug flag uses localStorage key `dashmsg_debug`.
- Message flow: choose menu item → render template (with placeholders) → optional name prompt → emoji stripping if disabled → clipboard copy → telemetry log POST to `/api/log`.
- If URL query has `return=...`, completed text is redirected back with encoded text appended.
- Shopping menu is dynamically built from the mutable store list in local state.

## 4) API auth + environment expectations

### Frontend API key behavior
The frontend currently sends header `x-dashmsg-key` using hard-coded key:
- `DashMaster_2026!` (in `public/app/core.js`)

### API endpoints expect
- `/api/log`, `/api/error`, `/api/feedback`: `env.DASHMSG_API_KEY`
- `/api/beta-report`: `env.DASHMSG_KEY` (different var name from other routes)

### `wrangler.toml` currently binds
- D1 binding `DB`
- R2 binding `REPORTS_BUCKET`

## 5) Data model

D1 tables from `schema.sql`:
- `events`: usage telemetry (template/category/source + feature flags like `used_name`, `used_eta`, `used_hotbag`)
- `errors`: client runtime error payloads
- `feedback`: tester notes + optional template JSON blob

Indexes exist on timestamp and tester_id for all tables, plus template index on events.

## 6) Current menu / UX map

Main sections:
- Pickup
- En Route
- Shopping
- Delivered
- Settings

Settings includes:
- Preferences: emoji on/off, name prompt on/off
- Customization: edit templates, manage stores
- Tester utilities: Beta/help screen, reset all local data, cancel

Beta/help screen includes:
- Send feedback
- Export/import settings JSON via clipboard/prompt
- Show/copy tester ID and app version

## 7) Important inconsistencies / likely bugs to fix next

1. **Feedback payload field mismatch**
   - Frontend sends `{ message: "..." }` in `sendFeedback()`.
   - Backend stores `notes` from request body and ignores `message`.
   - Effect: submitted feedback likely stores blank notes.

2. **Potential missing stylesheet reference**
   - `index.html` references both `style.css?v=2.0.0` and `styles.css`.
   - Only `public/styles.css` exists in repo.
   - `style.css` likely stale/legacy reference.

3. **API secret naming inconsistency**
   - Most endpoints use `DASHMSG_API_KEY`, but `/api/beta-report` uses `DASHMSG_KEY`.
   - Easy source of deployment misconfiguration.

4. **Hard-coded client API key**
   - API key in frontend source is exposed to users.
   - This is acceptable for low-risk beta instrumentation only; otherwise migrate to safer auth model.

## 8) Suggested next-task priorities

1. Fix feedback contract (`message` vs `notes`) end-to-end.
2. Remove or correct stale `style.css` reference.
3. Standardize env var naming across API routes (`DASHMSG_API_KEY` everywhere).
4. Decide whether `/api/error` should be auto-called from global error handlers (currently index shows errors visually, but no clear automatic POST wiring).
5. Add minimal README with setup/deploy/test + env vars + endpoint contracts.

## 9) Quick ops / repo facts

- Project root: `/workspace/dashmsg`
- Cloudflare Pages output dir: `./public`
- Main backend storage: D1 (`DB` binding)
- Optional report storage: R2 (`REPORTS_BUCKET` binding)

## 10) Prompt starter for a new ChatGPT session

Copy/paste this into a new chat:

> We are working on DashMsg, a Cloudflare Pages app with frontend in `public/` and Pages Functions APIs in `functions/api/` backed by D1 (`schema.sql`) and optional R2 reports. Please start by reading `SESSION_HANDOFF.md`, then audit/fix the known issues listed there (feedback message/notes mismatch, stale style.css reference, API key env-var inconsistency), and propose a safe auth/data-contract cleanup plan.

