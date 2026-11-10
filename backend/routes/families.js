const express = require('express');
const mongoose = require('mongoose');
const Family = require('../models/Family');
const Person = require('../models/Person');
const authenticate = require('../middleware/auth');
const { resolveTree } = require('../utils/trees');
const { httpError } = require('../utils/http');

const router = express.Router();
router.use(authenticate);

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

const RELATIONSHIP_STATUSES = new Set([
  'married',
  'partner',
  'engaged',
  'divorced',
  'widowed',
  'separated',
]);

function cleanRelationshipStatus(value) {
  return RELATIONSHIP_STATUSES.has(value) ? value : '';
}

async function resolvePerson(personId, ownerId, treeId) {
  if (personId == null || personId === '') return null;
  if (!mongoose.isValidObjectId(personId)) {
    throw httpError(400, 'Person not found');
  }
  const person = await Person.findOne({
    _id: personId,
    owner: ownerId,
    tree: treeId,
  });
  if (!person) throw httpError(400, 'Person not found');
  return person;
}

router.get('/', async (req, res) => {
  const tree = await resolveTree(req.user.id, req.query.treeId);

  const families = await Family.find({
    owner: req.user.id,
    tree: tree._id,
  }).sort({ createdAt: 1 });

  return res.json(families.map((family) => family.toJSON()));
});

router.post('/', async (req, res) => {
  const tree = await resolveTree(req.user.id, req.body.treeId);

  const husband = await resolvePerson(req.body.husband, req.user.id, tree._id);
  const wife = await resolvePerson(req.body.wife, req.user.id, tree._id);

  if (!husband && !wife) {
    return res
      .status(400)
      .json({ error: 'A family needs at least one spouse' });
  }

  const children = [];
  if (Array.isArray(req.body.children)) {
    for (const childId of req.body.children) {
      const child = await resolvePerson(childId, req.user.id, tree._id);
      if (child) children.push(child._id);
    }
  }

  const status =
    req.body.status === 'former' ? 'former' : 'current';

  const family = await Family.create({
    owner: req.user.id,
    tree: tree._id,
    husband: husband ? husband._id : null,
    wife: wife ? wife._id : null,
    children,
    status,
    relationshipStatus: cleanRelationshipStatus(req.body.relationshipStatus),
    marriageDate: cleanText(req.body.marriageDate, 40),
    marriagePlace: cleanText(req.body.marriagePlace, 160),
    divorceDate: cleanText(req.body.divorceDate, 40),
    separationDate: cleanText(req.body.separationDate, 40),
    notes: cleanText(req.body.notes, 2000),
  });

  return res.status(201).json(family.toJSON());
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Family not found' });
  }

  const tree = await resolveTree(req.user.id, req.body.treeId);
  const family = await Family.findOne({
    _id: req.params.id,
    owner: req.user.id,
    tree: tree._id,
  });

  if (!family) {
    return res.status(404).json({ error: 'Family not found' });
  }

  if ('husband' in req.body) {
    const husband = await resolvePerson(req.body.husband, req.user.id, tree._id);
    family.husband = husband ? husband._id : null;
  }
  if ('wife' in req.body) {
    const wife = await resolvePerson(req.body.wife, req.user.id, tree._id);
    family.wife = wife ? wife._id : null;
  }
  if (Array.isArray(req.body.children)) {
    const children = [];
    for (const childId of req.body.children) {
      const child = await resolvePerson(childId, req.user.id, tree._id);
      if (child) children.push(child._id);
    }
    family.children = children;
  }
  if ('status' in req.body) {
    family.status =
      req.body.status === 'former' ? 'former' : 'current';
  }
  if ('marriageDate' in req.body) {
    family.marriageDate = cleanText(req.body.marriageDate, 40);
  }
  if ('marriagePlace' in req.body) {
    family.marriagePlace = cleanText(req.body.marriagePlace, 160);
  }
  if ('divorceDate' in req.body) {
    family.divorceDate = cleanText(req.body.divorceDate, 40);
  }
  if ('separationDate' in req.body) {
    family.separationDate = cleanText(req.body.separationDate, 40);
  }
  if ('relationshipStatus' in req.body) {
    family.relationshipStatus = cleanRelationshipStatus(
      req.body.relationshipStatus
    );
  }
  if ('notes' in req.body) {
    family.notes = cleanText(req.body.notes, 2000);
  }

  await family.save();
  return res.json(family.toJSON());
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Family not found' });
  }

  const tree = await resolveTree(req.user.id, req.body.treeId || req.query.treeId);
  const family = await Family.findOne({
    _id: req.params.id,
    owner: req.user.id,
    tree: tree._id,
  });

  if (!family) {
    return res.status(404).json({ error: 'Family not found' });
  }

  await Family.deleteOne({ _id: family._id, owner: req.user.id });
  return res.json({ deleted: true });
});

module.exports = router;
