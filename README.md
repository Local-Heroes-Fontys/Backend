# Local Heroes Backend

REST API for Local Heroes, built with Node.js, TypeScript, Express and MySQL.

## Getting started

You need [Node.js 24+](https://nodejs.org) and a MySQL server. The easiest way to get MySQL is
[Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm install
cp .env.example .env     # then set your own passwords in .env
docker compose up -d     # starts MySQL in the background
npm run dev              # starts the API and restarts it when you save a file
```

Check that it works by opening <http://localhost:3000/api/health>. You should see:

```json
{ "status": "ok", "database": "up" }
```

## Scripts

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Run the API in watch mode                   |
| `npm run build`     | Compile TypeScript into `dist/`             |
| `npm start`         | Run the compiled API from `dist/`           |
| `npm test`          | Run the tests                               |
| `npm run typecheck` | Check types without compiling               |
| `npm run lint`      | Find code problems (`lint:fix` to auto-fix) |
| `npm run format`    | Format all files (`format:check` to verify) |

## Project structure

```text
database/migrations/   SQL files that create and change the tables
src/
  config/              Environment variables, validated at startup
  controllers/         Read the request, call a service, send the response
  db/                  MySQL connection pool
  errors/              Custom error classes
  middleware/          Code that runs around requests (errors, 404s, auth)
  repositories/        SQL queries, one file per table or feature
  routes/              Map URLs to controllers
  services/            Business rules
  types/               Shared TypeScript types
  validators/          Zod schemas that check incoming data
  app.ts               Creates and configures the Express app
  server.ts            Starts the app
tests/                 Automated tests
```

## How a request flows

```text
route -> controller -> service -> repository -> MySQL
```

Each layer only talks to the next one, so SQL stays in repositories and no service touches `req`
or `res`.

## Adding a new feature

For example, to add clubs:

1. Add the table in `database/migrations/`.
2. Add the queries in `src/repositories/clubs.repository.ts`.
3. Add the rules in `src/services/clubs.service.ts`.
4. Add the input schemas in `src/validators/clubs.validator.ts`.
5. Add the handlers in `src/controllers/clubs.controller.ts`.
6. Add the URLs in `src/routes/clubs.routes.ts` and register them in `src/routes/index.ts`.
7. Add tests in `tests/clubs.test.ts`.

The `health` route is a small working example of the route, controller and service layers.

Always pass values to SQL through `?` placeholders. Never build queries by joining strings, because
that allows SQL injection:

```ts
await pool.query('SELECT * FROM clubs WHERE id = ?', [id]);
```
