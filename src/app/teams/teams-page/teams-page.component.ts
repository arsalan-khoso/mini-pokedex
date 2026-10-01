import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../common/components/empty-state/empty-state.component';
import { CacheService } from '../../common/services/cache.service';
import { PokemonSelectors } from '../../pokedex/state/pokemon.selectors';
import { PokemonStore } from '../../pokedex/state/pokemon.store';
import { TeamBuilderFormComponent } from '../components/team-builder-form/team-builder-form.component';
import { TeamListComponent } from '../components/team-list/team-list.component';
import { TeamSummaryComponent } from '../components/team-summary/team-summary.component';
import { SELECTED_TEAM_STORAGE_KEY } from '../constants/team.constants';
import { Team } from '../models/team.model';
import { TeamStore } from '../state/team.store';

@Component({
  selector: 'app-teams-page',
  standalone: true,
  imports: [EmptyStateComponent, TeamBuilderFormComponent, TeamListComponent, TeamSummaryComponent],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsPage {
  private readonly teamStore = inject(TeamStore);
  private readonly pokemonStore = inject(PokemonStore);
  private readonly pokemonSelectors = inject(PokemonSelectors);
  private readonly cache = inject(CacheService);

  protected readonly teams = toSignal(this.teamStore.teams$, { requireSync: true });
  protected readonly teamsStatus = toSignal(this.teamStore.status$, { requireSync: true });
  protected readonly teamsError = toSignal(this.teamStore.error$, { requireSync: true });
  protected readonly pokemonById = toSignal(this.pokemonSelectors.pokemonById$, {
    requireSync: true,
  });
  protected readonly pokemonStatus = toSignal(this.pokemonSelectors.listStatus$, {
    requireSync: true,
  });
  protected readonly pokemonError = toSignal(this.pokemonSelectors.listError$, {
    requireSync: true,
  });

  protected readonly selectedTeamId = signal<string | null>(
    this.cache.get<string>(SELECTED_TEAM_STORAGE_KEY),
  );
  protected readonly selectedTeam = computed(
    () => this.teams().find((team) => team.id === this.selectedTeamId()) ?? null,
  );

  constructor() {
    this.teamStore.loadTeams();
    // Team cards and the summary need sprites, types and stats from the cached Pokédex.
    this.pokemonStore.loadPokemon();

    effect(() => {
      const id = this.selectedTeamId();
      if (id) {
        this.cache.set(SELECTED_TEAM_STORAGE_KEY, id);
      } else {
        this.cache.remove(SELECTED_TEAM_STORAGE_KEY);
      }
    });
  }

  protected onTeamSelect(id: string): void {
    this.selectedTeamId.update((current) => (current === id ? null : id));
  }

  protected onTeamDelete(team: Team): void {
    if (this.selectedTeamId() === team.id) this.selectedTeamId.set(null);
    this.teamStore.deleteTeam(team.id);
  }

  protected onRetryTeams(): void {
    this.teamStore.retryLoadTeams();
  }

  protected onRetryPokemon(): void {
    this.pokemonStore.retryLoadPokemon();
  }
}
