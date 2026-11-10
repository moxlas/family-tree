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

  it('round-trips family notes', () => {
    const withNotes = families.map((family, index) => ({
      ...family,
      notes: index === 0 ? 'Married in Kaunas.' : '',
    }));
    const text = buildGedcom(people, 'Spouse test', withNotes);
    const parsed = parseGedcom(text, 'en');

    const withNote = parsed.families.find((family) => family.notes);
    expect(withNote?.notes).toBe('Married in Kaunas.');
    expect(parsed.families.filter((family) => family.notes)).toHaveLength(1);
  });

  it('reads DEAT as a deceased flag even without a date', () => {
    const text = [
      '0 HEAD',
      '1 GEDC',
      '2 VERS 5.5.1',
      '1 CHAR UTF-8',
      '0 @I1@ INDI',
      '1 NAME Bronius /Mikėnas/',
      '1 SEX M',
      '1 DEAT Y',
      '0 @I2@ INDI',
      '1 NAME Vanda //',
      '1 SEX F',
      '0 TRLR',
    ].join('\n');

    const parsed = parseGedcom(text, 'en');
    expect(parsed.individuals[0].deceased).toBe(true);
    expect(parsed.individuals[0].deathDate).toBe('');
    expect(parsed.individuals[1].deceased).toBe(false);
  });

  it('exports and re-imports the deceased flag', () => {
    const peopleWithDeath = [
      person('1', { firstName: 'DeceasedNoDate', gender: 'male' }),
      person('2', { firstName: 'DeceasedWithDate', gender: 'female' }),
      person('3', { firstName: 'Living', gender: 'male' }),
    ];
    peopleWithDeath[0].deceased = true;
    peopleWithDeath[1].deceased = true;
    peopleWithDeath[1].deathDate = '1999';

    const text = buildGedcom(peopleWithDeath, 'Deceased test', []);
    expect(text).toContain('1 DEAT Y');
    expect(text).toContain('2 DATE 1999');

    const parsed = parseGedcom(text, 'en');
    const byName = new Map(
      parsed.individuals.map((entry) => [entry.firstName, entry])
    );
    expect(byName.get('DeceasedNoDate').deceased).toBe(true);
    expect(byName.get('DeceasedNoDate').deathDate).toBe('');
    expect(byName.get('DeceasedWithDate').deceased).toBe(true);
    expect(byName.get('DeceasedWithDate').deathDate).toBe('1999');
    expect(byName.get('Living').deceased).toBe(false);
  });

  it('round-trips a maiden name and a birth place', () => {
    const peopleWithDetails = [
      person('1', {
        firstName: 'Birutė',
        lastName: 'Mikėnienė',
        gender: 'female',
        birthDate: '1940',
        birthPlace: 'Kaunas, Lithuania',
        previousName: 'Birutė Strumskytė',
      }),
      person('2', { firstName: 'Adam', gender: 'male' }),
    ];

    const text = buildGedcom(peopleWithDetails, 'Names test', []);
    expect(text).toContain('1 NAME Birutė /Strumskytė/');
    expect(text).toContain('2 TYPE maiden');
    expect(text).toContain('2 PLAC Kaunas, Lithuania');

    const parsed = parseGedcom(text, 'en');
    const birute = parsed.individuals.find(
      (entry) => entry.firstName === 'Birutė'
    );

    expect(birute.previousName).toBe('Birutė Strumskytė');
    expect(birute.birthPlace).toBe('Kaunas, Lithuania');
    expect(parsed.individuals.find((entry) => entry.firstName === 'Adam').previousName).toBe('');
  });

  it('reads a secondary NAME and BIRT place from a file', () => {
    const text = [
      '0 HEAD',
      '1 GEDC',
      '2 VERS 5.5.1',
      '1 CHAR UTF-8',
      '0 @I1@ INDI',
      '1 NAME Birutė /Mikėnienė/',
      '1 SEX F',
      '1 BIRT',
      '2 DATE 1940',
      '2 PLAC Kaunas',
      '1 NAME Birutė /Strumskytė/',
      '2 TYPE maiden',
      '0 TRLR',
    ].join('\n');

    const parsed = parseGedcom(text, 'en');
    expect(parsed.individuals[0].firstName).toBe('Birutė');
    expect(parsed.individuals[0].lastName).toBe('Mikėnienė');
    expect(parsed.individuals[0].previousName).toBe('Birutė Strumskytė');
    expect(parsed.individuals[0].birthPlace).toBe('Kaunas');
  });

  it('round-trips multiline person and family notes', () => {    const peopleWithNotes = [
      person('1', { firstName: 'Adam', gender: 'male', spouseId: '2' }),
      person('2', { firstName: 'Emma', gender: 'female', spouseId: '1' }),
    ];
    peopleWithNotes[0].notes = 'Line one\nLine two';
    peopleWithNotes[1].notes = 'Second person note';

    const text = buildGedcom(peopleWithNotes, 'Notes test', [
      {
        id: 'f1',
        husband: '1',
        wife: '2',
        status: 'current',
        marriageDate: '',
        divorceDate: '',
        children: [],
        notes: 'Shared family note',
      },
    ]);
    const parsed = parseGedcom(text, 'en');

    expect(parsed.individuals[0].notes).toBe('Line one\nLine two');
    expect(parsed.individuals[1].notes).toBe('Second person note');
    expect(parsed.families[0].notes).toBe('Shared family note');
  });
});
