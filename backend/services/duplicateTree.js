const mongoose = require('mongoose');
const Tree = require('../models/Tree');
const Person = require('../models/Person');
const Family = require('../models/Family');

function copyWithoutMetadata(document) {
  const copy = { ...document };
  delete copy._id;
  delete copy.__v;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy;
}

function remapId(idMap, value) {
  if (!value) return null;
  return idMap.get(String(value)) || null;
}

async function uniqueCopyName(ownerId, sourceName) {
  const base = `${String(sourceName || 'My family tree')} (copy)`.slice(0, 120);
  let candidate = base;
  let suffixNumber = 2;

  // The owner + name index enforces uniqueness; find the next free label
  // before inserting so a duplicate never fails on a name collision.
  for (;;) {
    const exists = await Tree.exists({ owner: ownerId, name: candidate });
    if (!exists) return candidate;

    const suffix = ` (${suffixNumber})`;
    candidate = `${base.slice(0, 120 - suffix.length)}${suffix}`;
    suffixNumber += 1;
  }
}

async function duplicateTree({ ownerId, sourceTree }) {
  const [sourcePeople, sourceFamilies] = await Promise.all([
    Person.find({ owner: ownerId, tree: sourceTree._id }).lean(),
    Family.find({ owner: ownerId, tree: sourceTree._id }).lean(),
  ]);

  const name = await uniqueCopyName(ownerId, sourceTree.name);

  // A duplicate starts private. Copying the token would either collide with
  // the source link or silently share two different trees under one token.
  const newTree = await Tree.create({
    owner: ownerId,
    name,
    homePersonId: null,
    sharing: { enabled: false },
  });

  const idMap = new Map(
    sourcePeople.map((person) => [
      String(person._id),
      new mongoose.Types.ObjectId(),
    ])
  );

  const newPeople = sourcePeople.map((person) => {
    const copy = copyWithoutMetadata(person);
    copy._id = idMap.get(String(person._id));
    copy.owner = ownerId;
    copy.tree = newTree._id;
    copy.spouseId = remapId(idMap, person.spouseId);
    copy.parentId = remapId(idMap, person.parentId);
    copy.secondParentId = remapId(idMap, person.secondParentId);
    return copy;
  });

  const newFamilies = sourceFamilies.map((family) => {
    const copy = copyWithoutMetadata(family);
    copy._id = new mongoose.Types.ObjectId();
    copy.owner = ownerId;
    copy.tree = newTree._id;
    copy.husband = remapId(idMap, family.husband);
    copy.wife = remapId(idMap, family.wife);
    copy.children = (family.children || [])
      .map((childId) => remapId(idMap, childId))
      .filter(Boolean);
    return copy;
  });

  try {
    if (newPeople.length) await Person.insertMany(newPeople, { ordered: true });
    if (newFamilies.length) {
      await Family.insertMany(newFamilies, { ordered: true });
    }

    newTree.homePersonId = remapId(idMap, sourceTree.homePersonId);
    await newTree.save();

    return { tree: newTree, peopleCount: newPeople.length };
  } catch (error) {
    await Promise.all([
      Person.deleteMany({ owner: ownerId, tree: newTree._id }),
      Family.deleteMany({ owner: ownerId, tree: newTree._id }),
      Tree.deleteOne({ _id: newTree._id, owner: ownerId }),
    ]).catch(() => {});
    throw error;
  }
}

module.exports = { duplicateTree };
