# Putting GroupGrub online

This guide puts the app on the internet with two free services:

- **Vercel** runs the website (made by the company behind Next.js).
- **Neon** hosts the Postgres database (SQLite only works on your own computer).

Time needed: about 30–45 minutes the first time.

> **Who should do this:** an adult (club advisor, teacher, or parent) should create and own the
> Vercel and Neon accounts, with a student helping. The accounts hold real people's data once
> restaurants join. Vercel's free "Hobby" plan is meant for **non-commercial** projects; check
> their current terms, and move to a paid plan if you ever start charging money.
>
> Website menus change often, so a button may be named a little differently than written here.

---

## How it works (the short version)

| | On your Mac (development) | Online (production) |
|---|---|---|
| Database | SQLite file `prisma/dev.db` | Postgres on Neon |
| Schema file Prisma uses | `prisma/schema.prisma` | `prisma/postgres/schema.prisma` (generated, don't edit) |
| Migrations | `prisma/migrations/` | `prisma/postgres/migrations/` |
| Start command | `npm run dev` | Vercel runs `npm run build` |

The app picks the database by looking at `DATABASE_URL`: a `postgresql://…` address means Postgres,
`file:./dev.db` means SQLite. When it's Postgres, `npm run build` does three things on every deploy:
1. `prisma generate` for Postgres
2. `prisma migrate deploy`: creates or updates the database tables
3. `next build`

---

## Step 1: Create the database on Neon

1. Go to **neon.com** and sign up (signing in with GitHub is easiest).
2. Create a new project. Name it `groupgrub`. Pick the region closest to your town (e.g. a US East or US West region).
3. Open the project's **Connect** / **Connection details** panel. If it lets you pick a framework, choose **Prisma**.
4. Copy **two** connection strings and keep them somewhere private, like a password manager. They contain a password.
   - **Pooled** connection (the host name contains `-pooler`): this becomes `DATABASE_URL`.
   - **Direct** connection (connection pooling turned **off**): this becomes `DIRECT_URL`.

   If Neon's Prisma instructions show extra settings (like `?sslmode=require` or `pgbouncer=true`), keep them exactly as shown.

## Step 2: Make a login secret

On your Mac, run:

```bash
openssl rand -base64 32
```

Copy the output. This becomes `AUTH_SECRET`. It's different from the one in your local `.env`, and you never share it.

## Step 3: Create the site on Vercel

1. Go to **vercel.com** and sign up with GitHub.
2. Click **Add New… → Project** and import the `diamond-challenge` repository. If you don't see it, give Vercel access to that repo.
3. **Framework preset:** Next.js (it should pick this by itself).
4. **Build Command:** leave it at the default (`npm run build`). If you set it to `npm run build:vercel`
   earlier, that works too, since it does the same thing.
5. **Environment Variables:** add these (Production):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `DIRECT_URL` | Neon **direct** connection string |
   | `AUTH_SECRET` | the value from Step 2 |
   | `APP_TIME_ZONE` | your time zone, e.g. `America/Chicago`, `America/New_York`, `America/Denver`, `America/Los_Angeles` |
   | `DEFAULT_LAT` | latitude of your town center (e.g. `30.2672`) |
   | `DEFAULT_LNG` | longitude of your town center (e.g. `-97.7431`) |
   | `SHOW_SAMPLE_RESTAURANTS` | `false` |

6. Click **Deploy**. The first build takes a few minutes. It also creates all the database tables on Neon.

## Step 4: Tell the login system the site's address

1. When the deploy finishes, Vercel shows the site's address, like `https://groupgrub-xyz.vercel.app`.
2. In the Vercel project go to **Settings → Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXTAUTH_URL` | your site's address, e.g. `https://groupgrub-xyz.vercel.app` (no slash at the end) |

3. Go to **Deployments**, open the latest one, and choose **Redeploy** so the new setting takes effect.

## Step 5: Check that it works

1. Open the site. The landing page should load.
2. **Sign up as a customer** with your own email. You should land on "Find a restaurant", which will be empty because there are no restaurants yet.
3. In a private window, **sign up as an owner** and create a test restaurant called `[TEST] Our Team Kitchen`.
   Add a menu item and a time slot, then check you can find it as the customer and start an order.
4. When you're done testing, go to **Settings** on the test restaurant and turn off **Accepting group orders**.
   That hides it from search. (Deleting restaurants isn't built yet.)

The live site **never** has sample restaurants. Don't run `npm run db:seed` against the live database.

## Step 6: Your first real restaurant

Follow "Asking restaurants" and "How they join" in the README. Sit with the owner while they sign up at
`https://<your-site>/owner/signup`, so the account email and password belong to **them**.

---

## Updating the live site

**Normal code changes:** push to the `main` branch. Vercel deploys it automatically in a few minutes.

**Database changes** (you edited `prisma/schema.prisma`):

1. Update your local SQLite database, the same as before:
   ```bash
   npm run db:migrate
   ```
   Give the migration a name when asked.
2. Create the matching **Postgres** migration for the live site:
   ```bash
   npm run db:pg:migration -- short_name_here
   ```
   This writes `prisma/postgres/migrations/<date>_short_name_here/migration.sql`. If it prints a ⚠️ DROP warning,
   read the file carefully: dropped data is gone for good.
3. Run the tests. One test fails if you forgot step 2:
   ```bash
   npm test
   ```
4. Commit **both** migration folders and push. The live database is updated during the next deploy.

---

## Troubleshooting

| Problem | What to check |
|---|---|
| `the URL must start with the protocol file:` | The site was built for SQLite. Check `DATABASE_URL` in Vercel starts with `postgresql://`, then **Redeploy** with **"Use existing Build Cache" unchecked**. In the build log, look for `Database: Postgres (live site)`. (On your Mac, `.env` must keep `DATABASE_URL="file:./dev.db"`.) |
| Build fails with `Environment variable not found: DIRECT_URL` (or `DATABASE_URL`) | Add the variable in Vercel → Settings → Environment Variables, then redeploy. |
| Build fails with `P1001: Can't reach database server` | Wrong or incomplete connection string. Copy it from Neon again; keep any `?sslmode=require`. |
| Errors mentioning `prepared statement` | Add `pgbouncer=true` to the end of `DATABASE_URL` (use `&` if it already has a `?`). |
| Logging in sends you back to the login page | `AUTH_SECRET` is missing, or `NEXTAUTH_URL` doesn't exactly match the site's address. Fix it and redeploy. |
| Pickup times are off by several hours | `APP_TIME_ZONE` is missing or wrong. |
| The first page load after a quiet period is slow | Neon's free plan pauses the database when it's idle; it wakes up in a few seconds. |
| Restaurant search is empty for customers | Restaurants must turn on **Accepting group orders** and add time slots. Customers more than 25 mi away need to pick "Any distance". |

## Before you announce it publicly

Right now, **anyone** can sign up as a restaurant owner and appear in search. Before sharing the link widely,
add a "restaurants must be approved first" step (planned next). Also add a short terms and privacy page,
including a note that restaurants are responsible for their allergy and ingredient information.

Back up the database now and then. Neon keeps some history on the free plan, and you can also download a full copy:

```bash
pg_dump "<DIRECT_URL>" > groupgrub-backup.sql
```

Keep that file private: it contains users' emails and password hashes.
