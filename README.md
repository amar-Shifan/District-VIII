# District VIII

Booking app for **District VIII**, a gaming arena in Panoor with 3 eight-ball pool tables, 2 PS5 stations and a kitchen. Customers check live availability and request hourly slots from their phone. Staff approve requests, manage units and keep the menu up to date in the admin panel.

Everything is **one Next.js app**: the pages and the backend (`app/api/*` route handlers) deploy together as a single Vercel project. The only outside service is MongoDB, for example MongoDB Atlas.

## Quick start (local)

Requires **Node.js 20.9+** and **MongoDB** (Docker or a local `mongod`).

```bash
npm install                                      # installs and builds packages/shared
docker compose up -d mongo                       # or run a local mongod on 27017
cp apps/web/.env.example apps/web/.env.local     # then set JWT_SECRET (see the comment in the file)
npm run seed                                     # demo units, menu, bookings and the admin account
npm run dev                                      # http://localhost:3000
```

| URL | What |
| --- | --- |
| http://localhost:3000 | Customer app (slide to open) |
| http://localhost:3000/admin | Admin panel |
| http://localhost:3000/docs | API docs (Swagger UI; JSON at `/api/docs`) |

**Demo admin:** `admin@district8.local` / `District8!Pool-PS5-2026`. Both come from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `apps/web/.env.local`; use a different password for a real database.

**On your phone:** open `http://<your computer's IP>:3000` on the same Wi-Fi (run `ipconfig` to find the IP).

### Scripts (repo root)

| Script | Does |
| --- | --- |
| `npm run dev` | Shared package (watch) + Next.js dev server |
| `npm run build` | Production build (builds the shared package first) |
| `npm start` | Runs the production build |
| `npm run lint` | All workspaces |
| `npm test` | Vitest: availability rules, double-booking race, end-to-end API flow (in-memory MongoDB) |
| `npm run seed` | Wipes and reseeds the database at `MONGODB_URI` (refuses when `NODE_ENV=production` unless `--force`) |

The tests use `mongodb-memory-server`, which downloads a `mongod` binary on first run. To use one you already have, set `MONGOMS_SYSTEM_BINARY=/path/to/mongod` or `MONGO_TEST_URI=mongodb://127.0.0.1:27017`.

## Deploy to Vercel

1. **Database (MongoDB Atlas, free tier):**
   - In your Vercel project, open **Storage → Marketplace → MongoDB Atlas** and create a free cluster. Vercel adds `MONGODB_URI` for you.
   - Or create a cluster at mongodb.com/atlas: add a database user, allow `0.0.0.0/0` under Network Access, and copy the connection string with `/district8` before the `?`.
2. **Import the repo in Vercel:**
   - Framework: **Next.js**.
   - Root Directory: **`apps/web`**.
   - Leave the build and install commands as the defaults.
3. **Environment variables** (Project → Settings → Environment Variables):

   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | Atlas connection string, if the integration didn't add it |
   | `JWT_SECRET` | 32+ random characters |
   | `JWT_EXPIRES_IN` | `12h` (optional) |
   | `NEXT_PUBLIC_IMAGE_HOSTS` | `images.unsplash.com` (optional) |
   | `VAPID_PUBLIC_KEY` | Web Push public key (required for device push) |
   | `VAPID_PRIVATE_KEY` | Matching Web Push private key; keep secret |
   | `VAPID_SUBJECT` | Contact URI such as `mailto:you@example.com` |

4. **Deploy.** Then create the admin account and demo data once, from your computer:
   - Temporarily set `MONGODB_URI` in `apps/web/.env.local` to the Atlas string.
   - Change `SEED_ADMIN_PASSWORD`, then run `npm run seed`.
   - Switch `MONGODB_URI` back. The seed **deletes** everything in that database, so only run it before real bookings exist.
5. Every push to the connected branch redeploys automatically.

### Admin device notifications

Generate one VAPID key pair from the repository root with `npx web-push generate-vapid-keys`. Copy the public and private keys into `apps/web/.env.local`; set the same values in Vercel under **Settings â†’ Environment Variables** for each environment you deploy. Set `VAPID_SUBJECT` to a contact URI such as `mailto:you@example.com`. Keep the pair stable and never commit the private key. Redeploy after changing Vercel environment variables. Push delivery is disabled when these values are absent.

Admins can enable device push and notification sound from the bell panel after signing in. Permission is requested only after enabling push. The site must be served from HTTPS (localhost is also treated as secure by browsers). Push delivery depends on browser and operating-system support, notification permission, and the browser's push service. On iPhone and iPad, Web Push generally requires a supported iOS/iPadOS version and the site added to the Home Screen. The browser may need to be opened once after installation before the service worker is active. Logging out removes the current browser's subscription; other devices remain subscribed.

## Environment variables (`apps/web/.env.local`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | — | MongoDB connection string |
| `JWT_SECRET` | — | At least 32 characters; signs admin sessions |
| `JWT_EXPIRES_IN` | `12h` | Admin session length |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | — | Admin created by `npm run seed` |
| `NEXT_PUBLIC_USE_MOCK` | `false` | `true` runs the customer screens on an in-browser mock (no database) |
| `NEXT_PUBLIC_IMAGE_HOSTS` | `images.unsplash.com` | Hosts `next/image` optimizes; other hosts still render, unoptimized |
| `VAPID_PUBLIC_KEY` | â€” | Public Web Push application-server key |
| `VAPID_PRIVATE_KEY` | â€” | Secret Web Push application-server key; do not commit or expose to the browser |
| `VAPID_SUBJECT` | â€” | Contact URI included in VAPID requests, e.g. `mailto:you@example.com` |

## Folder structure

```
.
├─ docker-compose.yml           MongoDB for local development
├─ packages/shared              @district-viii/shared: DTO types, enums, phone/name validation,
│                               Asia/Kolkata business-day helpers (used by pages and API)
└─ apps/web                     The whole product (Next.js 16, App Router)
   ├─ src/app/(customer)        /, /home, /pool, /ps5, /food, /my-booking in the phone-style AppShell
   ├─ src/app/admin             /admin/login and the (panel) routes with sidebar and live toasts
   ├─ src/app/api               REST API as route handlers (one folder per endpoint)
   ├─ src/app/docs              Swagger UI for /api/docs
   ├─ src/proxy.ts              redirects signed-out visitors away from /admin
   ├─ src/server                backend code (server-only)
   │  ├─ models.ts              Mongoose schemas and indexes
   │  ├─ db.ts                  cached connection for serverless
   │  ├─ http.ts                route wrapper, error shape, rate limits, parsing
   │  ├─ validation.ts          zod request schemas
   │  ├─ auth.ts                admin login, JWT session cookie, guards
   │  ├─ live.ts                change counter behind live updates
   │  ├─ openapi.ts             API description
   │  └─ services/              units, availability (+ pure rules), bookings, slots, food, settings, dashboard
   ├─ src/features, src/components, src/hooks, src/lib    screens, UI, data hooks, clients
   ├─ scripts/seed.ts           npm run seed
   └─ test/                     end-to-end API test and helpers
```

## Business rules

- **Hours:** open 12 PM to 4 AM by default (Settings → `openHour`, `closeHour`). A closing hour at or before the opening hour means the session runs past midnight; equal hours mean open 24 hours.
- **Business date:** every booking stores a `businessDate`. Slots from midnight until closing belong to the previous day's session, so 1 AM on the 23rd is booked under the 22nd. All date logic runs in **Asia/Kolkata** (fixed UTC+05:30) through `packages/shared/src/time.ts`.
- **Slots:** one unit, one slot (one hour by default; `slotDurationHours` can be 1 to 4). `startHour` is the real clock hour.
- **Booking window:** customers book today's session plus the following days, `bookingWindowDays` in total (default 3). Admin walk-ins can go up to 30 days ahead.
- **Late booking:** a slot stays bookable for 30 minutes after it starts, then shows as `past`.
- **Flow:** a customer submits name and phone. The booking is `pending` and holds the slot until an admin approves or rejects it. Statuses: `pending`, `approved`, `rejected`, `cancelled`. Walk-ins created by an admin are approved immediately.
- **Double booking is impossible:** a unique partial index on `{unitId, businessDate, startHour}` covers only `pending` and `approved` bookings, so MongoDB rejects a second hold even under concurrent requests. The API returns `409`. Rejecting or cancelling frees the slot.
- **Customer cancel:** `PATCH /api/bookings/:id/cancel` with the matching phone, for pending bookings only. Admins may also cancel approved bookings.
- **Unit status:** `free`, `busy` (with `busyUntil`) or `maintenance`. A unit whose `busyUntil` has passed counts as free immediately, and is written back to `free` the next time units or availability are read. Slots overlapping the busy time, and admin-blocked hours, show as unavailable.
- **"Free right now"** (Home cards): the unit is active, not busy or in maintenance, and its current slot is neither held nor blocked. When none are free, `nextFreeAt` gives the earliest time one frees up.
- **Phones:** 10-digit Indian mobiles (starting 6 to 9), optionally prefixed with +91, stored as 10 digits.
- **Food:** customers see available items without prices. The optional `price` is admin-only.

## API overview

The full reference is at **`/docs`** (Swagger UI). Every error has the same shape: `{ statusCode, error, message, details?, path, timestamp }`.

| Area | Public | Admin |
| --- | --- | --- |
| Units | `GET /api/units`, `GET /api/units/summary` | `GET /api/admin/units`, `POST /api/units`, `PATCH /api/units/:id`, `PATCH /api/units/:id/status`, `DELETE /api/units/:id` |
| Availability | `GET /api/availability?type=pool\|ps5&date=YYYY-MM-DD` | — |
| Bookings | `POST /api/bookings`, `GET /api/bookings/by-phone/:phone`, `PATCH /api/bookings/:id/cancel` (phone) | `GET /api/bookings` (status, type, from, to, search, page, pageSize, sort, order), `PATCH /api/bookings/:id/approve\|reject\|cancel`, `POST /api/bookings/admin` |
| Blocked slots | — | `GET/POST /api/admin/slots`, `PATCH/DELETE /api/admin/slots/:id` |
| Food | `GET /api/food`, `GET /api/food/categories` | `GET/POST /api/admin/food`, `PATCH/DELETE /api/admin/food/:id`, `PATCH /api/admin/food/:id/toggle` |
| Settings | `GET /api/settings/public` | `GET/PUT /api/admin/settings` |
| Dashboard | — | `GET /api/admin/dashboard/stats \| bookings-per-day \| peak-hours \| usage-by-type \| status-split` (`?days=`) |
| Live | `GET /api/live` | `GET /api/admin/live?since=` |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout` | `GET /api/auth/me` |

**Live updates:** Vercel functions can't hold sockets, so every change bumps a counter in the database.
- **Customer screens** poll `/api/live` every 4 seconds, a single tiny read, and refetch only when the counter moves.
- **The admin panel** polls `/api/admin/live`, which also returns new pending requests, shown as toasts and on the pending badge.

## Security notes

- **Admin session:** an httpOnly, SameSite=Lax cookie holds a signed JWT (Secure in production). Browser code never reads it.
- **CSRF:** admin changes sent with the cookie must include the `x-admin-request: 1` header, which cross-site forms can't set. Bearer tokens are also accepted, for scripts and tests.
- **Route protection:** `proxy.ts` verifies the session signature before showing `/admin` pages, and every admin API route checks it again.
- **Input:**
  - Validation rejects unknown fields.
  - Free text is trimmed and stripped of HTML tags and control characters.
  - Search input is regex-escaped.
- **Rate limits (per IP, per server instance):** 10/min on booking and cancel, 20/min on lookup by phone, 5/min on login, 240/min overall.
- **Headers:** security headers (`nosniff`, frame options, HSTS, referrer policy) on every response, and `no-store` on the API.
- **Logging:** phone numbers are masked in logs (`*******210`), and errors never log request bodies.

## Landing photo

The background is `apps/web/public/images/landing-bg.jpg`, shown in grayscale at low opacity under the burgundy overlay. Replace the file to use your own photo.
