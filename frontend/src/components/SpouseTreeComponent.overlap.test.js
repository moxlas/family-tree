import { buildScene } from './SpouseTreeComponent';

function ranges(scene) {
  return scene.rows.map((row, depth) => row.map((index) => {
    const unit = scene.units[index];
    return {
      depth,
      ids: unit.members.map((member) => member.id),
      left: unit.x - unit.width / 2,
      right: unit.x + unit.width / 2,
      x: unit.x,
      width: unit.width,
    };
  }));
}

function assertNoOverlap(scene, label) {
  const all = ranges(scene);
  for (const row of all) {
    const sorted = [...row].sort((a, b) => a.left - b.left);
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (current.left < previous.right - 0.001) {
        // eslint-disable-next-line no-console
        console.log(label, JSON.stringify({ depth: current.depth, previous, current, row }, null, 2));
        throw new Error(`Overlap in ${label} at depth ${current.depth}: ${previous.ids} vs ${current.ids}`);
      }
    }
  }
}

describe('large layout overlap audit', () => {
  it('handles a broad fully linked tree', () => {
    const people = [];
    const families = [];
    const add = (id, extra = {}) => {
      people.push({
        id: String(id),
        firstName: `P${id}`,
        lastName: 'Test',
        gender: id % 2 ? 'male' : 'female',
        ...extra,
      });
    };

    add(1);
    add(2);
    families.push({ id: 'f-root', husband: '1', wife: '2', status: 'current', children: [] });

    let nextId = 3;
    const childUnitIds = [];
    for (let i = 0; i < 6; i += 1) {
      const child = nextId;
      const spouse = nextId + 1;
      add(child, { parentId: '1' });
      add(spouse, { spouseId: String(child) });
      childUnitIds.push(child);
      families[0].children.push(String(child));
      families.push({
        id: `f-child-${i}`,
        husband: String(child),
        wife: String(spouse),
        status: 'current',
        children: [],
      });
      nextId += 2;
    }

    for (let i = 0; i < childUnitIds.length; i += 1) {
      const childParent = String(childUnitIds[i]);
      const old = nextId;
      const newSpouse = nextId + 1;
      add(old, { parentId: childParent, spouseId: String(newSpouse) });
      add(newSpouse, { spouseId: String(old) });
      families.push({
        id: `f-grand-${i}`,
        husband: String(old),
        wife: String(newSpouse),
        status: 'current',
        children: [],
      });
      nextId += 2;
    }

    const scene = buildScene(people, families, true);
    assertNoOverlap(scene, 'broad');
  });

  it('handles multiple roots, remarriages and deep generations', () => {
    const people = [];
    const families = [];
    let nextId = 1;

    const addPerson = (extra = {}) => {
      const id = String(nextId);
      nextId += 1;
      people.push({
        id,
        firstName: `P${id}`,
        lastName: 'Test',
        gender: Number(id) % 2 ? 'male' : 'female',
        ...extra,
      });
      return id;
    };

    const addCouple = (status = 'current', children = []) => {
      const husband = addPerson({ gender: 'male' });
      const wife = addPerson({ gender: 'female', spouseId: husband });
      const family = {
        id: `family-${nextId}`,
        husband,
        wife,
        status,
        children,
      };
      families.push(family);
      nextId += 1;
      return { husband, wife, family };
    };

    // Three independent root families, each with a three generation chain
    // and several siblings per level.
    for (let root = 0; root < 3; root += 1) {
      const rootCouple = addCouple();
      const children = [];

      for (let child = 0; child < 4; child += 1) {
        const childCouple = addCouple('current', []);
        children.push(childCouple.husband);
        childCouple.family.children = [];

        // Marry the child into the root family.
        childCouple.family.id = `link-${childCouple.family.id}`;
        families.push({
          id: `root-child-${root}-${child}`,
          husband: rootCouple.husband,
          wife: rootCouple.wife,
          status: 'current',
          children: [childCouple.husband],
        });

        // Ex-spouse marriage for the first two children.
        if (child < 2) {
          const ex = addPerson({ gender: 'female' });
          families.push({
            id: `former-${root}-${child}`,
            husband: childCouple.husband,
            wife: ex,
            status: 'former',
            children: [],
          });
        }

        // Grandchildren for each child couple.
        const grandchildCouple = addCouple('current', []);
        families.push({
          id: `grand-${root}-${child}`,
          husband: childCouple.husband,
          wife: childCouple.wife,
          status: 'current',
          children: [grandchildCouple.husband],
        });
      }

      rootCouple.family.children = children;
    }

    const scene = buildScene(people, families, true);
    assertNoOverlap(scene, 'remarried');
  });

  it('keeps very wide sibling groups separated', () => {
    const people = [];
    const families = [];
    const rootHusband = {
      id: '1', firstName: 'Root', lastName: 'X', gender: 'male',
    };
    const rootWife = {
      id: '2', firstName: 'Root', lastName: 'X', gender: 'female', spouseId: '1',
    };
    people.push(rootHusband, rootWife);
    const children = [];

    for (let i = 0; i < 14; i += 1) {
      const childId = String(i + 3);
      const spouseId = String(i + 3 + 14);
      people.push({
        id: childId, firstName: `Child${i}`, lastName: 'X', gender: 'male', parentId: '1',
      });
      people.push({
        id: spouseId, firstName: `Spouse${i}`, lastName: 'X', gender: 'female', spouseId: childId,
      });
      families.push({
        id: `marriage-${i}`,
        husband: childId,
        wife: spouseId,
        status: 'current',
        children: [],
      });
      children.push(childId);
    }

    families.push({
      id: 'root-family',
      husband: '1',
      wife: '2',
      status: 'current',
      children,
    });

    const scene = buildScene(people, families, true);
    assertNoOverlap(scene, 'wide');
  });
});
