import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EmptyStateComponent } from '../../../common/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../common/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { SpinnerComponent } from '../../../common/components/spinner/spinner.component';
import { LoadStatus } from '../../../common/models/load-status.model';
import { DisplayNamePipe } from '../../../common/pipes/display-name.pipe';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { TEAM_MAX_POKEMON } from '../../constants/team.constants';
import { Team } from '../../models/team.model';

@Component({
  selector: 'app-team-list',
  imports: [
    DatePipe,
    DisplayNamePipe,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    SpinnerComponent,
  ],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamListComponent {
  readonly teams = input.required<readonly Team[]>();
  readonly status = input.required<LoadStatus>();
  readonly error = input<string | null>(null);
  readonly selectedId = input<string | null>(null);
  /** Used for sprites; members not loaded yet fall back to their Pokédex number. */
  readonly pokemonById = input.required<ReadonlyMap<number, Pokemon>>();

  readonly teamSelect = output<string>();
  readonly teamDelete = output<Team>();
  readonly retry = output<void>();

  protected readonly skeletonCards = [0, 1, 2];
  protected readonly spriteSlots = Array.from({ length: TEAM_MAX_POKEMON }, (_, index) => index);
  /** Optimistic creates show up even if the initial load is still running or failed. */
  protected readonly hasTeams = computed(() => this.teams().length > 0);
}
