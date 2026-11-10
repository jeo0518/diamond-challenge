# GroupGrub — Group Food Ordering App (v0.1)

A web app that makes **large group food orders** easy (a marching band, a robotics team, a club event).
An organizer picks a nearby restaurant, starts a group order, and shares a link. Members add their own
items, and the restaurant receives one clean, scheduled bulk order.

- Not a delivery-driver service — restaurants handle pickup or their own delivery.
- No real payments in v0.1 — orders show a total; payment happens outside the app.

> **Build status:** Milestone 1 (project setup) is done. See [Milestones](#milestones) below.

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

4. **Create the database:**
   ```bash
   npx prisma migrate dev
   ```
   *(Milestone 1 has no tables yet, so this step starts doing real work in Milestone 2.)*

5. **Start the app:**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at localhost:3000 |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | Lint the code |
| `npm test` | Run unit tests |
| `npm run db:migrate` | Apply database schema changes |
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
  schema.prisma   Database models
  seed.ts         Sample data (Milestone 2)
.env.example      Template for your local .env
```

## Milestones

1. ✅ Setup — Next.js + TypeScript + Tailwind + Prisma (SQLite), README, `.env.example`
2. ⬜ Data + seed — Prisma schema, clearly marked `[SAMPLE]` restaurants, `db:remove-samples`
3. ⬜ Auth — separate customer/owner sign-up & login, role-protected routes
4. ⬜ Restaurant search — geolocation, ZIP fallback, distance sorting, filters
5. ⬜ Owner tools — profile, menu, bulk pricing, order rules
6. ⬜ Group ordering — share link, participant entry, pricing, submit
7. ⬜ Owner order management — dashboard, kitchen summary, status actions
8. ⬜ Order history — list, timeline, reorder, cancel
9. ⬜ Polish — loading/error states, mobile layout, tests
