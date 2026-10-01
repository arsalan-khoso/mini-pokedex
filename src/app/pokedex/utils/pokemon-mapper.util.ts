import {
  PokemonAbilityDto,
  PokemonDetailsDto,
  PokemonDto,
  PokemonStatDto,
  PokemonSummaryDto,
} from '../models/pokemon-api.model';
import {
  Pokemon,
  PokemonAbility,
  PokemonDetails,
  PokemonStats,
  PokemonSummary,
  StatKey,
} from '../models/pokemon.model';

const API_STAT_KEYS: Readonly<Record<string, StatKey>> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

export function toPokemonSummary(dto: PokemonSummaryDto): PokemonSummary {
  return {
    id: dto.id,
    name: dto.name,
    types: dto.pokemon_v2_pokemontypes
      .map((entry) => entry.pokemon_v2_type?.name)
      .filter((name): name is string => !!name),
    spriteUrl: dto.pokemon_v2_pokemonsprites[0]?.sprites ?? null,
  };
}

export function toPokemon(dto: PokemonDto): Pokemon {
  const stats = toStats(dto.pokemon_v2_pokemonstats);
  return {
    ...toPokemonSummary(dto),
    height: dto.height ?? 0,
    weight: dto.weight ?? 0,
    stats,
    totalStats: Object.values(stats).reduce((sum, value) => sum + value, 0),
  };
}

export function toPokemonDetails(dto: PokemonDetailsDto): PokemonDetails {
  return {
    ...toPokemon(dto),
    abilities: dto.pokemon_v2_pokemonabilities
      .map(toAbility)
      .filter((ability): ability is PokemonAbility => ability !== null),
  };
}

function toStats(dtos: readonly PokemonStatDto[]): PokemonStats {
  const stats: Record<StatKey, number> = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };
  for (const dto of dtos) {
    const key = dto.pokemon_v2_stat ? API_STAT_KEYS[dto.pokemon_v2_stat.name] : undefined;
    if (key) stats[key] = dto.base_stat;
  }
  return stats;
}

function toAbility(dto: PokemonAbilityDto): PokemonAbility | null {
  if (!dto.pokemon_v2_ability) return null;
  return {
    name: dto.pokemon_v2_ability.name,
    isHidden: dto.is_hidden,
    shortEffect: dto.pokemon_v2_ability.pokemon_v2_abilityeffecttexts[0]?.short_effect ?? null,
  };
}
