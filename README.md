# Kite

A self-hosted invoice and expense tracking app for freelancers and small businesses.

Next.js (App Router) + Prisma/PostgreSQL + S3-compatible object storage (MinIO locally, S3/R2 in
production) + `@react-pdf/renderer` for invoice PDFs. Single-operator auth — no self-service
signup, no roles/permissions.

## Local development

Requires Docker (for Postgres + MinIO) and Node 20+.

```bash
cp .env.example .env          # adjust AUTH_SECRET / KITE_SEED_PASSWORD if desired
npm install
npm run docker:up             # starts Postgres (5433) + MinIO (9010, console 9011)
npm run db:migrate            # applies Prisma migrations
npm run db:seed               # creates the operator user + default company
npm run dev                   # http://localhost:3010
```

Ports are non-default (3010 / 5433 / 9010-9011) to avoid clashing with other local Docker
projects that use the standard 3000 / 5432 / 9000 ports.

Sign in with `KITE_OPERATOR_EMAIL` (default `operator@example.com`) and `KITE_SEED_PASSWORD`
(default `changeme` — override in `.env` before seeding).

## Running everything in Docker

`npm run docker:up:all` (or `docker compose up -d` directly) also builds and runs the Next.js
app itself (`app` service, host port 3010), so the whole stack — app, Postgres, MinIO — can run
without a local Node install. Use `npm run docker:down:all` to stop everything, including the
app container.

## Useful scripts

| Script                   | Purpose                                          |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Next.js dev server on port 3010 (local dev mode)   |
| `npm run build`           | Production build                                   |
| `npm run db:migrate`      | Create/apply a Prisma migration                    |
| `npm run db:studio`       | Prisma Studio GUI against the local DB             |
| `npm run db:seed`         | Seed the operator user + default company           |
| `npm run docker:up`       | Start only Postgres + MinIO (local dev mode)        |
| `npm run docker:down`     | Stop Postgres + MinIO                              |
| `npm run docker:up:all`   | Start everything, including the built app container|
| `npm run docker:down:all` | Stop everything, including the app container       |

## Production / Supabase

Prisma's schema is unchanged whether `DATABASE_URL` points at the local Docker Postgres or a
hosted Supabase Postgres instance — swapping the connection string is enough, no code fork.
Same idea for storage: point `STORAGE_ENDPOINT`/credentials at S3 or Cloudflare R2 instead of
MinIO for production.
