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

function buildScene(people) {
  const byId = new Map(people.map((person) => [String(person.id), person]));
  const unitByPerson = new Map();
  const units = [];
  const seen = new Set();

  for (const person of people) {
    const personId = String(person.id);
    if (seen.has(personId)) continue;

    let partner = null;
    if (person.spouseId) {
      const candidate = byId.get(String(person.spouseId));
      if (
        candidate &&
        String(candidate.id) !== personId &&
        !seen.has(String(candidate.id))
      ) {
        const candidateSpouse = candidate.spouseId
          ? String(candidate.spouseId)
          : null;
        if (!candidateSpouse || candidateSpouse === personId) {
          partner = candidate;
        }
      }
    }

    const members = partner ? [person, partner] : [person];
    const unitIndex = units.length;

    members.forEach((member) => {
      seen.add(String(member.id));
      unitByPerson.set(String(member.id), unitIndex);
    });

    units.push({ id: `unit-${personId}`, members });
  }

  const unitParents = units.map((unit, unitIndex) => {
    const parents = new Set();

    unit.members.forEach((member) => {
      const parentId = member.parentId ? String(member.parentId) : null;
      if (!parentId) return;
      const parentUnit = unitByPerson.get(parentId);
      if (parentUnit == null || parentUnit === unitIndex) return;
      parents.add(parentUnit);
    });

    return [...parents];
  });

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

  units.forEach((_unit, unitIndex) => resolveDepth(unitIndex));

  const maxDepth = depths.reduce((max, depth) => Math.max(max, depth), 0);
  const rows = Array.from({ length: maxDepth + 1 }, () => []);
  units.forEach((_unit, unitIndex) => rows[depths[unitIndex]].push(unitIndex));

  const labelOf = (unitIndex) =>
    units[unitIndex].members
      .map((member) => `${member.firstName} ${member.lastName}`.trim())
      .join(' & ');

  const orderInRow = new Map();

  rows.forEach((row) => {
    const averageParentOrder = (unitIndex) => {
      const orders = unitParents[unitIndex]
        .map((parentIndex) => orderInRow.get(parentIndex))
        .filter((order) => order != null);

      if (!orders.length) return Number.POSITIVE_INFINITY;
      return orders.reduce((total, order) => total + order, 0) / orders.length;
    };

    row.sort((first, second) => {
      const firstOrder = averageParentOrder(first);
      const secondOrder = averageParentOrder(second);

      if (firstOrder !== secondOrder) {
        if (firstOrder === Number.POSITIVE_INFINITY) return 1;
        if (secondOrder === Number.POSITIVE_INFINITY) return -1;
        return firstOrder - secondOrder;
      }

      return labelOf(first).localeCompare(labelOf(second));
    });

    row.forEach((unitIndex, order) => orderInRow.set(unitIndex, order));
  });

  return { units, rows };
}

export default function SpouseTreeComponent({
  onAddChild,
  onAddSpouse,
  onDelete,
  onEdit,
  onView,
  people,
  suppressClickRef,
}) {
  const { t } = useI18n();
  const scene = useMemo(() => buildScene(people), [people]);
  const containerRef = useRef(null);
  const cardRefs = useRef(new Map());
  const cardRefCallbacks = useRef(new Map());
  const [edges, setEdges] = useState([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const registerCard = useCallback((personId, node) => {
    const key = String(personId);
    if (node) {
      cardRefs.current.set(key, node);
    } else {
      cardRefs.current.delete(key);
    }
  }, []);

  const getCardRef = useCallback(
    (personId) => {
      const key = String(personId);
      if (!cardRefCallbacks.current.has(key)) {
        cardRefCallbacks.current.set(key, (node) =>
          registerCard(key, node)
        );
      }
      return cardRefCallbacks.current.get(key);
    },
    [registerCard]
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const nextEdges = [];

    people.forEach((person) => {
      if (!person.parentId) return;

      const parentNode = cardRefs.current.get(String(person.parentId));
      const childNode = cardRefs.current.get(String(person.id));
      if (!parentNode || !childNode) return;

      const parentRect = parentNode.getBoundingClientRect();
      const childRect = childNode.getBoundingClientRect();
      const startX =
        parentRect.left - containerRect.left + parentRect.width / 2;
      const startY = parentRect.bottom - containerRect.top;
      const endX = childRect.left - containerRect.left + childRect.width / 2;
      const endY = childRect.top - containerRect.top;
      const middleY = startY + Math.max(16, (endY - startY) / 2);

      nextEdges.push({
        id: `${String(person.parentId)}-${String(person.id)}`,
        path: `M ${startX} ${startY} V ${middleY} H ${endX} V ${endY}`,
      });
    });

    setEdges(nextEdges);
    setSize({
      width: container.scrollWidth,
      height: container.scrollHeight,
    });
  }, [people]);

  useLayoutEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

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
    <div
      aria-label={t('tree.heading')}
      className="spouse-tree"
      ref={containerRef}
      role="list"
    >
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
        <div
          className="spouse-generation"
          key={`generation-${depth}`}
          role="presentation"
        >
          {row.map((unitIndex) => {
            const unit = scene.units[unitIndex];

            return (
              <div
                className={`spouse-unit${
                  unit.members.length > 1 ? ' is-couple' : ''
                }`}
                key={unit.id}
                role="listitem"
              >
                {unit.members.map((member, memberIndex) => (
                  <Fragment key={member.id}>
                    {memberIndex > 0 && (
                      <span className="spouse-link" aria-hidden="true">
                        <span className="spouse-link-heart">♥</span>
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
