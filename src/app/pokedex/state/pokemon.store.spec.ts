import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
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
  let searchPokemonByName: Mock<(term: string) => Observable<Pokemon[]>>;
  let searchResponses: Map<string, Subject<Pokemon[]>>;

  function setup(): PokemonStore {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PokemonApiService,
          useValue: { getPokemonPage$: getPokemonPage, searchPokemonByName$: searchPokemonByName },
        },
      ],
    });
    return TestBed.inject(PokemonStore);
  }

  beforeEach(() => {
    getPokemonPage = vi.fn((limit: number, offset: number) =>
      of(DEX.slice(offset, offset + limit)),
    );
    searchResponses = new Map();
    searchPokemonByName = vi.fn((term: string) => {
      const response = new Subject<Pokemon[]>();
      searchResponses.set(term, response);
      return response;
    });
  });

  describe('setSearch (debounceTime → distinctUntilChanged → switchMap)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('only queries the API once typing pauses for 300ms', () => {
      const store = setup();

      store.setSearch('c');
      vi.advanceTimersByTime(100);
      store.setSearch('ch');
      vi.advanceTimersByTime(100);
      store.setSearch('char');
      vi.advanceTimersByTime(300);

      expect(searchPokemonByName).toHaveBeenCalledTimes(1);
      expect(searchPokemonByName).toHaveBeenCalledWith('char');
      expect(store.state.query.search).toBe('char');
      expect(store.state.tableSearch.status).toBe('loading');
    });

    it('skips a repeated term and cancels the stale request when the term changes', () => {
      const store = setup();

      store.setSearch('char');
      vi.advanceTimersByTime(300);
      store.setSearch('char');
      vi.advanceTimersByTime(300);
      expect(searchPokemonByName).toHaveBeenCalledTimes(1);

      store.setSearch('pika');
      vi.advanceTimersByTime(300);
      searchResponses.get('char')?.next([makePokemon(4)]);

      expect(store.state.tableSearch).toMatchObject({ term: 'pika', status: 'loading' });

      searchResponses.get('pika')?.next([makePokemon(25)]);

      expect(store.state.tableSearch).toMatchObject({ term: 'pika', status: 'success' });
      expect(store.state.tableSearch.data.map((pokemon) => pokemon.id)).toEqual([25]);
    });

    it('surfaces a failed search as an error that retryTableSearch can recover from', () => {
      const store = setup();

      store.setSearch('char');
      vi.advanceTimersByTime(300);
      searchResponses.get('char')?.error(new HttpErrorResponse({ status: 0 }));
      expect(store.state.tableSearch.status).toBe('error');

      store.retryTableSearch();
      searchResponses.get('char')?.next([makePokemon(4)]);

      expect(searchPokemonByName).toHaveBeenCalledTimes(2);
      expect(store.state.tableSearch.status).toBe('success');
    });
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
