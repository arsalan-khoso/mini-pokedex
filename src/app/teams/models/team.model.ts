export interface Team {
  id: string;
  name: string;
  trainerName: string | null;
  pokemonIds: readonly number[];
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** True while an optimistic create is waiting for the server. */
  isPending: boolean;
}

export interface TeamDraft {
  name: string;
  pokemonIds: readonly number[];
}
