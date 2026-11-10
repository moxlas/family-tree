const MAX_INDIVIDUALS = 3000;
const MAX_NOTE_LENGTH = 2000;

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function cleanLine(value, maxLength = 240) {
  return cleanText(value, maxLength).replace(/\s+/g, ' ');
}

function normalizeReference(value) {
  const reference = cleanText(value, 80);
  if (!reference) return '';

  if (reference.startsWith('@') && reference.endsWith('@')) {
    return reference;
  }

  return `@${reference}@`;
}

function directNoteText(node) {
  let text = node.value || '';

  for (const child of node.children) {
    if (child.tag === 'CONT') text += `\n${child.value || ''}`;
    if (child.tag === 'CONC') text += child.value || '';
  }

  return text.trim();
}

function readName(node) {
  const nameNode = node.children.find((child) => child.tag === 'NAME');
  if (!nameNode) return { firstName: '', lastName: '' };

  const givenNode = nameNode.children.find((child) => child.tag === 'GIVN');
  const surnameNode = nameNode.children.find((child) => child.tag === 'SURN');

  let firstName = cleanText(givenNode?.value, 80);
  let lastName = cleanText(surnameNode?.value, 80);
  const raw = cleanText(nameNode.value, 200);

  if (!firstName || !lastName) {
    const slashMatch = raw.match(/^(.*?)\/(.*?)\/(.*)$/);

    if (slashMatch) {
      if (!firstName) firstName = cleanText(slashMatch[1], 80);
      if (!lastName) lastName = cleanText(slashMatch[2], 80);
    } else if (!firstName && !lastName) {
      firstName = cleanText(raw, 80);
    }
  }

  return { firstName, lastName };
}

function readEventDate(node, tag) {
  const event = node.children.find((child) => child.tag === tag);
  if (!event) return '';

  const date = event.children.find((child) => child.tag === 'DATE');
  return cleanText(date?.value, 40);
}

function readEventPlace(node, tag) {
  const event = node.children.find((child) => child.tag === tag);
  if (!event) return '';

  const place = event.children.find((child) => child.tag === 'PLAC');
  return cleanText(place?.value, 160);
}

// A second NAME structure is how GEDCOM carries a maiden or former name.
// Only its surname is stored in the app.
function readAlternateName(node) {
  const nameNodes = node.children.filter((child) => child.tag === 'NAME');
  if (nameNodes.length < 2) return '';

  const preferred = nameNodes.slice(1).find((nameNode) => {
    const type = nameNode.children.find((child) => child.tag === 'TYPE')?.value;
    return /maiden|birth|aka|nick/i.test(type || '');
  });

  const nameNode = preferred || nameNodes[1];
  const surnameNode = nameNode.children.find((child) => child.tag === 'SURN');
  if (surnameNode?.value) {
    return cleanText(surnameNode.value, 160);
  }

  const raw = cleanText(nameNode.value, 200).replace(/\s+/g, ' ');
  const slashMatch = raw.match(/\/(.*?)\//);
  if (slashMatch) {
    return cleanText(slashMatch[1], 160);
  }

  // Files without the slash structure may store "Given Surname". Drop the
  // given name when it matches the person's primary first name.
  const { firstName } = readName(node);
  if (
    firstName &&
    raw.toLowerCase().startsWith(`${firstName.toLowerCase()} `)
  ) {
    return cleanText(raw.slice(firstName.length + 1), 160);
  }

  return cleanText(raw, 160);
}

// Existing records may still hold a full alternate name. The field now means
// the previous surname, so strip a leading copy of the person's first name.
export function previousSurnameFor(person) {
  const value = cleanText(person?.previousName, 160).replace(/\s+/g, ' ');
  if (!value) return '';

  const firstName = cleanText(person?.firstName, 80);
  if (!firstName) return value;

  const prefix = `${firstName} `;
  if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
    return value.slice(prefix.length).trim();
  }

  return value;
}

function readFamilyEvent(node, tags) {
  const event = node.children.find((child) => tags.includes(child.tag));
  if (!event) return { present: false, date: '' };
  const date = event.children.find((child) => child.tag === 'DATE');
  return { present: true, date: cleanText(date?.value, 40) };
}

function readNotes(node, sharedNotes) {
  const notes = node.children
    .filter((child) => child.tag === 'NOTE')
    .map((note) => {
      const pointer = cleanText(note.value, 80);
      if (pointer && sharedNotes.has(pointer)) {
        return sharedNotes.get(pointer);
      }
      return directNoteText(note);
    })
    .filter(Boolean);

  return notes.join('\n').slice(0, MAX_NOTE_LENGTH);
}

function parseRecords(text) {
  const records = [];
  const stack = [];
  let malformedLines = 0;

  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim()) continue;

    const match = rawLine.match(
      /^\s*(\d+)\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/
    );

    if (!match) {
      malformedLines += 1;
      continue;
    }

    const level = Number(match[1]);
    const node = {
      level,
      xref: match[2] || '',
      tag: match[3].toUpperCase(),
      value: (match[4] || '').trim(),
      children: [],
    };

    while (stack.length && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length) {
      stack[stack.length - 1].children.push(node);
    } else {
      records.push(node);
    }

    stack.push(node);
  }

  return { records, malformedLines };
}

export function parseGedcom(input, language = 'en') {
  const namePlaceholder = language === 'lt' ? 'Vardas' : 'Name';
  const text = String(input == null ? '' : input)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');

  if (!text.trim()) {
    throw new Error('empty');
  }

  const { records, malformedLines } = parseRecords(text);
  const individuals = [];
  const families = [];
  const warnings = [];
  const warningKeys = new Set();

  function addWarning(code, values = {}) {
    const key = `${code}|${JSON.stringify(values)}`;
    if (warningKeys.has(key)) return;
    warningKeys.add(key);
    warnings.push({ code, values });
  }

  const head = records.find((record) => record.tag === 'HEAD');
  const gedc = head?.children.find((child) => child.tag === 'GEDC');
  const version = cleanText(
    gedc?.children.find((child) => child.tag === 'VERS')?.value,
    20
  );
  const encoding = cleanText(
    head?.children.find((child) => child.tag === 'CHAR')?.value,
    20
  );
  // GEDCOM 5.5.x files are all accepted without source-specific warnings.

  if (version && !/^5\.5(\.\d+)?$/i.test(version)) {
    addWarning('unsupportedVersion', { version });
  }

  if (encoding && !/^(UTF-?8|ASCII)$/i.test(encoding)) {
    addWarning('unsupportedEncoding', { encoding });
  }

  if (malformedLines) {
    addWarning('malformedLines', { count: malformedLines });
  }

  const sharedNotes = new Map();
  for (const record of records) {
    if (record.tag === 'NOTE' && record.xref) {
      sharedNotes.set(record.xref, directNoteText(record));
    }
  }

  const seenKeys = new Set();

  for (const record of records) {
    if (record.tag !== 'INDI') continue;

    const key = normalizeReference(
      record.xref || `@AUTO-I${individuals.length + 1}@`
    );

    if (seenKeys.has(key)) {
      addWarning('duplicateReference', { ref: key });
      continue;
    }
    seenKeys.add(key);

    const { firstName: parsedFirstName, lastName } = readName(record);
    const firstName = parsedFirstName || namePlaceholder;

    const sex = cleanText(
      record.children.find((child) => child.tag === 'SEX')?.value,
      4
    ).toUpperCase();
    const deathDate = readEventDate(record, 'DEAT');
    const hasDeathEvent = record.children.some((child) => child.tag === 'DEAT');

    individuals.push({
      key,
      firstName,
      lastName,
      gender: sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'unknown',
      birthDate: readEventDate(record, 'BIRT'),
      birthPlace: readEventPlace(record, 'BIRT'),
      deathDate,
      deceased: hasDeathEvent || Boolean(deathDate),
      previousName: readAlternateName(record),
      notes: readNotes(record, sharedNotes),
    });
  }

  if (!individuals.length) {
    return {
      individuals,
      families,
      warnings,
      stats: { individuals: 0, families: 0, notes: 0, dated: 0 },
    };
  }

  const knownKeys = new Set(individuals.map((person) => person.key));
  const unknownReferences = new Set();

  for (const record of records) {
    if (record.tag !== 'FAM') continue;

    const key =
      normalizeReference(record.xref) || `@AUTO-F${families.length + 1}@`;
    const husband = normalizeReference(
      record.children.find((child) => child.tag === 'HUSB')?.value
    );
    const wife = normalizeReference(
      record.children.find((child) => child.tag === 'WIFE')?.value
    );
    const children = record.children
      .filter((child) => child.tag === 'CHIL')
      .map((child) => normalizeReference(child.value))
      .filter(Boolean);

    for (const reference of [husband, wife, ...children]) {
      if (reference && !knownKeys.has(reference)) {
        unknownReferences.add(reference);
      }
    }

    const knownHusband = knownKeys.has(husband) ? husband : '';
    const knownWife = knownKeys.has(wife) ? wife : '';
    const knownChildren = children.filter((child) => knownKeys.has(child));

    if (!knownHusband && !knownWife && !knownChildren.length) continue;

    const marriage = readFamilyEvent(record, ['MARR', 'MARRIAGE']);
    const divorce = readFamilyEvent(record, ['DIV', 'DIVORCE']);

    families.push({
      key,
      husband: knownHusband,
      wife: knownWife,
      children: knownChildren,
      status: divorce.present ? 'former' : 'current',
      marriageDate: marriage.date,
      divorceDate: divorce.date,
      notes: readNotes(record, sharedNotes),
    });
  }

  for (const reference of unknownReferences) {
    addWarning('unknownReference', { ref: reference });
  }

  if (individuals.length > MAX_INDIVIDUALS) {
    addWarning('tooManyIndividuals', { count: MAX_INDIVIDUALS });
  }

  const notes = individuals.filter((person) => person.notes).length;
  const dated = individuals.filter(
    (person) => person.birthDate || person.deathDate
  ).length;

  return {
    individuals,
    families,
    warnings,
    stats: {
      individuals: individuals.length,
      families: families.length,
      notes,
      dated,
    },
  };
}

function appendNote(lines, level, value) {
  const segments = String(value == null ? '' : value)
    .replace(/\r\n?/g, '\n')
    .split('\n');

  segments.forEach((segment, index) => {
    const chunks = [];

    for (let offset = 0; offset < segment.length; offset += 220) {
      chunks.push(segment.slice(offset, offset + 220));
    }

    if (!chunks.length) chunks.push('');

    const tag = index === 0 ? 'NOTE' : 'CONT';
    const tagLevel = index === 0 ? level : level + 1;
    lines.push(`${tagLevel} ${tag}${chunks[0] ? ` ${chunks[0]}` : ''}`);

    for (let chunkIndex = 1; chunkIndex < chunks.length; chunkIndex += 1) {
      lines.push(`${level + 1} CONC ${chunks[chunkIndex]}`);
    }
  });
}

function monthName(month) {
  return [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ][month];
}

export function buildGedcom(people, treeName, families = []) {
  const peopleList = Array.isArray(people) ? people : [];
  const byId = new Map(
    peopleList.map((person) => [String(person.id), person])
  );
  const xrefById = new Map();

  peopleList.forEach((person, index) => {
    xrefById.set(String(person.id), `@I${index + 1}@`);
  });

  const couples = [];
  const coupleKeys = new Set();

  for (const person of peopleList) {
    if (!person.spouseId) continue;

    const spouse = byId.get(String(person.spouseId));
    if (!spouse) continue;
    if (String(spouse.spouseId || '') !== String(person.id)) continue;

    const ids = [String(person.id), String(spouse.id)].sort();
    const key = ids.join('|');
    if (coupleKeys.has(key)) continue;
    coupleKeys.add(key);

    const members = [person, spouse];
    const husband =
      members.find((member) => member.gender === 'male') || members[0];
    const wife =
      members.find(
        (member) => member.gender === 'female' && member !== husband
      ) || members.find((member) => member !== husband);

    couples.push({ husband, wife });
  }

  let exportFamilies = [];

  if (Array.isArray(families) && families.length) {
    const covered = new Set();

    families.forEach((family) => {
      const husband = family.husband
        ? byId.get(String(family.husband))
        : null;
      const wife = family.wife ? byId.get(String(family.wife)) : null;
      const children = (family.children || [])
        .map((id) => byId.get(String(id)))
        .filter(Boolean);

      children.forEach((child) => covered.add(String(child.id)));
      if (husband) covered.add(String(husband.id));
      if (wife) covered.add(String(wife.id));

      exportFamilies.push({
        husband,
        wife,
        children,
        status: family.status === 'former' ? 'former' : 'current',
        marriageDate: family.marriageDate || '',
        divorceDate: family.divorceDate || '',
        notes: family.notes || '',
      });
    });

    // Preserve people who are not part of any stored family.
    const childrenByParent = new Map();
    for (const person of peopleList) {
      if (covered.has(String(person.id))) continue;
      if (!person.parentId) continue;
      const parent = byId.get(String(person.parentId));
      if (!parent) continue;
      const parentKey = String(parent.id);
      if (!childrenByParent.has(parentKey)) {
        childrenByParent.set(parentKey, []);
      }
      childrenByParent.get(parentKey).push(person);
    }

    for (const [parentKey, children] of childrenByParent) {
      const parent = byId.get(parentKey);
      if (!parent) continue;
      const parentIsFemale = parent.gender === 'female';
      exportFamilies.push({
        husband: parentIsFemale ? null : parent,
        wife: parentIsFemale ? parent : null,
        children,
        status: 'current',
        marriageDate: '',
        divorceDate: '',
      });
    }
  } else {
    exportFamilies = couples.map(({ husband, wife }) => ({
      husband,
      wife,
      children: [],
      status: 'current',
      marriageDate: '',
      divorceDate: '',
    }));

    const coupleByMember = new Map();
    couples.forEach((couple, index) => {
      coupleByMember.set(String(couple.husband.id), exportFamilies[index]);
      coupleByMember.set(String(couple.wife.id), exportFamilies[index]);
    });

    const childrenByParent = new Map();
    for (const person of peopleList) {
      if (!person.parentId) continue;
      const parent = byId.get(String(person.parentId));
      if (!parent) continue;
      const parentKey = String(parent.id);
      if (!childrenByParent.has(parentKey)) {
        childrenByParent.set(parentKey, []);
      }
      childrenByParent.get(parentKey).push(person);
    }

    const childSetByFamily = new Map(
      exportFamilies.map((family) => [family, new Set()])
    );

    for (const [parentKey, children] of childrenByParent) {
      const parent = byId.get(parentKey);
      if (!parent) continue;

      const coupleFamily = coupleByMember.get(parentKey);
      if (coupleFamily) {
        const seen = childSetByFamily.get(coupleFamily);
        children.forEach((child) => {
          if (!seen.has(String(child.id))) {
            seen.add(String(child.id));
            coupleFamily.children.push(child);
          }
        });
        continue;
      }

      const parentIsFemale = parent.gender === 'female';
      exportFamilies.push({
        husband: parentIsFemale ? null : parent,
        wife: parentIsFemale ? parent : null,
        children,
        status: 'current',
        marriageDate: '',
        divorceDate: '',
      });
    }
  }

  const name = cleanLine(treeName, 120) || 'Family Tree';
  const now = new Date();
  const dateLine = `${now.getDate()} ${monthName(
    now.getMonth()
  )} ${now.getFullYear()}`;
  const lines = [
    '0 HEAD',
    '1 SOUR FAMILY-TREE',
    `2 NAME ${name}`,
    '2 VERS 1.0',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    `1 DATE ${dateLine}`,
    '1 SUBM @U1@',
    '0 @U1@ SUBM',
    `1 NAME ${name}`,
  ];

  for (const person of peopleList) {
    const xref = xrefById.get(String(person.id));
    const firstName = cleanLine(person.firstName, 80);
    const lastName = cleanLine(person.lastName, 80);
    const nameValue = `${firstName}${
      lastName ? ` /${lastName}/` : ''
    }`.trim();

    lines.push(`0 ${xref} INDI`);

    if (nameValue) lines.push(`1 NAME ${nameValue}`);
    if (firstName) lines.push(`1 GIVN ${firstName}`);
    if (lastName) lines.push(`1 SURN ${lastName}`);

    if (person.previousName) {
      const previousSurname = previousSurnameFor({ firstName, previousName: person.previousName });
      if (previousSurname) {
        const value = firstName
          ? `${firstName} /${previousSurname}/`
          : `/${previousSurname}/`;
        lines.push(`1 NAME ${cleanLine(value, 200)}`);
        lines.push('2 TYPE maiden');
        lines.push(`2 SURN ${cleanLine(previousSurname, 80)}`);
      }
    }

    if (person.gender === 'male') lines.push('1 SEX M');
    if (person.gender === 'female') lines.push('1 SEX F');

    if (person.birthDate || person.birthPlace) {
      lines.push('1 BIRT');
      if (person.birthDate) {
        lines.push(`2 DATE ${cleanLine(person.birthDate, 40)}`);
      }
      if (person.birthPlace) {
        lines.push(`2 PLAC ${cleanLine(person.birthPlace, 160)}`);
      }
    }

    if (person.deathDate) {
      lines.push('1 DEAT');
      lines.push(`2 DATE ${cleanLine(person.deathDate, 40)}`);
    } else if (person.deceased) {
      lines.push('1 DEAT Y');
    }

    if (person.notes) {
      appendNote(lines, 1, person.notes);
    }
  }

  exportFamilies.forEach((family, index) => {
    lines.push(`0 @F${index + 1}@ FAM`);

    if (family.husband) {
      lines.push(`1 HUSB ${xrefById.get(String(family.husband.id))}`);
    }

    if (family.wife) {
      lines.push(`1 WIFE ${xrefById.get(String(family.wife.id))}`);
    }

    for (const child of family.children) {
      lines.push(`1 CHIL ${xrefById.get(String(child.id))}`);
    }

    if (family.marriageDate) {
      lines.push('1 MARR');
      lines.push(`2 DATE ${cleanLine(family.marriageDate, 40)}`);
    }

    const isFormer =
      family.status === 'former' || Boolean(family.divorceDate);

    if (isFormer) {
      if (family.divorceDate) {
        lines.push('1 DIV');
        lines.push(`2 DATE ${cleanLine(family.divorceDate, 40)}`);
      } else {
        lines.push('1 DIV Y');
      }
    }

    if (family.notes) {
      appendNote(lines, 1, family.notes);
    }
  });

  lines.push('0 TRLR');

  return `${lines.join('\n')}\n`;
}

export { MAX_INDIVIDUALS, MAX_NOTE_LENGTH };
