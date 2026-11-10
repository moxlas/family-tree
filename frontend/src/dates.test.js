import {
  formatDateForDisplay,
  formatIsoDate,
  formatLifeDateForDisplay,
  normalizeDateValue,
  toIsoDate,
} from './dates';

describe('formatDateForDisplay', () => {
  it('uses Lithuanian month abbreviations', () => {
    const cases = [
      ['JAN', 'saus.'],
      ['FEB', 'vas.'],
      ['MAR', 'kov.'],
      ['APR', 'bal.'],
      ['MAY', 'geg.'],
      ['JUN', 'birž.'],
      ['JUL', 'liep.'],
      ['AUG', 'rugp.'],
      ['SEP', 'rugs.'],
      ['OCT', 'spal.'],
      ['NOV', 'lapkr.'],
      ['DEC', 'gruod.'],
    ];

    cases.forEach(([gedcom, lithuanian]) => {
      expect(formatDateForDisplay(`16 ${gedcom} 1991`, 'lt')).toBe(
        `16 ${lithuanian} 1991`
      );
    });
  });

  it('keeps English dates in GEDCOM form', () => {
    expect(formatDateForDisplay('16 JAN 1991', 'en')).toBe('16 JAN 1991');
    expect(formatDateForDisplay('1991', 'en')).toBe('1991');
  });

  it('converts ISO input before displaying it', () => {
    expect(formatDateForDisplay('1991-01-16', 'lt')).toBe('16 saus. 1991');
  });

  it('translates dates inside qualifiers and ranges', () => {
    expect(formatDateForDisplay('ABT 16 JAN 1991', 'lt')).toBe(
      'ABT 16 saus. 1991'
    );
    expect(formatDateForDisplay('BET JAN 1991 AND FEB 1992', 'lt')).toBe(
      'BET saus. 1991 AND vas. 1992'
    );
  });

  it('leaves non-date text alone', () => {
    expect(formatDateForDisplay('spring 1991', 'lt')).toBe('spring 1991');
  });
});

describe('formatLifeDateForDisplay', () => {
  it('renders full Lithuanian dates as year/month/day', () => {
    expect(formatLifeDateForDisplay('16 JAN 1991', 'lt')).toBe('1991/01/16');
    expect(formatLifeDateForDisplay('9 OCT 1981', 'lt')).toBe('1981/10/09');
  });

  it('renders partial Lithuanian month dates in words', () => {
    expect(formatLifeDateForDisplay('DEC 2011', 'lt')).toBe('2011m. gruodį');
    expect(formatLifeDateForDisplay('OCT 2011', 'lt')).toBe('2011m. spalį');
    expect(formatLifeDateForDisplay('JUN 1945', 'lt')).toBe('1945m. birželį');
  });

  it('formats dates inside qualifiers and ranges', () => {
    expect(formatLifeDateForDisplay('ABT JUN 1945', 'lt')).toBe(
      'ABT 1945m. birželį'
    );
    expect(
      formatLifeDateForDisplay('BET JAN 1991 AND FEB 1992', 'lt')
    ).toBe('BET 1991m. sausį AND 1992m. vasarį');
  });

  it('keeps English and year-only dates unchanged', () => {
    expect(formatLifeDateForDisplay('16 JAN 1991', 'en')).toBe('16 JAN 1991');
    expect(formatLifeDateForDisplay('1945', 'lt')).toBe('1945');
  });
});

describe('normalizeDateValue', () => {
  it('normalizes full dates to GEDCOM', () => {
    expect(normalizeDateValue('1991-01-16')).toBe('16 JAN 1991');
    expect(normalizeDateValue('16.01.1991')).toBe('16 JAN 1991');
    expect(normalizeDateValue('16/1/1991')).toBe('16 JAN 1991');
    expect(normalizeDateValue('16 saus. 1991')).toBe('16 JAN 1991');
    expect(normalizeDateValue('1991 m. sausio 16 d.')).toBe('16 JAN 1991');
    expect(normalizeDateValue('16 January 1991')).toBe('16 JAN 1991');
    expect(normalizeDateValue('January 16, 1991')).toBe('16 JAN 1991');
  });

  it('keeps partial dates in GEDCOM form', () => {
    expect(normalizeDateValue('1945')).toBe('1945');
    expect(normalizeDateValue('JUN 1945')).toBe('JUN 1945');
    expect(normalizeDateValue('1945 m. birželis')).toBe('JUN 1945');
    expect(normalizeDateValue('1945 m.')).toBe('1945');
    expect(normalizeDateValue('16 saus.')).toBe('16 JAN');
  });

  it('normalizes qualifiers and ranges', () => {
    expect(normalizeDateValue('about 1945')).toBe('ABT 1945');
    expect(normalizeDateValue('before 16 saus. 1991')).toBe('BEF 16 JAN 1991');
    expect(normalizeDateValue('between 1900 and 1910')).toBe(
      'BET 1900 AND 1910'
    );
    expect(normalizeDateValue('from 1900 to 1910')).toBe('FROM 1900 TO 1910');
  });

  it('does not invent dates from invalid values', () => {
    expect(normalizeDateValue('31.02.1991')).toBe('31.02.1991');
    expect(normalizeDateValue('31 FEB 1991')).toBe('31 FEB 1991');
    expect(normalizeDateValue('')).toBe('');
  });
});

describe('calendar helpers', () => {
  it('converts a GEDCOM date to an ISO value for a date input', () => {
    expect(toIsoDate('16 JAN 1991')).toBe('1991-01-16');
    expect(toIsoDate('16 saus. 1991')).toBe('1991-01-16');
    expect(toIsoDate('1991')).toBe('');
  });

  it('converts an ISO value from the picker to GEDCOM', () => {
    expect(formatIsoDate('1991-01-16')).toBe('16 JAN 1991');
    expect(formatIsoDate('')).toBe('');
  });
});
