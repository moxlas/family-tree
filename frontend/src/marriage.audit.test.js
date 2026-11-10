const fs = require('fs');
const { parseGedcom } = require('./gedcom');
const { viewPeople } = require('./treeView');
const { buildScene } = require('./components/SpouseTreeComponent');

function loadRealData() {
  const parsed = parseGedcom(
    fs.readFileSync(
      'C:/Users/moxla.DESKTOP-EQA1RL8/Downloads/gj6985_77718996k6f3798a5b1cp5_A.ged',
      'utf8'
    ),
    'en'
  );

  const idByKey = new Map();
  parsed.individuals.forEach((person, index) =>
    idByKey.set(person.key, `p${index + 1}`)
  );
  const idOf = (key) => idByKey.get(key) || null;
  const name = new Map(
    parsed.individuals.map((person) => [
      idByKey.get(person.key),
      `${person.firstName} ${person.lastName}`.trim(),
    ])
  );

  const families = parsed.families.map((family, index) => ({
    id: `f${index + 1}`,
    husband: idOf(family.husband),
    wife: idOf(family.wife),
    children: (family.children || []).map(idOf).filter(Boolean),
    status: family.status || 'current',
    marriageDate: family.marriageDate || '',
    divorceDate: family.divorceDate || '',
  }));

  const parentOf = new Map();
  const spouseOf = new Map();
  families.forEach((family) => {
    family.children.forEach((childId) => {
      if (!parentOf.has(childId)) parentOf.set(childId, []);
      [family.husband, family.wife]
        .filter(Boolean)
        .forEach((parentId) => parentOf.get(childId).push(parentId));
    });
    if (family.husband && family.wife) {
      spouseOf.set(family.husband, family.wife);
      spouseOf.set(family.wife, family.husband);
    }
  });

  const people = parsed.individuals.map((person) => {
    const id = idByKey.get(person.key);
    const parents = parentOf.get(id) || [];
    return {
      id,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      parentId: parents[0] || null,
      secondParentId: parents[1] || null,
      spouseId: spouseOf.get(id) || null,
    };
  });

  return { people, families, name };
}

test('inspect Vytautas marriage group', () => {
  const { people, families, name } = loadRealData();
  const label = (id) => name.get(String(id)) || String(id);

  const focusId = people.find((person) => label(person.id) === 'Vytautas Mikėnas').id;
  const branch = viewPeople(people, families, { focusId });
  const scenes = {
    full: buildScene(people, families, true),
    branch: buildScene(branch.people, branch.families, true),
  };

  const report = Object.entries(scenes).map(([viewName, scene]) => ({
    viewName,
    units: scene.units
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) =>
        unit.members.some((member) => label(member.id) === 'Vytautas Mikėnas')
      )
      .map(({ unit, index }) => ({
        index,
        depth: scene.depths[index],
        x: Math.round(unit.x),
        width: unit.width,
        memberOrder: unit.members.map((member) => label(member.id)),
        memberCenters: unit.memberCenters.map((center) => Math.round(center)),
        relationships: (unit.relationships || []).map((relationship) => ({
          first: label(relationship.firstId),
          second: label(relationship.secondId),
          status: relationship.status,
          hasChildren: relationship.hasChildren,
        })),
        linkWidths: unit.linkWidths,
        children: (unit.children || []).map(label),
      })),
    children: scene.units
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) =>
        unit.members.some((member) =>
          ['Irmantė Bareikienė', 'Almantas Mikėnas'].includes(label(member.id))
        )
      )
      .map(({ unit, index }) => ({
        index,
        depth: scene.depths[index],
        x: Math.round(unit.x),
        members: unit.members.map((member) => label(member.id)),
        parentContext: [...(unit.parentLinks?.values() || [])].map((link) => ({
          child: label(link.childId),
          parent: label(link.parentId),
          familyId: link.relationshipContext?.familyId,
          status: link.relationshipStatus,
        })),
      })),
  }));

  // eslint-disable-next-line no-console
  console.log('SCENES', JSON.stringify(report, null, 2));

  expect(report.length).toBe(2);
});

test('branch sizes on the real file', () => {
  const { people, families, name } = loadRealData();
  const full = viewPeople(people, families);
  const fullIds = new Set(full.people.map((entry) => entry.id));

  const rows = people.map((person) => {
    const view = viewPeople(people, families, { focusId: person.id });
    const ids = new Set(view.people.map((entry) => entry.id));
    return {
      name: name.get(person.id),
      size: ids.size,
      same:
        ids.size === fullIds.size && [...ids].every((id) => fullIds.has(id)),
    };
  });

  // eslint-disable-next-line no-console
  console.log(
    'BRANCH_SIZES',
    JSON.stringify(
      {
        full: fullIds.size,
        unchanged: rows.filter((row) => row.same).length,
        sizes: rows.map((row) => row.size).sort((a, b) => a - b),
        vytautas: rows.find((row) => row.name === 'Vytautas Mikėnas'),
        birute: rows.find((row) => row.name === 'Birutė Mikėnienė'),
      },
      null,
      2
    )
  );

  expect(fullIds.size).toBeGreaterThan(0);
});

