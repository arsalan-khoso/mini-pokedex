import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { POKEAPI_GRAPHQL_URL } from '../../common/constants/api.constants';
import { retryWithBackoff } from '../../common/utils/retry-with-backoff.util';
import { GraphqlRequestError } from '../../core/graphql/graphql.model';
import { GraphqlService } from '../../core/graphql/graphql.service';
import {
  GetAbilitiesResponse,
  GetPokemonByIdResponse,
  GetPokemonListResponse,
  PokemonAbilityDto,
  PokemonDto,
  SearchPokemonResponse,
} from '../models/pokemon-api.model';
import { Pokemon, PokemonDetails, PokemonSummary } from '../models/pokemon.model';
import { toPokemon, toPokemonDetails, toPokemonSummary } from '../utils/pokemon-mapper.util';
import {
  GET_ABILITIES_QUERY,
  GET_POKEMON_BY_ID_QUERY,
  GET_POKEMON_LIST_QUERY,
  SEARCH_POKEMON_QUERY,
} from './pokemon.queries';

@Injectable({ providedIn: 'root' })
export class PokemonApiService {
  private readonly graphql = inject(GraphqlService);

  /** Fetches a page of Pokémon (species only) with types, base stats and sprite, ordered by id. */
  getPokemonPage$(limit: number, offset: number): Observable<Pokemon[]> {
    return this.graphql
      .request$<GetPokemonListResponse>(POKEAPI_GRAPHQL_URL, GET_POKEMON_LIST_QUERY, {
        limit,
        offset,
      })
      .pipe(
        retryWithBackoff(),
        map((data) => data.pokemon_v2_pokemon.map(toPokemon)),
      );
  }

  /**
   * Fetches one Pokémon by id with base stats and English ability descriptions.
   * Stats (`GetPokemonById`) and abilities (`GetAbilities`) are requested in parallel.
   */
  getPokemonDetails$(id: number): Observable<PokemonDetails> {
    return forkJoin([this.getPokemonById$(id), this.getAbilities$(id)]).pipe(
      map(([pokemon, abilities]) => toPokemonDetails(pokemon, abilities)),
    );
  }

  private getPokemonById$(id: number): Observable<PokemonDto> {
    return this.graphql
      .request$<GetPokemonByIdResponse>(POKEAPI_GRAPHQL_URL, GET_POKEMON_BY_ID_QUERY, { id })
      .pipe(
        retryWithBackoff(),
        map((data) => {
          if (!data.pokemon_v2_pokemon_by_pk) {
            throw new GraphqlRequestError([`Pokémon #${id} was not found.`]);
          }
          return data.pokemon_v2_pokemon_by_pk;
        }),
      );
  }

  private getAbilities$(pokemonId: number): Observable<PokemonAbilityDto[]> {
    return this.graphql
      .request$<GetAbilitiesResponse>(POKEAPI_GRAPHQL_URL, GET_ABILITIES_QUERY, { pokemonId })
      .pipe(
        retryWithBackoff(),
        map((data) => data.pokemon_v2_pokemonability),
      );
  }

  /** Case-insensitive "contains" search on Pokémon names, used by the team builder typeahead. */
  searchPokemonByName$(term: string, limit: number): Observable<PokemonSummary[]> {
    return this.graphql
      .request$<SearchPokemonResponse>(POKEAPI_GRAPHQL_URL, SEARCH_POKEMON_QUERY, {
        pattern: `%${escapeLikePattern(term)}%`,
        limit,
      })
      .pipe(
        retryWithBackoff(),
        map((data) => data.pokemon_v2_pokemon.map(toPokemonSummary)),
      );
  }
}

/** Stops user input such as "50%" from acting as SQL LIKE wildcards. */
function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}
