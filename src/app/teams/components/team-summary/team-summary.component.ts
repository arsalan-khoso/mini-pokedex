import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EmptyStateComponent } from '../../../common/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../common/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TypeBadgeComponent } from '../../../common/components/type-badge/type-badge.component';
import { LoadStatus } from '../../../common/models/load-status.model';
import { DisplayNamePipe } from '../../../common/pipes/display-name.pipe';
import { STAT_COLUMNS, TYPE_COLORS } from '../../../pokedex/constants/pokedex.constants';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { Team } from '../../models/team.model';
import { countTypes, sumTeamStats } from '../../utils/team-stats.util';

@Component({
  selector: 'app-team-summary',
  imports: [
    DisplayNamePipe,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    TypeBadgeComponent,
  ],
  templateUrl: './team-summary.component.html',
  styleUrl: './team-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSummaryComponent {
  readonly team = input.required<Team>();
  readonly pokemonById = input.required<ReadonlyMap<number, Pokemon>>();
  /** Status of the Pokédex data the summary is computed from. */
  readonly pokemonStatus = input.required<LoadStatus>();
  readonly pokemonError = input<string | null>(null);
  readonly retry = output<void>();

  protected readonly statColumns = STAT_COLUMNS;
  protected readonly typeColors = TYPE_COLORS;

  protected readonly members = computed(() => {
    const lookup = this.pokemonById();
    return this.team()
      .pokemonIds.map((id) => lookup.get(id))
      .filter((pokemon): pokemon is Pokemon => pokemon !== undefined);
  });
  protected readonly typeDistribution = computed(() => countTypes(this.members()));
  protected readonly statTotals = computed(() => sumTeamStats(this.members()));
  protected readonly maxTypeCount = computed(() =>
    Math.max(1, ...this.typeDistribution().map((entry) => entry.count)),
  );
}
