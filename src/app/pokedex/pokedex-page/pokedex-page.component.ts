import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { PaginatorComponent } from '../../common/components/paginator/paginator.component';
import { PokemonDetailPanelComponent } from '../components/pokemon-detail-panel/pokemon-detail-panel.component';
import { PokemonFiltersComponent } from '../components/pokemon-filters/pokemon-filters.component';
import { PokemonTableComponent } from '../components/pokemon-table/pokemon-table.component';
import { PAGE_SIZE_OPTIONS, PageSize } from '../constants/pokedex.constants';
import { Pokemon, SortColumn } from '../models/pokemon.model';
import { IDLE_DETAILS, PokemonSelectors } from '../state/pokemon.selectors';
import { PokemonStore } from '../state/pokemon.store';

@Component({
  selector: 'app-pokedex-page',
  standalone: true,
  imports: [
    PaginatorComponent,
    PokemonDetailPanelComponent,
    PokemonFiltersComponent,
    PokemonTableComponent,
  ],
  templateUrl: './pokedex-page.component.html',
  styleUrl: './pokedex-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexPage {
  private readonly store = inject(PokemonStore);
  private readonly selectors = inject(PokemonSelectors);

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  // The store is BehaviorSubject-backed, so these streams emit synchronously on subscribe.
  protected readonly status = toSignal(this.selectors.listStatus$, { requireSync: true });
  protected readonly error = toSignal(this.selectors.listError$, { requireSync: true });
  protected readonly query = toSignal(this.selectors.query$, { requireSync: true });
  protected readonly page = toSignal(this.selectors.pagedPokemon$, { requireSync: true });
  protected readonly types = toSignal(this.selectors.availableTypes$, { requireSync: true });
  private readonly pokemonById = toSignal(this.selectors.pokemonById$, { requireSync: true });

  protected readonly hasActiveFilters = computed(() => {
    const { search, type } = this.query();
    return search.trim() !== '' || type !== null;
  });

  // UI state for the detail panel.
  protected readonly selectedPokemonId = signal<number | null>(null);
  protected readonly isPanelOpen = signal(false);
  protected readonly selectedPokemon = computed(() => {
    const id = this.selectedPokemonId();
    return id === null ? null : (this.pokemonById().get(id) ?? null);
  });
  protected readonly selectedDetails = toSignal(
    toObservable(this.selectedPokemonId).pipe(
      switchMap((id) => (id === null ? of(IDLE_DETAILS) : this.selectors.details$(id))),
    ),
    { initialValue: IDLE_DETAILS },
  );

  constructor() {
    this.store.loadPokemon();
  }

  protected onSearchChange(term: string): void {
    this.store.setSearch(term);
  }

  protected onTypeChange(type: string | null): void {
    this.store.setTypeFilter(type);
  }

  protected onSortChange(column: SortColumn): void {
    this.store.toggleSort(column);
  }

  protected onPageChange(page: number): void {
    this.store.setPage(page);
  }

  protected onPageSizeChange(size: number): void {
    this.store.setPageSize(size as PageSize);
  }

  protected onClearFilters(): void {
    this.store.clearFilters();
  }

  protected onRetry(): void {
    this.store.retryLoadPokemon();
  }

  protected onRowSelect(pokemon: Pokemon): void {
    this.selectedPokemonId.set(pokemon.id);
    this.isPanelOpen.set(true);
    this.store.loadDetails(pokemon.id);
  }

  protected onPanelClosed(): void {
    this.isPanelOpen.set(false);
  }

  protected onRetryDetails(): void {
    const id = this.selectedPokemonId();
    if (id !== null) this.store.retryLoadDetails(id);
  }
}
