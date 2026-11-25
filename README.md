# GroupGrub — Group Food Ordering App (v0.1)

A web app that makes **large group food orders** easy (a marching band, a robotics team, a club event).
An organizer picks a nearby restaurant, starts a group order, and shares a link. Members add their own
items, and the restaurant receives one clean, scheduled bulk order.

- Not a delivery-driver service — restaurants handle pickup or their own delivery.
- No real payments in v0.1 — orders show a total; payment happens outside the app.

> **Build status:** v0.1 is feature-complete — all 9 milestones are done. See [Definition of Done](#definition-of-done-v01).
> **Going live:** see [docs/DEPLOY.md](docs/DEPLOY.md) (Vercel + Neon Postgres, free plans).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Prisma ORM 6 on your computer; Postgres online (see [docs/DEPLOY.md](docs/DEPLOY.md)) |
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
   git clone https://github.com/jeo0518/diamond-challenge.git
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
   Optionally change `DEFAULT_LAT` / `DEFAULT_LNG` to where you'll be testing, and `APP_TIME_ZONE`
   to your time zone (e.g. `America/New_York`).

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
- Owner API routes (`app/api/owner/...`) use `requireOwnerApi()` in `lib/owner.ts`, which only ever
  loads the caller's own restaurant, so an owner can't touch another restaurant's data.

## Owner tools

| Page | What owners do there |
|---|---|
| `/owner/restaurant` | Profile: name, cuisine, address, map coordinates, phone, hours, photo URL. A new owner starts here. |
| `/owner/menu` | Categories and items, available on/off, option groups (e.g. Size: required, pick 1). |
| `/owner/pricing` | Bulk discount tiers, service/delivery fees, per-item bulk prices, live price preview. |
| `/owner/settings` | Accepting orders on/off, min/max size, lead time, pickup/delivery, time slots, notes. |

Deleting a menu item or category only hides it (soft delete), so past orders never change.

## Group orders (how the core flow works)

1. A logged-in customer opens a restaurant and clicks **Start Group Order** (`/restaurants/[id]/start`):
   event name, a time slot (only slots past the lead time with room left), pickup or delivery, headcount,
   and a deadline for people to add items.
2. They land on **`/group/[id]`** with a share link like `http://localhost:3000/join/k3Jd9xQ2mPzr`.
3. Anyone with the link opens **`/join/[shareCode]`**, types a name (no account), and adds items.
   Their browser keeps a random token, so they can change or remove **only their own** items until the deadline.
4. The organizer's page refreshes every 15 seconds: who ordered what, item totals, and the price with bulk
   discounts. They can remove any item, add items for anyone, or close collection early.
5. **Submit to Restaurant** re-checks the rules on the server (min/max items, lead time, slot capacity,
   items still available), calculates the price on the server, freezes the totals, and sets the status to `SUBMITTED`.

6. The restaurant owner sees it on **`/owner/dashboard`** (tabs: New, Upcoming, Ready, Past; orders due within
   24 hours are highlighted). **`/owner/orders/[id]`** shows items **by person** (for labeling bags), a
   **kitchen summary** (total of each item + option combo), the frozen price, and the history. The owner moves
   it through **Accept → Preparing → Ready → Completed**, or **Rejects** it with a required reason, and can
   leave a note the organizer sees. The red badge next to "Orders" polls every 30 seconds.

7. The customer follows along on **`/orders`** (Active and Past, newest first) and **`/orders/[id]`**:
   a status timeline, items by person, the frozen price, and the restaurant's note or reject reason.
   - **Cancel**: allowed while `COLLECTING` or `SUBMITTED`, not after the restaurant accepts.
   - **Reorder**: starts a new `COLLECTING` order at the same restaurant with the same people's items,
     at **today's** prices. You pick a new time. Items that were removed or whose options changed are
     skipped, and the page lists them.

8. **Printable summary** (`/orders/[id]/print`, for the band director or coach): who gets what with
   check boxes for handing out food, and **who owes what**. The **split cost** view (also on the order page)
   gives each person a share of the total in proportion to what they ordered, so the discount and fees are
   shared the same way, and the shares always add up to the exact total.

**Testing with several "people":** open the share link in different browsers or a private/incognito window.
Each one is a separate participant. To try it from a phone on the same Wi-Fi, run `npm run dev -- -H 0.0.0.0`
and open `http://<your-Mac's-IP>:3000` on the phone (find the IP in System Settings → Wi-Fi → Details).

**Time zone note:** time slots like "4:00 PM" are in `APP_TIME_ZONE` from `.env` (default `America/Chicago`),
never the server's own clock, because hosting servers usually run on UTC. One time zone for the whole app in v0.1;
a per-restaurant time zone is a TODO.

**Delivery distance:** we check the delivery ZIP against the small placeholder ZIP table (or the organizer's
browser location), since there's no paid address lookup. The street address is only stored for delivery orders.

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

## Troubleshooting

| Problem | Fix |
|---|---|
| `The datasource property url is no longer supported` (Prisma 7 error) | You skipped `npm install`, so `npx` downloaded Prisma 7. Run `npm install`, then `npm run db:migrate`. This project uses Prisma **6.19.3**. |
| `npm error ERESOLVE` mentioning `prisma@7` or `vitest@5` | Your `package.json` was changed. Restore it: `git checkout -- package.json package-lock.json`, then `rm -rf node_modules` and `npm install`. Don't use `--force`. |
| `Module not found: Can't resolve 'next-auth/react'` (or another package) | New packages were added. Stop the dev server, run `npm install`, start it again. |
| `PrismaClientValidationError` / `Unknown argument` | The database changed. Stop the dev server, run `npm run db:migrate` (or `npx prisma generate`), start it again. |
| No restaurants in search | Samples sit around `DEFAULT_LAT`/`DEFAULT_LNG`. Type `78701` in the ZIP box, or set your own coordinates in `.env` and run `npm run db:seed`. |
| `[next-auth][warn][NEXTAUTH_URL]` in the terminal | Harmless during local development. Before deploying, add `NEXTAUTH_URL="https://your-site"` to `.env`. |
| `database is locked` | Close any SQLite viewer that has `prisma/dev.db` open, then retry. |

**After every `git pull`:** stop the dev server → `npm install` → `npm run db:migrate` → `npm run dev`.

## Viewing the database

- `npm run db:studio` opens Prisma Studio at http://localhost:5555.
- Or open `prisma/dev.db` with a free SQLite app (DB Browser for SQLite, TablePlus, or the VS Code "SQLite Viewer" extension).
  Money is stored in cents (`1800` = $18.00).

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at localhost:3000 |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | Lint the code |
| `npm test` | Run the unit tests (pricing, distance, status transitions, time slots, and more) |
| `npm run db:migrate` | Apply database schema changes |
| `npm run db:seed` | Load the SAMPLE restaurants and test logins |
| `npm run db:remove-samples` | Delete all SAMPLE restaurants, their data, and sample accounts |
| `npm run db:pg:migration -- <name>` | After a schema change: create the matching **Postgres** migration for the live site |
| `npm run build:vercel` | What Vercel runs on deploy (Postgres client + migrations + build) |
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
  pricing.ts      Group order price calculation, spec Section 10 (+ pricing.test.ts)
  owner.ts        Owner page/API helpers (role + "your own restaurant" checks)
  validation/     Zod schemas for every form and API input
  timezone.ts     All date math in APP_TIME_ZONE, not the server's clock (+ test)
  postgresSchema.ts  Builds the Postgres schema from the SQLite one (+ sync test)
scripts/          db:pg:schema and db:pg:migration helpers
docs/DEPLOY.md    Step-by-step guide to put the site online
  orderStatus.ts  Allowed status changes (+ test)
  timeSlots.ts    Weekly rules → bookable time slots (+ test)
  orderLines.ts   Checks option choices and builds order line snapshots (+ test)
  submitChecks.ts Rules an order must pass before it's sent (+ test)
  groupOrders.ts  Database helpers for group orders
  ownerOrders.ts  Owner dashboard tabs, new-order count, "due soon" (+ test)
  kitchenSummary.ts  Totals per item + option combo for the kitchen (+ test)
  timeline.ts     Customer status timeline steps (+ test)
  reorder.ts      Copies old order lines onto the current menu (+ test)
middleware.ts     Redirects users away from pages their role can't use
types/            TypeScript additions (session has user id + role)
prisma/
  schema.prisma   Database models (all money is integer cents)
  migrations/     Database change history for SQLite (commit these)
  postgres/       GENERATED Postgres schema + migrations for the live site (don't edit by hand)
  seed.ts         SAMPLE restaurants + test logins
  removeSamples.ts  Deletes all sample data (npm run db:remove-samples)
.env.example      Template for your local .env
```

## Milestones

1. ✅ Setup — Next.js + TypeScript + Tailwind + Prisma (SQLite), README, `.env.example`
2. ✅ Data + seed — Prisma schema, clearly marked `[SAMPLE]` restaurants, `db:remove-samples`
3. ✅ Auth — separate customer/owner sign-up & login, role-protected routes
4. ✅ Restaurant search — geolocation, ZIP fallback, distance sorting, filters
5. ✅ Owner tools — profile, menu, bulk pricing, order rules
6. ✅ Group ordering — share link, participant entry, pricing, submit
7. ✅ Owner order management — dashboard, kitchen summary, status actions
8. ✅ Order history — list, timeline, reorder, cancel
9. ✅ Polish — error and 404 screens, phone layouts, tests, printable summary + split cost

## Definition of Done (v0.1)

Each item was checked by automated browser tests (Playwright) against a production build, plus unit tests:

- [x] Fresh clone → `npm install` → `npx prisma migrate dev` → `npm run db:seed` → `npm run dev` works by following this README.
- [x] Every sample restaurant shows `[SAMPLE]` in its name and the yellow SAMPLE badge on cards, detail pages, and order screens.
- [x] A customer finds nearby restaurants, starts a group order, shares the link, 3 participants add items in different browsers, and the order is submitted.
- [x] The owner sees the order with per-participant and kitchen-summary views and moves it through Accept → Preparing → Ready → Completed.
- [x] The customer sees status changes and the order in their history, and can reorder.
- [x] Customers can't reach owner pages; owners can't see other restaurants' data (pages show 404, APIs return 403/404).
- [x] Pricing, distance, and status-transition unit tests pass (`npm test`).

## Not in v0.1 (on purpose)

Real payments (see `// TODO: payments` in `app/api/group-orders/[id]/submit/route.ts`), driver dispatch, notifications,
reviews, paid map APIs/address autocomplete, native apps, an admin panel, and per-restaurant time zones.

## Changing the database schema

1. Edit `prisma/schema.prisma` (the only schema file you edit).
2. Run `npm run db:migrate` for your local SQLite database.
3. Run `npm run db:pg:migration -- <short_name>` to create the Postgres migration for the live site.
4. Run `npm test`. A test fails if step 3 was forgotten.
5. Commit both `prisma/migrations/` and `prisma/postgres/`.
