# PulseBoard

PulseBoard is a lightweight team status/standup app. Team members post daily
text updates tagged with a status (`on-track`, `blocked`, or `done`), react to
teammates' updates with emoji, and browse a feed filtered by user or status.

This repo is the starter project for the freeCodeCamp/NHCarrigan Summer 2026
Cohort sprint phase. It's a real, runnable full-stack app - fork it, claim an
issue, and open a PR. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the
issue-claiming workflow.

## Stack

- **Frontend**: Next.js (App Router), React, plain CSS
- **API**: Node.js + Express, Mongoose
- **Database**: MongoDB
- **Auth**: JWT (email + password, bcrypt-hashed). This is intentionally
  simple for a sprint exercise - there's no email verification or password
  reset flow.
- **Tests**: Jest + Supertest (API), Jest + Testing Library (frontend)

## Quickstart

The fastest way to run the whole stack is Docker Compose:

```bash
cp .env.example .env
docker-compose up --build
```

This starts three services:

- `mongo` - MongoDB on port `27017`
- `api` - Express API on [http://localhost:4000](http://localhost:4000)
- `web` - Next.js frontend on [http://localhost:3000](http://localhost:3000)

Once it's up, seed some demo data:

```bash
docker-compose exec api npm run seed
```

Then open [http://localhost:3000](http://localhost:3000) and log in with one
of the seeded accounts (see `api/src/seed.js` for emails - the password for
all of them is `password123`), or register your own.

### Running without Docker

You'll need a local or remote MongoDB instance - if you don't already have
one, before doing anything below, seriously consider just
[installing Docker](https://docs.docker.com/get-docker/) instead and using
the Quickstart above. It gets you MongoDB *and* the API *and* the frontend
running with one command, which is almost always less friction than any of
the options below just to get a database.

If Docker genuinely isn't an option for you (locked-down work laptop, no
admin rights, etc.), pick whichever of these is easiest:

- **No local install: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  free tier.** Sign up (no card needed for the free tier), create a free M0
  cluster, add a database user under "Database Access," allow your IP (or
  `0.0.0.0/0` for simplicity while developing) under "Network Access," then
  copy the connection string Atlas gives you into `api/.env` as `MONGO_URI`.
- **Local install:** grab [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  for your OS. Once it's running, the default `MONGO_URI` in `.env.example`
  (`mongodb://localhost:27017/pulseboard`) will just work as-is.

If you skip this and try to run the app anyway, you'll hit a Mongoose
`MongooseServerSelectionError` - that error means the app can't reach any
MongoDB server at the address in `MONGO_URI`, not a problem with your JWT
secret or anything else in `.env`.

```bash
# API
cd api
cp .env.example .env  # or copy relevant values from the root .env.example
npm install
npm run seed   # optional, populates demo data
npm run dev

# Frontend, in a second terminal
cd web
npm install
npm run dev
```

## Architecture

```
pulseboard/
├── api/            Express REST API
│   └── src/
│       ├── models/      Mongoose schemas (User, Update)
│       ├── routes/      auth.js, updates.js
│       ├── middleware/  JWT auth middleware
│       ├── config/      MongoDB connection
│       ├── seed.js      demo data seeder
│       └── app.js       Express app factory (used by tests + server.js)
├── web/            Next.js App Router frontend
│   └── app/
│       ├── components/  AuthPanel, UpdateForm, Feed, UpdateCard
│       └── page.js       main feed page
├── docker-compose.yml
└── .github/workflows/ci.yml
```

### API overview

| Method | Route                              | Auth required | Description                     |
| ------ | ----------------------------------- | -------------- | -------------------------------- |
| POST   | `/api/auth/register`                | no             | Create an account                |
| POST   | `/api/auth/login`                   | no             | Log in, get a JWT                |
| GET    | `/api/updates`                      | no             | List updates, optional `?author=` / `?status=` filters |
| GET    | `/api/updates/:id`                  | no             | Get a single update              |
| POST   | `/api/updates`                      | yes            | Post a new status update         |
| POST   | `/api/updates/:id/reactions`        | yes            | Add an emoji reaction            |
| DELETE | `/api/updates/:id/reactions/:rid`   | yes            | Remove your own reaction         |

The data model is intentionally shallow: a `User` has an email, display name,
and password hash. An `Update` has an author, text body, status, and an
embedded array of reactions (emoji + reacting user).

## Testing

```bash
# API tests (spins up an in-memory MongoDB, no external DB needed)
cd api
npm install
npm test

# Frontend tests
cd web
npm install
npm test
```

CI runs both suites on every push and pull request - see
[.github/workflows/ci.yml](./.github/workflows/ci.yml).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to claim an issue, the PR
workflow, and how to run tests locally before you submit.

## License

[MIT](./LICENSE)
