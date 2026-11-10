import { branchFlags, viewPeople } from './treeView';

function person(id, extra = {}) {
  return { id, firstName: `P${id}`, lastName: 'X', gender: 'unknown', spouseId: null, parentId: null, ...extra };
}

const people = [
  person('1', { spouseId: '2' }),
  person('2', { spouseId: '1' }),
  person('3', { parentId: '1' }),
  person('4', { spouseId: '3' }),
  person('5', { parentId: '3' }),
  person('6', { spouseId: '1' }),
  person('7', { parentId: '6' }),
];

const families = [
  { id: 'f1', husband: '1', wife: '2', status: 'current', children: ['3'] },
  { id: 'f2', husband: '1', wife: '6', status: 'former', children: [] },
  { id: 'f3', husband: '3', wife: '4', status: 'current', children: ['5'] },
];

const ids = (view) => view.people.map((entry) => entry.id).sort();

describe('branch views', () => {
  it('full tree shows the bloodline, spouse cards and mutual children only', () => {
    const view = viewPeople(people, families);
    // 6 and 1 are spouses, 7 is 6's child from outside this family.
    expect(ids(view)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('keeps a separate family that has no marriage link to the main one', () => {
    const extra = [...people, person('8'), person('9', { parentId: '8' })];
    const view = viewPeople(extra, families);
    expect(ids(view)).toContain('8');
    expect(ids(view)).toContain('9');
  });

  it('branch view shows parents, grandparents, siblings and their partners', () => {
    const view = viewPeople(people, families, { focusId: '5' });
    // 5's branch: grandparents 1 & 2, parent 3, partner 4, spouse 6 of 1.
    expect(ids(view)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('branch view of a spouse shows that spouse own family', () => {
    const view = viewPeople(people, families, { focusId: '7' });
    expect(ids(view)).toEqual(['1', '6', '7']);
  });

  it('hides children of a collapsed marriage inside the full tree', () => {
    const view = viewPeople(people, families, { collapsedFamilyIds: ['f1'] });
    expect(ids(view)).toEqual(['1', '2', '6']);
  });

  it('reports parents and siblings for the branch button', () => {
    expect(branchFlags(people, families, '5')).toEqual({
      hasParents: true,
      hasSiblings: false,
      hasBranch: true,
    });

    const mixed = [...people, person('10', { parentId: '1' })];
    expect(branchFlags(mixed, families, '10').hasBranch).toBe(true);
    expect(branchFlags(mixed, families, '10').hasSiblings).toBe(true);
    expect(branchFlags(mixed, families, '2').hasBranch).toBe(false);
  });
});
