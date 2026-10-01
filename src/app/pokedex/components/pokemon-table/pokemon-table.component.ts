import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EmptyStateComponent } from '../../../common/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../common/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TypeBadgeComponent } from '../../../common/components/type-badge/type-badge.component';
import { LoadStatus } from '../../../common/models/load-status.model';
import { DisplayNamePipe } from '../../../common/pipes/display-name.pipe';
import { STAT_COLUMNS } from '../../constants/pokedex.constants';
import { Pokemon, SortColumn, SortDirection } from '../../models/pokemon.model';

/** Sprite + name + types + 6 stats + total. */
const COLUMN_COUNT = 3 + STAT_COLUMNS.length + 1;

@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [
    DisplayNamePipe,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    TypeBadgeComponent,
  ],
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTableComponent {
  readonly rows = input.required<readonly Pokemon[]>();
  readonly status = input.required<LoadStatus>();
  readonly error = input<string | null>(null);
  readonly sortColumn = input.required<SortColumn>();
  readonly sortDirection = input.required<SortDirection>();
  readonly selectedId = input<number | null>(null);
  readonly hasActiveFilters = input(false);
  /** Number of skeleton rows to render while loading, so the layout does not jump. */
  readonly skeletonRowCount = input(10);

  readonly sortChange = output<SortColumn>();
  readonly rowSelect = output<Pokemon>();
  readonly retry = output<void>();
  readonly clearFilters = output<void>();

  protected readonly statColumns = STAT_COLUMNS;
  protected readonly columnCount = COLUMN_COUNT;
  protected readonly isLoading = computed(
    () => this.status() === 'loading' || this.status() === 'idle',
  );
  protected readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonRowCount() }, (_, index) => index),
  );

  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (column !== this.sortColumn()) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIndicator(column: SortColumn): string {
    if (column !== this.sortColumn()) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }
}
