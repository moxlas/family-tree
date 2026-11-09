import { viewPeople } from './treeView';

function person(id, extra = {}) {
  return { id, firstName: `P${id}`, lastName: 'X', gender: 'unknown', spouseId: null, parentId: null, ...extra };
}

const people = [
  person('1', { spouseId: '2' }),
  person('2', { spouseId: '1' }),
  person('3', { parentId: '1' }),
  person('4', { spouseId: '3' }),
  person('5', { parentId: '3' }),
  person('6', { spouseId: '1', parentId: null }),
  person('7', { parentId: '6' }),
];

const families = [
  { id: 'f1', husband: '1', wife: '2', status: 'current', children: ['3'] },
  { id: 'f2', husband: '1', wife: '6', status: 'former', children: ['7'] },
  { id: 'f3', husband: '3', wife: '4', status: 'current', children: ['5'] },
];

const ids = (view) => view.people.map((entry) => entry.id).sort();

describe('viewPeople', () => {
  it('shows everyone when nothing is collapsed or focused', () => {
    expect(ids(viewPeople(people, families))).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('hides children, descendants and their partners when a marriage is collapsed', () => {
    const view = viewPeople(people, families, { collapsedFamilyIds: ['f1'] });
    expect(ids(view)).toEqual(['1', '2', '6', '7']);
    expect(view.families.find((family) => family.id === 'f1').children).toEqual([]);
  });

  it('keeps only the focused person, partners and descendants', () => {
    const view = viewPeople(people, families, { focusId: '3' });
    expect(ids(view)).toEqual(['3', '4', '5']);
  });

  it('does not show ancestors when focusing a branch', () => {
    const view = viewPeople(people, families, { focusId: '3' });
    expect(view.people.find((entry) => entry.id === '1')).toBeUndefined();
  });

  it('keeps a partner who is still married to a visible person when collapsing', () => {
    const view = viewPeople(people, families, { collapsedFamilyIds: ['f1'] });
    expect(view.people.find((entry) => entry.id === '6')).toBeDefined();
  });
});
