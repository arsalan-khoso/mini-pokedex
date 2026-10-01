import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { AsyncResource, LoadStatus } from '../../common/models/load-status.model';
import { Pokemon, PokemonDetails, SortColumn, SortDirection } from '../models/pokemon.model';
import { PokemonSearchState, PokemonStore, PokemonTableQuery } from './pokemon.store';

export interface PokemonFilter {
  search: string;
  type: string | null;
}

export interface PageSlice<T> {
  items: readonly T[];
  /** Zero-based page index, clamped to the available range. */
  page: number;
  pageCount: number;
  totalItems: number;
  /** One-based index of the first row on the page (0 when empty), for "11–20 of 151" labels. */
  rangeStart: number;
  rangeEnd: number;
}

export const IDLE_DETAILS: AsyncResource<PokemonDetails | null> = {
  status: 'idle',
  data: null,
  error: null,
};

// ── Pure projections (unit-tested without Angular) ─────────

export function filterPokemon(
  items: readonly Pokemon[],
  filter: PokemonFilter,
): readonly Pokemon[] {
  const search = filter.search.trim().toLowerCase();
  if (!search && !filter.type) return items;
  return items.filter(
    (pokemon) =>
      (!search || pokemon.name.includes(search)) &&
      (!filter.type || pokemon.types.includes(filter.type)),
  );
}

export function sortPokemon(
  items: readonly Pokemon[],
  column: SortColumn,
  direction: SortDirection,
): readonly Pokemon[] {
  const factor = direction === 'asc' ? 1 : -1;
  const valueOf = (pokemon: Pokemon): number | string => {
    if (column === 'id' || column === 'name' || column === 'totalStats') return pokemon[column];
    return pokemon.stats[column];
  };
  return [...items].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    const comparison =
      typeof left === 'string' && typeof right === 'string'
        ? left.localeCompare(right)
        : (left as number) - (right as number);
    // Ties fall back to Pokédex number so equal stats keep a stable, predictable order.
    return comparison !== 0 ? comparison * factor : a.id - b.id;
  });
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const totalItems = items.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    page: safePage,
    pageCount,
    totalItems,
    rangeStart: totalItems === 0 ? 0 : start + 1,
    rangeEnd: start + pageItems.length,
  };
}

export function collectTypes(items: readonly Pokemon[]): readonly string[] {
  return [...new Set(items.flatMap((pokemon) => pokemon.types))].sort();
}

// ── Derived streams ────────────────────────────────────────

/**
 * Derived, memoised views over {@link PokemonStore}. Every stream deduplicates its inputs with
 * `distinctUntilChanged`, so a page change does not re-run filtering or sorting, and is shared
 * with `shareReplay` because several components (table, filters, paginator) read the same data.
 */
@Injectable({ providedIn: 'root' })
export class PokemonSelectors {
  private readonly store = inject(PokemonStore);

  readonly listStatus$: Observable<LoadStatus> = this.store.state$.pipe(
    map((state) => state.list.status),
    distinctUntilChanged(),
  );

  readonly listError$: Observable<string | null> = this.store.state$.pipe(
    map((state) => state.list.error),
    distinctUntilChanged(),
  );

  readonly allPokemon$: Observable<readonly Pokemon[]> = this.store.state$.pipe(
    map((state) => state.list.data),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly query$: Observable<PokemonTableQuery> = this.store.state$.pipe(
    map((state) => state.query),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly availableTypes$: Observable<readonly string[]> = this.allPokemon$.pipe(
    map(collectTypes),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly pokemonById$: Observable<ReadonlyMap<number, Pokemon>> = this.allPokemon$.pipe(
    map((items) => new Map(items.map((pokemon) => [pokemon.id, pokemon]))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly filteredPokemon$: Observable<readonly Pokemon[]> = combineLatest([
    this.allPokemon$,
    this.query$.pipe(
      map(({ search, type }): PokemonFilter => ({ search, type })),
      distinctUntilChanged((a, b) => a.search === b.search && a.type === b.type),
    ),
  ]).pipe(
    map(([items, filter]) => filterPokemon(items, filter)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly sortedPokemon$: Observable<readonly Pokemon[]> = combineLatest([
    this.filteredPokemon$,
    this.query$.pipe(
      map(({ sortColumn, sortDirection }) => ({ sortColumn, sortDirection })),
      distinctUntilChanged(
        (a, b) => a.sortColumn === b.sortColumn && a.sortDirection === b.sortDirection,
      ),
    ),
  ]).pipe(
    map(([items, sort]) => sortPokemon(items, sort.sortColumn, sort.sortDirection)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly pagedPokemon$: Observable<PageSlice<Pokemon>> = combineLatest([
    this.sortedPokemon$,
    this.query$.pipe(
      map(({ page, pageSize }) => ({ page, pageSize })),
      distinctUntilChanged((a, b) => a.page === b.page && a.pageSize === b.pageSize),
    ),
  ]).pipe(
    map(([items, paging]) => paginate(items, paging.page, paging.pageSize)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly search$: Observable<PokemonSearchState> = this.store.state$.pipe(
    map((state) => state.search),
    distinctUntilChanged(),
  );

  /** Details request lifecycle for one Pokémon (idle until `loadDetails` is called). */
  details$(id: number): Observable<AsyncResource<PokemonDetails | null>> {
    return this.store.state$.pipe(
      map((state) => state.details[id] ?? IDLE_DETAILS),
      distinctUntilChanged(),
    );
  }
}
