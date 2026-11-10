function idOf(value) {
  return value == null || value === '' ? '' : String(value);
}

function addEdge(map, from, to) {
  if (!from || !to) return;
  if (!map.has(from)) map.set(from, new Set());
  map.get(from).add(to);
}

function buildGraph(people, families) {
  const partners = new Map();
  const children = new Map();

  families.forEach((family) => {
    const husband = idOf(family.husband);
    const wife = idOf(family.wife);
    if (husband && wife) {
      addEdge(partners, husband, wife);
      addEdge(partners, wife, husband);
    }
    (family.children || []).map(idOf).forEach((childId) => {
      [husband, wife].filter(Boolean).forEach((parentId) => {
        addEdge(children, parentId, childId);
      });
    });
  });

  people.forEach((person) => {
    const id = idOf(person.id);
    const spouse = idOf(person.spouseId);
    if (spouse) {
      addEdge(partners, id, spouse);
      addEdge(partners, spouse, id);
    }
    [person.parentId, person.secondParentId]
      .map(idOf)
      .filter(Boolean)
      .forEach((parentId) => addEdge(children, parentId, id));
  });

  return { partners, children };
}

function closure(seeds, edges) {
  const result = new Set(seeds);
  const queue = [...seeds];
  while (queue.length) {
    const current = queue.shift();
    (edges.get(current) || new Set()).forEach((next) => {
      if (!result.has(next)) {
        result.add(next);
        queue.push(next);
      }
    });
  }
  return result;
}

function reverseEdges(edges) {
  const reversed = new Map();
  edges.forEach((targets, source) => {
    targets.forEach((target) => addEdge(reversed, target, source));
  });
  return reversed;
}

// Parent-child components: everyone linked by blood or adoption. A spouse
// who married in starts their own component unless they descend from the
// same family, which is exactly what we need to tell in-laws apart.
function parentComponents(people, graph) {
  const componentOf = new Map();
  let cursor = 0;

  people.forEach((person) => {
    const id = idOf(person.id);
    if (componentOf.has(id)) return;

    const componentId = cursor;
    cursor += 1;
    const queue = [id];
    componentOf.set(id, componentId);

    while (queue.length) {
      const current = queue.shift();
      const neighbours = [
        ...(graph.children.get(current) || []),
        ...[...graph.children.entries()]
          .filter(([, descendants]) => descendants.has(current))
          .map(([parentId]) => parentId),
      ];
      neighbours.forEach((neighbourId) => {
        if (componentOf.has(neighbourId)) return;
        componentOf.set(neighbourId, componentId);
        queue.push(neighbourId);
      });
    }
  });

  const members = new Map();
  componentOf.forEach((componentId, personId) => {
    if (!members.has(componentId)) members.set(componentId, []);
    members.get(componentId).push(personId);
  });

  return { componentOf, members };
}

function fullTreeKeep(people, families) {
  const graph = buildGraph(people, families);
  const { componentOf, members } = parentComponents(people, graph);

  if (!members.size) return null;

  const componentIds = [...members.keys()];
  let mainComponent = componentIds[0];
  componentIds.forEach((componentId) => {
    const size = members.get(componentId).length;
    const bestSize = members.get(mainComponent).length;
    if (size > bestSize) mainComponent = componentId;
  });

  const inLawComponents = new Set();
  componentIds.forEach((componentId) => {
    if (componentId === mainComponent) return;
    const linkedByMarriage = members.get(componentId).some((personId) =>
      [...(graph.partners.get(personId) || [])].some(
        (partnerId) => componentOf.get(partnerId) === mainComponent
      )
    );
    if (linkedByMarriage) inLawComponents.add(componentId);
  });

  const keep = new Set(members.get(mainComponent));

  componentIds.forEach((componentId) => {
    if (componentId === mainComponent) return;
    if (!inLawComponents.has(componentId)) {
      // A separate family with no marriage link is its own tree.
      members.get(componentId).forEach((personId) => keep.add(personId));
    }
  });

  // Spouse cards of kept people are shown, but their relatives are not.
  [...keep].forEach((personId) => {
    (graph.partners.get(personId) || new Set()).forEach((partnerId) => {
      keep.add(partnerId);
    });
  });

  return keep;
}

// The main tree follows one home person: their ancestors, every descendant
// of those ancestors (siblings, cousins, nieces and nephews) and the spouse
// cards of the bloodline. A spouse's own parents and siblings are an in-law
// branch and are only shown in that person's branch view.
function homeTreeKeep(homeId, people, families) {
  const graph = buildGraph(people, families);
  const parents = reverseEdges(graph.children);
  const ancestors = closure([homeId], parents);
  const bloodline = closure([...ancestors], graph.children);

  const keep = new Set([...ancestors, ...bloodline]);

  [...keep].forEach((personId) => {
    (graph.partners.get(personId) || new Set()).forEach((partnerId) => {
      keep.add(partnerId);
    });
  });

  // A family with no marriage link to the home person's component is its own
  // tree. In-law families of a spouse are not: they stay in that spouse's
  // branch view only.
  const { componentOf, members } = parentComponents(people, graph);
  const homeComponent = componentOf.get(homeId);

  members.forEach((personIds, componentId) => {
    if (componentId === homeComponent) return;
    const linkedByMarriage = personIds.some((personId) =>
      [...(graph.partners.get(personId) || new Set())].some(
        (partnerId) => componentOf.get(partnerId) === homeComponent
      )
    );
    if (linkedByMarriage) return;
    personIds.forEach((personId) => keep.add(personId));
  });

  return keep;
}

// A person's branch: their ancestors, their siblings with the siblings'
// whole families (nieces, nephews, ...), and their own descendants. Partners
// of those people are added as spouse cards, but nobody else's line is
// pulled in - that is what keeps the branch view different from the full tree.
function branchKeep(focusId, people, families) {
  const graph = buildGraph(people, families);
  const parents = new Map();

  graph.children.forEach((childrenIds, parentId) => {
    childrenIds.forEach((childId) => addEdge(parents, childId, parentId));
  });

  const keep = new Set([focusId]);

  closure([focusId], parents).forEach((personId) => keep.add(personId));
  closure([focusId], graph.children).forEach((personId) => keep.add(personId));

  // Siblings and their descendants: the other children of the focused
  // person's parents, with every niece, nephew and their families.
  const siblingSeeds = [];
  (parents.get(focusId) || new Set()).forEach((parentId) => {
    (graph.children.get(parentId) || new Set()).forEach((siblingId) => {
      if (siblingId === focusId) return;
      keep.add(siblingId);
      siblingSeeds.push(siblingId);
    });
  });
  closure(siblingSeeds, graph.children).forEach((personId) =>
    keep.add(personId)
  );

  [...keep].forEach((personId) => {
    (graph.partners.get(personId) || new Set()).forEach((partnerId) => {
      keep.add(partnerId);
    });
  });

  return keep;
}

function filterToKeep(list, marriages, keep) {
  const visiblePeople = list.filter((person) => keep.has(idOf(person.id)));
  const visibleFamilies = marriages
    .map((family) => ({
      ...family,
      husband: keep.has(idOf(family.husband)) ? family.husband : null,
      wife: keep.has(idOf(family.wife)) ? family.wife : null,
      children: (family.children || []).filter((childId) =>
        keep.has(idOf(childId))
      ),
    }))
    .filter((family) => family.husband || family.wife || family.children.length);

  return { people: visiblePeople, families: visibleFamilies };
}

// Returns the people and families that should be drawn for the current view.
// - focusId shows that person's own family branch (ancestors, siblings and
//   their own descendants) in a separate view.
// - collapsedFamilyIds hides the children of those marriages, with their
//   descendants and any partners who are only linked to hidden people.
export function viewPeople(people, families, options = {}) {
  const list = Array.isArray(people) ? people : [];
  const marriages = Array.isArray(families) ? families : [];
  const focusId = idOf(options.focusId);
  const homePersonId = idOf(options.homePersonId);
  const collapsed = new Set((options.collapsedFamilyIds || []).map(idOf));
  const all = new Set(list.map((person) => idOf(person.id)));

  let baseKeep;
  if (focusId && all.has(focusId)) {
    baseKeep = branchKeep(focusId, list, marriages);
  } else if (homePersonId && all.has(homePersonId)) {
    baseKeep = homeTreeKeep(homePersonId, list, marriages);
  } else {
    baseKeep = fullTreeKeep(list, marriages);
  }

  const graph = buildGraph(list, marriages);
  let keep = baseKeep || new Set(all);

  if (collapsed.size) {
    const seeds = [];
    marriages.forEach((family) => {
      if (!collapsed.has(idOf(family.id))) return;
      (family.children || []).map(idOf).forEach((childId) => seeds.push(childId));
    });

    const descendants = closure(seeds, graph.children);
    descendants.forEach((id) => keep.delete(id));

    descendants.forEach((id) => {
      (graph.partners.get(id) || new Set()).forEach((partnerId) => {
        if (descendants.has(partnerId)) return;
        const linkedToVisible = [...(graph.partners.get(partnerId) || [])].some(
          (other) => keep.has(other)
        );
        if (!linkedToVisible) keep.delete(partnerId);
      });
    });
  }

  return filterToKeep(list, marriages, keep);
}

// Whether a person has parents or siblings recorded, used to highlight the
// "show branch" button on their card.
export function branchFlags(people, families, personId) {
  const id = idOf(personId);
  const list = Array.isArray(people) ? people : [];
  const marriages = Array.isArray(families) ? families : [];
  const graph = buildGraph(list, marriages);

  const parents = new Set();
  const siblings = new Set();

  (graph.children.entries()).forEach(([parentId, descendants]) => {
    if (!descendants.has(id)) return;
    parents.add(parentId);
  });
  parents.forEach((parentId) => {
    (graph.children.get(parentId) || new Set()).forEach((childId) => {
      if (childId !== id) siblings.add(childId);
    });
  });

  return {
    hasParents: parents.size > 0,
    hasSiblings: siblings.size > 0,
    hasBranch: parents.size > 0 || siblings.size > 0,
  };
}

// Picks a sensible trunk for the main tree when the user has not chosen one:
// the youngest person with recorded parents, then the deepest generation.
export function defaultHomePersonId(people, families) {
  const list = Array.isArray(people) ? people : [];
  if (!list.length) return '';

  const graph = buildGraph(list, families || []);
  const parents = reverseEdges(graph.children);

  const depthOf = (id) => {
    let depth = 0;
    let current = id;
    const seen = new Set([id]);
    for (;;) {
      const next = [...(parents.get(current) || [])][0];
      if (!next || seen.has(next)) break;
      seen.add(next);
      depth += 1;
      current = next;
    }
    return depth;
  };

  const yearOf = (person) => {
    const match = String(person.birthDate || '').match(/\b(\d{4})\b/);
    return match ? Number(match[1]) : 0;
  };

  let best = null;

  list.forEach((person) => {
    const id = idOf(person.id);
    const candidate = {
      person,
      hasParents: (parents.get(id) || new Set()).size > 0,
      year: yearOf(person),
      depth: depthOf(id),
    };

    if (!best) {
      best = candidate;
      return;
    }

    if (candidate.hasParents !== best.hasParents) {
      if (candidate.hasParents) best = candidate;
      return;
    }

    if (candidate.year !== best.year) {
      if (candidate.year > best.year) best = candidate;
      return;
    }

    if (candidate.depth >= best.depth) best = candidate;
  });

  return best ? idOf(best.person.id) : '';
}
