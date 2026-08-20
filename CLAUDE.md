# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Angular 20, repo root)

```bash
npm start                    # ng serve → http://localhost:4200 (development configuration)
npm run build                # production build → dist/time-tracker/browser
npm run build-inline         # production build + inline.cjs → single self-contained index.html
npm test                     # Karma/Jasmine (no *.spec.ts files exist yet)
```

`ng build` defaults to the **production** configuration; `ng serve` defaults to **development**.

### Backend (Flask, `backend/`)

A virtualenv already exists at `backend/venv`:

```bash
cd backend
./venv/bin/python main.py                 # dev server on 0.0.0.0:3000 (FLASK_PORT)
./venv/bin/python main.py create-admin    # interactive admin creation (first user)
./venv/bin/python main.py init-db         # create tables (create_app also calls db.create_all())
./venv/bin/python json_import.py          # import a localStorage JSON export into a user
```

`main.py` intercepts `create-admin` / `init-db` as bare argv so `flask` on PATH is not required.

### Backend tests — currently broken

`pytest -v` is documented but **pytest is not in `requirements.txt` nor installed in `backend/venv`**. The fixtures also POST to `/auth/login`, while all blueprints are nested under an `/api` prefix (`app/__init__.py`), so `backend/tests/*` is stale and will 404 even once pytest is installed. Fix both the install and the URLs before trusting test output.

### Production

Gunicorn behind systemd, with Flask serving the built Angular app (see `SERVICE_SETUP.md`):

```bash
ANGULAR_DIST_DIR=/path/to/dist/time-tracker/browser \
  ./venv/bin/gunicorn --workers 4 --bind 127.0.0.1:3000 main:app
```

## Architecture

### One server, two roles

`create_app()` (`backend/app/__init__.py`) registers `auth`, `users`, `activities` blueprints inside a parent `api_bp` with `url_prefix='/api'`. If `ANGULAR_DIST_DIR` is set, the same app also serves the Angular bundle with a catch-all route that falls back to `index.html` so the Angular router handles deep links. Unset it and the app is API-only (dev mode, Angular on 4200).

### API base URL selection

`src/environments/env.ts` (production) → `window.location.origin + '/api'`, i.e. same-origin, assumes Flask serves the SPA. `env.dev.ts` → `http://<hostname>:3000/api`. `angular.json` swaps them via `fileReplacements` in the development configuration only. Never hardcode a backend URL in a service — import `env`.

### The backend owns the domain logic

The frontend deliberately has no duplicate time math or suggestion logic. `StorageService` (`src/app/services/storage.service.ts`) is the single HTTP boundary and calls:

- `GET/PUT /api/activities/day/<ISODate>` — **whole-day replace**: the PUT deletes every activity in that day's bounds and recreates the incoming list. IDs are therefore not stable across a save; the client re-reads them from the response.
- `POST /api/activities/summary` — per-description and per-task minute totals.
- `POST /api/activities/suggestions` — description/task/start/end autocomplete, computed from the user's history within `durationThreshold` plus the activities currently on screen.
- `GET/PUT /api/users/me/settings` — settings, normalized on the backend into `user_settings`, `user_always_shown_activities`, `user_issue_tracker_sources`, `user_issue_tracker_projects`; a PUT deletes and rewrites the child rows wholesale.

`TimeCalculatorService` only maps a `BackendSummaryResponse` back onto `Activity` objects — put new aggregation logic in `activities.py`, not there.

### Client model ⇄ DB row mapping

Client `Activity` (`src/app/utils/models.ts`: `startTime`/`endTime` as `HH:MM`, `description`, `task`, `type: 'activity' | 'text'`) maps to the `activities` table (`task_name`, `description`, `category`, `start_time`/`end_time` as `DateTime`, `duration_minutes`). Conventions to preserve on both sides:

- `category === 'text'` marks a comment row; its `task` is blanked and `description` falls back to `task_name`.
- `text` rows may have no start time; the backend assigns start-of-day so day queries still find them.
- `task_name` is never empty — it falls back to `description`, then `'Activity'`.

### Signal plumbing (the non-obvious part)

`SiteComponent` holds `signal<WritableSignal<Activity>[]>` — a signal of per-row signals. `ActivityRowComponent` declares `model()` fields and binds them to its row's `WritableSignal<Activity>` through `initUsing()` (`src/app/utils/signals.ts`), which creates `effect()`s that write field changes back into the activity object. Those effects run outside an injection context, so they use `AppComponent.appInjector` — a static `Injector` captured in `app.component.ts` and exposed as `appInjector()`. Don't remove it.

Consequences:

- Editing any field mutates the row signal, which re-triggers the top-level `effect()` in `SiteComponent.initialize()`, which debounces a save (120 ms) and a summary refresh (150 ms). There are no explicit save calls in the row components.
- `autoSyncEnabled` is flipped off while a day loads so the load itself does not trigger a save-back.
- Add/remove row call `saveNow()` directly instead of waiting for the debounce.
- Unload paths (`beforeunload`, `pagehide`, `visibilitychange`) flush via `StorageService.sendKeepaliveSync()` → `navigator.sendBeacon`.

### Settings are a module-level global, not a service

`SettingsHolder` (`src/app/utils/settings.ts`) is a plain module singleton over an RxJS `Subject`. `StorageService.initSettings()` fills it from the API and subscribes to persist every change. Components read `SettingsHolder.getSettings()` and subscribe via `onSettingsChange()` (unsubscribe through `DestroyRef`). This is why settings work in non-DI code paths — keep new settings consumers on this pattern rather than introducing a parallel Angular service.

Theme is applied to `document.documentElement` (`.dark`/`.light` class + `data-theme`) in two places: `SiteComponent.applyTheme()` and `ThemeService`'s effect (used by the navbar toggle). Tailwind is configured with `darkMode: 'class'`.

### Auth

JWT (HS256, 24 h) in `localStorage` under `auth_token` / `current_user`; `AuthService` exposes it via signals, `authInterceptor` attaches the bearer header, and `authGuard`/`adminGuard`/`publicGuard` protect routes. Backend: `token_required` / `admin_required` decorators (`backend/app/utils/auth.py`) set `request.current_user`. Note `POST /api/auth/register` **requires an admin bearer token** — self-signup does not exist, and `/register` is behind `adminGuard` in the router. Rate limits come from `flask-limiter` with the per-user key in `app/utils/rate_limit.py`.

## Code style

`.github/copilot-instructions.md` holds the full Angular style guide and applies here. The load-bearing rules:

- Standalone components only, no `NgModule`, no `standalone: true` in the decorator.
- `ChangeDetectionStrategy.OnPush` everywhere; signals (`signal`/`computed`/`input()`/`output()`/`model()`) for state — never `mutate`.
- Native control flow (`@if`/`@for`/`@switch`); no `ngClass`/`ngStyle`, use `class`/`style` bindings; no `@HostBinding`/`@HostListener` (use the `host` object).
- `inject()` over constructor injection; `providedIn: 'root'` services.
- Logic in `.ts`, template in `.html`, styles in `.scss` (SCSS is the schematic default) — existing components follow this split.
- Avoid `any`; prefer `unknown`.

## Documentation caveat

`README.md`, `QUICK_REF.md`, `SETUP.md`, `TESTING.md` and `backend/README.md` predate the current code: they state port **5000** (actual default is **3000**), reference a `docker-compose` setup and `IMPLEMENTATION.md` that do not exist, and describe activity endpoints that the SPA no longer uses. Verify against the source before relying on them.
