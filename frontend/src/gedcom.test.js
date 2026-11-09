import { buildGedcom, parseGedcom } from './gedcom';

function person(id, values) {
  return {
    id,
    firstName: values.firstName,
    lastName: values.lastName || 'Test',
    gender: values.gender || 'unknown',
    birthDate: '',
    deathDate: '',
    notes: '',
    spouseId: values.spouseId || null,
    spouseName: '',
    parentId: values.parentId || null,
    ...values,
  };
}

describe('GEDCOM spouse connection round-trip', () => {
  const people = [
    person('1', { firstName: 'Adam', gender: 'male', spouseId: '3' }),
    person('2', { firstName: 'Emma', gender: 'female' }),
    person('3', { firstName: 'Nina', gender: 'female', spouseId: '1' }),
    person('4', { firstName: 'FormerKid', gender: 'male', parentId: '1' }),
    person('5', { firstName: 'CurrentKid', gender: 'female', parentId: '1' }),
  ];

  const families = [
    {
      id: 'f1',
      husband: '1',
      wife: '2',
      status: 'former',
      marriageDate: '1990',
      divorceDate: '1995',
      children: ['4'],
    },
    {
      id: 'f2',
      husband: '1',
      wife: '3',
      status: 'current',
      marriageDate: '1998',
      divorceDate: '',
      children: ['5'],
    },
  ];

  it('exports former marriages with MARR and DIV events', () => {
    const text = buildGedcom(people, 'Spouse test', families);

    expect(text).toContain('1 MARR');
    expect(text).toContain('2 DATE 1990');
    expect(text).toContain('1 DIV');
    expect(text).toContain('2 DATE 1995');
    expect(text).toContain('1 HUSB @I1@');
    expect(text).toContain('1 WIFE @I2@');
    expect(text).toContain('1 WIFE @I3@');
  });

  it('imports former marriages with status and dates', () => {
    const text = buildGedcom(people, 'Spouse test', families);
    const parsed = parseGedcom(text, 'en');

    expect(parsed.families).toHaveLength(2);

    const former = parsed.families.find(
      (family) => family.status === 'former'
    );
    const current = parsed.families.find(
      (family) => family.status === 'current'
    );

    expect(former).toEqual(
      expect.objectContaining({
        status: 'former',
        marriageDate: '1990',
        divorceDate: '1995',
      })
    );
    expect(current).toEqual(
      expect.objectContaining({
        status: 'current',
        marriageDate: '1998',
      })
    );
  });

  it('keeps a former marriage without a date as divorced', () => {
    const text = [
      '0 HEAD',
      '1 GEDC',
      '2 VERS 5.5.1',
      '1 CHAR UTF-8',
      '0 @I1@ INDI',
      '1 NAME Adam /Test/',
      '1 SEX M',
      '0 @I2@ INDI',
      '1 NAME Emma /Test/',
      '1 SEX F',
      '0 @F1@ FAM',
      '1 HUSB @I1@',
      '1 WIFE @I2@',
      '1 DIV Y',
      '0 TRLR',
    ].join('\n');

    const parsed = parseGedcom(text, 'en');
    expect(parsed.families[0].status).toBe('former');
    expect(parsed.families[0].divorceDate).toBe('');
  });
});
