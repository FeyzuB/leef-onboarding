# Stadsbeheer Onboarding Portal

Personal onboarding plans for new team members. A lead creates an account for a new hire, gives them a plan copied from their team's template, and tailors it to the person: steps, goals and timeframes. The new hire works through the plan; the lead sees where everyone is and who is stuck.

Built for the R&D developers (who work on LEEF) first; teams and roles are data, so other teams can be added later without code changes.

Spec: [LEEF Onboarding Portal — Spec](https://claude.ai/code/artifact/4abc36a7-ec91-48aa-8979-9d324a884207)

## What it does

| Who | Can |
| --- | --- |
| New hire | See their plan and goals (with a *This week* list of what is due now and what is overdue), tick off steps and goals, flag a step as "stuck" with a note, read the team's *Where to find things* page and the *Who is who* organogram |
| Lead | Create new-hire accounts and reset their passwords; create plans from a template; tailor plans (add, edit, remove, reorder steps; plan steps in a week of onboarding or on a fixed date; add or remove goals); see progress, overdue steps and goals, and stuck steps; edit templates (steps with their week, and goals that are copied into every new plan), the team page and the organogram |
| Admin | Everything a lead can, across all teams, plus create lead and admin accounts and manage teams and roles (*Teams & roles* page) |

Key behaviours:

- **A plan is a copy of a template.** Editing a template does not change running plans until a lead pushes the changes (per plan, or *Push to all plans* on the template). A push updates steps the lead never touched, adds new template steps, and drops deleted ones. Steps the lead tailored or removed stay as they are, and progress is never lost.
- **Goals** have a fixed date or "within N weeks of the start date"; they show as overdue the day after they are due.
- **New team:** an admin adds it on *Teams & roles* (plus a role if needed), creates the team's lead on *People*, and the lead or admin creates the team's template. A team or role can only be deleted while nothing uses it.
- **Passwords:** leads create accounts with a temporary password; users must change it at first login. Forgotten passwords are reset by a lead (no email).

## Run it locally

Requirements: Docker Desktop (or Docker Engine with Compose).

```sh
cp .env.example .env
# Set SESSION_SECRET to a random string of at least 32 characters:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# Set ADMIN_PASSWORD to the first admin's temporary password.

docker compose up -d --build
```

Open http://localhost:3000 and log in as `admin` with `ADMIN_PASSWORD`. You'll be asked to choose your own password.

On every start the container applies database migrations and seeds what is missing. On an empty database that is the R&D team, the Developer role, the *Developer* template and the R&D *Where to find things* page; after that only the first admin is created if there is none. The seed never overwrites existing data, so starter data you delete or rename in the app stays that way.

## Develop

```sh
npm install
npx prisma generate
docker compose up -d db          # Postgres on 127.0.0.1:5432
npx prisma migrate dev           # apply migrations
npm run db:seed
npm run dev                      # http://localhost:3000
```

| Command | Does |
| --- | --- |
| `npm test` | Unit tests for ordering, links, dates and progress (`lib/logic.ts`); no database needed |
| `npm run test:db` | Integration test for plan creation and template pushes; needs the database |
| `npm run type-check` / `npm run lint` | TypeScript and ESLint |
| `npx prisma migrate dev --name <change>` | Create a migration after editing `prisma/schema.prisma` |

### Layout

```
app/(app)/        pages behind login: my-plan, overview, people, plans, templates, team, organogram
app/actions/      server actions (every one checks the user's role and team itself)
app/login, app/change-password
components/       shared UI
lib/logic.ts      pure logic: module ordering, links, dates, progress (unit tested)
lib/plans.ts      plan creation and template push
lib/auth.ts       sessions, roles, team scoping
prisma/           schema, migrations, seed
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (compose sets it for the app container) |
| `SESSION_SECRET` | Signs login sessions; at least 32 random characters. Changing it logs everyone out |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` | First admin, created only when no admin exists |
| `APP_TIMEZONE` | Decides what "today" is for start dates, the current week and overdue steps and goals (default `Europe/Amsterdam`) |
| `COOKIE_SECURE` | `true` when served over HTTPS |
| `ALLOWED_ORIGINS` | Host names when running behind a reverse proxy, comma-separated |
| `APP_PORT`, `POSTGRES_PASSWORD`, `DB_PORT` | Docker Compose ports and database password |

## Deploying

The target is the internal server used for internal tools (not yet decided which). On that server:

1. Copy the repository, create `.env` from `.env.example` with a fresh `SESSION_SECRET`, a strong `POSTGRES_PASSWORD` and the first `ADMIN_PASSWORD`.
2. `docker compose up -d --build`.
3. Behind a reverse proxy with HTTPS: set `COOKIE_SECURE=true` and `ALLOWED_ORIGINS=<the portal's host name>`.
4. Back up the `db-data` volume (e.g. a nightly `pg_dump`).

The GitLab `deploy` job is a manual placeholder until the server is chosen.

## Not in this version

- Search across plans and templates (phase 2).
- Login attempt limiting is in memory: 5 failures lock a username for 15 minutes and resets on restart. Fine for one internal instance.
