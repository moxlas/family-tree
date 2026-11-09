import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useI18n } from '../i18n';
import PersonCard from './PersonCard';

function buildScene(people, families) {
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

      const unitIndex = units.length;
      familyUnitIndex.set(String(family.id), unitIndex);
      units.push({
        id: `family-${family.id}`,
        members: uniqueMembers,
        familyId: family.id,
        status: family.status || 'current',
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
        if (!alreadyPaired) {
          const unitIndex = units.length;
          units.push({
            id: `legacy-${pid}`,
            members: [person, spouse],
            familyId: null,
            status: person.spouseStatus || 'current',
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
  suppressClickRef,
  zoom = 1,
}) {
  const { t } = useI18n();
  const scene = useMemo(() => buildScene(people, families), [people, families]);

  const containerRef = useRef(null);
  const cardRefs = useRef(new Map());
  const cardRefCallbacks = useRef(new Map());
  const [edges, setEdges] = useState([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

    scene.units.forEach((unit, unitIndex) => {
      // Draw edges from this unit to its child units
      // Find child units whose parentUnits include this unit
    });

    // Draw parent-child edges
    people.forEach((person) => {
      // For each person, if they have a parentId, draw edge from parent unit to person's unit
    });

    // Simpler: iterate units, for each unit with parentUnits, draw edges from each parent unit's cards to this unit's cards
    scene.units.forEach((unit, childUnitIndex) => {
      const parentUnitIndices = scene.units[childUnitIndex].parentUnits
        ? [...scene.units[childUnitIndex].parentUnits]
        : [];
      // parentUnits stored on unit during build; but we stored on units[cu].parentUnits. Let's recompute.
    });

    // Actually, let's recompute parent relationships from the scene
    // We stored parentUnits on units during buildScene. Access via scene.units[i].parentUnits
    scene.units.forEach((childUnit, childIndex) => {
      const parents = childUnit.parentUnits ? [...childUnit.parentUnits] : [];
      parents.forEach((parentIndex) => {
        const parentUnit = scene.units[parentIndex];
        const childUnit = scene.units[childIndex];
        if (!parentUnit || !childUnit) return;

        // Draw a line from each parent card to each child card? 
        // For combined: horizontal bar between parents, vertical to child
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

        if (parentNodes.length >= 2) {
          const rects = parentNodes.map((n) => n.getBoundingClientRect());
          const xs = rects.map(
            (r) => (r.left - containerRect.left + r.width / 2) / scale
          );
          const ys = rects.map(
            (r) => (r.bottom - containerRect.top) / scale
          );
          const x1 = xs[0];
          const x2 = xs[xs.length - 1];
          const yBar = Math.max(...ys);
          const midX = (x1 + x2) / 2;
          nextEdges.push({
            id: `unit-${parentIndex}-${childIndex}`,
            path: `M ${x1} ${yBar} H ${x2} M ${midX} ${yBar} V ${endY} H ${endX}`,
          });
        } else {
          const parentRect = parentNodes[0].getBoundingClientRect();
          const startX =
            (parentRect.left - containerRect.left + parentRect.width / 2) / scale;
          const startY = (parentRect.bottom - containerRect.top) / scale;
          const middleY = startY + Math.max(16, (endY - startY) / 2);
          nextEdges.push({
            id: `unit-${parentIndex}-${childIndex}`,
            path: `M ${startX} ${startY} V ${middleY} H ${endX} V ${endY}`,
          });
        }
      });
    });

    setEdges(nextEdges);
    setSize({ width: container.scrollWidth, height: container.scrollHeight });
  }, [people, families, scene, zoom]);

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
                        <span className="spouse-link-heart">
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
