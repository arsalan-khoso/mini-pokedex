import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';
import { POKEDEX_PAGE_SIZE } from '../constants/pokedex.constants';
import { Pokemon } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';
import { PokemonStore } from './pokemon.store';

function makePokemon(id: number): Pokemon {
  return {
    id,
    name: `pokemon-${id}`,
    types: ['normal'],
    stats: { hp: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    totalStats: 6,
    height: 1,
    weight: 1,
    spriteUrl: null,
  };
}

/** Two full pages plus a short final page. */
const DEX = Array.from({ length: POKEDEX_PAGE_SIZE * 2 + 25 }, (_, index) =>
  makePokemon(index + 1),
);

describe('PokemonStore', () => {
  let getPokemonPage: Mock<(limit: number, offset: number) => Observable<Pokemon[]>>;

  function setup(): PokemonStore {
    TestBed.configureTestingModule({
      providers: [{ provide: PokemonApiService, useValue: { getPokemonPage$: getPokemonPage } }],
    });
    return TestBed.inject(PokemonStore);
  }

  beforeEach(() => {
    getPokemonPage = vi.fn((limit: number, offset: number) =>
      of(DEX.slice(offset, offset + limit)),
    );
  });

  describe('loadPokemon (paginated)', () => {
    it('pages through the list query until a short page and caches every Pokémon', () => {
      const store = setup();

      store.loadPokemon();

      expect(getPokemonPage.mock.calls).toEqual([
        [POKEDEX_PAGE_SIZE, 0],
        [POKEDEX_PAGE_SIZE, POKEDEX_PAGE_SIZE],
        [POKEDEX_PAGE_SIZE, POKEDEX_PAGE_SIZE * 2],
      ]);
      expect(store.state.list.status).toBe('success');
      expect(store.state.list.data.map((pokemon) => pokemon.id)).toEqual(DEX.map((p) => p.id));
    });

    it('serves later calls from the cache instead of refetching', () => {
      const store = setup();

      store.loadPokemon();
      store.loadPokemon();

      expect(getPokemonPage).toHaveBeenCalledTimes(3);
    });

    it('fails the whole load if a page fails, rather than caching a partial Pokédex', () => {
      getPokemonPage.mockImplementation((limit, offset) =>
        offset === 0
          ? of(DEX.slice(0, limit))
          : throwError(() => new HttpErrorResponse({ status: 503 })),
      );
      const store = setup();

      store.loadPokemon();

      expect(store.state.list.status).toBe('error');
      expect(store.state.list.data).toEqual([]);
      expect(store.state.list.error).toContain("Couldn't load the Pokédex");
    });
  });
});
