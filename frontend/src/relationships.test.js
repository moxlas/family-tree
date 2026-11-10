import { describeRelationship, formatRelationship } from './relationships';

function person(id, gender, extra = {}) {
  return { id, firstName: `P${id}`, lastName: 'Test', gender, ...extra };
}

const people = [
  person('R', 'male'),
  person('F', 'male'),
  person('M', 'female'),
  person('M2', 'female'),
  person('S', 'female'),
  person('HS', 'female'),
  person('HSH', 'male'),
  person('EXHSH', 'male'),
  person('U', 'male'),
  person('C', 'male'),
  person('CS', 'male'),
  person('GF', 'male'),
  person('GM', 'female'),
  person('W', 'female'),
  person('SWF', 'male'),
  person('SWM', 'female'),
  person('EXW', 'female'),
];

const families = [
  { id: 'f1', husband: 'F', wife: 'M', children: ['R', 'S'] },
  { id: 'f2', husband: 'F', wife: 'M2', children: ['HS'] },
  { id: 'f3', husband: 'HSH', wife: 'HS', children: [] },
  {
    id: 'f10',
    husband: 'EXHSH',
    wife: 'HS',
    status: 'former',
    relationshipStatus: 'divorced',
    children: [],
  },
  { id: 'f4', husband: 'GF', wife: 'GM', children: ['F', 'U'] },
  { id: 'f5', husband: 'U', wife: null, children: ['C'] },
  { id: 'f6', husband: 'C', wife: null, children: ['CS'] },
  { id: 'f7', husband: 'R', wife: 'W', children: [] },
  { id: 'f8', husband: 'SWF', wife: 'SWM', children: ['W'] },
  {
    id: 'f9',
    husband: 'R',
    wife: 'EXW',
    status: 'former',
    relationshipStatus: 'divorced',
    children: [],
  },
];

function relation(targetId) {
  return describeRelationship({
    families,
    people,
    referenceId: 'R',
    targetId,
  });
}

const labels = {
  'relation.father': 'Father',
  'relation.mother': 'Mother',
  'relation.sister': 'Sister',
  'relation.halfSister': 'Half-sister',
  'relation.uncle': 'Uncle',
  'relation.cousinMale': 'Cousin',
  'relation.cousinSon': 'Son of a cousin',
  'relation.wife': 'Wife',
  'relation.husband': 'Husband',
  'relation.exWife': 'Ex-wife',
  'relation.exHusband': 'Ex-husband',
  'relation.fatherInLaw': 'Father-in-law',
  'relation.grandfather': 'Grandfather',
  'relation.spouseOf': '{{relation}}’s {{spouse}}',
};

function t(key, values = {}) {
  let value = labels[key] || key;
  Object.entries(values).forEach(([name, replacement]) => {
    value = value.replace(`{{${name}}}`, replacement);
  });
  return value;
}

const ltLabels = {
  'relation.halfSister': 'Įseserė',
  'relation.halfSisterGenitive': 'Įseserės',
  'relation.exHusband': 'Buvęs vyras',
  'relation.exWife': 'Buvusi žmona',
  'relation.spouseOf': '{{relation}} {{spouse}}',
};

function ltT(key, values = {}) {
  let value = ltLabels[key] || key;
  Object.entries(values).forEach(([name, replacement]) => {
    value = value.replace(`{{${name}}}`, replacement);
  });
  return value;
}

describe('describeRelationship', () => {
  it('identifies parents, siblings and half-siblings', () => {
    expect(relation('F').key).toBe('relation.father');
    expect(relation('M').key).toBe('relation.mother');
    expect(relation('S').key).toBe('relation.sister');
    expect(relation('HS').key).toBe('relation.halfSister');
  });

  it('identifies uncles, cousins and cousins children', () => {
    expect(relation('U').key).toBe('relation.uncle');
    expect(relation('C').key).toBe('relation.cousinMale');
    expect(relation('CS').key).toBe('relation.cousinSon');
  });

  it('identifies spouses and in-laws', () => {
    expect(relation('W').key).toBe('relation.wife');
    expect(relation('SWF').key).toBe('relation.fatherInLaw');
  });

  it('distinguishes ex-wives and ex-husbands', () => {
    expect(relation('EXW').key).toBe('relation.exWife');
    expect(
      describeRelationship({
        families,
        people,
        referenceId: 'EXW',
        targetId: 'R',
      }).key
    ).toBe('relation.exHusband');
  });

  it('lets a former family override stale current spouse fields', () => {
    const stalePeople = [
      person('A', 'male', { spouseId: 'B', spouseStatus: 'current' }),
      person('B', 'female', { spouseId: 'A', spouseStatus: 'current' }),
    ];
    const staleFamilies = [
      {
        id: 'stale',
        husband: 'A',
        wife: 'B',
        status: 'former',
        relationshipStatus: 'divorced',
        children: [],
      },
    ];

    expect(
      describeRelationship({
        families: staleFamilies,
        people: stalePeople,
        referenceId: 'A',
        targetId: 'B',
      }).key
    ).toBe('relation.exWife');
  });

  it('builds a descriptive spouse-of-relative label', () => {
    const descriptor = relation('HSH');
    expect(descriptor).toEqual({
      key: 'relation.spouseOf',
      relation: { key: 'relation.halfSister' },
      spouseFormer: false,
      spouseGender: 'male',
    });
    expect(formatRelationship(descriptor, t, 'en')).toBe(
      'Half-sister’s husband'
    );
  });

  it('uses Lithuanian genitive forms for spouses of relatives', () => {
    const descriptor = relation('EXHSH');
    expect(descriptor).toEqual({
      key: 'relation.spouseOf',
      relation: { key: 'relation.halfSister' },
      spouseFormer: true,
      spouseGender: 'male',
    });
    expect(formatRelationship(descriptor, ltT, 'lt')).toBe(
      'Įseserės buvęs vyras'
    );

    expect(formatRelationship(relation('EXW'), ltT, 'lt')).toBe(
      'Buvusi žmona'
    );
  });
});
