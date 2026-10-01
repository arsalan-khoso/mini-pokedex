import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ErrorStateComponent } from '../../../common/components/error-state/error-state.component';
import { SpinnerComponent } from '../../../common/components/spinner/spinner.component';
import { TypeBadgeComponent } from '../../../common/components/type-badge/type-badge.component';
import { DisplayNamePipe } from '../../../common/pipes/display-name.pipe';
import { AUTOCOMPLETE_MIN_CHARS } from '../../../pokedex/constants/pokedex.constants';
import { PokemonSummary } from '../../../pokedex/models/pokemon.model';
import { PokemonSelectors } from '../../../pokedex/state/pokemon.selectors';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { TEAM_MAX_POKEMON } from '../../constants/team.constants';

type DropdownState = 'loading' | 'error' | 'empty' | 'success';

/**
 * Typeahead for choosing up to `maxSelection` Pokémon, exposed to Reactive Forms as a
 * `number[]` control. Search goes through `PokemonStore.searchPokemon` (debounced, switchMap).
 */
@Component({
  selector: 'app-pokemon-picker',
  standalone: true,
  imports: [DisplayNamePipe, ErrorStateComponent, SpinnerComponent, TypeBadgeComponent],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PokemonPickerComponent),
      multi: true,
    },
  ],
})
export class PokemonPickerComponent implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly maxSelection = input(TEAM_MAX_POKEMON);
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  private readonly store = inject(PokemonStore);
  private readonly selectors = inject(PokemonSelectors);
  private readonly search = toSignal(this.selectors.search$, { requireSync: true });
  private readonly pokemonById = toSignal(this.selectors.pokemonById$, { requireSync: true });

  protected readonly query = signal('');
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly selected = signal<readonly PokemonSummary[]>([]);
  protected readonly isDisabled = signal(false);

  protected readonly listboxId = computed(() => `${this.inputId()}-listbox`);
  protected readonly isFull = computed(() => this.selected().length >= this.maxSelection());
  protected readonly selectedIds = computed(() => new Set(this.selected().map((p) => p.id)));
  protected readonly results = computed(() => this.search().data);
  protected readonly searchError = computed(() => this.search().error ?? 'Please try again.');
  protected readonly showDropdown = computed(
    () => this.isOpen() && !this.isFull() && this.query().trim().length >= AUTOCOMPLETE_MIN_CHARS,
  );
  /** Results are stale while the debounce for the latest keystroke is still pending. */
  protected readonly dropdownState = computed<DropdownState>(() => {
    const search = this.search();
    const isStale = search.term !== this.query().trim();
    if (isStale || search.status === 'loading' || search.status === 'idle') return 'loading';
    if (search.status === 'error') return 'error';
    return search.data.length > 0 ? 'success' : 'empty';
  });
  protected readonly activeOptionId = computed(() =>
    this.showDropdown() && this.dropdownState() === 'success' && this.activeIndex() >= 0
      ? this.optionId(this.activeIndex())
      : null,
  );

  private onChange: (ids: number[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(ids: readonly number[] | null): void {
    const lookup = this.pokemonById();
    this.selected.set(
      (ids ?? []).map((id) => lookup.get(id) ?? { id, name: `#${id}`, types: [], spriteUrl: null }),
    );
  }

  registerOnChange(fn: (ids: number[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected optionId(index: number): string {
    return `${this.inputId()}-option-${index}`;
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.isOpen.set(true);
    this.activeIndex.set(-1);
    this.store.searchPokemon(value);
  }

  protected onFocus(): void {
    this.isOpen.set(true);
  }

  protected onBlur(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!this.showDropdown() || this.dropdownState() !== 'success') return;
        event.preventDefault();
        const count = this.results().length;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.activeIndex.update((index) => (index + step + count) % count);
        break;
      }
      case 'Enter': {
        const pokemon = this.results()[this.activeIndex()];
        if (this.showDropdown() && pokemon) {
          event.preventDefault();
          this.add(pokemon);
        }
        break;
      }
      case 'Escape':
        if (this.showDropdown()) {
          event.stopPropagation();
          this.isOpen.set(false);
        }
        break;
      case 'Backspace':
        if (this.query() === '' && this.selected().length > 0) {
          this.remove(this.selected()[this.selected().length - 1].id);
        }
        break;
    }
  }

  protected add(pokemon: PokemonSummary): void {
    if (this.isFull() || this.selectedIds().has(pokemon.id)) return;
    this.selected.update((current) => [...current, pokemon]);
    this.query.set('');
    this.activeIndex.set(-1);
    this.store.searchPokemon('');
    this.emitChange();
  }

  protected remove(id: number): void {
    this.selected.update((current) => current.filter((pokemon) => pokemon.id !== id));
    this.onTouched();
    this.emitChange();
  }

  protected retrySearch(): void {
    this.store.retrySearch();
  }

  private emitChange(): void {
    this.onChange(this.selected().map((pokemon) => pokemon.id));
  }
}
