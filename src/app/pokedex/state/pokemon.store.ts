import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  map,
  merge,
  mergeMap,
  switchMap,
  tap,
} from 'rxjs';
import { AsyncResource } from '../../common/models/load-status.model';
import { toUserMessage } from '../../common/utils/error-message.util';
import {
  AUTOCOMPLETE_MIN_CHARS,
  AUTOCOMPLETE_RESULT_LIMIT,
  DEFAULT_PAGE_SIZE,
  POKEDEX_SIZE,
  PageSize,
  SEARCH_DEBOUNCE_MS,
} from '../constants/pokedex.constants';
import {
  Pokemon,
  PokemonDetails,
  PokemonSummary,
  SortColumn,
  SortDirection,
} from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';

export interface PokemonTableQuery {
  search: string;
  type: string | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
  pageSize: PageSize;
}

export interface PokemonSearchState extends AsyncResource<readonly PokemonSummary[]> {
  term: string;
}

export interface PokemonState {
  list: AsyncResource<readonly Pokemon[]>;
  query: PokemonTableQuery;
  details: Readonly<Record<number, AsyncResource<PokemonDetails | null>>>;
  search: PokemonSearchState;
}

export const INITIAL_POKEMON_QUERY: PokemonTableQuery = {
  search: '',
  type: null,
  sortColumn: 'id',
  sortDirection: 'asc',
  page: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

const INITIAL_STATE: PokemonState = {
  list: { status: 'idle', data: [], error: null },
  query: INITIAL_POKEMON_QUERY,
  details: {},
  search: { term: '', status: 'idle', data: [], error: null },
};

/** Text columns read naturally A→Z; stat columns are most useful highest-first. */
const ASCENDING_BY_DEFAULT: ReadonlySet<SortColumn> = new Set(['id', 'name']);

function defaultDirectionFor(column: SortColumn): SortDirection {
  return ASCENDING_BY_DEFAULT.has(column) ? 'asc' : 'desc';
}

function flipDirection(direction: SortDirection): SortDirection {
  return direction === 'asc' ? 'desc' : 'asc';
}

@Injectable({ providedIn: 'root' })
export class PokemonStore {
  private readonly api = inject(PokemonApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSubject = new BehaviorSubject<PokemonState>(INITIAL_STATE);
  /** Full store state; prefer the derived streams in `PokemonSelectors`. */
  readonly state$: Observable<PokemonState> = this.stateSubject.asObservable();

  private readonly listRequests = new Subject<void>();
  private readonly detailRequests = new Subject<number>();
  private readonly tableSearchInput = new Subject<string>();
  private readonly autocompleteInput = new Subject<string>();
  private readonly autocompleteRetries = new Subject<void>();

  constructor() {
    this.listRequests
      .pipe(
        exhaustMap(() => this.fetchList$()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.detailRequests
      .pipe(
        mergeMap((id) => this.fetchDetails$(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.tableSearchInput
      .pipe(
        map((term) => term.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((search) => this.patchQuery({ search, page: 0 }));

    const debouncedTerms$ = this.autocompleteInput.pipe(
      map((term) => term.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
    );
    const retriedTerms$ = this.autocompleteRetries.pipe(map(() => this.state.search.term));
    merge(debouncedTerms$, retriedTerms$)
      .pipe(
        switchMap((term) => this.fetchAutocomplete$(term)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** Current state snapshot, for synchronous reads inside the store and in tests. */
  get state(): PokemonState {
    return this.stateSubject.value;
  }

  // ── Pokédex list ──────────────────────────────────────────

  /** Loads the full Pokédex once; later calls are served from the in-memory cache. */
  loadPokemon(): void {
    const { status } = this.state.list;
    if (status === 'loading' || status === 'success') return;
    this.listRequests.next();
  }

  /** Re-requests the Pokédex after a failure, bypassing the cache check. */
  retryLoadPokemon(): void {
    this.listRequests.next();
  }

  // ── Table query (filters, sorting, paging) ────────────────

  /** Queues a name filter; applied after a 300ms pause in typing. Resets to the first page. */
  setSearch(term: string): void {
    this.tableSearchInput.next(term);
  }

  /** Filters by a single type, or clears the filter with `null`. Resets to the first page. */
  setTypeFilter(type: string | null): void {
    this.patchQuery({ type, page: 0 });
  }

  /** Sorts by `column`; selecting the active column again flips the direction. */
  toggleSort(column: SortColumn): void {
    const { sortColumn, sortDirection } = this.state.query;
    const isSameColumn = column === sortColumn;
    const nextDirection: SortDirection = isSameColumn
      ? flipDirection(sortDirection)
      : defaultDirectionFor(column);
    this.patchQuery({ sortColumn: column, sortDirection: nextDirection, page: 0 });
  }

  /** Moves to a zero-based page; the selectors clamp out-of-range values. */
  setPage(page: number): void {
    this.patchQuery({ page: Math.max(0, page) });
  }

  /** Changes rows per page and returns to the first page. */
  setPageSize(pageSize: PageSize): void {
    this.patchQuery({ pageSize, page: 0 });
  }

  /** Clears the name and type filters, keeping sorting and page size. */
  clearFilters(): void {
    this.tableSearchInput.next('');
    this.patchQuery({ search: '', type: null, page: 0 });
  }

  // ── Details (by id, cached) ───────────────────────────────

  /** Loads abilities and stats for one Pokémon unless they are cached or already in flight. */
  loadDetails(id: number): void {
    const status = this.state.details[id]?.status;
    if (status === 'loading' || status === 'success') return;
    this.detailRequests.next(id);
  }

  /** Re-requests details for a Pokémon whose previous request failed. */
  retryLoadDetails(id: number): void {
    this.detailRequests.next(id);
  }

  // ── Autocomplete search (API-backed) ──────────────────────

  /** Feeds the typeahead: debounced 300ms, deduplicated, and stale requests are cancelled. */
  searchPokemon(term: string): void {
    this.autocompleteInput.next(term);
  }

  /** Repeats the last autocomplete request after a failure. */
  retrySearch(): void {
    this.autocompleteRetries.next();
  }

  // ── Internals ─────────────────────────────────────────────

  private fetchList$(): Observable<unknown> {
    this.patch({ list: { ...this.state.list, status: 'loading', error: null } });
    return this.api.getPokemonPage$(POKEDEX_SIZE, 0).pipe(
      tap((pokemon) => this.patch({ list: { status: 'success', data: pokemon, error: null } })),
      catchError((error: unknown) => {
        this.patch({
          list: {
            ...this.state.list,
            status: 'error',
            error: toUserMessage(error, 'load the Pokédex'),
          },
        });
        return EMPTY;
      }),
    );
  }

  private fetchDetails$(id: number): Observable<unknown> {
    this.patchDetails(id, { status: 'loading', data: null, error: null });
    return this.api.getPokemonDetails$(id).pipe(
      tap((details) => this.patchDetails(id, { status: 'success', data: details, error: null })),
      catchError((error: unknown) => {
        this.patchDetails(id, {
          status: 'error',
          data: null,
          error: toUserMessage(error, 'load this Pokémon'),
        });
        return EMPTY;
      }),
    );
  }

  private fetchAutocomplete$(term: string): Observable<unknown> {
    if (term.length < AUTOCOMPLETE_MIN_CHARS) {
      this.patch({ search: { term, status: 'idle', data: [], error: null } });
      return EMPTY;
    }
    this.patch({ search: { ...this.state.search, term, status: 'loading', error: null } });
    return this.api.searchPokemonByName$(term, AUTOCOMPLETE_RESULT_LIMIT).pipe(
      tap((results) =>
        this.patch({ search: { term, status: 'success', data: results, error: null } }),
      ),
      catchError((error: unknown) => {
        this.patch({
          search: {
            term,
            status: 'error',
            data: [],
            error: toUserMessage(error, 'search Pokémon'),
          },
        });
        return EMPTY;
      }),
    );
  }

  private patch(partial: Partial<PokemonState>): void {
    this.stateSubject.next({ ...this.state, ...partial });
  }

  private patchQuery(partial: Partial<PokemonTableQuery>): void {
    this.patch({ query: { ...this.state.query, ...partial } });
  }

  private patchDetails(id: number, resource: AsyncResource<PokemonDetails | null>): void {
    this.patch({ details: { ...this.state.details, [id]: resource } });
  }
}
