# District VIII

Booking app for **District VIII**, a gaming arena in Panoor with 3 eight-ball pool tables, 2 PS5 stations and a kitchen. Customers check live availability and request hourly slots from their phone. Staff approve requests, manage units and keep the menu up to date in the admin panel.

## Quick start

Requires **Node.js 20.9+** and **MongoDB** (Docker or a local `mongod`).

```bash
npm install                                   # installs every workspace and builds packages/shared
docker compose up -d mongo                    # or run a local mongod on 27017
cp apps/api/.env.example apps/api/.env        # then set JWT_SECRET (see the comment in the file)
cp apps/web/.env.example apps/web/.env.local
npm run seed -w apps/api                      # demo units, menu, bookings and the admin account
npm run dev                                   # shared (watch) + API on :4000 + web on :3000
```

| URL | What |
| --- | --- |
| http://localhost:3000 | Customer app (slide to open) |
| http://localhost:3000/admin | Admin panel |
| http://localhost:4000/docs | Swagger API docs (JSON at `/docs/json`) |

**Demo admin:** `admin@district8.local` / `District8!Pool-PS5-2026`. Both values come from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `apps/api/.env`. Change them before deploying anywhere.

### Scripts (repo root)

| Script | Does |
| --- | --- |
| `npm run dev` | Everything in watch mode (`dev:api`, `dev:web` run one app) |
| `npm run build` | shared → api → web |
| `npm run lint` | All workspaces |
| `npm test` | API unit tests and e2e tests (in-memory MongoDB) |
| `npm run seed` | Wipes and reseeds the dev database (refuses when `NODE_ENV=production` unless `--force`) |
| `npm start` | Runs the production builds of API and web |

The tests use `mongodb-memory-server`, which downloads a `mongod` binary on first run. To use one you already have, set `MONGOMS_SYSTEM_BINARY=/path/to/mongod` or `MONGO_TEST_URI=mongodb://127.0.0.1:27017`.

## Environment variables

**`apps/api/.env`**

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | — | Connection string |
| `JWT_SECRET` | — | At least 32 characters; signs admin tokens |
| `JWT_EXPIRES_IN` | `12h` | Admin session length |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated origins for HTTP and socket.io |
| `TRUST_PROXY` | `loopback` | Express trust proxy, so rate limits see the real client IP |
| `PORT` | `4000` | API port |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | — | Admin created by the seed script |

**`apps/web/.env.local`**

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API and socket URL used by the browser |
| `API_INTERNAL_URL` | `NEXT_PUBLIC_API_URL` | API URL used by the Next.js admin proxy (server side) |
| `NEXT_PUBLIC_USE_MOCK` | `false` | `true` runs the customer screens on an in-browser mock, with no API needed |
| `NEXT_PUBLIC_IMAGE_HOSTS` | `images.unsplash.com` | Hosts `next/image` optimizes; other hosts still render, unoptimized |

## Folder structure

```
.
├─ docker-compose.yml          MongoDB for local development
├─ packages/shared             @district-viii/shared: DTO types, enums, socket event names,
│                              phone and name validation, Asia/Kolkata business-day helpers
├─ apps/api                    NestJS 11 + Mongoose
│  ├─ src/availability         pure slot rules (availability.logic.ts) and GET /availability, /units/summary
│  ├─ src/bookings             create, list, approve, reject, cancel, lookup by phone
│  ├─ src/units                units CRUD, live status, cron that releases expired busy units
│  ├─ src/slots                admin-blocked hours
│  ├─ src/food  src/settings  src/dashboard (aggregation pipelines)
│  ├─ src/auth                 admin login, JWT strategy, guards
│  ├─ src/realtime             socket.io gateway and emitter
│  ├─ src/seed                 npm run seed
│  └─ test                     e2e tests
└─ apps/web                    Next.js 16 (App Router)
   ├─ src/app/(customer)       /, /home, /pool, /ps5, /food, /my-booking inside the phone-style AppShell
   ├─ src/app/admin            /admin/login and the (panel) routes with sidebar, toasts and realtime
   ├─ src/app/api/admin        login, logout and the authenticated proxy to the API
   ├─ src/proxy.ts             redirects signed-out visitors away from /admin
   ├─ src/features             screen-level components (booking, my-booking, food, admin/*)
   ├─ src/components           shared UI (customer) and components/admin (light theme, charts)
   ├─ src/hooks                data, live updates, focus trap, countdowns
   └─ src/lib                  api.ts (customer), admin-api.ts, socket.ts, mock-data.ts, config
```

## Business rules

- **Hours:** open 12 PM to 4 AM by default (Settings → `openHour`, `closeHour`). A closing hour at or before the opening hour means the session runs past midnight. Equal hours mean open 24 hours.
- **Business date:** every booking stores a `businessDate`. Slots from midnight until closing belong to the previous day's session, so 1 AM on the 23rd is booked under the 22nd. All date logic runs in **Asia/Kolkata** (fixed UTC+05:30) through the helpers in `packages/shared/src/time.ts`.
- **Slots:** one unit, one slot (one hour by default; `slotDurationHours` can be 1 to 4). `startHour` is the real clock hour.
- **Booking window:** customers can book today's session plus the following days, `bookingWindowDays` in total (default 3). Admin walk-ins can go up to 30 days ahead.
- **Late booking:** a slot stays bookable for 30 minutes after it starts, then shows as `past`.
- **Flow:** a customer submits name and phone. The booking is `pending` and holds the slot until an admin approves or rejects it. Statuses are `pending`, `approved`, `rejected` and `cancelled`. Walk-ins created by an admin are approved immediately.
- **Double booking is impossible:** a unique partial index on `{unitId, businessDate, startHour}` covers only `pending` and `approved` bookings, so MongoDB rejects a second hold even under concurrent requests. The API turns that into a `409`. Rejecting or cancelling a booking frees the slot.
- **Customer cancel:** `PATCH /bookings/:id/cancel` with the matching phone, for pending bookings only. Admins call the same route with their token and may also cancel approved bookings.
- **Unit status:** `free`, `busy` (with `busyUntil`) or `maintenance`. A cron job runs every minute and sets busy units back to free once `busyUntil` passes. Slots overlapping the busy time, and admin-blocked hours, show as unavailable.
- **"Free right now"** (Home cards): the unit is active, not busy or in maintenance, and its current slot is neither held nor blocked. When none are free, `nextFreeAt` gives the earliest time one frees up.
- **Phones:** 10-digit Indian mobiles (starting 6 to 9), optionally prefixed with +91. They are stored as 10 digits.
- **Food:** customers see available items without prices. The optional `price` is visible to admins only.

## API overview

The full reference is in Swagger at **`/docs`**. Every error has the same shape: `{ statusCode, error, message, details?, path, timestamp }`.

| Area | Public | Admin (Bearer JWT) |
| --- | --- | --- |
| Units | `GET /units`, `GET /units/summary` | `GET /admin/units`, `POST /units`, `PATCH /units/:id`, `PATCH /units/:id/status`, `DELETE /units/:id` |
| Availability | `GET /availability?type=pool\|ps5&date=YYYY-MM-DD` | — |
| Bookings | `POST /bookings`, `GET /bookings/by-phone/:phone`, `PATCH /bookings/:id/cancel` (phone) | `GET /bookings` (status, type, from, to, search, page, pageSize, sort, order), `PATCH /bookings/:id/approve\|reject\|cancel`, `POST /bookings/admin` |
| Blocked slots | — | `GET/POST /admin/slots`, `PATCH/DELETE /admin/slots/:id` |
| Food | `GET /food`, `GET /food/categories` | `GET/POST /admin/food`, `PATCH/DELETE /admin/food/:id`, `PATCH /admin/food/:id/toggle` |
| Settings | `GET /settings/public` | `GET/PUT /admin/settings` |
| Dashboard | — | `GET /admin/dashboard/stats`, `bookings-per-day?days=7`, `peak-hours`, `usage-by-type`, `status-split` |
| Auth | `POST /auth/login` | `GET /auth/me`, `GET /auth/socket-token` |

**Realtime (socket.io on the API origin):**
- **Events:** `availability:changed`, `booking:updated` (id and status only) and `unit:updated` go to everyone. `booking:created`, which includes customer details, goes only to sockets that joined the admin room with a valid token.
- **Clients:** the customer app invalidates its queries on these events and falls back to polling every 15 seconds. The admin panel shows a toast for each new request and refreshes the pending badge.

## Security notes

- **Admin token:** the admin JWT lives in an **httpOnly, SameSite=Lax cookie** set by `/api/admin/login`. Browser code never sees it.
- **Admin proxy:** admin calls go through `/api/admin/proxy/*`, which attaches the bearer token on the server. Mutating calls must send an `x-admin-request` header, which cross-site forms can't set.
- **Admin sockets:** they authenticate with a 5-minute socket token from `GET /auth/socket-token`.
- **Route protection:** `proxy.ts` redirects signed-out visitors away from `/admin` as an optimistic check. The API guard verifies every admin request.
- **Input handling:**
  - Validation rejects unknown fields (`whitelist`, `forbidNonWhitelisted`).
  - Free text is trimmed and stripped of HTML tags and control characters.
  - Search input is regex-escaped.
- **Rate limits:** 10/min on public booking and cancel, 20/min on lookup by phone, 5/min on login. Helmet is enabled.
- **Logging:** phone numbers are masked in logs (`*******210`). Error logs never include request bodies or parameters.

## Landing photo

Drop a dark neon pool-hall and PS5 image at `apps/web/public/images/landing-bg.jpg`. No code change is needed. Until then, a burgundy gradient fallback shows.
