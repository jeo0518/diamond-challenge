# GroupGrub — Group Food Ordering App (v0.1)

A web app that makes **large group food orders** easy (a marching band, a robotics team, a club event).
An organizer picks a nearby restaurant, starts a group order, and shares a link. Members add their own
items, and the restaurant receives one clean, scheduled bulk order.

- Not a delivery-driver service — restaurants handle pickup or their own delivery.
- No real payments in v0.1 — orders show a total; payment happens outside the app.

> **Build status:** Milestones 1–2 (setup, database + sample data) are done. See [Milestones](#milestones) below.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Prisma ORM 6 |
| Auth | Auth.js / NextAuth, email + password, bcrypt (Milestone 3) |
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

3. **Create your `.env` file** from the example (never commit `.env`):
   ```bash
   cp .env.example .env
   ```
   Optionally change `DEFAULT_LAT` / `DEFAULT_LNG` to where you'll be testing.

4. **Create the database** (this also loads the sample data the first time):
   ```bash
   npx prisma migrate dev
   ```

5. **Load (or reload) the sample data** — safe to run again any time:
   ```bash
   npm run db:seed
   ```

6. **Start the app:**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

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
3. ⬜ Auth — separate customer/owner sign-up & login, role-protected routes
4. ⬜ Restaurant search — geolocation, ZIP fallback, distance sorting, filters
5. ⬜ Owner tools — profile, menu, bulk pricing, order rules
6. ⬜ Group ordering — share link, participant entry, pricing, submit
7. ⬜ Owner order management — dashboard, kitchen summary, status actions
8. ⬜ Order history — list, timeline, reorder, cancel
9. ⬜ Polish — loading/error states, mobile layout, tests
