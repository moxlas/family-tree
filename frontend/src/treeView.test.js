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

// A wider family: grandparents 1 & 2 have children 3 and 4. 3 marries 5 and
// has child 6, who marries 7 and has child 8. 4 marries 9 and has child 10.
const wider = [
  person('1', { spouseId: '2' }),
  person('2', { spouseId: '1' }),
  person('3', { parentId: '1', spouseId: '5' }),
  person('4', { parentId: '1', spouseId: '9' }),
  person('5', { spouseId: '3' }),
  person('6', { parentId: '3', spouseId: '7' }),
  person('7', { spouseId: '6' }),
  person('8', { parentId: '6' }),
  person('9', { spouseId: '4' }),
  person('10', { parentId: '4' }),
];

const widerFamilies = [
  { id: 'w1', husband: '1', wife: '2', status: 'current', children: ['3', '4'] },
  { id: 'w2', husband: '3', wife: '5', status: 'current', children: ['6'] },
  { id: 'w3', husband: '6', wife: '7', status: 'current', children: ['8'] },
  { id: 'w4', husband: '4', wife: '9', status: 'current', children: ['10'] },
];

describe('branch views are narrower than the full tree', () => {
  it('focusing a grandchild leaves out the uncle and cousin lines', () => {
    expect(ids(viewPeople(wider, widerFamilies))).toEqual([
      '1',
      '10',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]);

    const branch = ids(viewPeople(wider, widerFamilies, { focusId: '6' }));
    // Ancestors 3 & 5, grandparents 1 & 2, child 8, partner 7. No uncle 4,
    // aunt 9 or cousin 10.
    expect(branch).toEqual(['1', '2', '3', '5', '6', '7', '8']);
  });

  it('focusing a parent keeps the siblings and their whole families', () => {
    const branch = ids(viewPeople(wider, widerFamilies, { focusId: '3' }));
    // Sibling 4, aunt 9 and cousin 10 come along with the sibling family.
    expect(branch).toEqual([
      '1',
      '10',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]);
  });

  it('focusing the root keeps the whole line below them', () => {
    const branch = ids(viewPeople(wider, widerFamilies, { focusId: '1' }));
    expect(branch).toEqual([
      '1',
      '10',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]);
  });
});
