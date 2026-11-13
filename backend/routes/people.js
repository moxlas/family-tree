const express = require('express');
const mongoose = require('mongoose');
const Person = require('../models/Person');
const Family = require('../models/Family');
const authenticate = require('../middleware/auth');
const { resolveTree } = require('../utils/trees');
const { httpError } = require('../utils/http');

const router = express.Router();
router.use(authenticate);

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function fullName(person) {
  return `${person.firstName || ''} ${person.lastName || ''}`.trim();
}

function readFields(body) {
  const fields = {};

  if ('firstName' in body) fields.firstName = cleanText(body.firstName, 80);
  if ('lastName' in body) fields.lastName = cleanText(body.lastName, 80);
  if ('previousName' in body) {
    fields.previousName = cleanText(body.previousName, 160);
  }
  if ('gender' in body) {
    const allowed = ['male', 'female', 'other', 'unknown'];
    fields.gender = allowed.includes(body.gender) ? body.gender : 'unknown';
  }
  if ('birthDate' in body) fields.birthDate = cleanText(body.birthDate, 40);
  if ('birthPlace' in body) fields.birthPlace = cleanText(body.birthPlace, 160);
  if ('deathDate' in body) fields.deathDate = cleanText(body.deathDate, 40);
  if ('deceased' in body) fields.deceased = Boolean(body.deceased);
  if ('spouseName' in body) fields.spouseName = cleanText(body.spouseName, 160);
  if ('spouseStatus' in body) {
    fields.spouseStatus = body.spouseStatus === 'former' ? 'former' : 'current';
  }
  if ('notes' in body) fields.notes = cleanText(body.notes, 2000);

  return fields;
}

async function resolveParent(parentId, ownerId, treeId, currentId = null) {
  if (parentId == null || parentId === '') {
    return null;
  }

  if (!mongoose.isValidObjectId(parentId)) {
    throw httpError(400, 'Invalid parent');
  }

  let cursor = await Person.findOne({
    _id: parentId,
    owner: ownerId,
    tree: treeId,
  });
  if (!cursor) {
    throw httpError(400, 'Parent not found');
  }

  if (currentId && cursor.id === currentId) {
    throw httpError(400, 'A person cannot be their own parent');
  }

  const visited = new Set();
  while (cursor) {
    if (currentId && cursor.id === currentId) {
      throw httpError(400, 'This relationship would create a loop in the tree');
    }
    if (visited.has(cursor.id)) break;
    visited.add(cursor.id);

    cursor = cursor.parentId
      ? await Person.findOne({
          _id: cursor.parentId,
          owner: ownerId,
          tree: treeId,
        })
      : null;
  }

  return parentId;
}

// Keep Family records in step with the parent fields. A child belongs to a
// family only when every parent of that family is still one of the chosen
// parents; otherwise the family would keep showing the old parent.
async function syncFamilyChildren(person, parentIds, treeId) {
  const targetIds = [...new Set(parentIds.filter(Boolean).map(String))];
  const targetSet = new Set(targetIds);

  const childFamilies = await Family.find({
    owner: person.owner,
    tree: treeId,
    children: person._id,
  });

  for (const family of childFamilies) {
    const familyParentIds = [family.husband, family.wife]
      .filter(Boolean)
      .map(String);
    const keep =
      familyParentIds.length > 0 &&
      familyParentIds.every((parentId) => targetSet.has(parentId));
    if (keep) continue;

    family.children = (family.children || []).filter(
      (childId) => String(childId) !== String(person._id)
    );
    await family.save();
  }

  if (!targetIds.length) return;

  const families = await Family.find({
    owner: person.owner,
    tree: treeId,
  });
  const targetFamily = families.find((family) => {
    const ids = [family.husband, family.wife].filter(Boolean).map(String);
    return (
      ids.length === targetIds.length &&
      ids.every((parentId) => targetSet.has(parentId))
    );
  });

  if (!targetFamily) return;

  const alreadyLinked = (targetFamily.children || []).some(
    (childId) => String(childId) === String(person._id)
  );
  if (alreadyLinked) return;

  targetFamily.children.push(person._id);
  await targetFamily.save();
}

const RELATIONSHIP_STATUSES = new Set([
  'married',
  'partner',
  'engaged',
  'divorced',
  'widowed',
  'separated',
]);
const ACTIVE_RELATIONSHIP_STATUSES = new Set([
  'married',
  'partner',
  'engaged',
]);
const ENDED_RELATIONSHIP_STATUSES = new Set([
  'divorced',
  'widowed',
  'separated',
]);

function readRelationship(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const partnerId = raw.partnerId ? String(raw.partnerId) : '';
  if (!mongoose.isValidObjectId(partnerId)) return null;

  return {
    partnerId,
    status: RELATIONSHIP_STATUSES.has(raw.status) ? raw.status : 'married',
    startDate: cleanText(raw.startDate, 40),
    startPlace: cleanText(raw.startPlace, 160),
    divorceDate: cleanText(raw.divorceDate, 40),
    separationDate: cleanText(raw.separationDate, 40),
  };
}

async function upsertRelationshipFamily(person, partner, relationship, forceFormer = false) {
  let family = await Family.findOne({
    owner: person.owner,
    tree: person.tree,
    $or: [
      { husband: person._id, wife: partner._id },
      { husband: partner._id, wife: person._id },
    ],
  });

  if (!family) {
    const personIsFemale = person.gender === 'female';
    family = new Family({
      owner: person.owner,
      tree: person.tree,
      husband: personIsFemale ? partner._id : person._id,
      wife: personIsFemale ? person._id : partner._id,
      children: [],
    });
  }

  const ended = ENDED_RELATIONSHIP_STATUSES.has(relationship.status);
  family.status = forceFormer || ended ? 'former' : 'current';
  family.relationshipStatus = relationship.status;
  family.marriageDate = relationship.startDate;
  family.marriagePlace = relationship.startPlace;
  family.divorceDate =
    relationship.status === 'divorced' ? relationship.divorceDate : '';
  family.separationDate =
    relationship.status === 'separated' ? relationship.separationDate : '';

  await family.save();
  return family;
}

async function removeFamilyPreservingChildren(family) {
  const parentIds = [family.husband, family.wife].filter(Boolean);
  const children = await Person.find({
    _id: { $in: family.children || [] },
    owner: family.owner,
    tree: family.tree,
  });

  for (const child of children) {
    let changed = false;

    if (!child.parentId && parentIds[0]) {
      child.parentId = parentIds[0];
      changed = true;
    }

    const secondParentId = parentIds.find(
      (parentId) => String(parentId) !== String(child.parentId)
    );
    if (!child.secondParentId && secondParentId) {
      child.secondParentId = secondParentId;
      changed = true;
    }

    if (changed) await child.save();
  }

  await Family.deleteOne({ _id: family._id });
}

async function syncRelationshipDetails(person, body, ownerId, treeId) {
  const hasCurrent = Object.prototype.hasOwnProperty.call(
    body,
    'currentRelationship'
  );
  const hasPrevious = Object.prototype.hasOwnProperty.call(
    body,
    'previousRelationships'
  );

  if (!hasCurrent && !hasPrevious) return;

  const current = hasCurrent ? readRelationship(body.currentRelationship) : null;
  const previous =
    hasPrevious && Array.isArray(body.previousRelationships)
      ? body.previousRelationships.map(readRelationship).filter(Boolean)
      : null;

  const keepPartnerIds = new Set();
  if (current) keepPartnerIds.add(current.partnerId);
  if (previous) {
    previous.forEach((relationship) =>
      keepPartnerIds.add(relationship.partnerId)
    );
  }

  if (hasCurrent && !current) {
    await detachSpouse(person);
    await person.save();
  }

  if (current) {
    const partner = await Person.findOne({
      _id: current.partnerId,
      owner: ownerId,
      tree: treeId,
    });

    if (partner && String(partner._id) !== String(person._id)) {
      if (
        partner.deceased &&
        !person.deceased &&
        ACTIVE_RELATIONSHIP_STATUSES.has(current.status)
      ) {
        current.status = 'widowed';
      }

      await upsertRelationshipFamily(person, partner, current);
      const ended = ENDED_RELATIONSHIP_STATUSES.has(current.status);
      person.spouseStatus = ended ? 'former' : 'current';

      if (String(partner.spouseId || '') === String(person._id)) {
        partner.spouseStatus = person.spouseStatus;
        await partner.save();
      }

      await person.save();
    }
  }

  if (previous) {
    for (const relationship of previous) {
      if (
        current &&
        String(relationship.partnerId) === String(current.partnerId)
      ) {
        continue;
      }

      const partner = await Person.findOne({
        _id: relationship.partnerId,
        owner: ownerId,
        tree: treeId,
      });
      if (!partner || String(partner._id) === String(person._id)) continue;

      if (
        partner.deceased &&
        ACTIVE_RELATIONSHIP_STATUSES.has(relationship.status)
      ) {
        relationship.status = 'widowed';
      }

      await upsertRelationshipFamily(person, partner, relationship, true);
    }

    if (hasCurrent) {
      const families = await Family.find({
        owner: ownerId,
        tree: treeId,
        $or: [{ husband: person._id }, { wife: person._id }],
      });

      for (const family of families) {
        const partnerId =
          String(family.husband || '') === String(person._id)
            ? family.wife
            : family.husband;

        if (!partnerId) continue;
        if (keepPartnerIds.has(String(partnerId))) continue;

        await removeFamilyPreservingChildren(family);
      }
    }
  }

  await syncSpouseLabels(person);
}

async function resolveSpouse(spouseId, ownerId, treeId, currentId = null) {
  if (spouseId == null || spouseId === '') {
    return null;
  }
  if (!mongoose.isValidObjectId(spouseId)) {
    throw httpError(400, 'Invalid spouse');
  }

  if (currentId && String(spouseId) === String(currentId)) {
    throw httpError(400, 'A person cannot be their own spouse');
  }

  const spouse = await Person.findOne({
    _id: spouseId,
    owner: ownerId,
    tree: treeId,
  });
  if (!spouse) {
    throw httpError(400, 'Spouse not found');
  }

  return spouse;
}

async function retireCurrentMarriages(person, keepSpouseId) {
  const currentMarriages = await Family.find({
    owner: person.owner,
    tree: person.tree,
    status: 'current',
    $or: [{ husband: person._id }, { wife: person._id }],
  });

  for (const marriage of currentMarriages) {
    const firstId = marriage.husband ? String(marriage.husband) : '';
    const secondId = marriage.wife ? String(marriage.wife) : '';
    const otherId =
      firstId === String(person._id)
        ? secondId
        : secondId === String(person._id)
          ? firstId
          : firstId;

    if (otherId && otherId === String(keepSpouseId)) continue;

    marriage.status = 'former';
    await marriage.save();
  }
}

async function syncPreviousSpouses(person, previousSpouseIds, ownerId, treeId) {
  if (!Array.isArray(previousSpouseIds)) return 0;

  let created = 0;
  const seen = new Set();

  for (const rawId of previousSpouseIds) {
    if (rawId == null || rawId === '') continue;
    if (!mongoose.isValidObjectId(rawId)) continue;

    const partnerId = String(rawId);
    if (partnerId === String(person._id)) continue;
    if (person.spouseId && String(person.spouseId) === partnerId) continue;
    if (seen.has(partnerId)) continue;
    seen.add(partnerId);

    const partner = await Person.findOne({
      _id: partnerId,
      owner: ownerId,
      tree: treeId,
    });
    if (!partner) continue;

    const existing = await Family.findOne({
      owner: ownerId,
      tree: treeId,
      $or: [
        { husband: person._id, wife: partner._id },
        { husband: partner._id, wife: person._id },
      ],
    });
    if (existing) continue;

    const personIsFemale = person.gender === 'female';
    await Family.create({
      owner: ownerId,
      tree: treeId,
      husband: personIsFemale ? partner._id : person._id,
      wife: personIsFemale ? person._id : partner._id,
      status: 'former',
      marriageDate: '',
      divorceDate: '',
      notes: '',
    });
    created += 1;
  }

  return created;
}

async function detachSpouse(person) {
  if (!person.spouseId) return;

  const partner = await Person.findOne({
    _id: person.spouseId,
    owner: person.owner,
    tree: person.tree,
  });

  if (partner && String(partner.spouseId) === String(person._id)) {
    partner.spouseId = null;
    partner.spouseName = '';
    await partner.save();
  }

  person.spouseId = null;
  person.spouseName = '';
}

async function attachSpouse(person, spouse) {
  if (String(spouse.id) === String(person.id)) {
    throw httpError(400, 'A person cannot be their own spouse');
  }

  const previousSpouseId = person.spouseId ? String(person.spouseId) : null;
  const spousePreviousSpouseId = spouse.spouseId ? String(spouse.spouseId) : null;
  const marriageChanged =
    previousSpouseId !== String(spouse._id) ||
    spousePreviousSpouseId !== String(person._id);

  if (marriageChanged) {
    // A person can have several family records, but only one current
    // marriage. Retirement is therefore limited to "current" families and
    // preserves every marriage record for former-spouse display.
    await retireCurrentMarriages(person, spouse._id);
    await retireCurrentMarriages(spouse, person._id);
  }

  if (person.spouseId && String(person.spouseId) !== String(spouse._id)) {
    const previous = await Person.findOne({
      _id: person.spouseId,
      owner: person.owner,
      tree: person.tree,
    });
    if (previous && String(previous.spouseId) === String(person._id)) {
      previous.spouseId = null;
      previous.spouseName = '';
      await previous.save();
    }
  }

  if (spouse.spouseId && String(spouse.spouseId) !== String(person._id)) {
    const previous = await Person.findOne({
      _id: spouse.spouseId,
      owner: person.owner,
      tree: person.tree,
    });
    if (previous && String(previous.spouseId) === String(spouse._id)) {
      previous.spouseId = null;
      previous.spouseName = '';
      await previous.save();
    }
  }

  person.spouseId = spouse._id;
  person.spouseName = fullName(spouse);
  person.spouseStatus = 'current';
  spouse.spouseId = person._id;
  spouse.spouseName = fullName(person);
  spouse.spouseStatus = 'current';

  if (marriageChanged) {
    const familyCandidates = await Family.find({
      owner: person.owner,
      tree: person.tree,
      $or: [
        { husband: person._id },
        { wife: person._id },
        { husband: spouse._id },
        { wife: spouse._id },
      ],
    });
    const existingCouple = familyCandidates.find((candidate) => {
      const pair = [candidate.husband, candidate.wife]
        .filter(Boolean)
        .map(String);
      return (
        pair.includes(String(person._id)) &&
        pair.includes(String(spouse._id))
      );
    });

    if (existingCouple) {
      if (existingCouple.status !== 'current') {
        existingCouple.status = 'current';
        await existingCouple.save();
      }
    } else {
      const husbandId = person.gender === 'male' ? person._id : spouse._id;
      const wifeId = person.gender === 'female' ? person._id : spouse._id;
      await Family.create({
        owner: person.owner,
        tree: person.tree,
        husband: husbandId,
        wife: wifeId,
        status: 'current',
        marriageDate: '',
        divorceDate: '',
        notes: '',
      });
    }
  }

  await Promise.all([person.save(), spouse.save()]);
}

async function syncSpouseLabels(person) {
  if (!person.spouseId) return;

  const spouse = await Person.findOne({
    _id: person.spouseId,
    owner: person.owner,
    tree: person.tree,
  });

  if (!spouse) {
    person.spouseId = null;
    person.spouseName = '';
    await person.save();
    return;
  }

  const personLabel = fullName(person);
  const spouseLabel = fullName(spouse);
  let personChanged = false;
  let spouseChanged = false;

  if (String(spouse.spouseId || '') !== String(person._id)) {
    spouse.spouseId = person._id;
    spouseChanged = true;
  }
  if (person.spouseName !== spouseLabel) {
    person.spouseName = spouseLabel;
    personChanged = true;
  }
  if (spouse.spouseName !== personLabel) {
    spouse.spouseName = personLabel;
    spouseChanged = true;
  }

  if (personChanged) await person.save();
  if (spouseChanged) await spouse.save();
}

async function listPeople(ownerId, treeId) {
  return Person.find({ owner: ownerId, tree: treeId }).sort({ createdAt: 1 });
}

router.get('/', async (req, res) => {
  const tree = await resolveTree(req.user.id, req.query.treeId);
  res.json(await listPeople(req.user.id, tree._id));
});

router.post('/', async (req, res) => {
  const tree = await resolveTree(req.user.id, req.body.treeId);
  const fields = readFields(req.body);

  if (!fields.firstName) {
    return res.status(400).json({ error: 'First name is required' });
  }

  const parentId = await resolveParent(
    req.body.parentId,
    req.user.id,
    tree._id
  );
  const secondParentId = await resolveParent(
    req.body.secondParentId,
    req.user.id,
    tree._id
  );
  const spouse = await resolveSpouse(
    req.body.spouseId,
    req.user.id,
    tree._id
  );

  const person = await Person.create({
    ...fields,
    owner: req.user.id,
    tree: tree._id,
    parentId,
    secondParentId,
    spouseId: null,
  });

  if (spouse) {
    await attachSpouse(person, spouse);
  }

  await syncFamilyChildren(person, [parentId, secondParentId], tree._id);

  await syncPreviousSpouses(
    person,
    req.body.previousSpouseIds,
    req.user.id,
    tree._id
  );

  await syncRelationshipDetails(person, req.body, req.user.id, tree._id);

  return res.status(201).json(person);
});

router.post('/demo', async (req, res) => {
  const tree = await resolveTree(
    req.user.id,
    req.body.treeId || req.query.treeId
  );

  await Person.deleteMany({ owner: req.user.id, tree: tree._id });

  const demo = [
    {
      key: 'john',
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1945',
      notes: 'Started the family archive.',
    },
    {
      key: 'jane',
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female',
      birthDate: '1947',
    },
    {
      key: 'michael',
      parent: 'john',
      firstName: 'Michael',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1970',
    },
    {
      key: 'anna',
      firstName: 'Anna',
      lastName: 'Brown',
      gender: 'female',
      birthDate: '1972',
    },
    {
      key: 'sarah',
      parent: 'john',
      firstName: 'Sarah',
      lastName: 'Doe',
      gender: 'female',
      birthDate: '1973',
    },
    {
      key: 'david',
      firstName: 'David',
      lastName: 'Miller',
      gender: 'male',
      birthDate: '1971',
    },
    {
      key: 'emma',
      parent: 'michael',
      firstName: 'Emma',
      lastName: 'Doe',
      gender: 'female',
      birthDate: '1998',
    },
    {
      key: 'lucas',
      parent: 'michael',
      firstName: 'Lucas',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '2001',
    },
    {
      key: 'noah',
      parent: 'sarah',
      firstName: 'Noah',
      lastName: 'Miller',
      gender: 'male',
      birthDate: '2005',
    },
  ];

  const created = {};
  for (const entry of demo) {
    const person = await Person.create({
      owner: req.user.id,
      tree: tree._id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      gender: entry.gender,
      birthDate: entry.birthDate,
      notes: entry.notes || '',
      parentId: entry.parent ? created[entry.parent]._id : null,
    });
    created[entry.key] = person;
  }

  const couples = [
    ['john', 'jane'],
    ['michael', 'anna'],
    ['sarah', 'david'],
  ];

  for (const [firstKey, secondKey] of couples) {
    const first = created[firstKey];
    const second = created[secondKey];
    first.spouseId = second._id;
    first.spouseName = fullName(second);
    second.spouseId = first._id;
    second.spouseName = fullName(first);
    await Promise.all([first.save(), second.save()]);
  }

  return res.status(201).json(await listPeople(req.user.id, tree._id));
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Person not found' });
  }

  const person = await Person.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }

  const tree = await resolveTree(
    req.user.id,
    person.tree || req.body.treeId
  );
  if (String(person.tree || '') !== String(tree._id)) {
    person.tree = tree._id;
  }

  const fields = readFields(req.body);
  if ('firstName' in fields && !fields.firstName) {
    return res.status(400).json({ error: 'First name is required' });
  }

  const previousParentIds = [person.parentId, person.secondParentId]
    .filter(Boolean)
    .map(String);

  const spouseProvided = Object.prototype.hasOwnProperty.call(
    req.body,
    'spouseId'
  );
  let spouse = null;

  if (spouseProvided) {
    spouse = await resolveSpouse(
      req.body.spouseId,
      req.user.id,
      tree._id,
      person.id
    );
    // The display name is derived from the linked person.
    delete fields.spouseName;
  }

  if ('parentId' in req.body) {
    person.parentId = await resolveParent(
      req.body.parentId,
      req.user.id,
      tree._id,
      person.id
    );
  }

  if ('secondParentId' in req.body) {
    person.secondParentId = await resolveParent(
      req.body.secondParentId,
      req.user.id,
      tree._id,
      person.id
    );
  }

  Object.assign(person, fields);

  if (spouseProvided) {
    if (spouse) {
      await attachSpouse(person, spouse);
    } else {
      await detachSpouse(person);
      person.spouseName = cleanText(req.body.spouseName, 160);
      await person.save();
    }
    await syncSpouseLabels(person);
  } else {
    await person.save();
    await syncSpouseLabels(person);
  }

  const nextParentIds = [person.parentId, person.secondParentId]
    .filter(Boolean)
    .map(String);
  const parentsChanged =
    previousParentIds.length !== nextParentIds.length ||
    previousParentIds.some((parentId) => !nextParentIds.includes(parentId));

  if (parentsChanged) {
    await syncFamilyChildren(person, nextParentIds, tree._id);
  }

  await syncPreviousSpouses(
    person,
    req.body.previousSpouseIds,
    req.user.id,
    tree._id
  );

  await syncRelationshipDetails(person, req.body, req.user.id, tree._id);

  return res.json(person);
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Person not found' });
  }

  const person = await Person.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!person) {
    return res.status(404).json({ error: 'Person not found' });
  }

  const tree = await resolveTree(
    req.user.id,
    person.tree || req.query.treeId
  );

  const people = await Person.find({
    owner: req.user.id,
    tree: tree._id,
  })
    .select('_id parentId')
    .lean();

  const childrenByParent = new Map();
  for (const entry of people) {
    const parentKey = entry.parentId ? entry.parentId.toString() : null;
    if (!parentKey) continue;
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
    childrenByParent.get(parentKey).push(entry._id.toString());
  }

  const toDelete = new Set([person.id]);
  const queue = [person.id];
  while (queue.length) {
    const current = queue.shift();
    for (const childId of childrenByParent.get(current) || []) {
      if (!toDelete.has(childId)) {
        toDelete.add(childId);
        queue.push(childId);
      }
    }
  }

  const deletedIds = [...toDelete];

  await Person.deleteMany({
    _id: { $in: deletedIds },
    owner: req.user.id,
    tree: tree._id,
  });

  // Surviving spouses of the deleted people become unlinked.
  await Person.updateMany(
    {
      owner: req.user.id,
      tree: tree._id,
      spouseId: { $in: deletedIds },
    },
    {
      $set: { spouseId: null, spouseName: '' },
    }
  );

  return res.json({ deleted: deletedIds.length });
});

module.exports = router;
