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
});
