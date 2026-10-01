export interface PokemonTypeDto {
  pokemon_v2_type: { name: string } | null;
}

export interface PokemonStatDto {
  base_stat: number;
  pokemon_v2_stat: { name: string } | null;
}

export interface PokemonSpritesDto {
  sprites: string | null;
}

export interface PokemonSummaryDto {
  id: number;
  name: string;
  pokemon_v2_pokemontypes: PokemonTypeDto[];
  pokemon_v2_pokemonsprites: PokemonSpritesDto[];
}

export interface PokemonDto extends PokemonSummaryDto {
  height: number | null;
  weight: number | null;
  pokemon_v2_pokemonstats: PokemonStatDto[];
}

export interface PokemonAbilityDto {
  is_hidden: boolean;
  pokemon_v2_ability: {
    name: string;
    pokemon_v2_abilityeffecttexts: { short_effect: string }[];
  } | null;
}

export interface PokemonDetailsDto extends PokemonDto {
  pokemon_v2_pokemonabilities: PokemonAbilityDto[];
}

export interface GetPokemonListResponse {
  pokemon_v2_pokemon: PokemonDto[];
}

export interface GetPokemonDetailsResponse {
  pokemon_v2_pokemon_by_pk: PokemonDetailsDto | null;
}

export interface SearchPokemonResponse {
  pokemon_v2_pokemon: PokemonSummaryDto[];
}
