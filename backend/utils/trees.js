const mongoose = require('mongoose');
const Tree = require('../models/Tree');
const Person = require('../models/Person');
const { httpError } = require('./http');

const DEFAULT_TREE_NAME = 'My family tree';

async function loadTrees(ownerId) {
  return Tree.find({ owner: ownerId }).sort({ createdAt: 1, _id: 1 });
}

async function ensureTrees(ownerId) {
  let trees = await loadTrees(ownerId);

  if (!trees.length) {
    try {
      const created = await Tree.create({
        owner: ownerId,
        name: DEFAULT_TREE_NAME,
      });
      trees = [created];
    } catch (error) {
      if (error.code !== 11000) throw error;
      trees = await loadTrees(ownerId);
    }
  }

  if (!trees.length) {
    throw httpError(500, 'Could not create a family tree');
  }

  // People created before multiple trees existed have no tree reference.
  // Move them into the oldest tree, which acts as the default tree.
  await Person.updateMany(
    { owner: ownerId, tree: null },
    { $set: { tree: trees[0]._id } }
  );

  return trees;
}

async function resolveTree(ownerId, treeId) {
  const trees = await ensureTrees(ownerId);

  if (!treeId) return trees[0];

  if (!mongoose.isValidObjectId(treeId)) {
    throw httpError(404, 'Tree not found');
  }

  const tree = trees.find((entry) => String(entry._id) === String(treeId));
  if (!tree) throw httpError(404, 'Tree not found');

  return tree;
}

function serializeTree(tree, peopleCount = 0) {
  return {
    id: tree.id,
    name: tree.name,
    peopleCount,
    homePersonId: tree.homePersonId ? String(tree.homePersonId) : '',
    sharing: {
      enabled: Boolean(tree.sharing?.enabled),
      token: tree.sharing?.token || '',
    },
    createdAt: tree.createdAt,
    updatedAt: tree.updatedAt,
  };
}

module.exports = {
  DEFAULT_TREE_NAME,
  ensureTrees,
  resolveTree,
  serializeTree,
};
