export interface TeamDto {
  id: string;
  name: string;
  pokemon_ids: number[] | null;
  created_at: string;
  Trainer: { name: string } | null;
}

export interface GetTeamsResponse {
  allTeams: TeamDto[];
}

export interface FindTeamsByNameResponse {
  allTeams: Pick<TeamDto, 'name'>[];
}

export interface CreateTeamResponse {
  createTeam: TeamDto;
}

export interface RemoveTeamResponse {
  removeTeam: Pick<TeamDto, 'id'> | null;
}
