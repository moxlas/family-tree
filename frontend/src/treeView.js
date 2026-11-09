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

// Returns the people and families that should be drawn for the current view.
// - collapsedFamilyIds hides the children of those marriages, with their
//   descendants and any partners who are only linked to hidden people.
// - focusId keeps only that person, their partners and their descendants.
export function viewPeople(people, families, options = {}) {
  const list = Array.isArray(people) ? people : [];
  const marriages = Array.isArray(families) ? families : [];
  const focusId = idOf(options.focusId);
  const collapsed = new Set((options.collapsedFamilyIds || []).map(idOf));
  const all = new Set(list.map((person) => idOf(person.id)));
  const graph = buildGraph(list, marriages);

  let keep;

  if (focusId && all.has(focusId)) {
    keep = closure([focusId], graph.children);
    let changed = true;
    while (changed) {
      changed = false;
      const additions = [];
      for (const id of keep) {
        for (const partnerId of graph.partners.get(id) || []) {
          additions.push(partnerId);
        }
      }
      for (const id of closure([...keep], graph.children)) {
        additions.push(id);
      }
      for (const id of additions) {
        if (!keep.has(id)) {
          keep.add(id);
          changed = true;
        }
      }
    }
  } else {
    const hidden = new Set();

    if (collapsed.size) {
      const seeds = [];
      marriages.forEach((family) => {
        if (!collapsed.has(idOf(family.id))) return;
        (family.children || []).map(idOf).forEach((childId) => seeds.push(childId));
      });

      const descendants = closure(seeds, graph.children);
      descendants.forEach((id) => hidden.add(id));

      descendants.forEach((id) => {
        (graph.partners.get(id) || new Set()).forEach((partnerId) => {
          if (descendants.has(partnerId)) return;
          const linkedToVisible = [...(graph.partners.get(partnerId) || [])].some(
            (other) => !descendants.has(other)
          );
          if (!linkedToVisible) hidden.add(partnerId);
        });
      });
    }

    keep = new Set([...all].filter((id) => !hidden.has(id)));
  }

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
