const PARENT = 'parent';
const CHILD = 'child';
const SPOUSE = 'spouse';

function addToMap(map, key, value) {
  if (!key || !value || key === value) return;
  const id = String(key);
  const target = String(value);
  if (!map.has(id)) map.set(id, new Set());
  map.get(id).add(target);
}

function pairKey(firstId, secondId) {
  const first = String(firstId);
  const second = String(secondId);
  return first < second ? `${first}\u0000${second}` : `${second}\u0000${first}`;
}

function setSpouseFormer(map, firstId, secondId, former) {
  const key = pairKey(firstId, secondId);
  if (!map.has(key) || (!former && map.get(key))) {
    map.set(key, former);
  }
}

export function buildRelationshipGraph(people, families) {
  const parentsByChild = new Map();
  const childrenByParent = new Map();
  const spousesByPerson = new Map();
  const spouseFormerByPair = new Map();
  const byId = new Map(
    (people || []).map((person) => [String(person.id), person])
  );

  (people || []).forEach((person) => {
    const id = String(person.id);
    [person.parentId, person.secondParentId].filter(Boolean).forEach((parentId) => {
      addToMap(parentsByChild, id, parentId);
      addToMap(childrenByParent, parentId, id);
    });
    if (person.spouseId) {
      addToMap(spousesByPerson, id, person.spouseId);
      addToMap(spousesByPerson, person.spouseId, id);
      const spouse = byId.get(String(person.spouseId));
      const former =
        person.spouseStatus === 'former' || spouse?.spouseStatus === 'former';
      setSpouseFormer(spouseFormerByPair, id, person.spouseId, former);
    }
  });

  (families || []).forEach((family) => {
    const parents = [family.husband, family.wife].filter(Boolean);
    const children = family.children || [];
    const former =
      family.status === 'former' ||
      ['divorced', 'widowed', 'separated'].includes(family.relationshipStatus);

    parents.forEach((parentId) => {
      children.forEach((childId) => {
        addToMap(parentsByChild, childId, parentId);
        addToMap(childrenByParent, parentId, childId);
      });
    });

    if (parents.length === 2) {
      addToMap(spousesByPerson, parents[0], parents[1]);
      addToMap(spousesByPerson, parents[1], parents[0]);
      setSpouseFormer(spouseFormerByPair, parents[0], parents[1], former);
    }
  });

  return {
    parentsByChild,
    childrenByParent,
    spouseFormerByPair,
    spousesByPerson,
  };
}

function findPath(referenceId, targetId, graph) {
  const start = String(referenceId);
  const target = String(targetId);
  if (start === target) return { nodes: [start], steps: [] };

  const queue = [start];
  const visited = new Set([start]);
  const previous = new Map();

  while (queue.length) {
    const current = queue.shift();
    const neighbors = [];

    (graph.parentsByChild.get(current) || new Set()).forEach((id) => {
      neighbors.push([id, PARENT]);
    });
    (graph.childrenByParent.get(current) || new Set()).forEach((id) => {
      neighbors.push([id, CHILD]);
    });
    (graph.spousesByPerson.get(current) || new Set()).forEach((id) => {
      const former =
        graph.spouseFormerByPair?.get(pairKey(current, id)) === true;
      neighbors.push([id, SPOUSE, former]);
    });

    for (const [nextId, edge, former] of neighbors) {
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      previous.set(nextId, { from: current, edge, former: Boolean(former) });
      if (nextId === target) {
        queue.length = 0;
        break;
      }
      queue.push(nextId);
    }
  }

  if (!visited.has(target)) return null;

  const steps = [];
  const formerFlags = [];
  const nodes = [target];
  let cursor = target;
  while (cursor !== start) {
    const entry = previous.get(cursor);
    if (!entry) return null;
    steps.unshift(entry.edge);
    formerFlags.unshift(entry.former);
    cursor = entry.from;
    nodes.unshift(cursor);
  }
  return { formerFlags, nodes, steps };
}

function genderedKey(gender, maleKey, femaleKey, neutralKey) {
  if (gender === 'male') return maleKey;
  if (gender === 'female') return femaleKey;
  return neutralKey;
}

function siblingDescriptor(referenceId, targetId, gender, graph) {
  const firstParents = graph.parentsByChild.get(String(referenceId)) || new Set();
  const secondParents = graph.parentsByChild.get(String(targetId)) || new Set();
  const shared = [...firstParents].filter((id) => secondParents.has(id));
  const half =
    shared.length === 1 &&
    (firstParents.size > 1 || secondParents.size > 1);

  return {
    key: half
      ? genderedKey(
          gender,
          'relation.halfBrother',
          'relation.halfSister',
          'relation.halfSibling'
        )
      : genderedKey(
          gender,
          'relation.brother',
          'relation.sister',
          'relation.sibling'
        ),
  };
}

function ancestorDescriptor(count, gender) {
  if (count === 1) {
    return {
      key: genderedKey(gender, 'relation.father', 'relation.mother', 'relation.parent'),
    };
  }
  if (count === 2) {
    return {
      key: genderedKey(
        gender,
        'relation.grandfather',
        'relation.grandmother',
        'relation.grandparent'
      ),
    };
  }
  if (count === 3) {
    return {
      key: genderedKey(
        gender,
        'relation.greatGrandfather',
        'relation.greatGrandmother',
        'relation.greatGrandparent'
      ),
    };
  }
  return { key: 'relation.ancestor' };
}

function descendantDescriptor(count, gender) {
  if (count === 1) {
    return {
      key: genderedKey(gender, 'relation.son', 'relation.daughter', 'relation.child'),
    };
  }
  if (count === 2) {
    return {
      key: genderedKey(
        gender,
        'relation.grandson',
        'relation.granddaughter',
        'relation.grandchild'
      ),
    };
  }
  if (count === 3) {
    return {
      key: genderedKey(
        gender,
        'relation.greatGrandson',
        'relation.greatGranddaughter',
        'relation.greatGrandchild'
      ),
    };
  }
  return { key: 'relation.descendant' };
}

function spouseKey(gender, former = false) {
  if (former) {
    return genderedKey(
      gender,
      'relation.exHusband',
      'relation.exWife',
      'relation.exPartner'
    );
  }
  return genderedKey(gender, 'relation.husband', 'relation.wife', 'relation.partner');
}

function describeSteps(steps, context, nodes, formerFlags = []) {
  const { byId, graph, referenceId } = context;
  const targetId = nodes[nodes.length - 1];
  const target = byId.get(String(targetId));
  const gender = target?.gender || 'unknown';

  if (!steps || !steps.length) return { key: 'relation.self' };

  if (steps.length === 1 && steps[0] === SPOUSE) {
    return { key: spouseKey(gender, Boolean(formerFlags[0])) };
  }

  if (steps[steps.length - 1] === SPOUSE) {
    const base = describeSteps(
      steps.slice(0, -1),
      context,
      nodes.slice(0, -1),
      formerFlags.slice(0, -1)
    );
    if (base && base.key !== 'relation.self' && base.key !== 'relation.relative') {
      return {
        key: 'relation.spouseOf',
        relation: base,
        spouseFormer: Boolean(formerFlags[formerFlags.length - 1]),
        spouseGender: gender,
      };
    }
  }

  if (steps.every((step) => step === PARENT)) {
    return ancestorDescriptor(steps.length, gender);
  }

  if (steps.every((step) => step === CHILD)) {
    return descendantDescriptor(steps.length, gender);
  }

  const path = steps.join('|');

  if (path === `${PARENT}|${CHILD}`) {
    return siblingDescriptor(referenceId, targetId, gender, graph);
  }

  if (path === `${PARENT}|${CHILD}|${CHILD}`) {
    return {
      key: genderedKey(gender, 'relation.nephew', 'relation.niece', 'relation.nephewOrNiece'),
    };
  }

  if (path === `${PARENT}|${PARENT}|${CHILD}`) {
    return {
      key: genderedKey(gender, 'relation.uncle', 'relation.aunt', 'relation.auntOrUncle'),
    };
  }

  if (path === `${PARENT}|${PARENT}|${CHILD}|${CHILD}`) {
    return {
      key: genderedKey(gender, 'relation.cousinMale', 'relation.cousinFemale', 'relation.cousin'),
    };
  }

  if (path === `${PARENT}|${PARENT}|${CHILD}|${CHILD}|${CHILD}`) {
    return {
      key: genderedKey(
        gender,
        'relation.cousinSon',
        'relation.cousinDaughter',
        'relation.cousinChild'
      ),
    };
  }

  if (path === `${PARENT}|${CHILD}|${CHILD}|${CHILD}`) {
    return {
      key: genderedKey(
        gender,
        'relation.greatNephew',
        'relation.greatNiece',
        'relation.greatNephewOrNiece'
      ),
    };
  }

  if (path === `${PARENT}|${PARENT}|${PARENT}|${CHILD}|${CHILD}`) {
    return { key: 'relation.parentCousin' };
  }

  if (path === `${SPOUSE}|${PARENT}`) {
    return {
      key: genderedKey(
        gender,
        'relation.fatherInLaw',
        'relation.motherInLaw',
        'relation.parentInLaw'
      ),
    };
  }

  if (path === `${SPOUSE}|${PARENT}|${CHILD}`) {
    return {
      key: genderedKey(
        gender,
        'relation.brotherInLaw',
        'relation.sisterInLaw',
        'relation.siblingInLaw'
      ),
    };
  }

  if (path === `${SPOUSE}|${CHILD}`) {
    return {
      key: genderedKey(
        gender,
        'relation.stepSon',
        'relation.stepDaughter',
        'relation.stepChild'
      ),
    };
  }

  if (path === `${PARENT}|${SPOUSE}`) {
    return {
      key: genderedKey(
        gender,
        'relation.stepFather',
        'relation.stepMother',
        'relation.stepParent'
      ),
    };
  }

  if (path === `${PARENT}|${SPOUSE}|${CHILD}`) {
    return {
      key: genderedKey(
        gender,
        'relation.stepBrother',
        'relation.stepSister',
        'relation.stepSibling'
      ),
    };
  }

  return {
    key: steps.includes(SPOUSE)
      ? 'relation.relativeByMarriage'
      : 'relation.relative',
  };
}

export function describeRelationship({
  families,
  people,
  referenceId,
  targetId,
}) {
  if (!referenceId || !targetId) return null;
  if (String(referenceId) === String(targetId)) {
    return { key: 'relation.self' };
  }

  const target = (people || []).find(
    (entry) => String(entry.id) === String(targetId)
  );
  if (!target) return null;

  const graph = buildRelationshipGraph(people, families);
  const path = findPath(referenceId, targetId, graph);
  if (!path) return null;

  return describeSteps(path.steps, {
    byId: new Map((people || []).map((entry) => [String(entry.id), entry])),
    graph,
    referenceId,
  }, path.nodes, path.formerFlags);
}

export function formatRelationship(descriptor, t, language = 'en') {
  if (!descriptor) return '';

  if (descriptor.key === 'relation.spouseOf') {
    const relation = formatRelationship(descriptor.relation, t, language);
    let spouse = t(spouseKey(descriptor.spouseGender, descriptor.spouseFormer));
    if (language === 'en' && spouse) {
      spouse = spouse.charAt(0).toLowerCase() + spouse.slice(1);
    }
    return t('relation.spouseOf', { relation, spouse });
  }

  return t(descriptor.key);
}
