import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PersonCard from './PersonCard';

export function buildScene(people, families, showFormerSpouses = true) {
  const byId = new Map(people.map((person) => [String(person.id), person]));
  const units = [];
  const personUnits = new Map(); // personId -> [unitIndex, ...]
  const familyUnitIndex = new Map(); // familyId -> unitIndex

  function addPersonToUnit(unitIndex, personId) {
    if (!personUnits.has(personId)) personUnits.set(personId, []);
    if (!personUnits.get(personId).includes(unitIndex)) {
      personUnits.get(personId).push(unitIndex);
    }
  }

  // 1. Create units from families
  if (Array.isArray(families) && families.length) {
    families.forEach((family) => {
      const members = [];
      if (family.husband && byId.has(String(family.husband))) {
        members.push(byId.get(String(family.husband)));
      }
      if (family.wife && byId.has(String(family.wife))) {
        members.push(byId.get(String(family.wife)));
      }
      // Avoid duplicate if husband === wife
      const uniqueMembers = [];
      const seen = new Set();
      members.forEach((m) => {
        if (seen.has(String(m.id))) return;
        seen.add(String(m.id));
        uniqueMembers.push(m);
      });

      if (uniqueMembers.length === 0) return;

      const status = family.status || 'current';
      const isFormer =
        status === 'former' ||
        uniqueMembers.some((m) => m.spouseStatus === 'former');

      // Ex-spouses can be hidden through the user preferences.
      if (isFormer && !showFormerSpouses) return;

      const unitIndex = units.length;
      familyUnitIndex.set(String(family.id), unitIndex);
      units.push({
        id: `family-${family.id}`,
        members: uniqueMembers,
        familyId: family.id,
        status: isFormer ? 'former' : 'current',
        marriageDate: family.marriageDate || '',
        divorceDate: family.divorceDate || '',
        children: family.children || [],
      });
      uniqueMembers.forEach((m) => addPersonToUnit(unitIndex, String(m.id)));
    });
  }

  // 2. Legacy spouseId-based units for people not in any family
  const peopleInFamilies = new Set();
  if (Array.isArray(families) && families.length) {
    families.forEach((f) => {
      if (f.husband) peopleInFamilies.add(String(f.husband));
      if (f.wife) peopleInFamilies.add(String(f.wife));
    });
  }

  people.forEach((person) => {
    const pid = String(person.id);
    if (personUnits.has(pid)) return; // already in a family unit
    if (peopleInFamilies.has(pid)) return; // covered

    // Legacy: if has spouseId, create couple unit
    if (person.spouseId && byId.has(String(person.spouseId))) {
      const spouse = byId.get(String(person.spouseId));
      if (String(spouse.spouseId || '') === pid) {
        // mutual — create unit if spouse not already in a unit with this person
        const alreadyPaired = units.some(
          (u) =>
            u.members.length === 2 &&
            u.members.some((m) => String(m.id) === pid) &&
            u.members.some((m) => String(m.id) === String(spouse.id))
        );
        const status =
          person.spouseStatus === 'former' || spouse.spouseStatus === 'former'
            ? 'former'
            : 'current';
        if (!alreadyPaired && (status !== 'former' || showFormerSpouses)) {
          const unitIndex = units.length;
          units.push({
            id: `legacy-${pid}`,
            members: [person, spouse],
            familyId: null,
            status,
            marriageDate: '',
            divorceDate: '',
            children: [],
          });
          addPersonToUnit(unitIndex, pid);
          addPersonToUnit(unitIndex, String(spouse.id));
        }
        return;
      }
    }

    // Single-person unit
    const unitIndex = units.length;
    units.push({
      id: `single-${pid}`,
      members: [person],
      familyId: null,
      status: 'current',
      marriageDate: '',
      divorceDate: '',
      children: [],
    });
    addPersonToUnit(unitIndex, pid);
  });

  // 3. Attach children to parent units
  // For each family, its children's units get this family's unit as parent
  if (Array.isArray(families) && families.length) {
    families.forEach((family) => {
      const parentUnitIndex = familyUnitIndex.get(String(family.id));
      if (parentUnitIndex == null) return;
      (family.children || []).forEach((childId) => {
        const childUnits = personUnits.get(String(childId));
        if (!childUnits) return;
        childUnits.forEach((cu) => {
          if (!units[cu].parentUnits) units[cu].parentUnits = new Set();
          units[cu].parentUnits.add(parentUnitIndex);
        });
      });
    });
  }

  // Legacy: children linked via parentId
  people.forEach((person) => {
    if (!person.parentId) return;
    const parentPerson = byId.get(String(person.parentId));
    if (!parentPerson) return;
    const parentUnits = personUnits.get(String(person.parentId));
    if (!parentUnits) return;
    const childUnits = personUnits.get(String(person.id));
    if (!childUnits) return;
    parentUnits.forEach((pu) => {
      childUnits.forEach((cu) => {
        if (pu === cu) return;
        if (!units[cu].parentUnits) units[cu].parentUnits = new Set();
        units[cu].parentUnits.add(pu);
      });
    });
  });

  // 4. Handle secondParentId (legacy)
  people.forEach((person) => {
    if (!person.secondParentId) return;
    const parentUnits = personUnits.get(String(person.secondParentId));
    if (!parentUnits) return;
    const childUnits = personUnits.get(String(person.id));
    if (!childUnits) return;
    parentUnits.forEach((pu) => {
      childUnits.forEach((cu) => {
        if (pu === cu) return;
        if (!units[cu].parentUnits) units[cu].parentUnits = new Set();
        units[cu].parentUnits.add(pu);
      });
    });
  });

  // Spouse / ex-spouse links: a card without parent cards that belongs to a
  // marriage (current or former) is placed in the generation of its spouse or
  // ex-spouse instead of always falling back to the root generation.
  const unitPartners = units.map(() => new Set());

  people.forEach((person) => {
    const pid = String(person.id);
    const spouseId = person.spouseId ? String(person.spouseId) : null;
    if (!spouseId) return;

    const spouse = byId.get(spouseId);
    if (!spouse) return;

    const ownUnits = personUnits.get(pid) || [];
    const partnerUnits = personUnits.get(String(spouse.id)) || [];
    partnerUnits.forEach((partnerUnitIndex) => {
      ownUnits.forEach((ownUnitIndex) => {
        // Couple members sharing one unit are already in the same generation.
        if (ownUnitIndex === partnerUnitIndex) return;
        unitPartners[ownUnitIndex].add(partnerUnitIndex);
      });
    });
  });

  // 5. Compute depths
  const unitParents = units.map((u) => [...(u.parentUnits || [])]);
  const depths = new Array(units.length).fill(0);
  const resolved = new Array(units.length).fill(false);
  const visiting = new Set();

  function resolveDepth(unitIndex) {
    if (resolved[unitIndex]) return depths[unitIndex];
    if (visiting.has(unitIndex)) return 0;
    visiting.add(unitIndex);
    let depth = 0;
    for (const parentIndex of unitParents[unitIndex]) {
      depth = Math.max(depth, resolveDepth(parentIndex) + 1);
    }
    for (const partnerIndex of unitPartners[unitIndex]) {
      depth = Math.max(depth, resolveDepth(partnerIndex));
    }
    visiting.delete(unitIndex);
    resolved[unitIndex] = true;
    depths[unitIndex] = depth;
    return depth;
  }

  units.forEach((_u, i) => resolveDepth(i));

  // 6. Build rows
  const maxDepth = depths.reduce((m, d) => Math.max(m, d), 0);
  const rows = Array.from({ length: maxDepth + 1 }, () => []);
  units.forEach((_u, i) => rows[depths[i]].push(i));

  // 7. Sort rows
  const labelOf = (unitIndex) =>
    units[unitIndex].members
      .map((m) => `${m.firstName} ${m.lastName}`.trim())
      .join(' & ');

  const orderInRow = new Map();
  rows.forEach((row) => {
    const avgParentOrder = (unitIndex) => {
      const orders = unitParents[unitIndex]
        .map((p) => orderInRow.get(p))
        .filter((o) => o != null);
      if (!orders.length) return Number.POSITIVE_INFINITY;
      return orders.reduce((t, o) => t + o, 0) / orders.length;
    };
    row.sort((a, b) => {
      const ao = avgParentOrder(a);
      const bo = avgParentOrder(b);
      if (ao !== bo) {
        if (ao === Number.POSITIVE_INFINITY) return 1;
        if (bo === Number.POSITIVE_INFINITY) return -1;
        return ao - bo;
      }
      return labelOf(a).localeCompare(labelOf(b));
    });
    row.forEach((ui, order) => orderInRow.set(ui, order));
  });

  return { units, rows, depths };
}

export default function SpouseTreeComponent({
  families = [],
  onAddChild,
  onAddSpouse,
  onDelete,
  onEdit,
  onView,
  people,
  showFormerSpouses = true,
  suppressClickRef,
  zoom = 1,
}) {
  const scene = useMemo(
    () => buildScene(people, families, showFormerSpouses),
    [people, families, showFormerSpouses]
  );

  const containerRef = useRef(null);
  const cardRefs = useRef(new Map());
  const cardRefCallbacks = useRef(new Map());
  const heartRefs = useRef(new Map());
  const [edges, setEdges] = useState([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const setHeartRef = useCallback((key, node) => {
    if (node) heartRefs.current.set(key, node);
    else heartRefs.current.delete(key);
  }, []);

  const registerCard = useCallback((personId, node) => {
    const key = String(personId);
    if (node) cardRefs.current.set(key, node);
    else cardRefs.current.delete(key);
  }, []);

  const getCardRef = useCallback(
    (personId) => {
      const key = String(personId);
      if (!cardRefCallbacks.current.has(key)) {
        cardRefCallbacks.current.set(key, (node) => registerCard(key, node));
      }
      return cardRefCallbacks.current.get(key);
    },
    [registerCard]
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scale = zoom || 1;
    const containerRect = container.getBoundingClientRect();
    const nextEdges = [];

    scene.units.forEach((unit, childUnitIndex) => {
      const childUnit = scene.units[childUnitIndex];
      const parentUnitIndices = childUnit.parentUnits || [];

      parentUnitIndices.forEach((parentIndex) => {
        const parentUnit = scene.units[parentIndex];
        const parentNodes = parentUnit.members
          .map((m) => cardRefs.current.get(String(m.id)))
          .filter(Boolean);
        const childNodes = childUnit.members
          .map((m) => cardRefs.current.get(String(m.id)))
          .filter(Boolean);
        if (!parentNodes.length || !childNodes.length) return;

        const childNode = childNodes[0];
        const childRect = childNode.getBoundingClientRect();
        const endX =
          (childRect.left - containerRect.left + childRect.width / 2) / scale;
        const endY = (childRect.top - containerRect.top) / scale;

        const parentNode = parentNodes[0];
        const parentRect = parentNode.getBoundingClientRect();
        const startX =
          (parentRect.left - containerRect.left + parentRect.width / 2) / scale;
        const startY = (parentRect.bottom - containerRect.top) / scale;

        // Couple units connect through the heart between the spouses;
        // single cards connect straight from the card itself. The connector
        // starts at the child card and extends upwards before running to the
        // parent side - a single clean line, no extra segments.
        let junctionX = startX;
        let junctionY = startY;
        if (parentUnit.members.length > 1) {
          const heartNode = heartRefs.current.get(`heart-${parentUnit.id}`);
          if (heartNode) {
            const heartRect = heartNode.getBoundingClientRect();
            junctionX = (heartRect.left - containerRect.left + heartRect.width / 2) / scale;
            junctionY = (heartRect.bottom - containerRect.top) / scale;
          }
        }

        let path = `M ${endX} ${endY} V ${junctionY}`;
        if (endX !== junctionX) path += ` H ${junctionX}`;

        nextEdges.push({
          id: `edge-${parentIndex}-${childUnitIndex}`,
          path,
        });
      });
    });

    setEdges(nextEdges);
    setSize({ width: container.scrollWidth, height: container.scrollHeight });
  }, [scene, zoom]);

  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    cardRefs.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const handleResize = () => measure();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measure]);

  return (
    <div className="spouse-tree" ref={containerRef} role="list">
      <svg
        aria-hidden="true"
        className="spouse-edges"
        height={size.height}
        width={size.width}
      >
        {edges.map((edge) => (
          <path d={edge.path} key={edge.id} />
        ))}
      </svg>

      {scene.rows.map((row, depth) => (
        <div className="spouse-generation" key={`generation-${depth}`} role="presentation">
          {row.map((unitIndex) => {
            const unit = scene.units[unitIndex];
            return (
              <div
                className={`spouse-unit${unit.members.length > 1 ? ' is-couple' : ''}`}
                key={unit.id}
                role="listitem"
              >
                {unit.members.map((member, memberIndex) => (
                  <Fragment key={member.id}>
                    {memberIndex > 0 && (
                      <span className="spouse-link" aria-hidden="true">
                        <span
                          className="spouse-link-heart"
                          ref={(node) => setHeartRef(`heart-${unit.id}`, node)}
                        >
                          {unit.status === 'former' ? '💔' : '♥'}
                        </span>
                      </span>
                    )}
                    <PersonCard
                      cardRef={getCardRef(member.id)}
                      onAddChild={onAddChild}
                      onAddSpouse={onAddSpouse}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onView={onView}
                      person={member}
                      showSpouseName={false}
                      spouseStatus={unit.status}
                      suppressClickRef={suppressClickRef}
                    />
                  </Fragment>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
