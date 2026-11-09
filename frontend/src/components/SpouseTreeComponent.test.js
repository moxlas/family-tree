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

  it('renders one unit per marriage for a person with several spouses', () => {
    const people = [
      person('1', { firstName: 'John', spouseId: '3' }),
      person('2', { firstName: 'Mary', spouseId: '1', spouseStatus: 'former' }),
      person('3', { firstName: 'Jane', spouseId: '1' }),
      person('4', { firstName: 'Kid4', parentId: '2' }),
      person('5', { firstName: 'Kid5', parentId: '1' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '2', status: 'former', marriageDate: '', divorceDate: '', children: ['4'] },
      { id: 'f2', husband: '1', wife: '3', status: 'current', marriageDate: '', divorceDate: '', children: ['5'] },
    ];
    const scene = buildScene(people, families, true);
    const johnUnits = scene.units.filter((u) => u.members.some((m) => m.id === '1'));
    expect(johnUnits).toHaveLength(2);
    expect(scene.units).toHaveLength(4);
  });
});
