# Alimentaria Mexicana LMS - Frontend

The frontend for the Alimentaria Mexicana Learning Management System (LMS). It provides bilingual employee and administrator experiences for browsing procedures, managing the content library, onboarding employees, and working with training content.

This repository contains the Next.js application. The REST API is maintained separately in `lms-backend`.

## Table of contents

- [Product areas](#product-areas)
- [Technology](#technology)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Application routes](#application-routes)
- [Project structure](#project-structure)
- [How the app works](#how-the-app-works)
- [Backend integration](#backend-integration)
- [Localization](#localization)
- [Procedure content](#procedure-content)
- [Development guidelines](#development-guidelines)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Current implementation notes](#current-implementation-notes)

## Product areas

- **Employee experience:** sign in, browse procedures, read procedure details, and view training pages.
- **Administrator experience:** manage employees, categories, subcategories, procedures, settings, and training content.
- **Procedure authoring:** create and edit bilingual procedures, organize content into blocks, add quizzes, and publish or archive procedures.
- **Employee onboarding:** invitation links, password setup, sign in, and password reset.
- **Localization:** English (`en`) and Spanish (`es`) routes and messages.
- **Procedure translation:** the editor can request translation through a Next.js server route backed by OpenRouter.

Some areas, especially training, still use local demo data. See [Current implementation notes](#current-implementation-notes).

## Technology

| Area                  | Technology                                   |
| --------------------- | -------------------------------------------- |
| Runtime               | Node.js 22 or newer                          |
| Package manager       | pnpm 10 (declared in `package.json`)         |
| Framework             | Next.js 16 App Router                        |
| UI                    | React 19, TypeScript 6                       |
| Styling               | Tailwind CSS 4 and the project design tokens |
| Localization          | `next-intl` 4, English and Spanish           |
| Server state          | TanStack Query 5                             |
| HTTP client           | Axios                                        |
| Validation            | Zod 4                                        |
| Translation provider  | OpenRouter through a Next.js route handler   |
| Hosting configuration | AWS Amplify (`amplify.yml`)                  |

## Requirements

- Node.js 22 or newer
- Corepack enabled, or pnpm 10.34.6 installed
- The backend API running locally or reachable at a configured URL
- An OpenRouter API key to use the translation feature

## Local setup

From this directory:

```bash
corepack enable
pnpm install
Copy-Item .env.local.example .env.local
```

Set `NEXT_PUBLIC_API_BASE` in `.env.local` to the URL of the running backend. The checked-in example uses `http://localhost:4000`; the backend currently defaults to port `8000`, so change the value if you run it with its default configuration.

Start the frontend:

```bash
pnpm dev
```

Open <http://localhost:3000>. Routes use a locale prefix, for example `/en/login` and `/es/login`.

The backend must be configured and running for live authentication, employee, category, job, station, and procedure data. The two applications use separate environment files; configure the backend independently using its own README and environment example.

## Environment variables

Create `.env.local` from `.env.local.example`. Do not commit `.env.local` or put secrets in variables prefixed with `NEXT_PUBLIC_`; Next.js embeds public variables in browser code.

| Variable                     | Required                     | Purpose                                                                                                                           |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE`       | Recommended                  | Base URL for backend API requests. Example: `http://localhost:8000` when using the backend's default port.                        |
| `NEXT_PUBLIC_API_URL`        | No                           | Legacy alternate API base URL used by the shared HTTP client when `NEXT_PUBLIC_API_BASE` is unset. Prefer `NEXT_PUBLIC_API_BASE`. |
| `BACKEND_API_URL`            | No                           | Server-side fallback for the shared HTTP client. Keep it server-only.                                                             |
| `OPENROUTER_API_KEY`         | For translation              | Server-side key used by `/api/backend/translate`. Configure it in the hosting environment for deployment.                         |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Legacy; avoid for production | A public Gemini key is exposed in the browser bundle. The server translation route uses `OPENROUTER_API_KEY` instead.             |
| `NEXT_PUBLIC_GEMINI_MODEL`   | Legacy/optional              | Model override for the legacy client-side Gemini helper.                                                                          |

The shared HTTP client falls back to `http://localhost:8000` when no API base is configured. Keep the configured URL aligned with the backend port and deployment origin.

## Scripts

| Command          | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Start the Next.js development server.           |
| `pnpm build`     | Create the production build.                    |
| `pnpm start`     | Serve a previously built app.                   |
| `pnpm typecheck` | Run TypeScript without emitting files.          |
| `pnpm lint`      | Run the lint command defined in `package.json`. |
| `pnpm check`     | Run lint, typecheck, and a production build.    |

## Application routes

Application pages are under `app/[locale]`. Both `en` and `es` are supported, with locale prefixes always present.

| Area                        | Routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home and sign-in            | `/[locale]`, `/[locale]/login`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Invite and account recovery | `/[locale]/invite/[token]`, `/[locale]/activate`, `/[locale]/activate/[token]`, `/[locale]/set-password`, `/[locale]/set-password/[token]`, `/[locale]/forgot-password`, `/[locale]/reset-password`, `/[locale]/reset-password/[token]`                                                                                                                                                                                                                                                                                    |
| Employee                    | `/[locale]/employee/home`, `/[locale]/employee/training`, `/[locale]/employee/training/[id]`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Procedures                  | `/[locale]/procedures`, `/[locale]/procedures/[id]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Administrator               | `/[locale]/admin`, `/[locale]/admin/employees`, `/[locale]/admin/employees/new`, `/[locale]/admin/employees/[id]`, `/[locale]/admin/library`, `/[locale]/admin/library/new`, `/[locale]/admin/library/[id]`, `/[locale]/admin/library/[id]/edit`, `/[locale]/admin/library/categories`, `/[locale]/admin/library/categories/[slug]`, `/[locale]/admin/library/categories/[slug]/[subSlug]`, `/[locale]/admin/training`, `/[locale]/admin/training/new`, `/[locale]/admin/training/[id]/assign`, `/[locale]/admin/settings` |
| Reports and utilities       | `/[locale]/admin/reports`, `/[locale]/design-system`, `/[locale]/demo1`, `/[locale]/demo2`, `/[locale]/demo3`                                                                                                                                                                                                                                                                                                                                                                                                              |
| Translation API             | `POST /api/backend/translate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

This is an overview, not an access-control specification. The route layouts and backend authorization determine access.

## Project structure

```text
app/
  [locale]/                 Localized App Router pages and layouts
  api/backend/translate/    Server-side translation endpoint
components/
  admin/                    Administrator and procedure-editor UI
  auth/                     Authentication UI
  doc/                      Procedure rendering and cook mode
  employee/                 Employee navigation and UI
  providers/                React Query provider
  ui/                       Shared UI primitives
services/
  auth/                     Auth API functions, types, hooks, endpoints
  categories/               Category and subcategory integration
  employees/                Employee integration
  jobs/                     Jobs and job-station integration
  library/                  Procedure API, normalization, types, hooks
  locations/                Location integration
  stations/                  Station integration
i18n/                       Locale routing and request configuration
lib/                        HTTP client, shared types, helpers, and demo stores
messages/                   English and Spanish translation messages
public/                     Static assets
```

## How the app works

### Rendering and layouts

- The root localized layout loads the selected message catalog, theme cookie, shared toast UI, and TanStack Query provider.
- The administrator layout checks the session on the server, loads the current employee and workspace, and redirects to sign-in if the session cannot be verified.
- The employee layout checks for a session cookie before rendering; the client top bar resolves the employee session and handles expired sessions.
- Client components own interactive forms, editors, dialogs, and query-driven screens. Server components are used where they can resolve locale, cookies, or initial page data before rendering.

### Data and caching

- TanStack Query holds server data and is configured with a five-minute stale time, no focus refetch, no retries for 4xx errors, and no automatic mutation retries.
- Feature services contain endpoint constants, API calls, types, and query hooks. Shared Axios behavior lives in `lib/http.ts`.
- Mutations should invalidate or update the relevant query keys so visible lists and details stay current.
- Some API/service modules retain local demo stores or seed data for areas not fully connected to the backend. Verify whether a feature is live or mock-backed before relying on its persistence.

### Authentication and requests

- The frontend uses the backend API base URL for normal API calls and sends credentials with requests.
- The HTTP client adds a request ID and normalizes failed Axios responses to `ApiException`.
- In browser requests, the client may add the Bearer token from local storage/cookies. Server-side API functions can forward the incoming cookie header.
- Admin and employee layouts handle session checks differently; see their layout files before changing redirects or initial loading behavior.
- `proxy.ts` handles locale routing and a legacy invite-link redirect. It is not a general API proxy.

## Backend integration

The frontend consumes backend API groups for:

- Authentication and invitations
- Employees
- Jobs and stations
- Locations
- Categories and subcategories
- Procedures, quizzes, uploads, and assignments

Endpoint paths and feature calls are organized under `services/*` and `lib/api/*`. Keep endpoint definitions in the corresponding service and route calls through the shared HTTP client unless a server-only route or an external upload protocol requires another transport.

Backend responses are normalized in feature services where API data differs from the UI types. `ApiException` preserves status, code, message, and field details so screens can show useful errors without parsing Axios errors repeatedly.

## Localization

- Supported locales are defined in `i18n/routing.ts`: `en` and `es`.
- `en` is the default locale; URLs always include a locale prefix.
- `i18n/request.ts` loads the matching JSON catalog from `messages/`.
- Add or update user-facing translation keys in both `messages/en.json` and `messages/es.json`.
- Use the route locale for navigation and localized backend fields; avoid hard-coded language assumptions.

## Procedure content

Procedures use a typed, bilingual block model in `lib/types.ts`. Current block kinds include:

- `text` and `heading`
- `method`
- `ingredients` and `recipe`
- `image` and `video`
- `warning` and `attachment`
- `table` and `checklist`

The editor components live under `components/admin/procedure-block-editor/`; shared block types and content helpers live under `lib/`. The reader and cook-mode presentation live under `components/doc/`. Preserve the backend-compatible block shape when editing serialization or normalization code.

## Development guidelines

- Keep page-specific work close to its route and extract shared UI into `components/`.
- Keep API calls, endpoint paths, response normalization, and query hooks in the relevant `services/` feature folder or established `lib/api/` module.
- Reuse the shared HTTP client and `ApiException` handling.
- Use query invalidation after writes; avoid manual reloads when a targeted cache update is sufficient.
- Keep localized strings in both message files and use existing shared controls and design tokens.
- Keep secrets server-side. Never prefix private provider keys with `NEXT_PUBLIC_`.
- Preserve existing API payload and response contracts unless backend and frontend changes are coordinated.
- This project uses a recent Next.js version. Check the installed Next.js documentation and current route conventions before relying on older Next.js patterns.

## Deployment

The repository includes `amplify.yml` for AWS Amplify builds. The build installs dependencies with pnpm and runs `pnpm run build`; deployment artifacts are taken from `.next`.

Configure `OPENROUTER_API_KEY` as a protected Amplify environment variable for translation. The current build configuration writes it into `.env.production` during the build so the server route can read it. Do not expose this key to browser code. Configure the backend base URL for the deployed frontend and ensure backend CORS/trusted-origin settings include the frontend origin.

## Troubleshooting

### API requests fail locally

- Confirm the backend is running and note its actual port.
- Set `NEXT_PUBLIC_API_BASE` in `.env.local` to that backend origin.
- Restart `pnpm dev` after changing environment variables.
- Check the browser network panel and backend logs for the request URL and status.

### Sign-in redirects back to the login page

- Confirm the backend session cookie is present and accepted for the local frontend/API origins.
- Check the `/api/v1/auth/me` request and the backend CORS and cookie configuration.
- A login redirect can also follow a temporary API failure because the admin layout treats session-check failures as a sign-in redirect.

### Translation reports that the service is not configured

- Set `OPENROUTER_API_KEY` in the frontend server environment.
- For Amplify, configure the variable in the app's environment settings and redeploy.
- Do not use a `NEXT_PUBLIC_` provider key in production.

### Local changes are not reflected

- Restart the dev server after environment/config changes.
- Check that both locale message files were updated when changing translated UI.
- If a server-state view looks stale after a mutation, check its React Query invalidation key.

## Current implementation notes

- The training course and assignment screens are still backed by mock/local data in `lib/mock-training*` and `lib/training-courses.ts`; they are not fully persisted through the backend API yet.
- Demo pages (`demo1`, `demo2`, `demo3`) and the design-system page are included for product/design work and are not the main employee or administrator workflows.
- Legacy mock/seed helpers remain in `lib/` and in some API modules. Avoid assuming that every fallback writes to the backend; check the feature implementation.
- `.env.local.example` currently shows port `4000`, while the backend guide and HTTP-client fallback use `8000`. Set the value to the port your backend actually listens on.
- A legacy Gemini helper and public environment variables remain in the repository. The translation route currently uses the server-side OpenRouter key; do not put production secrets in public variables.
