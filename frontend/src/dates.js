// GEDCOM dates are stored as free text such as "16 JAN 1991", "JUN 1945"
// or just "1945". This module keeps that canonical form for export while
// letting the UI display Lithuanian month names and accepting flexible
// manual input (ISO, dotted, Lithuanian or English).

const MONTHS = [
  {
    gedcom: 'JAN',
    en: ['JAN', 'JANUARY'],
    lt: ['sausis', 'sausio', 'saus'],
    abbr: 'saus.',
  },
  {
    gedcom: 'FEB',
    en: ['FEB', 'FEBRUARY'],
    lt: ['vasaris', 'vasario', 'vas'],
    abbr: 'vas.',
  },
  {
    gedcom: 'MAR',
    en: ['MAR', 'MARCH'],
    lt: ['kovas', 'kovo', 'kov'],
    abbr: 'kov.',
  },
  {
    gedcom: 'APR',
    en: ['APR', 'APRIL'],
    lt: ['balandis', 'balandžio', 'bal'],
    abbr: 'bal.',
  },
  {
    gedcom: 'MAY',
    en: ['MAY'],
    lt: ['gegužė', 'gegužės', 'geg'],
    abbr: 'geg.',
  },
  {
    gedcom: 'JUN',
    en: ['JUN', 'JUNE'],
    lt: ['birželis', 'birželio', 'birž'],
    abbr: 'birž.',
  },
  {
    gedcom: 'JUL',
    en: ['JUL', 'JULY'],
    lt: ['liepa', 'liepos', 'liep'],
    abbr: 'liep.',
  },
  {
    gedcom: 'AUG',
    en: ['AUG', 'AUGUST'],
    lt: ['rugpjūtis', 'rugpjūčio', 'rugp'],
    abbr: 'rugp.',
  },
  {
    gedcom: 'SEP',
    en: ['SEP', 'SEPT', 'SEPTEMBER'],
    lt: ['rugsėjis', 'rugsėjo', 'rugs'],
    abbr: 'rugs.',
  },
  {
    gedcom: 'OCT',
    en: ['OCT', 'OCTOBER'],
    lt: ['spalis', 'spalio', 'spal'],
    abbr: 'spal.',
  },
  {
    gedcom: 'NOV',
    en: ['NOV', 'NOVEMBER'],
    lt: ['lapkritis', 'lapkričio', 'lapkr'],
    abbr: 'lapkr.',
  },
  {
    gedcom: 'DEC',
    en: ['DEC', 'DECEMBER'],
    lt: ['gruodis', 'gruodžio', 'gruod'],
    abbr: 'gruod.',
  },
];

function fold(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .trim();
}

const MONTH_LOOKUP = new Map();
MONTHS.forEach((month, index) => {
  [...month.en, ...month.lt, month.gedcom, month.abbr].forEach((name) => {
    MONTH_LOOKUP.set(fold(name), index);
  });
});

const GEDCOM_MONTH_INDEX = new Map(
  MONTHS.map((month, index) => [month.gedcom, index])
);

const LT_MONTH_ACCUSATIVE = [
  'sausį',
  'vasarį',
  'kovą',
  'balandį',
  'gegužę',
  'birželį',
  'liepą',
  'rugpjūtį',
  'rugsėjį',
  'spalį',
  'lapkritį',
  'gruodį',
];

const LIFE_FULL_DATE_RE =
  /\b(\d{1,2}) (JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) (\d{4})\b/g;
const LIFE_MONTH_YEAR_RE =
  /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) (\d{4})\b/g;

const QUALIFIERS = {
  ABT: 'ABT',
  ABOUT: 'ABT',
  CAL: 'CAL',
  CALCULATED: 'CAL',
  EST: 'EST',
  ESTIMATED: 'EST',
  BEF: 'BEF',
  BEFORE: 'BEF',
  AFT: 'AFT',
  AFTER: 'AFT',
};

const FULL_DATE_RE =
  /^(\d{1,2}) (JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) (\d{4})$/;

function monthIndex(token) {
  if (!token) return null;
  const index = MONTH_LOOKUP.get(fold(token));
  return index == null ? null : index;
}

function buildFullDate(yearValue, monthValue, dayValue) {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);

  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 0 || month > 11) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${day} ${MONTHS[month].gedcom} ${year}`;
}

function replaceMonthTokens(text) {
  let changed = false;
  const output = text.replace(/[\p{L}.]+/gu, (token) => {
    const index = monthIndex(token);
    if (index == null) return token;
    changed = true;
    return MONTHS[index].gedcom;
  });
  return changed ? output : null;
}

function normalizeSegment(text) {
  const segment = text.trim();
  if (!segment) return null;

  let match;

  // ISO year first: 1991-01-16
  match = segment.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return buildFullDate(match[1], Number(match[2]) - 1, match[3]);
  }

  // European day first: 16.01.1991 or 16/01/1991
  match = segment.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (match) {
    return buildFullDate(match[3], Number(match[2]) - 1, match[1]);
  }

  // Year first with dots: 1991.01.16
  match = segment.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (match) {
    return buildFullDate(match[1], Number(match[2]) - 1, match[3]);
  }

  // Lithuanian year label: 1945 m. / 1945 metai
  match = segment.match(/^(\d{4})\s*(?:m\.?|metai)$/iu);
  if (match) return match[1];

  // Lithuanian month and year: 1945 m. birželis
  match = segment.match(/^(\d{4})\s*(?:m\.?|metai)\s*([^\d\s,]+)$/iu);
  if (match) {
    const index = monthIndex(match[2]);
    if (index != null) return `${MONTHS[index].gedcom} ${match[1]}`;
  }

  // Lithuanian style: 1991 m. sausio 16 d.
  match = segment.match(
    /^(\d{4})\s*(?:m\.?|metai)?\s*([^\d\s,]+)\s*(\d{1,2})\s*(?:d\.?|dieną?)?$/iu
  );
  if (match) {
    const index = monthIndex(match[2]);
    if (index != null) return buildFullDate(match[1], index, match[3]);
  }

  // Day month year: 16 JAN 1991 or 16 January 1991
  match = segment.match(/^(\d{1,2})\s+([^\d\s,]+)\s*,?\s*(\d{4})$/iu);
  if (match) {
    const index = monthIndex(match[2]);
    if (index != null) return buildFullDate(match[3], index, match[1]);
  }

  // Month day year: JAN 16 1991 or January 16, 1991
  match = segment.match(/^([^\d\s,]+)\s+(\d{1,2})\s*,?\s*(\d{4})$/iu);
  if (match) {
    const index = monthIndex(match[1]);
    if (index != null) return buildFullDate(match[3], index, match[2]);
  }

  // Numeric without separators: 1991 01 16 / 16 01 1991
  match = segment.match(/^(\d{4})\s+(\d{1,2})\s+(\d{1,2})$/);
  if (match) {
    return buildFullDate(match[1], Number(match[2]) - 1, match[3]);
  }
  match = segment.match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/);
  if (match) {
    return buildFullDate(match[3], Number(match[2]) - 1, match[1]);
  }

  // Month and year: JUN 1945 / 1945 sausio
  match = segment.match(/^([^\d\s,]+)\s*,?\s*(\d{4})$/iu);
  if (match) {
    const index = monthIndex(match[1]);
    if (index != null) return `${MONTHS[index].gedcom} ${match[2]}`;
  }
  match = segment.match(/^(\d{4})\s+([^\d\s,]+)$/iu);
  if (match) {
    const index = monthIndex(match[2]);
    if (index != null) return `${MONTHS[index].gedcom} ${match[1]}`;
  }

  // Day and month without a year: 16 JAN
  match = segment.match(/^(\d{1,2})\s+([^\d\s,]+)$/iu);
  if (match) {
    const index = monthIndex(match[2]);
    if (index != null) {
      return `${Number(match[1])} ${MONTHS[index].gedcom}`;
    }
  }

  // Year only or month only.
  if (/^\d{4}$/.test(segment)) return segment;
  const singleMonth = monthIndex(segment);
  if (singleMonth != null) return MONTHS[singleMonth].gedcom;

  return null;
}

function normalizeInner(text) {
  const value = text.trim();
  const normalized = normalizeSegment(value);
  if (normalized) return normalized;
  return replaceMonthTokens(value) || value;
}

export function normalizeDateValue(raw) {
  if (raw == null) return '';
  let text = String(raw).replace(/\s+/g, ' ').trim();
  if (!text) return '';

  let match = text.match(
    /^(ABT|ABOUT|CAL|CALCULATED|EST|ESTIMATED|BEF|BEFORE|AFT|AFTER)\s+(.+)$/i
  );
  if (match) {
    const qualifier = QUALIFIERS[match[1].toUpperCase()];
    return `${qualifier} ${normalizeInner(match[2])}`;
  }

  match = text.match(/^(BET|BETWEEN)\s+(.+?)\s+AND\s+(.+)$/i);
  if (match) {
    return `BET ${normalizeInner(match[2])} AND ${normalizeInner(match[3])}`;
  }

  match = text.match(/^FROM\s+(.+?)\s+TO\s+(.+)$/i);
  if (match) {
    return `FROM ${normalizeInner(match[1])} TO ${normalizeInner(match[2])}`;
  }

  return normalizeInner(text);
}

export function toIsoDate(raw) {
  const normalized = normalizeDateValue(raw);
  const match = normalized.match(FULL_DATE_RE);
  if (!match) return '';

  const month = GEDCOM_MONTH_INDEX.get(match[2]);
  if (month == null) return '';

  return `${match[3]}-${String(month + 1).padStart(2, '0')}-${match[1].padStart(
    2,
    '0'
  )}`;
}

export function formatIsoDate(iso) {
  if (!iso) return '';
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return buildFullDate(match[1], Number(match[2]) - 1, match[3]) || '';
}

export function formatDateForDisplay(raw, language) {
  if (!raw) return '';
  const normalized = normalizeDateValue(raw);
  if (language !== 'lt') return normalized;

  return normalized.replace(/[\p{L}.]+/gu, (token) => {
    const index = monthIndex(token);
    return index == null ? token : MONTHS[index].abbr;
  });
}

// Read-only life dates on cards and details:
//   full date      -> 1981/10/09
//   month and year -> 2011m. gruodį
export function formatLifeDateForDisplay(raw, language) {
  if (!raw) return '';
  const normalized = normalizeDateValue(raw);
  if (language !== 'lt') return normalized;

  return normalized
    .replace(LIFE_FULL_DATE_RE, (match, day, month, year) => {
      const index = GEDCOM_MONTH_INDEX.get(month);
      if (index == null) return match;
      return `${year}/${String(index + 1).padStart(2, '0')}/${String(
        day
      ).padStart(2, '0')}`;
    })
    .replace(LIFE_MONTH_YEAR_RE, (match, month, year) => {
      const index = GEDCOM_MONTH_INDEX.get(month);
      if (index == null) return match;
      return `${year}m. ${LT_MONTH_ACCUSATIVE[index]}`;
    });
}
