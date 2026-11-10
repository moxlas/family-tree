import { buildScene } from './SpouseTreeComponent';

function person(id, extra = {}) {
  return { id, firstName: `P${id}`, lastName: 'X', gender: 'unknown', ...extra };
}

describe('buildScene generation placement', () => {
  it('keeps couples without parents in the root generation', () => {
    const people = [
      person('1', { firstName: 'A', spouseId: '2' }),
      person('2', { firstName: 'B', spouseId: '1' }),
    ];
    const scene = buildScene(people, [], true);
    expect(scene.depths).toHaveLength(1);
    expect(scene.depths[0]).toBe(0);
  });

  it('places a card without parents into its spouse generation', () => {
    const people = [
      person('1', { firstName: 'A', spouseId: '2' }),
      person('2', { firstName: 'B', spouseId: '1', parentId: '3' }),
      person('3', { firstName: 'C', lastName: 'Grandparent' }),
    ];
    const scene = buildScene(people, [], true);
    // The couple lives under the spouse's parents -> generation 1.
    expect(scene.depths).toHaveLength(2);
    expect(scene.depths.reduce((m, d) => Math.max(m, d), 0)).toBe(1);
    expect(scene.rows).toHaveLength(2);
  });

  it('keeps children one generation below their parent couple', () => {
    const people = [
      person('1', { firstName: 'A', lastName: 'Root' }),
      person('2', { firstName: 'B', lastName: 'Root', spouseId: '1' }),
      person('3', { firstName: 'C', parentId: '1' }),
    ];
    const scene = buildScene(people, [], true);
    const childDepth = scene.depths[scene.depths.length - 1];
    expect(childDepth).toBe(1);
  });

  it('skips former marriages when ex-spouses are hidden', () => {
    const people = [
      person('1', { firstName: 'A', spouseId: '2', spouseStatus: 'former' }),
      person('2', { firstName: 'B', spouseId: '1', spouseStatus: 'former' }),
    ];
    const shown = buildScene(people, [], true);
    const hidden = buildScene(people, [], false);
    expect(shown.units).toHaveLength(1);
    expect(shown.units[0].status).toBe('former');
    expect(hidden.units).toHaveLength(0);
  });

  it('renders one shared person card for several spouses', () => {
    const people = [
      person('1', { firstName: 'John', spouseId: '3' }),
      person('2', { firstName: 'Mary', spouseId: '1', spouseStatus: 'former' }),
      person('3', { firstName: 'Jane', spouseId: '1' }),
      person('4', { firstName: 'Kid4', parentId: '2' }),
      person('5', { firstName: 'Kid5', parentId: '1' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '2', status: 'former', marriageDate: '', divorceDate: '', children: ['4'] },
      { id: 'f2', husband: '1', wife: '3', status: 'current', marriageDate: '', divorceDate: '', children: ['5'] },
    ];
    const scene = buildScene(people, families, true);
    const johnUnits = scene.units.filter((u) => u.members.some((m) => m.id === '1'));
    const johnUnitIndex = scene.units.findIndex((u) =>
      u.members.some((m) => m.id === '1')
    );
    const formerChildUnit = scene.units.find((u) =>
      u.members.some((m) => m.id === '4')
    );
    const formerChildLink = formerChildUnit.parentLinks?.get(johnUnitIndex);
    expect(johnUnits).toHaveLength(1);
    expect(scene.units).toHaveLength(3);
    expect(johnUnits[0].members.map((m) => m.id)).toEqual(['2', '1', '3']);
    expect(johnUnits[0].relationships).toHaveLength(2);
    expect(formerChildLink?.relationshipStatus).toBe('former');
    expect(formerChildLink?.relationshipContext).toEqual(
      expect.objectContaining({ firstId: '1', secondId: '2', status: 'former' })
    );

    const currentChildUnit = scene.units.find((unit) =>
      unit.members.some((m) => m.id === '5')
    );
    // Children are reserved as one block under the parent unit: the former
    // marriage's child on the left, the current marriage's child on the right.
    expect(formerChildUnit.x).toBeCloseTo(johnUnits[0].x - 138, 0);
    expect(currentChildUnit.x).toBeCloseTo(johnUnits[0].x + 138, 0);
    expect(formerChildUnit.x).toBeLessThan(currentChildUnit.x);
  });

  it('keeps only one current marriage per person', () => {
    const people = [
      person('1', { firstName: 'Adam' }),
      person('2', { firstName: 'Emma' }),
      person('3', { firstName: 'Nina' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '2', status: 'current', marriageDate: '1990', divorceDate: '', children: [] },
      { id: 'f2', husband: '1', wife: '3', status: 'current', marriageDate: '1998', divorceDate: '', children: [] },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '1')
    );
    const statuses = unit.relationships.map((relationship) => relationship.status);

    expect(statuses.filter((status) => status === 'current')).toHaveLength(1);
    expect(statuses.filter((status) => status === 'former')).toHaveLength(1);
    // The newer marriage stays current.
    const current = unit.relationships.find(
      (relationship) => relationship.status === 'current'
    );
    expect([current.firstId, current.secondId].sort()).toEqual(['1', '3']);
  });

  it('places former partners left and the current partner right', () => {
    const people = [
      person('1', { firstName: 'Adam', gender: 'male' }),
      person('2', { firstName: 'Emma', gender: 'female' }),
      person('3', { firstName: 'Nina', gender: 'female' }),
      person('4', { firstName: 'Olga', gender: 'female' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '2', status: 'former', children: [] },
      { id: 'f2', husband: '1', wife: '4', status: 'former', children: [] },
      { id: 'f3', husband: '1', wife: '3', status: 'current', children: [] },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '1')
    );
    const order = unit.members.map((member) => member.id);

    expect(order[order.length - 1]).toBe('3');
    expect(order.indexOf('1')).toBeGreaterThan(0);
    expect(order.indexOf('1')).toBeLessThan(order.length - 1);
    expect(unit.memberCenters).toHaveLength(order.length);
    // Compact links: ex-spouse connections are drawn behind the cards.
    expect(unit.linkWidths.every((width) => width === 36)).toBe(true);
  });

  it('orders chained marriages so every marriage sits between neighbours', () => {
    const people = [
      person('1', { firstName: 'Ex1', gender: 'female' }),
      person('2', { firstName: 'Man', gender: 'male' }),
      person('3', { firstName: 'Current', gender: 'female' }),
      person('4', { firstName: 'Ex2', gender: 'male' }),
    ];
    const families = [
      { id: 'f1', husband: '2', wife: '1', status: 'former', children: [] },
      { id: 'f2', husband: '2', wife: '3', status: 'current', children: [] },
      { id: 'f3', husband: '4', wife: '3', status: 'former', children: [] },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '2')
    );
    const order = unit.members.map((member) => member.id);

    unit.relationships.forEach((relationship) => {
      const gap = Math.abs(
        order.indexOf(relationship.firstId) - order.indexOf(relationship.secondId)
      );
      expect(gap).toBe(1);
    });
    expect(unit.linkWidths.every((width) => width === 36)).toBe(true);
  });

  it('renders marriages where only one partner is in view', () => {
    const people = [person('1', { firstName: 'Solo', gender: 'male' })];
    const families = [
      { id: 'f1', husband: '1', wife: null, status: 'former', children: [] },
    ];
    expect(() => buildScene(people, families, true)).not.toThrow();
    expect(buildScene(people, families, true).units).toHaveLength(1);
  });

  it('centres children under the linked parent card when parents are not adjacent', () => {
    const people = [
      person('1', { firstName: 'Shared', gender: 'male' }),
      person('2', { firstName: 'ExFar', gender: 'female' }),
      person('3', { firstName: 'ExNear', gender: 'female' }),
      person('4', { firstName: 'Current', gender: 'female' }),
      person('5', { firstName: 'Kid', gender: 'male', parentId: '1' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '2', status: 'former', children: ['5'] },
      { id: 'f2', husband: '1', wife: '3', status: 'former', children: [] },
      { id: 'f3', husband: '1', wife: '4', status: 'current', children: [] },
    ];
    const scene = buildScene(people, families, true);
    const parentUnit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '1')
    );
    const childUnit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '5')
    );
    const parentIndex = scene.units.indexOf(parentUnit);
    const childIndex = scene.units.indexOf(childUnit);
    const parentLink = childUnit.parentLinks?.get(parentIndex);

    expect(parentLink).toBeTruthy();
    // Children are reserved under the parent unit and stay inside its block.
    const parentLeft = parentUnit.x - parentUnit.width / 2;
    const parentRight = parentUnit.x + parentUnit.width / 2;
    expect(childUnit.x).toBeGreaterThanOrEqual(parentLeft);
    expect(childUnit.x).toBeLessThanOrEqual(parentRight);
    expect(scene.depths[childIndex]).toBe(scene.depths[parentIndex] + 1);
  });

  it('keeps each family subtree beneath its own ancestors', () => {
    const people = [
      person('1', { firstName: 'ARoot', lastName: 'Doe' }),
      person('2', { firstName: 'AWife', lastName: 'Doe', spouseId: '1' }),
      person('3', { firstName: 'AChild1', lastName: 'Doe', parentId: '1' }),
      person('4', { firstName: 'AChild1Spouse', lastName: 'Doe', spouseId: '3' }),
      person('5', { firstName: 'AChild2', lastName: 'Doe', parentId: '1' }),
      person('6', { firstName: 'BRoot', lastName: 'Doe' }),
      person('7', { firstName: 'BWife', lastName: 'Doe', spouseId: '6' }),
      person('8', { firstName: 'BChild', lastName: 'Doe', parentId: '6' }),
      person('9', { firstName: 'BChildSpouse', lastName: 'Doe', spouseId: '8' }),
      person('10', { firstName: 'AGrand', lastName: 'Doe', parentId: '3' }),
      person('11', { firstName: 'AGrandSpouse', lastName: 'Doe', spouseId: '10' }),
      person('12', { firstName: 'BGrand', lastName: 'Doe', parentId: '8' }),
      person('13', { firstName: 'BGrandSpouse', lastName: 'Doe', spouseId: '12' }),
    ];
    const families = [
      { id: 'fb', husband: '6', wife: '7', status: 'current', marriageDate: '', divorceDate: '', children: ['8'] },
      { id: 'fa', husband: '1', wife: '2', status: 'current', marriageDate: '', divorceDate: '', children: ['3', '5'] },
      { id: 'fac', husband: '3', wife: '4', status: 'current', marriageDate: '', divorceDate: '', children: ['10'] },
      { id: 'fbc', husband: '8', wife: '9', status: 'current', marriageDate: '', divorceDate: '', children: ['12'] },
    ];
    const scene = buildScene(people, families, true);
    const unitFor = (id) => scene.units.find((unit) => unit.members.some((member) => member.id === id));

    const aRoot = unitFor('1');
    const aChild = unitFor('3');
    const aGrandchild = unitFor('10');
    const bRoot = unitFor('6');
    const bChild = unitFor('8');
    const bGrandchild = unitFor('12');

    expect(aRoot.x).toBeLessThan(bRoot.x);
    expect(Math.max(aRoot.x, aChild.x, unitFor('5').x, aGrandchild.x)).toBeLessThan(
      Math.min(bRoot.x, bChild.x, bGrandchild.x)
    );
    expect(aGrandchild.x).toBeLessThan(bChild.x);
    expect(scene.treeWidth).toBeGreaterThan(bGrandchild.x + bGrandchild.width / 2);
  });

  it('targets the actual child in a child spouse pair', () => {
    const people = [
      person('1', { firstName: 'Father', lastName: 'Root', gender: 'male' }),
      person('2', { firstName: 'Mother', lastName: 'Root', gender: 'female', spouseId: '1' }),
      person('3', { firstName: 'Daughter', lastName: 'Root', gender: 'female', parentId: '1' }),
      person('4', { firstName: 'SonInLaw', lastName: 'Other', gender: 'male', spouseId: '3' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '2', status: 'current', marriageDate: '', divorceDate: '', children: ['3'] },
      { id: 'f2', husband: '4', wife: '3', status: 'current', marriageDate: '', divorceDate: '', children: [] },
    ];
    const scene = buildScene(people, families, true);
    const rootIndex = scene.units.findIndex((unit) =>
      unit.members.some((member) => member.id === '1')
    );
    const childUnit = scene.units.find((unit) =>
      unit.members.some((member) => member.id === '3')
    );

    expect(childUnit.parentLinks?.get(rootIndex)?.childId).toBe('3');
    expect(childUnit.members.map((member) => member.id)).toEqual(['4', '3']);
  });
});
