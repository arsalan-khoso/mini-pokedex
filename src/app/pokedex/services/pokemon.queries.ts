const POKEMON_SUMMARY_FIELDS = /* GraphQL */ `
  id
  name
  pokemon_v2_pokemontypes(order_by: { slot: asc }) {
    pokemon_v2_type {
      name
    }
  }
  pokemon_v2_pokemonsprites {
    sprites(path: "front_default")
  }
`;

const POKEMON_FIELDS = /* GraphQL */ `
  ${POKEMON_SUMMARY_FIELDS}
  height
  weight
  pokemon_v2_pokemonstats {
    base_stat
    pokemon_v2_stat {
      name
    }
  }
`;

/** Alternate forms (mega, regional, gmax…) live at id >= 10000; the Pokédex lists species only. */
export const GET_POKEMON_LIST_QUERY = /* GraphQL */ `
  query GetPokemon($limit: Int, $offset: Int) {
    pokemon_v2_pokemon(
      limit: $limit
      offset: $offset
      order_by: { id: asc }
      where: { id: { _lt: 10000 } }
    ) {
      ${POKEMON_FIELDS}
    }
  }
`;

export const GET_POKEMON_BY_ID_QUERY = /* GraphQL */ `
  query GetPokemonById($id: Int!) {
    pokemon_v2_pokemon_by_pk(id: $id) {
      ${POKEMON_FIELDS}
    }
  }
`;

/** The assessment brief's abilities query, used as specified. */
export const GET_ABILITIES_QUERY = /* GraphQL */ `
  query GetAbilities($pokemonId: Int) {
    pokemon_v2_pokemonability(where: { pokemon_id: { _eq: $pokemonId } }) {
      pokemon_v2_ability {
        name
        pokemon_v2_abilityeffecttexts(where: { language_id: { _eq: 9 } }) {
          short_effect
        }
      }
      is_hidden
    }
  }
`;

/** Name search with the same fields as the list, so results can feed the table directly. */
export const SEARCH_POKEMON_QUERY = /* GraphQL */ `
  query SearchPokemon($pattern: String!, $limit: Int) {
    pokemon_v2_pokemon(
      limit: $limit
      order_by: { id: asc }
      where: { name: { _ilike: $pattern }, id: { _lt: 10000 } }
    ) {
      ${POKEMON_FIELDS}
    }
  }
`;
