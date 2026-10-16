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
| `/sign-in` | Demo sign-in |
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
To run the full stack (Postgres, Redis, mock SQS, API and UI), use `docker compose up --build` in `pulseboard-api`.
