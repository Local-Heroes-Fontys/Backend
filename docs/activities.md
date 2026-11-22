# Activities: the example feature

Club representatives create and manage the activities of their club. Parents browse, filter and
view them. This feature is the reference for how we build features in this backend. When you add a
new one, copy its structure.

## Setup

See [Getting started](../README.md#getting-started). In short: `docker compose up -d`,
`npm run db:deploy`, `npm run db:seed`, `npm run dev`.

- **Migrations** live in `database/migrations/` and are generated from `database/schema.prisma`.
  `db:deploy` only applies migrations that haven't run yet. It never resets data.
- **The seed** (`database/seed.ts`) adds the sports (Voetbal, Zwemmen, Tennis, Basketbal, Judo).
  Outside production it also adds a demo club with representative `vertegenwoordiger@demo-club.nl`.
  It only adds missing rows, so running it again is safe.

## The data

```text
Sport 1 ──── * Activity * ──── 1 SportsClub 1 ──── * ClubRepresentative
                  │ 1
                  * CostItem
```

| Table        | Notes                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| `sports`     | Fixed list from the seed. Names are Dutch. Activities pick one and never create one. |
| `activities` | One weekly time slot: `weekday`, `startTime`, `endTime` as `"HH:mm"`.                |
| `cost_items` | `amount` is `DECIMAL(8,2)`. Deleted automatically with their activity (`CASCADE`).   |

**The database checks the rules too.** The migration `*_add_activity_checks` adds MySQL `CHECK`
constraints for a non-blank name, `minAge <= maxAge <= 99`, `"HH:mm"` times, `startTime < endTime`
and `amount >= 0`. The API validates all of this first and gives clear messages. The constraints
are a safety net for data that doesn't come through the API, like seeds or manual SQL. Prisma's
schema language can't describe CHECK constraints, which is why they're written by hand in that
migration. If you change a rule in the validator, add a new migration that changes the constraint too.

Allowed values:

| Field                 | Values                                             |
| --------------------- | -------------------------------------------------- |
| `setting`             | `INDOOR`, `OUTDOOR`                                |
| `weekday`             | `MONDAY` … `SUNDAY`                                |
| `costItems.type`      | `MEMBERSHIP`, `REGISTRATION`, `EQUIPMENT`, `OTHER` |
| `costItems.frequency` | `ONCE`, `PER_SESSION`, `MONTHLY`, `YEARLY`         |

## How a request flows

Take `POST /api/activities`:

| Step | File                                          | What happens                                                                                                                    |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `src/routes/activities.routes.ts`             | Matches the URL and runs `requireClubRepresentative` first.                                                                     |
| 2    | `src/middleware/requireClubRepresentative.ts` | Checks the `Bearer` token and loads the representative (and their club) from the database. 401 if invalid.                      |
| 3    | `src/controllers/activities.controller.ts`    | Validates the body with `activityBodySchema.parse()`. Invalid input gives a 400 with a list of fields.                          |
| 4    | `src/validators/activities.validator.ts`      | The Zod rules: lengths, ages, times, amounts and allowed values.                                                                |
| 5    | `src/services/activities.service.ts`          | Business rules: the sport must exist, the club comes from the logged-in user, picks 403 or 404 when PUT/DELETE matched nothing. |
| 6    | `src/repositories/activities.repository.ts`   | The Prisma queries. Activity and cost items are saved in one transaction. PUT/DELETE only match `id` + `clubId`.                |
| 7    | `src/services/activities.service.ts`          | `toActivityResponse()` turns the database record into the response DTO (`src/types/activities.types.ts`).                       |
| 8    | `src/middleware/errorHandler.ts`              | Any `AppError` or `ZodError` thrown along the way becomes a JSON error with the right status code.                              |

Errors always look like this:

```json
{
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "costItems.0.amount",
        "message": "Amount must be 0 or more with at most 2 decimals"
      }
    ]
  }
}
```

`details` is only there for validation errors (400).

The club's `contactName`, `contactPhone` and `contactEmail` in an activity can be `null` when the
club chose not to share them.

## Endpoints

Reading is public. Writing needs `Authorization: Bearer <token>` of a club representative.

| Method | URL                   | Who                                   | Success |
| ------ | --------------------- | ------------------------------------- | ------- |
| GET    | `/api/sports`         | everyone                              | 200     |
| GET    | `/api/activities`     | everyone                              | 200     |
| GET    | `/api/activities/:id` | everyone                              | 200     |
| POST   | `/api/activities`     | club representative                   | 201     |
| PUT    | `/api/activities/:id` | representative of the activity's club | 200     |
| DELETE | `/api/activities/:id` | representative of the activity's club | 204     |

Other status codes: `400` invalid input or unknown sport, `401` no or invalid token, `403` activity
of another club, `404` activity not found.

To try the protected endpoints locally, get a token for the demo representative:

```bash
TOKEN=$(npm run -s token:dev -- vertegenwoordiger@demo-club.nl)
```

### GET /api/sports

```json
{
  "data": [
    { "id": 4, "name": "Basketbal" },
    { "id": 5, "name": "Judo" },
    { "id": 3, "name": "Tennis" },
    { "id": 1, "name": "Voetbal" },
    { "id": 2, "name": "Zwemmen" }
  ]
}
```

### POST /api/activities: create an activity with several cost items

Send all cost items in the `costItems` array. `costItems` is required, and `[]` means the
activity is free. A `clubId` in the body is ignored: the club is always the one of the logged-in
representative.

```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "Zwemles A-diploma",
    "description": "Zwemles voor beginners in een klein groepje.",
    "sportId": 2,
    "minAge": 5,
    "maxAge": 8,
    "setting": "INDOOR",
    "weekday": "SATURDAY",
    "startTime": "09:00",
    "endTime": "09:45",
    "location": "Zwembad De Tongelreep, Eindhoven",
    "costItems": [
      { "type": "REGISTRATION", "amount": "20.00", "frequency": "ONCE" },
      { "type": "MEMBERSHIP", "amount": "32.50", "frequency": "MONTHLY" },
      { "type": "EQUIPMENT", "amount": "12.95", "frequency": "YEARLY" }
    ]
  }'
```

Response `201`. This is also the shape of every activity in the other responses:

```json
{
  "id": 1,
  "name": "Zwemles A-diploma",
  "description": "Zwemles voor beginners in een klein groepje.",
  "sport": { "id": 2, "name": "Zwemmen" },
  "club": {
    "id": 1,
    "name": "Demo Sportclub Eindhoven",
    "address": "Stratumsedijk 1, 5611 NA Eindhoven",
    "contactName": "Demo Vertegenwoordiger",
    "contactPhone": "040 123 4567",
    "contactEmail": "info@demo-club.nl"
  },
  "minAge": 5,
  "maxAge": 8,
  "setting": "INDOOR",
  "weekday": "SATURDAY",
  "startTime": "09:00",
  "endTime": "09:45",
  "location": "Zwembad De Tongelreep, Eindhoven",
  "costItems": [
    { "id": 1, "type": "REGISTRATION", "amount": "20.00", "frequency": "ONCE" },
    { "id": 2, "type": "MEMBERSHIP", "amount": "32.50", "frequency": "MONTHLY" },
    { "id": 3, "type": "EQUIPMENT", "amount": "12.95", "frequency": "YEARLY" }
  ],
  "createdAt": "2026-11-15T10:30:00.000Z",
  "updatedAt": "2026-11-15T10:30:00.000Z"
}
```

### GET /api/activities

Optional query parameters:

| Parameter  | Meaning                                                           | Default |
| ---------- | ----------------------------------------------------------------- | ------- |
| `sportId`  | Only activities of this sport                                     | –       |
| `clubId`   | Only activities of this club                                      | –       |
| `age`      | Only activities where `minAge <= age <= maxAge`. Nothing is saved | –       |
| `page`     | Page number, starting at 1                                        | 1       |
| `pageSize` | Items per page, at most 50                                        | 20      |

`GET /api/activities?age=6&sportId=2`

```json
{
  "data": [{ "id": 1, "name": "Zwemles A-diploma", "...": "same shape as above" }],
  "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

### GET /api/activities/:id

Returns one activity in the shape above, or `404 { "error": { "message": "Activity not found" } }`.

### PUT /api/activities/:id

Send the **complete** activity, with the same body as POST. Cost items are **replaced**, not merged:

- All existing cost items of the activity are deleted.
- The cost items in your request are created, with new ids.
- To keep an item, include it again. To remove all items (free activity), send `"costItems": []`.

This happens in one transaction, so if anything fails, nothing changes. Response `200` with the
updated activity. A representative of another club gets `403`.

### DELETE /api/activities/:id

Deletes the activity and its cost items. Response `204` with no body.

## Costs: why there is no total

Each cost item is returned with its own frequency. We do not add them up, because
"€20 once + €32.50 per month + €12.95 per year" is not one meaningful number. The frontend shows
the items separately.

Amounts are `DECIMAL` in MySQL and strings like `"32.50"` in JSON. They are never converted to a
JavaScript `number`, because numbers can't store most decimals exactly (`0.1 + 0.2 !== 0.3`). The
API accepts both `"32.50"` and `32.5` as input.

## Tests

Two kinds of tests:

- `tests/activities.test.ts` calls the API and uses the real `local_heroes_test` database. It empties
  the tables before each test. It covers saving activities with cost items, the age and sport filters
  (including the boundary ages), pagination, validation errors, the unknown-sport check, 401s, that
  one club cannot change or delete another club's activity, and that the database CHECK constraints
  refuse bad rows.
- `tests/activities.service.test.ts` tests only the service's decisions. The repositories are
  replaced by mocks (`vi.mock`), so no database query runs. It checks which club the activity is
  saved under, and when the service answers 400, 403 or 404.

## Assumptions and missing pieces

- **No login endpoint yet.** There was no authentication in the project. This feature adds the
  minimum needed: a signed JWT (`JWT_SECRET`) that says which representative is calling, checked by
  `requireClubRepresentative`. The club is always looked up in the database, never taken from the
  token or the request. The login feature should use `createRepresentativeToken()` from
  `src/services/auth.service.ts` after checking the password. Until then, use `npm run token:dev`
  (it refuses to run in production).
- **Clubs and representatives** are described in [clubs.md](clubs.md). Clubs have an approval
  status, but nothing enforces it yet: activities of not-yet-approved clubs are visible for now.
- **Free activity** = an empty `costItems` list.
- **One weekly time slot** per activity, within one day (`startTime` before `endTime`).
- **API messages are in English**, like the existing errors. The frontend shows Dutch text to users.
  Sport names are Dutch because they come straight from the database.

## Following this pattern

1. **Schema.** Add your models to `database/schema.prisma`, then run
   `npm run db:migrate -- --name <what_changed>`. Commit the new folder in `database/migrations/`.
2. **Repository.** Put only Prisma calls here. Use a shared `include` so every query returns the same shape.
   Take input as a type from `src/types/`, not from the validator. When a write may only touch the
   user's own rows, put the owner in the `where` (`{ id, clubId }`), so the check and the write are one
   operation.
3. **Validator.** Write a Zod schema per input (body, query, params). Use `z.enum(PrismaEnum)` for
   fixed values, and `.refine()` for rules that compare two fields.
4. **Types.** Define the repository input type and the response DTOs. Never send Prisma records
   straight to the client.
5. **Service.** Put the business rules here (existence checks, ownership) and map records to DTOs.
   Throw `AppError(status, message)` for expected problems.
6. **Controller.** Parse the input, call the service, send the result. Nothing else.
7. **Routes.** Add `requireClubRepresentative` (or a future middleware for other roles) to write routes.
   Register the router in `src/routes/index.ts`.
8. **Tests.** Copy the `beforeEach` from `tests/activities.test.ts` and test the happy path,
   validation, and who may do what. Put service rules in a separate unit test with mocked repositories.
9. **Database rules.** For rules the database must also enforce, add CHECK constraints in a
   migration made with `npm run db:migrate -- --create-only --name <name>`, then fill in the SQL.
