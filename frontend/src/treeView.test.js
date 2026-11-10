import {
  branchMemberIds,
  branchFlags,
  defaultHomePersonId,
  viewPeople,
} from './treeView';

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

  it('hides the children of a collapsed person inside the full tree', () => {
    const view = viewPeople(people, families, { collapsedPersonIds: ['1'] });
    expect(ids(view)).toEqual(['1', '2', '6']);
  });

  it('keeps a collapsed person out of the branch view', () => {
    const view = viewPeople(people, families, {
      focusId: '1',
      collapsedPersonIds: ['1'],
    });
    expect(ids(view)).toEqual(['1', '2', '3', '4', '5', '6']);
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

describe('branch views follow the whole bloodline', () => {
  it('focusing a grandchild includes uncles, aunts and cousins', () => {
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
    // Ancestors 3 & 5 and grandparents 1 & 2 bring in uncle 4, aunt 9 and
    // cousin 10 along with the focus's own child 8 and partner 7.
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

  it('does not pull unrelated families into a branch', () => {
    const extra = [...wider, person('20'), person('21', { parentId: '20' })];
    const branch = ids(viewPeople(extra, widerFamilies, { focusId: '6' }));

    expect(branch).not.toContain('20');
    expect(branch).not.toContain('21');
  });
});

// Four generations: 20 & 21 have children 1 and 22; 1 & 2 have 3 and 4;
// 3 & 5 have focus 6; 22 & 23 have 24. The branch of 6 must reach the
// great-grandparents and the great-uncle's line too.
const deepPeople = [
  person('20', { spouseId: '21' }),
  person('21', { spouseId: '20' }),
  person('1', { parentId: '20', spouseId: '2' }),
  person('2', { spouseId: '1' }),
  person('22', { parentId: '20', spouseId: '23' }),
  person('23', { spouseId: '22' }),
  person('3', { parentId: '1', spouseId: '5' }),
  person('4', { parentId: '1', spouseId: '9' }),
  person('5', { spouseId: '3' }),
  person('6', { parentId: '3', spouseId: '7' }),
  person('7', { spouseId: '6' }),
  person('9', { spouseId: '4' }),
  person('24', { parentId: '22' }),
];

const deepFamilies = [
  { id: 'd1', husband: '20', wife: '21', status: 'current', children: ['1', '22'] },
  { id: 'd2', husband: '1', wife: '2', status: 'current', children: ['3', '4'] },
  { id: 'd3', husband: '22', wife: '23', status: 'current', children: ['24'] },
  { id: 'd4', husband: '3', wife: '5', status: 'current', children: ['6'] },
  { id: 'd5', husband: '4', wife: '9', status: 'current', children: [] },
  { id: 'd6', husband: '6', wife: '7', status: 'current', children: [] },
];

describe('branch ancestors at every depth', () => {
  it('includes great-grandparents and their other descendant lines', () => {
    const branch = ids(viewPeople(deepPeople, deepFamilies, { focusId: '6' }));

    expect(branch).toEqual([
      '1',
      '2',
      '20',
      '21',
      '22',
      '23',
      '24',
      '3',
      '4',
      '5',
      '6',
      '7',
      '9',
    ]);
  });

  it('still leaves out the spouse own parents and their other children', () => {
    const withInLaws = [
      ...deepPeople.map((entry) =>
        entry.id === '7' ? { ...entry, parentId: '30' } : entry
      ),
      person('30', { spouseId: '31' }),
      person('31', { spouseId: '30' }),
      person('32', { parentId: '30' }),
    ];
    const branch = ids(
      viewPeople(withInLaws, deepFamilies, { focusId: '6' })
    );

    expect(branch).not.toContain('30');
    expect(branch).not.toContain('31');
    expect(branch).not.toContain('32');
  });
});

// Home person 7. 1 & 2 have children 3 and 4; 3 marries 5 and has 7; 4
// marries 6 and has 8; 8 marries 12, whose parents 13 & 14 have 15.
const homePeople = [
  person('1', { spouseId: '2' }),
  person('2', { spouseId: '1' }),
  person('3', { parentId: '1', spouseId: '5' }),
  person('4', { parentId: '1', spouseId: '6' }),
  person('5', { spouseId: '3' }),
  person('6', { spouseId: '4' }),
  person('7', { parentId: '3' }),
  person('8', { parentId: '4', spouseId: '12' }),
  person('12', { spouseId: '8' }),
  person('13', { spouseId: '14' }),
  person('14', { spouseId: '13' }),
  person('15', { parentId: '13' }),
];

const homeFamilies = [
  { id: 'h1', husband: '1', wife: '2', status: 'current', children: ['3', '4'] },
  { id: 'h2', husband: '3', wife: '5', status: 'current', children: ['7'] },
  { id: 'h3', husband: '6', wife: '4', status: 'current', children: ['8'] },
  { id: 'h4', husband: '13', wife: '14', status: 'current', children: ['15', '12'] },
];

describe('home person tree', () => {
  it('shows the home person ancestors, their descendants and spouse cards', () => {
    const view = ids(viewPeople(homePeople, homeFamilies, { homePersonId: '7' }));
    // Cousin 8 and their spouse 12 are in; the spouse's own parents 13 & 14
    // and their other child 15 are an in-law branch.
    expect(view).toEqual([
      '1',
      '12',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);
  });

  it('keeps a spouse own family reachable through their branch', () => {
    const branch = ids(
      viewPeople(homePeople, homeFamilies, { focusId: '12' })
    );
    expect(branch).toEqual(['12', '13', '14', '15', '8']);
  });

  it('never applies the home person to a branch view', () => {
    const withHome = ids(
      viewPeople(homePeople, homeFamilies, {
        focusId: '12',
        homePersonId: '7',
      })
    );
    const withoutHome = ids(
      viewPeople(homePeople, homeFamilies, { focusId: '12' })
    );

    // 13, 14 and 15 are in-laws that the home tree of 7 does not contain.
    expect(withHome).toEqual(withoutHome);
    expect(withHome).toEqual(['12', '13', '14', '15', '8']);
  });

  it('reports branch members that the main tree hides', () => {
    const baseIds = new Set(
      viewPeople(homePeople, homeFamilies, { homePersonId: '7' }).people.map(
        (person) => String(person.id)
      )
    );
    const extra = branchMemberIds(homePeople, homeFamilies, '12')
      .map(String)
      .filter((id) => !baseIds.has(id))
      .sort();

    expect(extra).toEqual(['13', '14', '15']);
  });

  it('falls back to the plain full tree when the home person is unknown', () => {
    const withMissing = ids(
      viewPeople(homePeople, homeFamilies, { homePersonId: 'missing' })
    );
    const withoutOption = ids(viewPeople(homePeople, homeFamilies));
    expect(withMissing).toEqual(withoutOption);
  });

  it('keeps a family with no link to the home line as its own tree', () => {
    const extra = [
      ...homePeople,
      person('20'),
      person('21', { spouseId: '20' }),
      person('22', { parentId: '20' }),
    ];
    const combined = [
      ...homeFamilies,
      { id: 'h9', husband: '20', wife: '21', status: 'current', children: ['22'] },
    ];
    const view = ids(viewPeople(extra, combined, { homePersonId: '7' }));
    expect(view).toContain('22');
    expect(view).toContain('21');
  });

  it('picks the youngest person with parents as the default trunk', () => {
    const dated = homePeople.map((entry) =>
      entry.id === '7' ? { ...entry, birthDate: '1990' } : entry
    );
    const withYear = dated.map((entry) =>
      entry.id === '8' ? { ...entry, birthDate: '1995' } : entry
    );
    expect(defaultHomePersonId(withYear, homeFamilies)).toBe('8');
  });
});
