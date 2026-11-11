const express = require('express');
const Tree = require('../models/Tree');
const Person = require('../models/Person');
const Family = require('../models/Family');

const router = express.Router();

function isLiving(person) {
  return !person.deceased && !String(person.deathDate || '').trim();
}

function idOf(value) {
  return value ? String(value) : '';
}

// Public pages are read-only and never expose account data or private notes.
// Living people keep their names and relationships, but their birth details
// and the dates/places of their unions stay hidden.
router.get('/trees/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();

  if (!token) {
    return res.status(404).json({ error: 'Shared tree not found' });
  }

  const tree = await Tree.findOne({
    'sharing.enabled': true,
    'sharing.token': token,
  });

  if (!tree) {
    return res.status(404).json({ error: 'Shared tree not found' });
  }

  const [people, families] = await Promise.all([
    Person.find({ owner: tree.owner, tree: tree._id }).sort({
      createdAt: 1,
    }),
    Family.find({ owner: tree.owner, tree: tree._id }).sort({
      createdAt: 1,
    }),
  ]);

  const livingById = new Map(
    people.map((person) => [String(person._id), isLiving(person)])
  );

  const publicPeople = people.map((person) => {
    const living = livingById.get(String(person._id)) !== false;

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      previousName: person.previousName,
      gender: person.gender,
      birthDate: living ? '' : person.birthDate,
      birthPlace: living ? '' : person.birthPlace,
      deathDate: living ? '' : person.deathDate,
      deceased: Boolean(person.deceased),
      spouseId: idOf(person.spouseId),
      spouseName: person.spouseName,
      spouseStatus: person.spouseStatus,
      parentId: idOf(person.parentId),
      secondParentId: idOf(person.secondParentId),
    };
  });

  const publicFamilies = families.map((family) => {
    const partners = [family.husband, family.wife]
      .filter(Boolean)
      .map((partnerId) => livingById.get(String(partnerId)));

    // A union's dates and places are shown only once at least one partner is
    // known to be deceased. Otherwise they could reveal a living person's
    // marriage or divorce details.
    const showUnionDates = partners.some((living) => living === false);

    return {
      id: family.id,
      husband: idOf(family.husband),
      wife: idOf(family.wife),
      children: (family.children || []).map((childId) => String(childId)),
      status: family.status,
      relationshipStatus: family.relationshipStatus,
      marriageDate: showUnionDates ? family.marriageDate : '',
      marriagePlace: showUnionDates ? family.marriagePlace : '',
      divorceDate: showUnionDates ? family.divorceDate : '',
      separationDate: showUnionDates ? family.separationDate : '',
    };
  });

  res.set('X-Robots-Tag', 'noindex, nofollow');

  return res.json({
    tree: {
      name: tree.name,
      homePersonId: idOf(tree.homePersonId),
    },
    people: publicPeople,
    families: publicFamilies,
  });
});

module.exports = router;
