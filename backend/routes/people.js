const express = require('express');
const mongoose = require('mongoose');
const Person = require('../models/Person');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

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
  if ('gender' in body) {
    const allowed = ['male', 'female', 'other', 'unknown'];
    fields.gender = allowed.includes(body.gender) ? body.gender : 'unknown';
  }
  if ('birthDate' in body) fields.birthDate = cleanText(body.birthDate, 40);
  if ('deathDate' in body) fields.deathDate = cleanText(body.deathDate, 40);
  if ('spouseName' in body) fields.spouseName = cleanText(body.spouseName, 160);
  if ('notes' in body) fields.notes = cleanText(body.notes, 2000);

  return fields;
}

async function resolveParent(parentId, ownerId, currentId = null) {
  if (parentId == null || parentId === '') {
    return null;
  }

  if (!mongoose.isValidObjectId(parentId)) {
    throw httpError(400, 'Invalid parent');
  }

  let cursor = await Person.findOne({ _id: parentId, owner: ownerId });
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
      ? await Person.findOne({ _id: cursor.parentId, owner: ownerId })
      : null;
  }

  return parentId;
}

async function resolveSpouse(spouseId, ownerId, currentId = null) {
  if (spouseId == null || spouseId === '') {
    return null;
  }

  if (!mongoose.isValidObjectId(spouseId)) {
    throw httpError(400, 'Invalid spouse');
  }

  if (currentId && String(spouseId) === String(currentId)) {
    throw httpError(400, 'A person cannot be their own spouse');
  }

  const spouse = await Person.findOne({ _id: spouseId, owner: ownerId });
  if (!spouse) {
    throw httpError(400, 'Spouse not found');
  }

  return spouse;
}

async function detachSpouse(person) {
  if (!person.spouseId) return;

  const partner = await Person.findOne({
    _id: person.spouseId,
    owner: person.owner,
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

  if (person.spouseId && String(person.spouseId) !== String(spouse._id)) {
    const previous = await Person.findOne({
      _id: person.spouseId,
      owner: person.owner,
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
    });
    if (previous && String(previous.spouseId) === String(spouse._id)) {
      previous.spouseId = null;
      previous.spouseName = '';
      await previous.save();
    }
  }

  person.spouseId = spouse._id;
  person.spouseName = fullName(spouse);
  spouse.spouseId = person._id;
  spouse.spouseName = fullName(person);

  await Promise.all([person.save(), spouse.save()]);
}

async function syncSpouseLabels(person) {
  if (!person.spouseId) return;

  const spouse = await Person.findOne({
    _id: person.spouseId,
    owner: person.owner,
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

async function listPeople(ownerId) {
  return Person.find({ owner: ownerId }).sort({ createdAt: 1 });
}

router.get('/', async (req, res) => {
  res.json(await listPeople(req.user.id));
});

router.post('/', async (req, res) => {
  const fields = readFields(req.body);

  if (!fields.firstName) {
    return res.status(400).json({ error: 'First name is required' });
  }

  const parentId = await resolveParent(req.body.parentId, req.user.id);
  const spouse = await resolveSpouse(req.body.spouseId, req.user.id);

  const person = await Person.create({
    ...fields,
    owner: req.user.id,
    parentId,
    spouseId: null,
  });

  if (spouse) {
    await attachSpouse(person, spouse);
  }

  return res.status(201).json(person);
});

router.post('/demo', async (req, res) => {
  await Person.deleteMany({ owner: req.user.id });

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

  return res.status(201).json(await listPeople(req.user.id));
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

  const fields = readFields(req.body);
  if ('firstName' in fields && !fields.firstName) {
    return res.status(400).json({ error: 'First name is required' });
  }

  const spouseProvided = Object.prototype.hasOwnProperty.call(
    req.body,
    'spouseId'
  );
  let spouse = null;

  if (spouseProvided) {
    spouse = await resolveSpouse(req.body.spouseId, req.user.id, person.id);
    // The display name is derived from the linked person.
    delete fields.spouseName;
  }

  if ('parentId' in req.body) {
    person.parentId = await resolveParent(
      req.body.parentId,
      req.user.id,
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

  const people = await Person.find({ owner: req.user.id })
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
  });

  // Surviving spouses of the deleted people become unlinked.
  await Person.updateMany(
    {
      owner: req.user.id,
      spouseId: { $in: deletedIds },
    },
    {
      $set: { spouseId: null, spouseName: '' },
    }
  );

  return res.json({ deleted: deletedIds.length });
});

module.exports = router;
