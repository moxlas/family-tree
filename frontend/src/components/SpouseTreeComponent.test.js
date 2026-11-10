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
    expect(formerChildUnit.x).toBeLessThan(currentChildUnit.x);

    // Each child sits nearest the heart of its own marriage, never the heart
    // of the other marriage.
    const unitLeft = johnUnits[0].x - johnUnits[0].width / 2;
    const centerOf = (personId) => {
      const index = johnUnits[0].members.findIndex((m) => m.id === personId);
      return unitLeft + johnUnits[0].memberCenters[index];
    };
    const formerAnchor = (centerOf('1') + centerOf('2')) / 2;
    const currentAnchor = (centerOf('1') + centerOf('3')) / 2;
    expect(Math.abs(formerChildUnit.x - formerAnchor)).toBeLessThan(
      Math.abs(formerChildUnit.x - currentAnchor)
    );
    expect(Math.abs(currentChildUnit.x - currentAnchor)).toBeLessThan(
      Math.abs(currentChildUnit.x - formerAnchor)
    );
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
    // Previous marriages are separated from their neighbour by a wider gap
    // than a current marriage, so their children have room under the heart.
    const widthFor = (firstId, secondId) => {
      const relationship = unit.relationships.find(
        (entry) =>
          (entry.firstId === firstId && entry.secondId === secondId) ||
          (entry.secondId === firstId && entry.firstId === secondId)
      );
      const index = Math.max(
        order.indexOf(relationship.firstId),
        order.indexOf(relationship.secondId)
      );
      return unit.linkWidths[index - 1];
    };
    expect(widthFor('1', '3')).toBe(36);
    expect(widthFor('1', '2')).toBeGreaterThan(36);
    expect(widthFor('1', '4')).toBeGreaterThan(36);
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
    // Ex-marriages sit in wider gaps than the current marriage.
    const currentIndex = Math.max(order.indexOf('2'), order.indexOf('3'));
    expect(unit.linkWidths[currentIndex - 1]).toBe(36);
    expect(unit.linkWidths.filter((width) => width > 36)).toHaveLength(2);
  });

  it('keeps the shared spouse in the middle of a chain under their parents', () => {
    const people = [
      person('5', { firstName: 'Grandpa', gender: 'male' }),
      person('6', { firstName: 'Grandma', gender: 'female', spouseId: '5' }),
      person('2', { firstName: 'Man', gender: 'male', parentId: '5' }),
      person('1', { firstName: 'Ex', gender: 'female' }),
      person('3', { firstName: 'Current', gender: 'female' }),
      person('4', { firstName: 'ExKid', parentId: '2' }),
      person('7', { firstName: 'CurrentKid', parentId: '2' }),
    ];
    const families = [
      { id: 'f0', husband: '5', wife: '6', status: 'current', children: ['2'] },
      { id: 'f1', husband: '2', wife: '1', status: 'former', children: ['4'] },
      { id: 'f2', husband: '2', wife: '3', status: 'current', children: ['7'] },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '2')
    );

    // Ex-partner on one side, current partner on the other, shared person
    // between them: the current marriage must not sit across the ex card.
    expect(unit.members.map((member) => member.id)).toEqual(['1', '2', '3']);
    expect(unit.linkWidths[0]).toBeGreaterThan(unit.linkWidths[1]);
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

  it('anchors children of a behind-the-cards marriage to its own heart gap', () => {
    const people = [
      person('1', { firstName: 'Saulius', gender: 'male' }),
      person('2', { firstName: 'Ričardas', gender: 'male' }),
      person('3', { firstName: 'Diana', gender: 'female' }),
      person('4', { firstName: 'Petras', gender: 'male' }),
      person('5', { firstName: 'Edvinas', parentId: '1' }),
      person('6', { firstName: 'Eisra', parentId: '2' }),
      person('7', { firstName: 'Karolis', parentId: '4' }),
    ];
    const families = [
      { id: 'f1', husband: '1', wife: '3', status: 'former', children: ['5'] },
      { id: 'f2', husband: '2', wife: '3', status: 'former', children: ['6'] },
      { id: 'f3', husband: '4', wife: '3', status: 'current', children: ['7'] },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '3')
    );
    const order = unit.members.map((member) => member.id);

    expect(order).toEqual(['1', '2', '3', '4']);
    // The heart of 1 & 3 sits beside 1, in the gap between 1 and 2, so that
    // gap is widened for their child. 2 & 3 is a neighbour marriage with one
    // child, so it widens a little but stays narrower than an ex marriage.
    expect(unit.linkWidths).toEqual([152, 152, 64]);

    const unitLeft = unit.x - unit.width / 2;
    const cardCenter = (id) => {
      const index = order.indexOf(id);
      return unitLeft + unit.memberCenters[index];
    };
    const heartForSaulius = (cardCenter('1') + cardCenter('2')) / 2;
    const child = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '5')
    );

    expect(Math.abs(child.x - heartForSaulius)).toBeLessThan(
      Math.abs(child.x - cardCenter('2'))
    );
  });

  it('places a single child exactly under its parents marriage heart', () => {
    const people = [
      person('1', { firstName: 'Mother', gender: 'female' }),
      person('2', { firstName: 'Father', gender: 'male' }),
      person('3', { firstName: 'Child', parentId: '1' }),
      person('5', { firstName: 'SecondWife', gender: 'female' }),
      person('4', { firstName: 'OtherChild', parentId: '2' }),
    ];
    const families = [
      { id: 'f1', husband: '2', wife: '1', status: 'current', children: ['3'] },
      { id: 'f2', husband: '2', wife: '5', status: 'current', children: ['4'] },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '2')
    );
    const order = unit.members.map((member) => member.id);
    const unitLeft = unit.x - unit.width / 2;
    const centerOf = (personId) =>
      unitLeft + unit.memberCenters[order.indexOf(personId)];
    const heartX = (centerOf('1') + centerOf('2')) / 2;
    const child = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '3')
    );

    expect(child.x).toBeCloseTo(heartX, 1);
  });

  it('widens a current marriage gap by the number of children it carries', () => {    const people = [
      person('1', { firstName: 'Father', gender: 'male' }),
      person('2', { firstName: 'Mother', gender: 'female' }),
      person('3', { firstName: 'ChildOne', parentId: '1' }),
      person('4', { firstName: 'ChildTwo', parentId: '1' }),
      person('5', { firstName: 'ChildThree', parentId: '1' }),
    ];
    const families = [
      {
        id: 'f1',
        husband: '1',
        wife: '2',
        status: 'current',
        children: ['3', '4', '5'],
      },
    ];
    const scene = buildScene(people, families, true);
    const unit = scene.units.find((entry) =>
      entry.members.some((member) => member.id === '1')
    );

    expect(unit.linkWidths).toContain(112);
  });
});
