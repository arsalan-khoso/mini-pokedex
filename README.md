# Mini Pokédex

A single-page Angular 21 app for browsing the Pokédex and building teams of up to six Pokémon.
Pokémon data comes from the public [PokéAPI GraphQL endpoint](https://beta.pokeapi.co/graphql/v1beta);
teams are stored in a local `json-graphql-server` mock.

## Setup

Requirements: Node.js 20.19+ (developed on Node 24) and npm.

```bash
npm install
```

The app needs **two processes**. Run each in its own terminal:

```bash
# 1. Mock GraphQL server for teams (http://localhost:4000)
npm run mock-server        # = npx json-graphql-server db.js --port 4000

# 2. Angular dev server (http://localhost:4200)
npm start                  # = ng serve
```

The mock server keeps data in memory, so restarting it resets teams to the three in `db.js`.
If it is not running, the Pokédex still works and the Teams page shows an error state with Retry.

| Script                | What it does                                    |
| --------------------- | ----------------------------------------------- |
| `npm start`           | Dev server on port 4200                         |
| `npm run mock-server` | Teams GraphQL mock on port 4000                 |
| `npm test`            | Unit tests (Vitest via `ng test`)               |
| `npm run lint`        | angular-eslint (also runs as a pre-commit hook) |
| `npm run build`       | Production build                                |

## Features

- **Pokédex table**: sprite, name, colored type badges, the six base stats and total. Every
  column is sortable, with 10/25/50 rows per page, a debounced name search and a type filter.
- **Detail panel**: slides in on row click (or Enter/Space on a focused row), with a Chart.js radar of
  the six base stats that animates between Pokémon, stat bars, height/weight and abilities.
  It closes with Escape or a backdrop click and returns focus to the row.
- **Team builder**: a Reactive Form with a name field (required, 3–30 characters, debounced async
  uniqueness check) and a typeahead Pokémon picker (1–6 Pokémon, removable chips, keyboard support).
- **Teams**: created and deleted optimistically with rollback and a retry toast on failure. Selecting a
  team shows its type distribution and total base stats, and the selection is saved to `localStorage`.

## UI states

Every async view renders all four states. Errors always say what failed and offer **Retry**.

| View                  | Loading                                                  | Empty                                           | Error + Retry                            |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Pokédex table         | Skeleton rows (same height as data rows, no layout jump) | "No Pokémon match your filters" + Clear filters | Inline in table body                     |
| Detail panel          | Skeleton ability rows                                    | "No abilities are recorded…"                    | Compact error in abilities section       |
| Autocomplete dropdown | "Searching…" spinner                                     | `No Pokémon match "xyz"`                        | Compact error inside dropdown            |
| Team list             | Skeleton cards                                           | "No teams yet"                                  | Includes a hint to start the mock server |
| Team summary          | Skeleton blocks                                          | "This team has no Pokémon"                      | Retries the Pokédex load it depends on   |
| Mutations             | Pending card with "Saving…"                              | –                                               | Rollback + error toast with Retry        |

PokéAPI calls retry transient failures (network drop, timeout, 429, 5xx) three times with
exponential backoff (0.5s, 1s, 2s) before showing the error state. GraphQL errors, which arrive as
HTTP 200 with an `errors` array, are turned into real errors so they never fail silently.

## Architecture

```
src/app/
├── core/graphql/            # GraphqlService: POST + error normalization + timeout
├── common/                  # Shared UI (skeleton, error/empty states, toasts, paginator),
│                            # constants, models, pipes, services (toast, cache), utils, styles
├── pokedex/
│   ├── constants/ models/ utils/      # stat columns, type colors, DTOs, response mappers
│   ├── services/            # PokemonApiService + queries
│   ├── state/               # pokemon.store.ts, pokemon.selectors.ts
│   ├── components/          # table, filters, detail panel, radar chart
│   └── pokedex-page/        # route component
└── teams/
    ├── constants/ models/ utils/ validators/
    ├── services/            # TeamApiService + queries (mock server)
    ├── state/               # team.store.ts
    ├── components/          # builder form, pokemon picker, team list, team summary
    └── teams-page/          # route component
```

**Data flow:** API services return Observables. The stores own the state in a `BehaviorSubject`.
Selectors derive streams from it, and components bridge those streams into templates with
`toSignal()`. Components talk to each other only through `input()` / `output()`.

### RxJS stores

- **`PokemonStore`** holds the cached list, the table query (search, type, sort, page), per-id
  details and the autocomplete state. Each request type has a command `Subject` that is subscribed
  once in the constructor with `takeUntilDestroyed`, using the operator that fits its concurrency:
  - `exhaustMap` for the list, so repeated load calls can't start duplicate fetches.
  - `mergeMap` for details, so independent ids load in parallel.
  - `debounceTime(300) → distinctUntilChanged() → switchMap` for the typeahead, so stale searches
    are cancelled.

  The full Pokédex (1,025 species) is fetched once. The query requests only the `front_default`
  sprite path, which keeps the response under 40 KB gzipped, and then sorting, filtering and
  paging all happen client-side.

- **`pokemon.selectors.ts`** builds filtered → sorted → paged streams with `combineLatest`, `map`
  and `distinctUntilChanged` on each input slice, so changing the page doesn't re-filter or
  re-sort. The projection functions are pure and unit-tested on their own.
- **`TeamStore`** is optimistic:
  - **Create:** a placeholder flagged `isPending` is inserted immediately. On success the server
    record replaces it; on failure it is removed and an error toast offers Retry.
  - **Delete:** the team is removed immediately and put back at its original index if the server
    call fails.
  - **Reloads:** a list reload keeps in-flight placeholders.

Shared derived streams use `shareReplay({ bufferSize: 1, refCount: true })`. That is
`shareReplay(1)` plus `refCount`, which releases the upstream subscription when the last
subscriber leaves, because these selectors live in root services that are never destroyed.

### Signals

- `signal()` for UI state: the selected Pokémon, whether the panel is open, the picker's query and
  active option, and the selected team.
- `computed()` for derived values: the team's type distribution and stat totals, whether filters
  are active, and the form's error messages.
- `effect()` persists the selected team id to `localStorage`. `afterRenderEffect()` drives the
  Chart.js instance and the panel's focus handling.
- `toSignal()` bridges every store selector into templates.
- All components are standalone, use `OnPush`, `inject()` and `input()`/`output()` (no decorators).
  A lint rule enforces OnPush.

Reactive Forms state is not signal-based, so the team form converts `form.events` with
`toSignal()`. That lets OnPush views pick up async validator results and touched/dirty changes.

### Notable decisions

- **No Apollo client:** a ~40-line `GraphqlService` on `HttpClient` keeps the dependency list
  small and makes retry and error handling explicit.
- **Retries only on PokéAPI** (as the brief specifies). Mock-server mutations are not retried
  automatically, because replaying a create could duplicate a team; the toast's Retry is the user's
  explicit choice.
- **Detail panel stats come from the cached list**, so the chart can animate immediately on
  selection. Abilities load per id through `GetPokemonDetails` (stats + abilities), which keeps
  its own loading/error state and is cached by id.
- **Uniqueness check** compares case-insensitively against teams already in the list (including
  pending ones), then against the server through json-graphql-server's `q` filter. If the check
  itself fails, the field reports `teamNameUnverified` instead of passing silently.
- **Angular 21 file naming:** the CLI now generates `app.ts` without the `.component` suffix.
  The schematics are configured to generate `*.component.ts` / `*.service.ts`, matching the
  developer guide.

## Tests

```bash
npm test
```

- `team.store.spec.ts`: optimistic create (placeholder → saved record), **rollback with a
  retry toast when the mutation fails**, delete restored at its original index, and the
  case-insensitive name check.
- `pokemon.selectors.spec.ts`: filtering, stable stat sorting, paging and clamping, plus the
  composed `pagedPokemon$` stream reading from the store.
- `unique-team-name.validator.spec.ts`: taken vs available names, **debouncing** (only the final
  value is checked), trimming, and the unverified state when the check fails.
- `team-stats.util.spec.ts`: the type distribution and stat totals behind the summary's `computed()`.
- `retry-with-backoff.util.spec.ts`: which errors are retried and recovery after transient failures.

## Commit conventions

Conventional Commits (`type(scope): subject`) are enforced by commitlint through a husky
`commit-msg` hook, and lint runs in `pre-commit`.

## What I'd improve with more time

- **E2E tests in the repo:** I checked the golden paths and the throttled and offline states with
  a throwaway Playwright script. Committing those as a Playwright suite with network mocking would
  lock in the UI-state guarantees.
- **Component tests** for the picker's keyboard behaviour and the form's error-display rules.
- **URL-synced table state** (`?search=&type=&sort=&page=`) so filtered views can be shared and
  survive a reload.
- **Virtual scrolling** (CDK) as an alternative to pagination for the full list.
- **Offline-friendly caching:** persist the Pokédex in IndexedDB with a TTL so repeat visits load
  instantly and work offline.
- **Accessibility pass** with axe and a screen reader, especially the combobox announcements and
  the contrast of light type badges such as Electric.
- **Environment config** for API URLs (`environment.ts` / build-time replacement) instead of constants.
