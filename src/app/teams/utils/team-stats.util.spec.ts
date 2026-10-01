import { Pokemon } from '../../pokedex/models/pokemon.model';
import { countTypes, sumTeamStats } from './team-stats.util';

function makePokemon(id: number, types: string[], base: number): Pokemon {
  return {
    id,
    name: `pokemon-${id}`,
    types,
    stats: {
      hp: base,
      attack: base,
      defense: base,
      specialAttack: base,
      specialDefense: base,
      speed: base,
    },
    totalStats: base * 6,
    height: 10,
    weight: 100,
    spriteUrl: null,
  };
}

describe('team stats', () => {
  const team = [
    makePokemon(6, ['fire', 'flying'], 80),
    makePokemon(9, ['water'], 70),
    makePokemon(130, ['water', 'flying'], 90),
  ];

  it('counts each type once per member, most common first then alphabetical', () => {
    expect(countTypes(team)).toEqual([
      { type: 'flying', count: 2 },
      { type: 'water', count: 2 },
      { type: 'fire', count: 1 },
    ]);
  });

  it('sums every base stat and the grand total across the team', () => {
    const totals = sumTeamStats(team);
    expect(totals.stats.speed).toBe(240);
    expect(totals.total).toBe(1440);
  });

  it('returns zeroed totals for an empty team', () => {
    expect(countTypes([])).toEqual([]);
    expect(sumTeamStats([]).total).toBe(0);
  });
});
