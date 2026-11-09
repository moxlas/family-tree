const express = require('express');
const mongoose = require('mongoose');
const Family = require('../models/Family');
const authenticate = require('../middleware/auth');
const { resolveTree } = require('../utils/trees');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const tree = await resolveTree(req.user.id, req.query.treeId);

  const families = await Family.find({
    owner: req.user.id,
    tree: tree._id,
  }).sort({ createdAt: 1 });

  return res.json(families.map((family) => family.toJSON()));
});

module.exports = router;
