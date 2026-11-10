# GroupGrub — Group Food Ordering App (v0.1)

A web app that makes **large group food orders** easy (a marching band, a robotics team, a club event).
An organizer picks a nearby restaurant, starts a group order, and shares a link. Members add their own
items, and the restaurant receives one clean, scheduled bulk order.

- Not a delivery-driver service — restaurants handle pickup or their own delivery.
- No real payments in v0.1 — orders show a total; payment happens outside the app.

> **Build status:** Milestones 1–4 (setup, database + sample data, login, restaurant search) are done. See [Milestones](#milestones) below.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Prisma ORM 6 |
| Auth | Auth.js (NextAuth v4), email + password, bcryptjs |
| Validation | Zod |
| Tests | Vitest |

No paid services or API keys are needed.

## Setup on a fresh Mac

1. **Install Node.js 20 or newer.** The easiest way is [Homebrew](https://brew.sh):
   ```bash
   brew install node
   ```
   Check it worked: `node -v` should print `v20` or higher.

2. **Clone the repo and install packages:**
   ```bash
   git clone <repo-url>
   cd diamond-challenge
   npm install
   ```
   ⚠️ Don't skip this. Without it, `npx prisma …` downloads the newest Prisma (v7), which
   doesn't work with this project and fails with *"The datasource property `url` is no longer
   supported"*. This project pins Prisma **6.19.3**.

3. **Create your `.env` file** from the example (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
   Then set `AUTH_SECRET` to your own random value (it signs login cookies):
   ```bash
   openssl rand -base64 32
   ```
   Optionally change `DEFAULT_LAT` / `DEFAULT_LNG` to where you'll be testing.

4. **Create the database** (this also loads the sample data the first time):
   ```bash
   npm run db:migrate
   ```
   (Same as `npx prisma migrate dev`, but always uses the project's own Prisma version.)

5. **Load (or reload) the sample data** — safe to run again any time:
   ```bash
   npm run db:seed
   ```

6. **Start the app:**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## Accounts and logins

There are two separate account types with separate pages:

| Role | Sign up | Log in | Lands on |
|---|---|---|---|
| Customer (organizer) | `/signup` | `/login` | `/restaurants` |
| Restaurant owner | `/owner/signup` | `/owner/login` | `/owner/dashboard` |

- Roles are checked on the server in two places: `middleware.ts` (before a page loads) and
  `requireRole()` / `requireRoleApi()` in `lib/session.ts` (inside every protected page and API route).
- A customer opening `/owner/...` is sent to `/restaurants`; an owner opening customer pages is sent to `/owner/dashboard`.
- Group-order participants who open a shared link don't need an account (Milestone 6).

## ⚠️ Sample restaurants and test logins

No real restaurant has joined yet, so the seed creates **8 made-up SAMPLE restaurants** placed
0.5–15 miles from `DEFAULT_LAT` / `DEFAULT_LNG`. Every one has a name starting with `[SAMPLE]`,
a fake `... Example St` address, a `555-01xx` phone number, and `isSample = true` in the database.

All test accounts use the password **`password123`**:

| Email | Role | Restaurant |
|---|---|---|
| `customer@example.com` | Customer | — |
| `owner1@example.com` | Owner | [SAMPLE] Slice Society Pizza |
| `owner2@example.com` | Owner | [SAMPLE] Casa Ejemplo Taqueria |
| `owner3@example.com` | Owner | [SAMPLE] Golden Wok Kitchen |
| `owner4@example.com` | Owner | [SAMPLE] Seoul Bowl House |
| `owner5@example.com` | Owner | [SAMPLE] Example Street Deli |
| `owner6@example.com` | Owner | [SAMPLE] Masala Example House |
| `owner7@example.com` | Owner | [SAMPLE] Big Example Burgers |
| `owner8@example.com` | Owner | [SAMPLE] Olive & Example Grill |

**Before launching with real partners**, delete every sample restaurant (with its menu, orders,
and the sample accounts above):

```bash
npm run db:remove-samples
```

Real restaurants (`isSample = false`) are never touched. To just *hide* samples from search without
deleting them, set `SHOW_SAMPLE_RESTAURANTS="false"` in `.env` (search arrives in Milestone 4).

**Testing far from Austin?** The samples are placed around `DEFAULT_LAT` / `DEFAULT_LNG`, and search
shows restaurants within 25 mi by default. If your browser shares a location far away, you'll see
no results. Either click "Search the default area", type `78701` in the ZIP box, or set
`DEFAULT_LAT` / `DEFAULT_LNG` in `.env` to your own area and run `npm run db:seed` again.

To wipe the whole database and start over: `npx prisma migrate reset`.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at localhost:3000 |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | Lint the code |
| `npm test` | Run unit tests |
| `npm run db:migrate` | Apply database schema changes |
| `npm run db:seed` | Load the SAMPLE restaurants and test logins |
| `npm run db:remove-samples` | Delete all SAMPLE restaurants, their data, and sample accounts |
| `npm run db:studio` | Open Prisma Studio to browse the database |

## Folder structure

```
app/              Pages and API routes (Next.js App Router). Folders = URLs.
  layout.tsx      Shared page shell + nav bar
  page.tsx        Landing page ("/")
components/       Reusable React components (cards, badges, forms)
lib/              Plain TypeScript logic: database client, pricing, distance, order status
  db.ts           Shared Prisma client
  auth.ts         Auth.js login setup (email + password, role in session)
  session.ts      requireRole() / requireRoleApi() server-side role checks
  geo.ts          Haversine distance in miles (+ geo.test.ts)
  zipLookup.ts    PLACEHOLDER ZIP/city → coordinates table (no paid API)
  restaurantSearch.ts  Search filters + distance sorting (+ test)
  format.ts       Money, distance, and time display helpers
middleware.ts     Redirects users away from pages their role can't use
types/            TypeScript additions (session has user id + role)
prisma/
  schema.prisma   Database models (all money is integer cents)
  migrations/     Database change history (commit these)
  seed.ts         SAMPLE restaurants + test logins
  removeSamples.ts  Deletes all sample data (npm run db:remove-samples)
.env.example      Template for your local .env
```

## Milestones

1. ✅ Setup — Next.js + TypeScript + Tailwind + Prisma (SQLite), README, `.env.example`
2. ✅ Data + seed — Prisma schema, clearly marked `[SAMPLE]` restaurants, `db:remove-samples`
3. ✅ Auth — separate customer/owner sign-up & login, role-protected routes
4. ✅ Restaurant search — geolocation, ZIP fallback, distance sorting, filters
5. ⬜ Owner tools — profile, menu, bulk pricing, order rules
6. ⬜ Group ordering — share link, participant entry, pricing, submit
7. ⬜ Owner order management — dashboard, kitchen summary, status actions
8. ⬜ Order history — list, timeline, reorder, cancel
9. ⬜ Polish — loading/error states, mobile layout, tests
