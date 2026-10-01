export type StatKey = 'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed';

export type PokemonStats = Readonly<Record<StatKey, number>>;

export interface Pokemon {
  id: number;
  name: string;
  /** Decimetres, as returned by PokéAPI. */
  height: number;
  /** Hectograms, as returned by PokéAPI. */
  weight: number;
  types: readonly string[];
  stats: PokemonStats;
  totalStats: number;
  spriteUrl: string | null;
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
  shortEffect: string | null;
}

export interface PokemonDetails extends Pokemon {
  abilities: readonly PokemonAbility[];
}

export type PokemonSummary = Pick<Pokemon, 'id' | 'name' | 'types' | 'spriteUrl'>;

export type SortColumn = 'id' | 'name' | StatKey | 'totalStats';
export type SortDirection = 'asc' | 'desc';
