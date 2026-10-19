# System Monitor

A local system monitoring dashboard: a Rust API that reads CPU and RAM stats from `/proc` and a Next.js app that displays them per server, with servers stored in SQLite via Prisma.

## Structure

```
src/                  Rust API (axum), serves on port 3001
frontend/monitor/     Next.js dashboard (port 3000)
```

## Backend (Rust)

Reads `/proc/cpuinfo`, `/proc/stat`, and `/proc/meminfo` and exposes:

- `GET /cpu_identity` — CPU vendor, model, family, stepping, microcode
- `GET /system_stats` — latest CPU and RAM snapshot
- `WS /ws/system_stats` — pushes CPU + RAM stats every second

```bash
cargo run
```

## Frontend (Next.js)

```bash
cd frontend/monitor
npm install
npx prisma migrate dev   # creates data/monitor.db
npm run dev
```

Open http://localhost:3000. Add a server (IP/domain + port) from the sidebar or `/servers/new`, then click it in the sidebar to see its CPU identity (cached per server) and live CPU/RAM usage over a WebSocket.

Environment variables (see `.env.example`):

```
DATABASE_URL="file:./data/monitor.db"
```

## Notes

- Database and generated Prisma client live in `frontend/monitor/data/` and `frontend/monitor/app/generated/prisma/` — both are gitignored.
- The right-click context menu on a sidebar server entry opens an inline editor.
- Dark mode follows the system theme and can be toggled in the sidebar.
