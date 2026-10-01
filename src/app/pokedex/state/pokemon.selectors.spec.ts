import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { Pokemon, StatKey } from '../models/pokemon.model';
import { PokemonApiService } from '../services/pokemon-api.service';
import {
  PokemonSelectors,
  filterPokemon,
  paginate,
  selectTableSource,
  sortPokemon,
} from './pokemon.selectors';
import { PokemonStore } from './pokemon.store';

function makePokemon(id: number, name: string, types: string[], speed: number): Pokemon {
  const stats: Record<StatKey, number> = {
    hp: 50,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed,
  };
  return {
    id,
    name,
    types,
    stats,
    totalStats: 250 + speed,
    height: 10,
    weight: 100,
    spriteUrl: null,
  };
}

const BULBASAUR = makePokemon(1, 'bulbasaur', ['grass', 'poison'], 45);
const CHARMANDER = makePokemon(4, 'charmander', ['fire'], 65);
const CHARMELEON = makePokemon(5, 'charmeleon', ['fire'], 80);
const SQUIRTLE = makePokemon(7, 'squirtle', ['water'], 43);
const PIKACHU = makePokemon(25, 'pikachu', ['electric'], 90);
const ODDISH = makePokemon(43, 'oddish', ['grass', 'poison'], 30);
const DIGLETT = makePokemon(50, 'diglett', ['ground'], 95);
const ALL = [BULBASAUR, CHARMANDER, CHARMELEON, SQUIRTLE, PIKACHU, ODDISH, DIGLETT];

describe('pokemon selectors', () => {
  describe('filterPokemon', () => {
    it('combines a case-insensitive name search with the type filter', () => {
      expect(filterPokemon(ALL, { search: '  CHAR ', type: 'fire' })).toEqual([
        CHARMANDER,
        CHARMELEON,
      ]);
      expect(filterPokemon(ALL, { search: '', type: 'poison' })).toEqual([BULBASAUR, ODDISH]);
      expect(filterPokemon(ALL, { search: 'char', type: 'water' })).toEqual([]);
    });
  });

  describe('sortPokemon', () => {
    it('sorts by a stat column descending without mutating the input', () => {
      const sorted = sortPokemon(ALL, 'speed', 'desc');

      expect(sorted.map((pokemon) => pokemon.name)).toEqual([
        'diglett',
        'pikachu',
        'charmeleon',
        'charmander',
        'bulbasaur',
        'squirtle',
        'oddish',
      ]);
      expect(ALL[0]).toBe(BULBASAUR);
    });

    it('breaks ties by Pokédex number so the order is stable', () => {
      const sorted = sortPokemon([ODDISH, CHARMANDER, BULBASAUR], 'hp', 'desc');
      expect(sorted.map((pokemon) => pokemon.id)).toEqual([1, 4, 43]);
    });
  });

  describe('paginate', () => {
    it('returns the requested page with a human-readable range', () => {
      expect(paginate(ALL, 1, 3)).toEqual({
        items: [SQUIRTLE, PIKACHU, ODDISH],
        page: 1,
        pageCount: 3,
        totalItems: 7,
        rangeStart: 4,
        rangeEnd: 6,
      });
    });

    it('clamps an out-of-range page to the last page and handles empty input', () => {
      expect(paginate(ALL, 99, 3).page).toBe(2);
      expect(paginate([], 0, 10)).toMatchObject({
        items: [],
        pageCount: 1,
        rangeStart: 0,
        rangeEnd: 0,
      });
    });
  });

  describe('selectTableSource', () => {
    const list = { status: 'success' as const, data: ALL, error: null };

    it('uses the cached list when no search is active', () => {
      const idle = { term: '', status: 'idle' as const, data: [], error: null };
      expect(selectTableSource(list, '  ', idle)).toEqual({
        status: 'success',
        error: null,
        items: ALL,
      });
    });

    it('treats results for an older term as still loading', () => {
      const stale = { term: 'char', status: 'success' as const, data: [CHARMANDER], error: null };
      expect(selectTableSource(list, 'pika', stale)).toMatchObject({
        status: 'loading',
        items: [],
      });
    });

    it('returns the search results and errors for the current term', () => {
      const found = { term: 'pika', status: 'success' as const, data: [PIKACHU], error: null };
      const failed = { term: 'pika', status: 'error' as const, data: [], error: 'Offline' };

      expect(selectTableSource(list, 'pika ', found).items).toEqual([PIKACHU]);
      expect(selectTableSource(list, 'pika', failed)).toMatchObject({
        status: 'error',
        error: 'Offline',
      });
    });
  });

  describe('PokemonSelectors.pagedPokemon$', () => {
    it('derives the visible page from the store query (filter → sort → page)', async () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: PokemonApiService,
            useValue: {
              getPokemonPage$: (limit: number, offset: number) =>
                of(ALL.slice(offset, offset + limit)),
            },
          },
        ],
      });
      const store = TestBed.inject(PokemonStore);
      const selectors = TestBed.inject(PokemonSelectors);

      store.loadPokemon();
      store.setTypeFilter('fire');
      store.toggleSort('speed');

      const page = await firstValueFrom(selectors.pagedPokemon$);
      expect(page.items.map((pokemon) => pokemon.name)).toEqual(['charmeleon', 'charmander']);
      expect(page.totalItems).toBe(2);
    });
  });
});
