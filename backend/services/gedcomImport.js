const mongoose = require('mongoose');
const Family = require('../models/Family');
const Person = require('../models/Person');
const { httpError } = require('../utils/http');

const MAX_INDIVIDUALS = 3000;
const MAX_FAMILIES = 3000;
const MAX_CHILDREN_PER_FAMILY = 500;
const GENDERS = new Set(['male', 'female', 'other', 'unknown']);

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function fullName(person) {
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—';
}

function nameKey(value) {
  return String(value == null ? '' : value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function yearOf(value) {
  const match = String(value == null ? '' : value).match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

function dateKey(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sanitizeIndividual(raw) {
  if (!raw || typeof raw !== 'object') {
    throw httpError(400, 'Invalid GEDCOM data');
  }

  const key = cleanText(raw.key, 80);
  if (!key) throw httpError(400, 'Invalid GEDCOM data');

  return {
    key,
    firstName: cleanText(raw.firstName, 80),
    lastName: cleanText(raw.lastName, 80),
    gender: GENDERS.has(raw.gender) ? raw.gender : 'unknown',
    birthDate: cleanText(raw.birthDate, 40),
    deathDate: cleanText(raw.deathDate, 40),
    notes: cleanText(raw.notes, 2000),
  };
}

function sanitizeFamily(raw, index) {
  if (!raw || typeof raw !== 'object') {
    throw httpError(400, 'Invalid GEDCOM data');
  }

  const children = Array.isArray(raw.children)
    ? raw.children
        .map((entry) => cleanText(entry, 80))
        .filter(Boolean)
        .slice(0, MAX_CHILDREN_PER_FAMILY)
    : [];

  return {
    key: cleanText(raw.key, 80) || `@F${index + 1}@`,
    husband: cleanText(raw.husband, 80),
    wife: cleanText(raw.wife, 80),
    children,
    status: raw.status === 'former' ? 'former' : 'current',
    marriageDate: cleanText(raw.marriageDate, 40),
    divorceDate: cleanText(raw.divorceDate, 40),
  };
}

function validateImportBody(body) {
  if (!body || typeof body !== 'object') {
    throw httpError(400, 'Invalid GEDCOM data');
  }

  const rawIndividuals = Array.isArray(body.individuals)
    ? body.individuals
    : [];
  const rawFamilies = Array.isArray(body.families) ? body.families : [];

  if (!rawIndividuals.length) {
    throw httpError(400, 'No GEDCOM data to import');
  }

  if (
    rawIndividuals.length > MAX_INDIVIDUALS ||
    rawFamilies.length > MAX_FAMILIES
  ) {
    throw httpError(400, 'This GEDCOM file contains too many people');
  }

  const individuals = rawIndividuals.map(sanitizeIndividual);
  const keys = new Set();
  for (const individual of individuals) {
    if (keys.has(individual.key)) {
      throw httpError(400, 'Invalid GEDCOM data');
    }
    keys.add(individual.key);
  }

  return {
    individuals,
    families: rawFamilies.map(sanitizeFamily),
  };
}

function buildIndex(people) {
  const byName = new Map();
  const byNameBirth = new Map();

  for (const person of people) {
    const key = nameKey(`${person.firstName} ${person.lastName}`);
    if (!key) continue;

    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(person);

    const year = yearOf(person.birthDate);
    if (!year) continue;

    const birthKey = `${key}|${year}`;
    if (!byNameBirth.has(birthKey)) byNameBirth.set(birthKey, []);
    byNameBirth.get(birthKey).push(person);
  }

  return { byName, byNameBirth };
}

function findMatch(fields, index, addWarning) {
  const key = nameKey(`${fields.firstName} ${fields.lastName}`);
  const year = yearOf(fields.birthDate);

  if (year) {
    const exact = index.byNameBirth.get(`${key}|${year}`) || [];
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) {
      addWarning('ambiguousMatch', { name: fullName(fields) });
      return null;
    }

    // An existing record without a birth date can still be the same person.
    const withoutDate = (index.byName.get(key) || []).filter(
      (person) => !yearOf(person.birthDate)
    );
    if (withoutDate.length === 1) return withoutDate[0];
    if (withoutDate.length > 1) {
      addWarning('ambiguousMatch', { name: fullName(fields) });
    }
    return null;
  }

  const candidates = index.byName.get(key) || [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    addWarning('ambiguousMatch', { name: fullName(fields) });
  }
  return null;
}

function wouldCreateCycle(child, parent, allById) {
  const childId = String(child._id);
  const seen = new Set([childId]);
  let cursor = parent;

  while (cursor) {
    const id = String(cursor._id);
    if (seen.has(id)) return true;
    seen.add(id);
    cursor = cursor.parentId ? allById.get(String(cursor.parentId)) : null;
  }

  return false;
}

function yearOfDate(value) {
  const match = String(value == null ? '' : value).match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : 0;
}

// GEDCOM exports often list several FAM records for one person without
// divorce events. Only one marriage can be current, so keep the newest
// marriage current and treat the older ones as previous partnerships.
function inferCurrentMarriages(families) {
  const marriagesByPerson = new Map();

  families.forEach((family, index) => {
    if (family.status !== 'current') return;
    [family.husband, family.wife].forEach((key) => {
      if (!key) return;
      if (!marriagesByPerson.has(key)) marriagesByPerson.set(key, []);
      marriagesByPerson.get(key).push({ family, index });
    });
  });

  const newestByPerson = new Map();

  marriagesByPerson.forEach((entries, personKey) => {
    const newest = entries.reduce((best, entry) => {
      const bestYear = yearOfDate(best.family.marriageDate);
      const entryYear = yearOfDate(entry.family.marriageDate);
      if (entryYear !== bestYear) return entryYear > bestYear ? entry : best;
      return entry.index > best.index ? entry : best;
    });
    newestByPerson.set(personKey, newest.family);
  });

  families.forEach((family) => {
    if (family.status !== 'current') return;
    const newestForHusband =
      !family.husband || newestByPerson.get(family.husband) === family;
    const newestForWife =
      !family.wife || newestByPerson.get(family.wife) === family;

    if (!newestForHusband || !newestForWife) {
      family.status = 'former';
    }
  });
}

async function importGedcom({ ownerId, tree, body }) {
  const { individuals, families } = validateImportBody(body);
  inferCurrentMarriages(families);
  const existing = await Person.find({ owner: ownerId, tree: tree._id });

  const index = buildIndex(existing);
  const allById = new Map(existing.map((person) => [String(person._id), person]));
  const newPeople = [];
  const newIds = new Set();
  const patches = new Map();
  const updatedIds = new Set();
  const keyMap = new Map();
  const warnings = [];
  const warningKeys = new Set();

  function addWarning(code, values = {}) {
    const key = `${code}|${JSON.stringify(values)}`;
    if (warningKeys.has(key)) return;
    warningKeys.add(key);
    warnings.push({ code, values });
  }

  function applyPatch(person, patch) {
    const id = String(person._id);

    Object.keys(patch).forEach((field) => {
      person[field] = patch[field];
    });

    if (newIds.has(id)) return;

    patches.set(id, { ...(patches.get(id) || {}), ...patch });
    updatedIds.add(id);
  }

  let createdCount = 0;

  for (const fields of individuals) {
    if (!fields.firstName) {
      addWarning('missingName');
      continue;
    }

    const match = findMatch(fields, index, addWarning);

    if (match) {
      const patch = {};
      let changed = false;

      for (const field of ['lastName', 'birthDate', 'deathDate', 'notes']) {
        if (!match[field] && fields[field]) {
          patch[field] = fields[field];
          changed = true;
        }
      }

      if (match.gender === 'unknown' && fields.gender !== 'unknown') {
        patch.gender = fields.gender;
        changed = true;
      }

      if (
        (match.birthDate &&
          fields.birthDate &&
          dateKey(match.birthDate) !== dateKey(fields.birthDate)) ||
        (match.deathDate &&
          fields.deathDate &&
          dateKey(match.deathDate) !== dateKey(fields.deathDate))
      ) {
        addWarning('fieldConflict', { person: fullName(match) });
      }

      if (changed) applyPatch(match, patch);
      keyMap.set(fields.key, match);
      continue;
    }

    const person = {
      _id: new mongoose.Types.ObjectId(),
      owner: ownerId,
      tree: tree._id,
      firstName: fields.firstName,
      lastName: fields.lastName,
      gender: fields.gender,
      birthDate: fields.birthDate,
      deathDate: fields.deathDate,
      spouseId: null,
      spouseName: '',
      notes: fields.notes,
      parentId: null,
    };

    newPeople.push(person);
    newIds.add(String(person._id));
    allById.set(String(person._id), person);
    keyMap.set(fields.key, person);
    createdCount += 1;
  }

  let spouseLinks = 0;
  let parentLinks = 0;
  const unresolvedReferences = new Set();

  for (const family of families) {
    const husbandPerson = family.husband
      ? keyMap.get(family.husband)
      : null;
    const wifePerson = family.wife ? keyMap.get(family.wife) : null;
    const childIds = family.children
      .map((key) => keyMap.get(key)?._id)
      .filter(Boolean);

    if (husbandPerson || wifePerson || childIds.length) {
      await Family.create({
        owner: ownerId,
        tree: tree._id,
        husband: husbandPerson?._id || null,
        wife: wifePerson?._id || null,
        children: childIds,
        status: family.status,
        marriageDate: family.marriageDate,
        divorceDate: family.divorceDate,
      });
    }

    const parentKeys = [family.husband, family.wife].filter(Boolean);
    const parents = [];

    for (const key of parentKeys) {
      const parent = keyMap.get(key);
      if (parent) {
        parents.push(parent);
      } else {
        unresolvedReferences.add(key);
      }
    }

    for (const childKey of family.children) {
      if (!keyMap.has(childKey)) unresolvedReferences.add(childKey);
    }

    if (parents.length >= 2 && family.status === 'current') {
      const [first, second] = parents;
      const firstSpouse = first.spouseId ? String(first.spouseId) : '';
      const secondSpouse = second.spouseId ? String(second.spouseId) : '';
      const linkedToEachOther =
        firstSpouse === String(second._id) &&
        secondSpouse === String(first._id);

      if (!linkedToEachOther) {
        const firstAvailable =
          !firstSpouse || firstSpouse === String(second._id);
        const secondAvailable =
          !secondSpouse || secondSpouse === String(first._id);

        if (firstAvailable && secondAvailable) {
          applyPatch(first, {
            spouseId: second._id,
            spouseName: fullName(second),
            spouseStatus: 'current',
          });
          applyPatch(second, {
            spouseId: first._id,
            spouseName: fullName(first),
            spouseStatus: 'current',
          });
          spouseLinks += 1;
        }
        // Additional spouse relationships are preserved in Family records.
      }
    }

    const primaryParent = parents[0];
    if (!primaryParent) continue;

    for (const childKey of family.children) {
      const child = keyMap.get(childKey);
      if (!child) continue;

      if (String(child._id) === String(primaryParent._id)) {
        addWarning('cycle', { person: fullName(child) });
        continue;
      }

      const childParent = child.parentId ? String(child.parentId) : '';

      if (!childParent) {
        if (wouldCreateCycle(child, primaryParent, allById)) {
          addWarning('cycle', { person: fullName(child) });
          continue;
        }

        applyPatch(child, { parentId: primaryParent._id });
        parentLinks += 1;
        continue;
      }

      if (parents.some((parent) => String(parent._id) === childParent)) {
        continue;
      }

      addWarning('parentConflict', {
        person: fullName(child),
        parent: fullName(primaryParent),
      });
    }
  }

  for (const reference of unresolvedReferences) {
    addWarning('unknownReference', { ref: reference });
  }

  if (newPeople.length) {
    await Person.insertMany(newPeople);
  }

  if (patches.size) {
    await Person.bulkWrite(
      [...patches.entries()].map(([id, patch]) => ({
        updateOne: {
          filter: { _id: id, owner: ownerId, tree: tree._id },
          update: { $set: patch },
        },
      }))
    );
  }

  return {
    created: createdCount,
    updated: updatedIds.size,
    spouseLinks,
    parentLinks,
    warningCount: warnings.length,
    warnings: warnings.slice(0, 100),
  };
}

module.exports = {
  MAX_INDIVIDUALS,
  importGedcom,
  validateImportBody,
};
