# Sports clubs and club representatives

A sports club registers itself together with its first club representative. Activities belong to a
club (see [activities.md](activities.md)), and only a representative of that club may change them.

## The data

```text
SportsClub 1 ──── * ClubRepresentative
     │ 1
     * Activity
```

| Table                  | Notes                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `sports_clubs`         | Club details and contact person. `approvalStatus` is `PENDING`, `APPROVED` or `REJECTED`. |
| `club_representatives` | `email` is unique. `passwordHash` is a scrypt hash (`salt:hash`), never the password.     |

**What is optional.** Only `name` and `address` are required. `description`, `contactName`,
`contactPhone` and `contactEmail` may be `null`: a club may choose not to share them in the app, and
the frontend then simply doesn't show them. `null` is the only way to say "not shared": the API turns
`""` and whitespace into `null`, and CHECK constraints refuse blank text in the database. The
representative's `name`, `email` and password are always required, because they make up the account.

The migration `*_complete_clubs_and_representatives` renamed `email`/`phone` to `contactEmail`/
`contactPhone`. For existing rows: clubs became `APPROVED`; blank values became `NULL`; a phone
number longer than the new 20 characters became `NULL` (a cut-off number would be wrong);
`contactName` stays `NULL`, because we don't publish a person's name without the club choosing to;
existing representatives got an empty password hash (no password matches it).

## Endpoints

| Method | URL              | Who                                      | Success |
| ------ | ---------------- | ---------------------------------------- | ------- |
| POST   | `/api/clubs`     | everyone (registers a new club)          | 201     |
| GET    | `/api/clubs`     | everyone (paginated: `page`, `pageSize`) | 200     |
| GET    | `/api/clubs/:id` | everyone                                 | 200     |
| PUT    | `/api/clubs/:id` | representative of that club              | 200     |

Other status codes: `400` invalid input, `401` no or invalid token, `403` another club, `404` club
not found, `409` representative email already in use.

### POST /api/clubs

```json
{
  "club": {
    "name": "VV Eindhoven Noord",
    "description": "Voetbalvereniging voor de hele familie.",
    "address": "Sportlaan 10, 5612 AB Eindhoven",
    "contactName": "Jan de Vries",
    "contactPhone": "040 765 4321",
    "contactEmail": "info@vveindhovennoord.nl"
  },
  "representative": {
    "name": "Jan de Vries",
    "email": "jan@vveindhovennoord.nl",
    "password": "een-goed-wachtwoord"
  }
}
```

The club and representative are saved in one transaction. The new club is always `PENDING`; an
`approvalStatus` in the body is ignored. Emails are trimmed and lowercased. Response `201`:

```json
{
  "club": { "id": 2, "name": "VV Eindhoven Noord", "...": "...", "approvalStatus": "PENDING" },
  "representative": { "id": 2, "name": "Jan de Vries", "email": "jan@vveindhovennoord.nl" }
}
```

### PUT /api/clubs/:id

Send all club fields (the `club` object above). They replace the current details, so an optional
field you leave out is cleared (`null`). The approval status cannot be changed this way.

## Not part of this feature

- **Reviewing clubs**: the ERD's `approved_by` (an admin), approving/rejecting, and hiding clubs
  and activities that are not approved.
- **Logging in** with the representative's password. Until then, use `npm run token:dev`.
