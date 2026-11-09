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

  const person = await Person.create({
    ...fields,
    owner: req.user.id,
    parentId,
  });

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
      spouseName: 'Jane Smith',
      notes: 'Started the family archive.',
    },
    {
      key: 'michael',
      parent: 'john',
      firstName: 'Michael',
      lastName: 'Doe',
      gender: 'male',
      birthDate: '1970',
      spouseName: 'Anna Brown',
    },
    {
      key: 'sarah',
      parent: 'john',
      firstName: 'Sarah',
      lastName: 'Doe',
      gender: 'female',
      birthDate: '1973',
      spouseName: 'David Miller',
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
      spouseName: entry.spouseName || '',
      notes: entry.notes || '',
      parentId: entry.parent ? created[entry.parent]._id : null,
    });
    created[entry.key] = person;
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

  if ('parentId' in req.body) {
    person.parentId = await resolveParent(
      req.body.parentId,
      req.user.id,
      person.id
    );
  }

  Object.assign(person, fields);
  await person.save();

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

  await Person.deleteMany({
    _id: { $in: [...toDelete] },
    owner: req.user.id,
  });

  return res.json({ deleted: toDelete.size });
});

module.exports = router;
