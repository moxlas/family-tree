import { buildScene } from './SpouseTreeComponent';

function person(id, extra = {}) {
  return { id, firstName: `P${id}`, lastName: 'X', gender: 'unknown', ...extra };
}

describe('buildScene generation placement', () => {
  it('keeps couples without parents in the root generation', () => {
    const people = [
      person('1', { firstName: 'A', spouseId: '2' }),
      person('2', { firstName: 'B', spouseId: '1' }),
    ];
    const scene = buildScene(people, [], true);
    expect(scene.depths).toHaveLength(1);
    expect(scene.depths[0]).toBe(0);
  });

  it('places a card without parents into its spouse generation', () => {
    const people = [
      person('1', { firstName: 'A', spouseId: '2' }),
      person('2', { firstName: 'B', spouseId: '1', parentId: '3' }),
      person('3', { firstName: 'C', lastName: 'Grandparent' }),
    ];
    const scene = buildScene(people, [], true);
    // The couple lives under the spouse's parents -> generation 1.
    expect(scene.depths).toHaveLength(2);
    expect(scene.depths.reduce((m, d) => Math.max(m, d), 0)).toBe(1);
    expect(scene.rows).toHaveLength(2);
  });

  it('keeps children one generation below their parent couple', () => {
    const people = [
      person('1', { firstName: 'A', lastName: 'Root' }),
      person('2', { firstName: 'B', lastName: 'Root', spouseId: '1' }),
      person('3', { firstName: 'C', parentId: '1' }),
    ];
    const scene = buildScene(people, [], true);
    const childDepth = scene.depths[scene.depths.length - 1];
    expect(childDepth).toBe(1);
  });

  it('skips former marriages when ex-spouses are hidden', () => {
    const people = [
      person('1', { firstName: 'A', spouseId: '2', spouseStatus: 'former' }),
      person('2', { firstName: 'B', spouseId: '1', spouseStatus: 'former' }),
    ];
    const shown = buildScene(people, [], true);
    const hidden = buildScene(people, [], false);
    expect(shown.units).toHaveLength(1);
    expect(shown.units[0].status).toBe('former');
    expect(hidden.units).toHaveLength(0);
  });
});
