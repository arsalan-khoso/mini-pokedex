import { Pokemon, PokemonStats, StatKey } from '../../pokedex/models/pokemon.model';

export interface TypeCount {
  type: string;
  count: number;
}

export interface TeamStatTotals {
  stats: PokemonStats;
  total: number;
}

const STAT_KEYS: readonly StatKey[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];

/** How many team members share each type, most common first (dual types count once per type). */
export function countTypes(members: readonly Pokemon[]): readonly TypeCount[] {
  const counts = new Map<string, number>();
  for (const pokemon of members) {
    for (const type of pokemon.types) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

/** Sums each base stat across the team, plus the grand total. */
export function sumTeamStats(members: readonly Pokemon[]): TeamStatTotals {
  const stats = Object.fromEntries(
    STAT_KEYS.map((key) => [key, members.reduce((sum, pokemon) => sum + pokemon.stats[key], 0)]),
  ) as Record<StatKey, number>;
  return {
    stats,
    total: members.reduce((sum, pokemon) => sum + pokemon.totalStats, 0),
  };
}
