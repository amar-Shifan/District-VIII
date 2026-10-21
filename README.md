# District VIII

Customer app for **District VIII**, a gaming arena in Panoor: 3 eight-ball pool tables, 2 PS5 stations and a kitchen.

This is a monorepo with npm workspaces:

| Workspace  | Status    | Stack                                                                                |
| ---------- | --------- | ------------------------------------------------------------------------------------ |
| `apps/web` | ✅ built  | Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, Framer Motion, GSAP, TanStack Query |
| `apps/api` | ✅ built  | NestJS 11, Mongoose, Passport JWT, socket.io, @nestjs/schedule, Swagger at `/docs` |
| `packages/shared` | ✅ built | Shared DTO types, enums, validation rules and Asia/Kolkata time helpers |

## Backend quick start

```bash
docker compose up -d mongo          # or run a local mongod on 27017
cp apps/api/.env.example apps/api/.env
npm run seed -w apps/api            # demo units, food, bookings and admin@district8.local
npm run dev:api                     # http://localhost:4000, Swagger at /docs
npm test                            # unit + e2e tests (in-memory MongoDB)
```

## Setup

Requires Node.js 20.9 or newer.

```bash
npm install                      # from the repo root; installs every workspace
cp apps/web/.env.example apps/web/.env.local
npm run dev                      # http://localhost:3000
```

Other root scripts: `npm run build`, `npm run start`, `npm run lint`.

## Routes

| Route         | Screen                                                     |
| ------------- | ---------------------------------------------------------- |
| `/`           | Landing: animated brand title and slide-to-open control    |
| `/home`       | Home: live pool and PS5 availability, plus the food card   |
| `/pool`, `/ps5`, `/food`, `/my-booking` | Placeholders, built in later tasks |

## Folder structure

```
apps/web/
├─ .env.example
├─ public/images/              # put landing-bg.jpg here
└─ src/
   ├─ app/
   │  ├─ globals.css           # design tokens (colors, radius, shadows, animations) live here
   │  ├─ layout.tsx            # fonts (Anton, Manrope), metadata, providers
   │  └─ (customer)/           # every customer screen, wrapped in AppShell
   │     ├─ page.tsx           # /
   │     ├─ home/              # /home
   │     └─ pool | ps5 | food | my-booking/
   ├─ features/
   │  ├─ landing/LandingScreen.tsx
   │  └─ home/HomeScreen.tsx
   ├─ components/              # reusable UI: AppShell, SlideToOpen, AnimatedTitle, ParticleField,
   │                           # HomeHeader, HomeCard, AvailabilityCard, FoodCard, StatusPill,
   │                           # CountUp, CardSkeleton, LandingBackground, PlaceholderScreen
   ├─ hooks/use-live-data.ts   # TanStack Query hooks (15s refetch)
   └─ lib/
      ├─ api.ts                # typed service layer (the only data entry point)
      ├─ mock-data.ts          # mock backend used while USE_MOCK is on
      ├─ config.ts             # API_URL, USE_MOCK, refetch interval
      ├─ types.ts              # API contracts shared with the future NestJS DTOs
      └─ venue.ts              # static venue facts (closing time, unit counts)
```

Admin routes can later go in a separate route group (for example `app/(admin)/`) outside the phone shell. The shell's no-scroll rule only applies inside `AppShell`.

## Design system

All tokens are defined once, in `apps/web/src/app/globals.css`, as a Tailwind v4 `@theme`. That block also removes Tailwind's default palette, so only these colors exist:

| Token                    | Value     | Utility example         |
| ------------------------ | --------- | ----------------------- |
| `--color-burgundy`       | `#7A1020` | `bg-burgundy`           |
| `--color-burgundy-dark`  | `#4A0812` | `bg-burgundy-dark`      |
| `--color-burgundy-bright`| `#A01830` | `ring-burgundy-bright`  |
| `--color-ink`            | `#0A0A0A` | `bg-ink`                |
| `--color-white`          | `#FFFFFF` | `text-white`            |
| `--color-blush`          | `#E8D5D8` | `text-blush` (captions) |

Gradients, glows and text effects are named utilities in the same file, for example `bg-card-gradient`, `shadow-card`, `text-shine` and `border-glow`. Every looping animation is gated behind `motion-safe:`, and Framer Motion runs with `reducedMotion="user"`.

## Adding the landing photo

Save a dark, neon pool-hall and PS5 scene as:

```
apps/web/public/images/landing-bg.jpg
```

No code change is needed. `next/image` serves and optimizes it, a burgundy overlay tints it, and the Ken Burns animation runs on it. Until the file exists, a layered burgundy gradient with noise is shown instead, and the browser console logs a harmless 404 for the image. A portrait image of at least 1290×2796 works best.

## Swapping the mock for the real API

Components never fetch directly. They use the hooks in `src/hooks/use-live-data.ts`, which call `src/lib/api.ts`. To switch to NestJS, edit `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_USE_MOCK=false
```

Restart `npm run dev`, since `NEXT_PUBLIC_*` values are inlined at build time. The API must serve:

| Function               | Request                   | Response                                                                 |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `getUnitsSummary()`    | `GET /units/summary`      | `{ pool: { total, free, nextFreeAt? }, ps5: { total, free, nextFreeAt? } }` |
| `getMyBookingStatus()` | `GET /bookings/me/status` | `{ hasPending: boolean }`                                                |

`nextFreeAt` is an ISO 8601 timestamp. The UI formats it as local `HH:MM`. Requests are sent with `credentials: "include"`, so enable CORS with credentials for the web origin in NestJS. The shared shapes are in `src/lib/types.ts`.

The mock adds about 550 ms of latency and rotates through four scenarios every 20 seconds, including a "Full" state, so you can watch live updates and the full-card state while developing.
