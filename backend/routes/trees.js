const express = require('express');
const mongoose = require('mongoose');
const Tree = require('../models/Tree');
const Person = require('../models/Person');
const authenticate = require('../middleware/auth');
const { ensureTrees, resolveTree, serializeTree } = require('../utils/trees');
const { importGedcom } = require('../services/gedcomImport');

const router = express.Router();
router.use(authenticate);

function cleanName(value) {
  return String(value == null ? '' : value).trim().slice(0, 120);
}

async function serializeTrees(trees, ownerId) {
  const counts = await Promise.all(
    trees.map((tree) =>
      Person.countDocuments({ owner: ownerId, tree: tree._id })
    )
  );

  return trees.map((tree, index) => serializeTree(tree, counts[index]));
}

router.get('/', async (req, res) => {
  const trees = await ensureTrees(req.user.id);
  res.json(await serializeTrees(trees, req.user.id));
});

router.post('/', async (req, res) => {
  const name = cleanName(req.body.name);

  if (!name) {
    return res.status(400).json({ error: 'Tree name is required' });
  }

  const existing = await Tree.findOne({ owner: req.user.id, name });
  if (existing) {
    return res
      .status(409)
      .json({ error: 'A tree with this name already exists' });
  }

  const tree = await Tree.create({ owner: req.user.id, name });
  return res.status(201).json(serializeTree(tree, 0));
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  const tree = await Tree.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!tree) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  const name = cleanName(req.body.name);
  const hasHomePerson = Object.prototype.hasOwnProperty.call(
    req.body,
    'homePersonId'
  );

  if (!name && !hasHomePerson) {
    return res.status(400).json({ error: 'Tree name is required' });
  }

  if (name) {
    const existing = await Tree.findOne({
      owner: req.user.id,
      name,
      _id: { $ne: tree._id },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: 'A tree with this name already exists' });
    }

    tree.name = name;
  }

  if (hasHomePerson) {
    const homePersonId = req.body.homePersonId;

    if (!homePersonId) {
      tree.homePersonId = null;
    } else {
      if (!mongoose.isValidObjectId(homePersonId)) {
        return res.status(400).json({ error: 'Invalid home person' });
      }

      const homePerson = await Person.findOne({
        _id: homePersonId,
        owner: req.user.id,
        tree: tree._id,
      });

      if (!homePerson) {
        return res.status(400).json({ error: 'Invalid home person' });
      }

      tree.homePersonId = homePerson._id;
    }
  }

  await tree.save();

  const peopleCount = await Person.countDocuments({
    owner: req.user.id,
    tree: tree._id,
  });

  return res.json(serializeTree(tree, peopleCount));
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  const trees = await ensureTrees(req.user.id);
  const tree = trees.find(
    (entry) => String(entry._id) === String(req.params.id)
  );

  if (!tree) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  if (trees.length <= 1) {
    return res.status(400).json({ error: 'You need at least one tree' });
  }

  const deletedPeople = await Person.deleteMany({
    owner: req.user.id,
    tree: tree._id,
  });
  await Tree.deleteOne({ _id: tree._id, owner: req.user.id });

  return res.json({
    deleted: true,
    deletedPeople: deletedPeople.deletedCount,
  });
});

router.post('/:id/import', async (req, res) => {
  const tree = await resolveTree(req.user.id, req.params.id);

  if (String(tree._id) !== String(req.params.id)) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  const result = await importGedcom({
    ownerId: req.user.id,
    tree,
    body: req.body,
  });

  return res.json(result);
});

module.exports = router;
