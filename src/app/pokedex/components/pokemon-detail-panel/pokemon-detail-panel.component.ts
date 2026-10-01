import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ErrorStateComponent } from '../../../common/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TypeBadgeComponent } from '../../../common/components/type-badge/type-badge.component';
import { AsyncResource } from '../../../common/models/load-status.model';
import { DisplayNamePipe } from '../../../common/pipes/display-name.pipe';
import { STAT_COLUMNS, TYPE_COLORS } from '../../constants/pokedex.constants';
import { Pokemon, PokemonDetails } from '../../models/pokemon.model';
import { StatRadarChartComponent } from '../stat-radar-chart/stat-radar-chart.component';

/** Highest base stat in the games (Blissey's HP), used to scale the stat bars. */
const MAX_BASE_STAT = 255;

@Component({
  selector: 'app-pokemon-detail-panel',
  standalone: true,
  imports: [
    DisplayNamePipe,
    ErrorStateComponent,
    SkeletonComponent,
    StatRadarChartComponent,
    TypeBadgeComponent,
  ],
  templateUrl: './pokemon-detail-panel.component.html',
  styleUrl: './pokemon-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class PokemonDetailPanelComponent {
  /** Kept while the panel slides out so the content does not vanish mid-animation. */
  readonly pokemon = input.required<Pokemon | null>();
  readonly details = input.required<AsyncResource<PokemonDetails | null>>();
  readonly open = input.required<boolean>();

  readonly closed = output<void>();
  readonly retryDetails = output<void>();

  protected readonly statColumns = STAT_COLUMNS;
  protected readonly maxBaseStat = MAX_BASE_STAT;
  protected readonly accentColor = computed(
    () => TYPE_COLORS[this.pokemon()?.types[0] ?? ''] ?? '#007acc',
  );

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    // Move focus into the dialog when it opens and give it back to the trigger when it closes.
    afterRenderEffect(() => {
      const button = this.closeButton()?.nativeElement;
      if (this.open()) {
        if (button && document.activeElement !== button && !this.returnFocusTo) {
          this.returnFocusTo = document.activeElement as HTMLElement | null;
          button.focus();
        }
      } else if (this.returnFocusTo) {
        this.returnFocusTo.focus();
        this.returnFocusTo = null;
      }
    });
  }

  protected onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
