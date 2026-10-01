import { StatKey } from '../models/pokemon.model';

/** National Pokédex species count (Gen I–IX); loaded once and cached client-side. */
export const POKEDEX_SIZE = 1025;

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

export const SEARCH_DEBOUNCE_MS = 300;
export const AUTOCOMPLETE_MIN_CHARS = 2;
export const AUTOCOMPLETE_RESULT_LIMIT = 8;

export interface StatColumn {
  key: StatKey;
  label: string;
  shortLabel: string;
}

export const STAT_COLUMNS: readonly StatColumn[] = [
  { key: 'hp', label: 'HP', shortLabel: 'HP' },
  { key: 'attack', label: 'Attack', shortLabel: 'Atk' },
  { key: 'defense', label: 'Defense', shortLabel: 'Def' },
  { key: 'specialAttack', label: 'Sp. Attack', shortLabel: 'Sp.Atk' },
  { key: 'specialDefense', label: 'Sp. Defense', shortLabel: 'Sp.Def' },
  { key: 'speed', label: 'Speed', shortLabel: 'Speed' },
];

export const TYPE_COLORS: Readonly<Record<string, string>> = {
  normal: '#a8a77a',
  fire: '#ee8130',
  water: '#6390f0',
  electric: '#f7d02c',
  grass: '#7ac74c',
  ice: '#96d9d6',
  fighting: '#c22e28',
  poison: '#a33ea1',
  ground: '#e2bf65',
  flying: '#a98ff3',
  psychic: '#f95587',
  bug: '#a6b91a',
  rock: '#b6a136',
  ghost: '#735797',
  dragon: '#6f35fc',
  dark: '#705746',
  steel: '#b7b7ce',
  fairy: '#d685ad',
};
