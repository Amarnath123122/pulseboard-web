# pulseboard-web

The Angular 17 monorepo for the Pulseboard UI. It uses the Angular CLI workspace layout: one app plus a shared library.

```
projects/
  pulseboard/     the app: pages, routing, shell, styles
  data-access/    the library: API client, models, session, WebSocket events, meta and toast services
```

## Pages
| Route | Page |
|---|---|
| `/sign-in` | Sign in or create an account (identity service) |
| `/users` | Admin only: search users, change roles, activate or deactivate |
| `/` | Overview board: alerts first, live updates |
| `/boards` | My boards: search, filter by kind, pagination |
| `/boards/:id` | Detail or briefing board |
| `/metrics` | Metric catalog: search, filter, sort, pagination, create, edit, delete |
| `/activity` | Setup and review jobs, filterable, refreshes live |
| `/setup` | Setup assistant chat (streamed over SSE) |

Nothing environment-specific is compiled in:
- API URLs come from `/config.json` at runtime.
- Menus, units, areas and page sizes come from `GET /api/v1/meta`.

## Run
```bash
npm install
npx ng serve pulseboard --port 5173     # expects the API on http://localhost:8000
```
To point at another API, edit `projects/pulseboard/public/config.json`.

## Docker
```bash
docker build -t pulseboard-web .
docker run -p 8080:8080 -e API_URL=http://localhost:8000 -e WS_URL=ws://localhost:8000/ws/events pulseboard-web
```
To run the full system (gateway, identity, API, web, Postgres, Redis and mock SQS), use `docker compose up --build` in `pulseboard-platform`.

## CI/CD (GitHub Actions)
- **`ci.yml`** runs on every push: `npm ci`, the app build, the library build, then the Docker image build.
- **`deploy.yml`** builds once, writes `config.json` from the repo variables `API_URL` and `WS_URL`, then uploads to Azure Static Web Apps. It's skipped until those variables and the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret are set.

## Authentication (version 3)
- **Sign-in and accounts:** sign in, or create an account, against `pulseboard-identity` through the gateway.
- **Token refresh:** the interceptor refreshes the 15-minute access token automatically. It's single-flight, so concurrent 401s share one refresh. If the refresh fails, you're signed out.
- **Role-aware UI:** the Users page is admin-only, the metric catalog is read-only for viewers, and route guards apply the same rules.
- **`config.json`** now has `apiUrl`, `authUrl` and `wsUrl`.
- **`npm start`** uses `proxy.conf.json` as a local gateway: identity on :8100, api on :8000.
