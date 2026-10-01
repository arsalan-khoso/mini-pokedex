import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MOCK_GRAPHQL_URL } from '../../common/constants/api.constants';
import { GraphqlService } from '../../core/graphql/graphql.service';
import { DEFAULT_TRAINER_ID } from '../constants/team.constants';
import {
  CreateTeamResponse,
  FindTeamsByNameResponse,
  GetTeamsResponse,
  RemoveTeamResponse,
  TeamDto,
} from '../models/team-api.model';
import { Team, TeamDraft } from '../models/team.model';
import {
  CREATE_TEAM_MUTATION,
  FIND_TEAMS_BY_NAME_QUERY,
  GET_TEAMS_QUERY,
  REMOVE_TEAM_MUTATION,
} from './team.queries';

/**
 * Talks to the local json-graphql-server. Calls are deliberately not retried:
 * the mock runs on localhost, and replaying a create mutation could duplicate a team.
 */
@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly graphql = inject(GraphqlService);

  /** Fetches all teams, newest first. */
  getTeams$(): Observable<Team[]> {
    return this.graphql
      .request$<GetTeamsResponse>(MOCK_GRAPHQL_URL, GET_TEAMS_QUERY)
      .pipe(map((data) => data.allTeams.map(toTeam)));
  }

  /** Persists a new team for the default trainer and returns the saved record. */
  createTeam$(draft: TeamDraft): Observable<Team> {
    return this.graphql
      .request$<CreateTeamResponse>(MOCK_GRAPHQL_URL, CREATE_TEAM_MUTATION, {
        trainerId: DEFAULT_TRAINER_ID,
        name: draft.name,
        pokemonIds: draft.pokemonIds,
        createdAt: new Date().toISOString(),
      })
      .pipe(map((data) => toTeam(data.createTeam)));
  }

  /** Deletes a team. Completes without error if it was already gone, since the outcome is the same. */
  deleteTeam$(id: string): Observable<void> {
    return this.graphql
      .request$<RemoveTeamResponse>(MOCK_GRAPHQL_URL, REMOVE_TEAM_MUTATION, { id })
      .pipe(map(() => undefined));
  }

  /** Returns server-side team names that contain `name` (case-insensitive), for uniqueness checks. */
  findTeamNames$(name: string): Observable<string[]> {
    return this.graphql
      .request$<FindTeamsByNameResponse>(MOCK_GRAPHQL_URL, FIND_TEAMS_BY_NAME_QUERY, { name })
      .pipe(map((data) => data.allTeams.map((team) => team.name)));
  }
}

function toTeam(dto: TeamDto): Team {
  return {
    id: String(dto.id),
    name: dto.name,
    trainerName: dto.Trainer?.name ?? null,
    pokemonIds: dto.pokemon_ids ?? [],
    createdAt: dto.created_at,
    isPending: false,
  };
}
