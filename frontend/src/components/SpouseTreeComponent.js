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

function pairKeyOf(firstId, secondId) {
  const first = String(firstId);
  const second = String(secondId);
  return first < second ? `${first}\u0000${second}` : `${second}\u0000${first}`;
}

// When the marriages in a group form a simple chain (A - B - C - D), return
// the people in chain order so every marriage sits between neighbours and
// its heart is drawn beside the card. Returns null for any other shape.
function pathOrderFor(ids, relationships) {
  if (ids.length < 3 || relationships.length !== ids.length - 1) return null;

  const adjacent = new Map(ids.map((id) => [id, []]));
  relationships.forEach((relationship) => {
    adjacent.get(relationship.firstId)?.push(relationship.secondId);
    adjacent.get(relationship.secondId)?.push(relationship.firstId);
  });

  if ([...adjacent.values()].some((links) => links.length > 2)) return null;

  const endpoints = ids.filter((id) => adjacent.get(id).length === 1);
  if (endpoints.length !== 2) return null;

  // Start from the endpoint whose only marriage is a former one, so the
  // ex-spouse is drawn on the left and the current partner on the right.
  const endpointStatus = (id) =>
    relationships.find(
      (relationship) => relationship.firstId === id || relationship.secondId === id
    )?.status;
  const start =
    endpointStatus(endpoints[1]) === 'former' && endpointStatus(endpoints[0]) !== 'former'
      ? endpoints[1]
      : endpoints[0];

  const walk = [start];
  let previous = null;
  let current = start;
  while (walk.length < ids.length) {
    const next = adjacent
      .get(current)
      .find((candidate) => candidate !== previous && !walk.includes(candidate));
    if (!next) return null;
    walk.push(next);
    previous = current;
    current = next;
  }
  return walk;
}

// One icon for both marriage states so solid and broken hearts share the
// same size, outline and weight. Broken hearts get a crack and a white fill.
export function HeartIcon({ broken = false }) {
  return (
    <svg
      className={`heart-icon${broken ? ' is-broken' : ''}`}
      height="13"
      viewBox="0 0 24 24"
      width="13"
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-7.8-4.7-9.6-9.4C1.2 7.9 3.2 4.8 6.4 4.8c2.1 0 3.7 1.2 4.6 2.8.9-1.6 2.5-2.8 4.6-2.8 3.2 0 5.2 3.1 4 6.3-1.8 4.7-9.6 9.4-9.6 9.4z"
        fill={broken ? '#fff' : 'currentColor'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      {broken && (
        <path
          d="M12.6 7.4 10.6 11.6 13.4 12.8 11.2 17.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
}

function yearFromDate(value) {
  const match = String(value == null ? '' : value).match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : 0;
}

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

  function relationshipInfoForLinkedParent(parentUnitIndex, linkedParentId) {
    const parentUnit = units[parentUnitIndex];
    const relationship = parentUnit?.relationships?.find(
      (entry) =>
        String(entry.firstId) === String(linkedParentId) ||
        String(entry.secondId) === String(linkedParentId)
    );
    if (relationship) return relationship;
    return {
      relationshipStatus: byId.get(String(linkedParentId))?.spouseStatus === 'former'
        ? 'former'
        : 'current',
    };
  }

  function linkChildToUnit(
    parentUnitIndex,
    childPersonId,
    linkedParentId,
    relationshipStatus = 'current',
    relationshipContext = null
  ) {
    const childUnitIndexes = personUnits.get(String(childPersonId));
    if (!childUnitIndexes) return;

    childUnitIndexes.forEach((childUnitIndex) => {
      if (childUnitIndex === parentUnitIndex) return;
      if (!units[childUnitIndex].parentLinks) {
        units[childUnitIndex].parentLinks = new Map();
      }
      if (!units[childUnitIndex].parentLinks.has(parentUnitIndex)) {
        units[childUnitIndex].parentLinks.set(parentUnitIndex, {
          childId: String(childPersonId),
          parentId: linkedParentId ? String(linkedParentId) : null,
          relationshipStatus,
          relationshipContext,
        });
      }
    });
  }

  // 1. Create units from families.
  // Families that share a spouse belong to one visual unit: the shared
  // person's card must not be duplicated when they have several spouses.
  const familyRecords = [];
  const memberSequence = [];
  const relationCountById = new Map();
  const relationshipByPair = new Map();
  const relationshipCountByPerson = new Map();

  function incrementRelationshipCount(personId) {
    const id = String(personId);
    relationshipCountByPerson.set(id, (relationshipCountByPerson.get(id) || 0) + 1);
  }

  const findRoot = (personId) => {
    let current = String(personId);
    if (!relationCountById.has(current)) relationCountById.set(current, current);

    let root = current;
    while (relationCountById.get(root) !== root) {
      root = relationCountById.get(root);
    }

    while (relationCountById.get(current) !== root) {
      const next = relationCountById.get(current);
      relationCountById.set(current, root);
      current = next;
    }
    return root;
  };

  const unionMembers = (firstId, secondId) => {
    const firstRoot = findRoot(firstId);
    const secondRoot = findRoot(secondId);
    if (firstRoot !== secondRoot) relationCountById.set(firstRoot, secondRoot);
    incrementRelationshipCount(secondId);
  };

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
      members.forEach((member) => {
        if (seen.has(String(member.id))) return;
        seen.add(String(member.id));
        uniqueMembers.push(member);
      });

      if (uniqueMembers.length === 0) return;

      const status = family.status || 'current';
      const isFormer =
        status === 'former' ||
        uniqueMembers.some((member) => member.spouseStatus === 'former');

      // Ex-spouses can be hidden through the user preferences.
      if (isFormer && !showFormerSpouses) return;

      familyRecords.push({
        family,
        members: uniqueMembers,
        status: isFormer ? 'former' : 'current',
        children: family.children || [],
      });

      uniqueMembers.forEach((member) => {
        const id = String(member.id);
        findRoot(id);
        if (!memberSequence.includes(id)) memberSequence.push(id);
      });

      if (uniqueMembers.length > 1) {
        const firstId = String(uniqueMembers[0].id);
        const secondId = String(uniqueMembers[1].id);
        unionMembers(firstId, secondId);
        incrementRelationshipCount(firstId);
        relationshipByPair.set(pairKeyOf(firstId, secondId), {
          familyId: family.id,
          firstId,
          secondId,
          status: isFormer ? 'former' : 'current',
          marriageDate: family.marriageDate || '',
          divorceDate: family.divorceDate || '',
        });
      }
    });
  }

  // A person can only have one current spouse. GEDCOM exports often list
  // several FAM records without divorce events; keep the newest marriage
  // current and treat the older ones as previous partnerships so their
  // broken-heart connections are shown.
  const recordIndex = new Map(
    familyRecords.map((record, index) => [record, index])
  );
  const newestCurrentByPerson = new Map();

  const isNewerCurrentMarriage = (candidate, current) => {
    const candidateYear = yearFromDate(candidate.family.marriageDate);
    const currentYear = yearFromDate(current.family.marriageDate);
    if (candidateYear !== currentYear) return candidateYear > currentYear;
    return recordIndex.get(candidate) > recordIndex.get(current);
  };

  familyRecords.forEach((record) => {
    if (record.status !== 'current') return;
    [record.family.husband, record.family.wife].forEach((personKey) => {
      if (!personKey) return;
      const id = String(personKey);
      const best = newestCurrentByPerson.get(id);
      if (!best || isNewerCurrentMarriage(record, best)) {
        newestCurrentByPerson.set(id, record);
      }
    });
  });

  familyRecords.forEach((record) => {
    if (record.status !== 'current') return;
    const husbandKey = record.family.husband
      ? String(record.family.husband)
      : null;
    const wifeKey = record.family.wife ? String(record.family.wife) : null;
    const newestForHusband =
      !husbandKey || newestCurrentByPerson.get(husbandKey) === record;
    const newestForWife =
      !wifeKey || newestCurrentByPerson.get(wifeKey) === record;
    if (newestForHusband && newestForWife) return;

    record.status = 'former';
    const relationship = relationshipByPair.get(
      pairKeyOf(husbandKey || '', wifeKey || '')
    );
    if (relationship) relationship.status = 'former';
  });

  const familyGroups = new Map();
  memberSequence.forEach((personId) => {
    const root = findRoot(personId);
    if (!familyGroups.has(root)) familyGroups.set(root, []);
    familyGroups.get(root).push(personId);
  });

  const familyGroupIndex = new Map();

  familyGroups.forEach((personIds) => {
    const relatedFamilyRecords = familyRecords.filter((record) =>
      record.members.some((member) => personIds.includes(String(member.id)))
    );
    const relationships = relatedFamilyRecords.map((record) => {
      const firstId = String(record.members[0].id);
      const secondId = String(record.members[1].id);
      return {
        familyId: record.family.id,
        firstId,
        secondId,
        status: record.status,
        marriageDate: record.family.marriageDate || '',
        divorceDate: record.family.divorceDate || '',
      };
    });

    // Put the most-connected person between all spouses so no card is
    // repeated: one spouse goes to the left and the rest to the right.
    const anchorPersonId = personIds.reduce((bestId, personId) => {
      const bestCount = relationshipCountByPerson.get(bestId) || 0;
      const currentCount = relationshipCountByPerson.get(personId) || 0;
      return currentCount > bestCount ? personId : bestId;
    }, personIds[0]);
    const anchorSpouseIds = relationships.reduce((spouseIds, relationship) => {
      const otherId =
        relationship.firstId === anchorPersonId
          ? relationship.secondId
          : relationship.secondId === anchorPersonId
            ? relationship.firstId
            : null;
      if (otherId && !spouseIds.includes(otherId)) spouseIds.push(otherId);
      return spouseIds;
    }, []);
    const otherPersonIds = personIds.filter(
      (personId) => personId !== anchorPersonId && !anchorSpouseIds.includes(personId)
    );
    const statusWithAnchor = (partnerId) => {
      const relationship = relationships.find(
        (entry) =>
          (entry.firstId === anchorPersonId && entry.secondId === partnerId) ||
          (entry.secondId === anchorPersonId && entry.firstId === partnerId)
      );
      return relationship ? relationship.status : 'current';
    };
    const formerAnchorIds = anchorSpouseIds.filter(
      (partnerId) => statusWithAnchor(partnerId) === 'former'
    );
    const currentAnchorIds = anchorSpouseIds.filter(
      (partnerId) => statusWithAnchor(partnerId) !== 'former'
    );
    // Former partners sit on the left, the current partner on the right.
    const chainOrder = pathOrderFor(personIds, relationships);
    const orderedPersonIds =
      chainOrder ||
      (personIds.length > 2
        ? [
            ...formerAnchorIds,
            anchorPersonId,
            ...currentAnchorIds,
            ...otherPersonIds,
          ]
        : personIds);
    const members = orderedPersonIds
      .map((personId) => byId.get(personId))
      .filter(Boolean);

    const children = [...new Set(relatedFamilyRecords.flatMap((record) => record.children))];
    const unitIndex = units.length;
    const unitId = `family-group-${orderedPersonIds.join('-')}`;

    relatedFamilyRecords.forEach((record) => {
      familyUnitIndex.set(String(record.family.id), unitIndex);
      familyGroupIndex.set(String(record.family.id), personIds[0]);
    });

    units.push({
      id: unitId,
      members,
      familyIds: relatedFamilyRecords.map((record) => record.family.id),
      familyId: relatedFamilyRecords[0]?.family.id || null,
      relationships,
      relationshipByPair: new Map(
        relationships.map((relationship) => [
          pairKeyOf(relationship.firstId, relationship.secondId),
          relationship,
        ])
      ),
      status: relatedFamilyRecords.some((record) => record.status === 'current')
        ? 'current'
        : 'former',
      marriageDate: relatedFamilyRecords[0]?.family.marriageDate || '',
      divorceDate: relatedFamilyRecords[0]?.family.divorceDate || '',
      children,
    });
    personIds.forEach((personId) => addPersonToUnit(unitIndex, personId));
  });

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
            u.members.some((m) => String(m.id) === pid) &&
            u.members.some((m) => String(m.id) === String(spouse.id))
        );
        const spouseAlreadyPlaced = (personUnits.get(String(spouse.id)) || []).length > 0;
        const status =
          person.spouseStatus === 'former' || spouse.spouseStatus === 'former'
            ? 'former'
            : 'current';
        if (
          !alreadyPaired &&
          !spouseAlreadyPlaced &&
          (status !== 'former' || showFormerSpouses)
        ) {
          const relationship = {
            familyId: null,
            firstId: pid,
            secondId: String(spouse.id),
            status,
            marriageDate: '',
            divorceDate: '',
          };
          const unitIndex = units.length;
          units.push({
            id: `legacy-${pid}`,
            members: [person, spouse],
            familyId: null,
            familyIds: [],
            relationships: [relationship],
            relationshipByPair: new Map([
              [pairKeyOf(pid, String(spouse.id)), relationship],
            ]),
            status,
            marriageDate: '',
            divorceDate: '',
            children: [],
          });
          addPersonToUnit(unitIndex, pid);
          addPersonToUnit(unitIndex, String(spouse.id));
          return;
        }

        if (alreadyPaired) return;

        if (!spouseAlreadyPlaced) return;
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

        const childPerson = byId.get(String(childId));
        const parentCandidates = [family.husband, family.wife]
          .filter(Boolean)
          .map(String);
        const linkedParentId =
          parentCandidates.find(
            (parentId) => byId.get(parentId)?.gender === childPerson?.gender
          ) || parentCandidates[0] || null;
        const familyRelationship =
          family.husband && family.wife
            ? relationshipByPair.get(pairKeyOf(family.husband, family.wife))
            : null;
        const relationshipStatus =
          familyRelationship?.status ||
          ((family.status === 'former' ||
            parentCandidates.some((parentId) => byId.get(parentId)?.spouseStatus === 'former'))
            ? 'former'
            : 'current');

        childUnits.forEach((cu) => {
          if (!units[cu].parentUnits) units[cu].parentUnits = new Set();
          units[cu].parentUnits.add(parentUnitIndex);
          linkChildToUnit(
            parentUnitIndex,
            childId,
            linkedParentId,
            relationshipStatus,
            familyRelationship
          );
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
        const relationshipInfo = relationshipInfoForLinkedParent(
          pu,
          person.parentId
        );
        linkChildToUnit(
          pu,
          person.id,
          person.parentId,
          relationshipInfo.relationshipStatus,
          relationshipInfo
        );
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
        const relationshipInfo = relationshipInfoForLinkedParent(
          pu,
          person.secondParentId
        );
        linkChildToUnit(
          pu,
          person.id,
          person.secondParentId,
          relationshipInfo.relationshipStatus,
          relationshipInfo
        );
      });
    });
  });


  // Place the descendant in the spouse pair at the same side as the
  // linked parent where possible. This keeps the child card nearest the
  // parent connection and avoids connectors targeting a spouse first.
  units.forEach((childUnit) => {
    if (!childUnit.parentUnits?.size || childUnit.members.length < 2) return;

    const parentUnitIndex = [...childUnit.parentUnits][0];
    const parentUnit = units[parentUnitIndex];
    const parentLink = childUnit.parentLinks?.get(parentUnitIndex);
    if (!parentUnit || !parentLink?.childId) return;

    const childPosition = childUnit.members.findIndex(
      (member) => String(member.id) === parentLink.childId
    );
    if (childPosition < 0) return;

    const parentPosition = parentUnit.members.findIndex(
      (member) => String(member.id) === parentLink.parentId
    );
    const targetPosition = Math.min(
      parentPosition >= 0 ? parentPosition : 0,
      childUnit.members.length - 1
    );
    if (targetPosition === childPosition) return;

    const reorderedMembers = [...childUnit.members];
    const [childMember] = reorderedMembers.splice(childPosition, 1);
    reorderedMembers.splice(targetPosition, 0, childMember);
    childUnit.members = reorderedMembers;
  });

  // Spouse / ex-spouse links keep a card without parent cards in the
  // generation of its spouse.
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

  // Layout: assign each unit a horizontal center. A contiguous subtree
  // block is allocated for every parent, so descendants stay underneath
  // their ancestors and unrelated branches do not overlap. Roots and
  // sibling subtrees are laid out left-to-right as one block each.
  const CARD_WIDTH = 232;
  const SPOUSE_LINK_WIDTH = 36;
  const UNIT_GAP = 44;
  // Links to a former partner are wider so ex-spouses never look adjacent
  // to the current spouse.
  const FORMER_LINK_WIDTH = 72;
  units.forEach((unit) => {
    unit.linkWidths = unit.members.slice(1).map((member, index) => {
      const previous = unit.members[index];
      const relationship = unit.relationshipByPair?.get(
        pairKeyOf(previous.id, member.id)
      );
      return relationship?.status === 'former'
        ? FORMER_LINK_WIDTH
        : SPOUSE_LINK_WIDTH;
    });
  });
  const unitWidths = units.map(
    (unit) =>
      unit.members.length * CARD_WIDTH +
      unit.linkWidths.reduce((sum, width) => sum + width, 0)
  );
  const primaryParentOf = new Map();

  units.forEach((unit, unitIndex) => {
    const parents = [...(unit.parentUnits || [])].sort(
      (first, second) =>
        depths[first] - depths[second] || orderInRow.get(first) - orderInRow.get(second) || first - second
    );
    if (parents.length) primaryParentOf.set(unitIndex, parents[0]);
  });

  const primaryChildrenByParent = new Map();
  primaryParentOf.forEach((parentIndex, childIndex) => {
    if (depths[childIndex] <= depths[parentIndex]) return;
    if (!primaryChildrenByParent.has(parentIndex)) primaryChildrenByParent.set(parentIndex, []);
    primaryChildrenByParent.get(parentIndex).push(childIndex);
  });
  primaryChildrenByParent.forEach((children) => {
    children.sort(
      (first, second) =>
        depths[first] - depths[second] ||
        orderInRow.get(first) - orderInRow.get(second) ||
        labelOf(first).localeCompare(labelOf(second))
    );
  });

  const layoutX = new Map();
  let layoutCursor = 0;

  function collectDescendants(unitIndex, seen = new Set()) {
    if (seen.has(unitIndex)) return [];
    seen.add(unitIndex);
    const result = [unitIndex];
    (primaryChildrenByParent.get(unitIndex) || []).forEach((childIndex) => {
      result.push(...collectDescendants(childIndex, seen));
    });
    return result;
  }

  function layoutUnit(unitIndex, seen = new Set()) {
    if (layoutX.has(unitIndex)) return layoutX.get(unitIndex);
    if (seen.has(unitIndex)) return null;
    seen.add(unitIndex);

    const width = unitWidths[unitIndex];
    const children = primaryChildrenByParent.get(unitIndex) || [];

    if (!children.length) {
      const center = layoutCursor + width / 2;
      layoutX.set(unitIndex, center);
      layoutCursor += width + UNIT_GAP;
      return center;
    }

    const subtreeStart = layoutCursor;
    const childCenters = [];
    children.forEach((childIndex) => {
      const childCenter = layoutUnit(childIndex, new Set(seen));
      if (childCenter != null) childCenters.push(childCenter);
    });

    if (!childCenters.length) {
      const center = layoutCursor + width / 2;
      layoutX.set(unitIndex, center);
      layoutCursor += width + UNIT_GAP;
      return center;
    }

    let desiredCenter =
      (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    let desiredLeft = desiredCenter - width / 2;

    if (desiredLeft < subtreeStart) {
      const shift = subtreeStart - desiredLeft;
      collectDescendants(unitIndex).forEach((descendantIndex) => {
        if (descendantIndex !== unitIndex) {
          layoutX.set(descendantIndex, layoutX.get(descendantIndex) + shift);
        }
      });
      layoutCursor += shift;
      desiredCenter += shift;
      desiredLeft += shift;
    }

    const subtreeEnd = layoutCursor - UNIT_GAP;
    const parentRight = desiredCenter + width / 2;
    if (parentRight > subtreeEnd) layoutCursor = parentRight + UNIT_GAP;

    layoutX.set(unitIndex, desiredCenter);
    return desiredCenter;
  }

  const layoutRootOrder = units
    .map((_unit, unitIndex) => unitIndex)
    .sort(
      (first, second) =>
        depths[first] - depths[second] ||
        orderInRow.get(first) - orderInRow.get(second) ||
        labelOf(first).localeCompare(labelOf(second))
    );

  layoutRootOrder.forEach((unitIndex) => {
    if (!layoutX.has(unitIndex)) layoutUnit(unitIndex);
  });

  // Align every direct child under the relationship heart that produced it.
  // Child subtrees are kept in left-to-right heart order, so a former
  // partner's children collect under the broken heart and current
  // partner's children under the normal heart. Current subtree-relative
  // dimensions are preserved while the whole subtree is shifted as one.
  const ALIGNED_GAP = 8;

  function memberCenterOffset(unitIndex, memberIndex) {
    const width = unitWidths[unitIndex];
    const linkWidths = units[unitIndex].linkWidths;
    let left = 0;
    for (let index = 0; index < memberIndex; index += 1) {
      left += CARD_WIDTH + (linkWidths[index] || 0);
    }
    return left + CARD_WIDTH / 2 - width / 2;
  }

  function relationshipHeartOffset(parentIndex, childIndex) {
    const parentUnit = units[parentIndex];
    const relationshipContext =
      units[childIndex].parentLinks?.get(parentIndex)?.relationshipContext;
    if (!relationshipContext?.firstId || !relationshipContext?.secondId) return 0;

    const firstIndex = parentUnit.members.findIndex(
      (member) => String(member.id) === String(relationshipContext.firstId)
    );
    const secondIndex = parentUnit.members.findIndex(
      (member) => String(member.id) === String(relationshipContext.secondId)
    );
    if (firstIndex < 0 || secondIndex < 0) return 0;

    return (
      (memberCenterOffset(parentIndex, firstIndex) +
        memberCenterOffset(parentIndex, secondIndex)) /
      2
    );
  }

  function descendantsSpan(unitIndex) {
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;

    collectDescendants(unitIndex).forEach((descendantIndex) => {
      const center = layoutX.get(descendantIndex) || 0;
      const halfWidth = unitWidths[descendantIndex] / 2;
      left = Math.min(left, center - halfWidth);
      right = Math.max(right, center + halfWidth);
    });

    return { left, right, width: right - left };
  }

  layoutRootOrder.forEach((parentIndex) => {
    const children = primaryChildrenByParent.get(parentIndex) || [];
    if (!children.length) return;

    const parentX = layoutX.get(parentIndex) || 0;

    // Group direct children by the heart that produced them, then centre
    // each relationship group underneath its own current or broken heart.
    const groups = new Map();
    children.forEach((childIndex) => {
      const offset = Math.round(relationshipHeartOffset(parentIndex, childIndex));
      if (!groups.has(offset)) groups.set(offset, []);
      groups.get(offset).push(childIndex);
    });

    const orderedGroups = [...groups.entries()].sort(
      (first, second) => first[0] - second[0]
    );
    let cursor = Number.NEGATIVE_INFINITY;

    orderedGroups.forEach(([offset, groupChildren]) => {
      let left = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;

      groupChildren.forEach((childIndex) => {
        const span = descendantsSpan(childIndex);
        left = Math.min(left, span.left);
        right = Math.max(right, span.right);
      });

      const groupWidth = right - left;
      const desiredCenter = parentX + offset;
      let newLeft = desiredCenter - groupWidth / 2;
      if (cursor !== Number.NEGATIVE_INFINITY) {
        newLeft = Math.max(newLeft, cursor);
      }

      const shift = newLeft - left;
      if (shift) {
        groupChildren.forEach((childIndex) => {
          collectDescendants(childIndex).forEach((descendantIndex) => {
            layoutX.set(
              descendantIndex,
              (layoutX.get(descendantIndex) || 0) + shift
            );
          });
        });
      }

      cursor = newLeft + groupWidth + ALIGNED_GAP;
    });
  });

  // Last-resort clearance pass: if two card units in one generation end
  // up too close after heart alignment (or from an unusual ancestor graph),
  // move the later unit and all of its descendants further right as one
  // block. This keeps every generation horizontally collision-free while
  // preserving the internal structure of each subtree.
  const MIN_HORIZONTAL_GAP = 8;
  rows.forEach((row) => {
    const orderedRow = [...row].sort(
      (first, second) => layoutX.get(first) - layoutX.get(second)
    );
    let nextLeft = Number.NEGATIVE_INFINITY;

    orderedRow.forEach((unitIndex) => {
      const currentCenter = layoutX.get(unitIndex) || 0;
      const currentLeft = currentCenter - unitWidths[unitIndex] / 2;
      const shift = nextLeft - currentLeft;

      if (shift > 0) {
        collectDescendants(unitIndex).forEach((descendantIndex) => {
          layoutX.set(descendantIndex, (layoutX.get(descendantIndex) || 0) + shift);
        });
      }

      nextLeft =
        (layoutX.get(unitIndex) || 0) +
        unitWidths[unitIndex] / 2 +
        MIN_HORIZONTAL_GAP;
    });
  });

  // Normalize the finished layout so the leftmost card starts just inside
  // the tree padding instead of leaving a large empty strip on the left.
  const TREE_PADDING = 34;
  const minLeft = units.reduce(
    (value, _unit, unitIndex) =>
      Math.min(value, (layoutX.get(unitIndex) || 0) - unitWidths[unitIndex] / 2),
    Number.POSITIVE_INFINITY
  );

  if (Number.isFinite(minLeft)) {
    units.forEach((_unit, unitIndex) => {
      layoutX.set(
        unitIndex,
        (layoutX.get(unitIndex) || 0) - minLeft + TREE_PADDING
      );
    });
  }

  units.forEach((unit, unitIndex) => {
    unit.x = layoutX.get(unitIndex) || 0;
    unit.width = unitWidths[unitIndex];
    unit.layoutCenter = unit.x;
    unit.memberCenters = unit.members.map(
      (_member, memberIndex) =>
        memberCenterOffset(unitIndex, memberIndex) + unit.width / 2
    );
  });

  rows.forEach((row) => {
    row.sort((first, second) => units[first].x - units[second].x);
  });

  const layoutWidth = Math.max(
    68,
    ...units.map((unit) => unit.x + unit.width / 2)
  ) + 68;

  return { units, rows, depths, treeWidth: layoutWidth };
}

export default function SpouseTreeComponent({
  childCounts = {},
  collapsedFamilyIds = [],
  families = [],
  onAddChild,
  onAddParent,
  onAddSibling,
  onAddSpouse,
  onDelete,
  onEdit,
  onFocus,
  onToggleFamily,
  onView,
  people,
  showFormerSpouses = true,
  suppressClickRef,
  zoom = 1,
}) {
  const { t } = useI18n();
  const scene = useMemo(
    () => buildScene(people, families, showFormerSpouses),
    [people, families, showFormerSpouses]
  );

  const containerRef = useRef(null);
  const cardRefs = useRef(new Map());
  const cardRefCallbacks = useRef(new Map());
  const heartRefs = useRef(new Map());
  const [edges, setEdges] = useState([]);
  const [rowHeights, setRowHeights] = useState({});
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
    const descriptorById = new Map();

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

        const parentLink = childUnit.parentLinks?.get(parentIndex);
        const edgeRelationshipStatus = parentLink?.relationshipStatus ||
          parentUnit.relationships?.find(
            (relationship) =>
              String(relationship.firstId) === String(parentLink?.parentId) ||
              String(relationship.secondId) === String(parentLink?.parentId)
          )?.status ||
          parentUnit.status ||
          'current';
        const isFormerSpouseEdge = edgeRelationshipStatus === 'former';

        const linkedChildMember = parentLink
          ? childUnit.members.find((member) => String(member.id) === parentLink.childId)
          : childUnit.members.find((member) =>
              parentUnit.members.some(
                (parentMember) =>
                  String(member.parentId || '') === String(parentMember.id) ||
                  String(member.secondParentId || '') === String(parentMember.id)
              )
            );
        const childMemberForEdge = linkedChildMember || childUnit.members[0];
        const childNode = childMemberForEdge
          ? cardRefs.current.get(String(childMemberForEdge.id))
          : childNodes[0];

        if (!parentNodes.length || !childNode) return;

        const childRect = childNode.getBoundingClientRect();
        const endX =
          (childRect.left - containerRect.left + childRect.width / 2) / scale;
        const endY = (childRect.top - containerRect.top) / scale;

        const parentNode =
          (parentLink?.parentId &&
            cardRefs.current.get(String(parentLink.parentId))) ||
          parentNodes[0];
        const parentRect = parentNode.getBoundingClientRect();
        const startX =
          (parentRect.left - containerRect.left + parentRect.width / 2) / scale;
        const startY = (parentRect.bottom - containerRect.top) / scale;

        // Couple units connect through the heart between the spouses;
        // single cards connect straight from the card itself.
        let junctionX = startX;
        let junctionY = startY;
        if (parentUnit.members.length > 1) {
          const relationshipContext = parentLink?.relationshipContext;
          const firstIndex = relationshipContext?.firstId
            ? parentUnit.members.findIndex(
                (member) => String(member.id) === String(relationshipContext.firstId)
              )
            : -1;
          const secondIndex = relationshipContext?.secondId
            ? parentUnit.members.findIndex(
                (member) => String(member.id) === String(relationshipContext.secondId)
              )
            : -1;

          let heartNode = null;
          if (firstIndex >= 0 && secondIndex >= 0 && firstIndex !== secondIndex) {
            const leftMember = parentUnit.members[Math.min(firstIndex, secondIndex)];
            const rightMember = parentUnit.members[Math.max(firstIndex, secondIndex)];
            heartNode = heartRefs.current.get(
              `heart-${parentUnit.id}-${leftMember.id}-${rightMember.id}`
            );
          }

          if (!heartNode) {
            // Fall back to the heart nearest the linked parent card so the
            // connector never attaches to an unrelated marriage.
            const heartEntries = [...heartRefs.current.entries()].filter(
              ([key]) => key.startsWith(`heart-${parentUnit.id}-`)
            );
            const parentCardNode = parentLink?.parentId
              ? cardRefs.current.get(String(parentLink.parentId))
              : null;

            if (heartEntries.length <= 1 || !parentCardNode) {
              heartNode = heartEntries[0] ? heartEntries[0][1] : null;
            } else {
              const parentCardRect = parentCardNode.getBoundingClientRect();
              const parentCenterX = parentCardRect.left + parentCardRect.width / 2;
              let bestEntry = null;

              heartEntries.forEach((entry) => {
                const rect = entry[1].getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const distance = Math.abs(centerX - parentCenterX);
                if (!bestEntry || distance < bestEntry.distance) {
                  bestEntry = { entry, distance };
                }
              });

              heartNode = bestEntry ? bestEntry.entry[1] : null;
            }
          }

          if (heartNode) {
            const heartRect = heartNode.getBoundingClientRect();
            junctionX = (heartRect.left - containerRect.left + heartRect.width / 2) / scale;
            junctionY = (heartRect.bottom - containerRect.top) / scale;
          }
        }

        const connector = {
          id: `edge-${parentIndex}-${childUnitIndex}`,
          parentIndex,
          childUnitIndex,
          parentDepth: scene.depths[parentIndex] || 0,
          childDepth: scene.depths[childUnitIndex] || 0,
          junctionX,
          junctionY,
          endX,
          endY,
          isFormerSpouseEdge,
        };
        descriptorById.set(connector.id, connector);
      });
    });

    // A family branch gets its own track within the gap. Nesting sibling
    // tracks lower toward the child keeps each child stub at most one
    // quarter of the full parent-child gap while preventing horizontal
    // paths for different branches from sharing a line.
    const trackGroups = new Map();
    descriptorById.forEach((descriptor) => {
      const key = `${descriptor.parentDepth}->${descriptor.childDepth}`;
      if (!trackGroups.has(key)) trackGroups.set(key, []);
      trackGroups.get(key).push(descriptor);
    });

    trackGroups.forEach((track) => {
      const ordered = [...track].sort(
        (first, second) => first.endX - second.endX || first.parentIndex - second.parentIndex
      );
      const averageGap = ordered.reduce(
        (sum, descriptor) => sum + (descriptor.endY - descriptor.junctionY),
        0
      ) / ordered.length;
      const longestChildStub = Math.max(0, averageGap) / 4;
      const shortestChildStub = Math.max(2, longestChildStub / 3.5);
      const stubStep =
        ordered.length > 1
          ? Math.min(4, (longestChildStub - shortestChildStub) / (ordered.length - 1))
          : 0;

      ordered.forEach((descriptor, index) => {
        const childStubLength = longestChildStub - index * stubStep;
        const branchY = descriptor.endY - childStubLength;
        descriptor.path =
          Math.abs(descriptor.endX - descriptor.junctionX) < 0.5
            ? `M ${descriptor.junctionX} ${descriptor.junctionY} V ${branchY} M ${descriptor.endX} ${descriptor.endY} V ${branchY}`
            : `M ${descriptor.junctionX} ${descriptor.junctionY} V ${branchY} M ${descriptor.endX} ${descriptor.endY} V ${branchY} M ${descriptor.junctionX} ${branchY} H ${descriptor.endX}`;
      });
    });

    const nextEdges = [...descriptorById.values()].map((descriptor) => ({
      id: descriptor.id,
      path: descriptor.path,
      isFormerSpouseEdge: descriptor.isFormerSpouseEdge,
    }));

    setEdges(nextEdges);

    const measuredRowHeights = {};
    scene.units.forEach((unit, unitIndex) => {
      const depth = scene.depths[unitIndex] || 0;
      const measuredHeights = unit.members
        .map((member) => {
          const node = cardRefs.current.get(String(member.id));
          return node ? node.getBoundingClientRect().height / scale : 0;
        })
        .filter(Boolean);
      if (measuredHeights.length) {
        measuredRowHeights[depth] = Math.max(
          measuredRowHeights[depth] || 0,
          ...measuredHeights
        );
      }
    });

    if (JSON.stringify(measuredRowHeights) !== JSON.stringify(rowHeights)) {
      setRowHeights(measuredRowHeights);
    }

    setSize({ width: container.scrollWidth, height: container.scrollHeight });
  }, [rowHeights, scene, zoom]);

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
    <div
      className="spouse-tree"
      ref={containerRef}
      role="list"
      style={scene.treeWidth ? { width: `${scene.treeWidth}px` } : undefined}
    >
      <svg
        aria-hidden="true"
        className="spouse-edges"
        height={size.height}
        width={size.width}
      >
        {edges.map((edge) => (
          <path
            className={edge.isFormerSpouseEdge ? 'is-former-spouse' : undefined}
            d={edge.path}
            key={edge.id}
          />
        ))}
      </svg>

      {scene.rows.map((row, depth) => (
        <div
          className="spouse-generation"
          key={`generation-${depth}`}
          role="presentation"
          style={{ height: `${rowHeights[depth] || 126}px` }}
        >
          {row.map((unitIndex) => {
            const unit = scene.units[unitIndex];
            const unitRelationships = unit.relationships || [];
            const formerMemberIds = new Set(
              unit.members
                .filter((member) => {
                  const links = unitRelationships.filter(
                    (relationship) =>
                      String(relationship.firstId) === String(member.id) ||
                      String(relationship.secondId) === String(member.id)
                  );
                  return (
                    links.length > 0 &&
                    links.every((relationship) => relationship.status === 'former')
                  );
                })
                .map((member) => String(member.id))
            );
            const familyIds = unit.familyIds || [];
            const childCount = familyIds.reduce(
              (sum, familyId) => sum + (childCounts[String(familyId)] || 0),
              0
            );
            const collapsedSet = new Set(collapsedFamilyIds.map(String));
            const isCollapsed =
              familyIds.length > 0 &&
              familyIds.some((familyId) => collapsedSet.has(String(familyId)));

            // Partners who are not beside each other are joined by a dashed
            // rail under the cards, with the broken heart on the ex-spouse.
            const railRelationships = unitRelationships.filter((relationship) => {
              const firstIndex = unit.members.findIndex(
                (member) => String(member.id) === String(relationship.firstId)
              );
              const secondIndex = unit.members.findIndex(
                (member) => String(member.id) === String(relationship.secondId)
              );
              if (firstIndex < 0 || secondIndex < 0) return false;
              return Math.abs(firstIndex - secondIndex) > 1;
            });

            return (
              <div
                className={`spouse-unit${unit.members.length > 1 ? ' is-couple' : ''}`}
                key={unit.id}
                role="listitem"
                style={{ left: `${unit.x || 0}px` }}
              >
                {childCount > 0 && onToggleFamily && (
                  <button
                    aria-expanded={!isCollapsed}
                    className={`family-toggle${isCollapsed ? ' is-collapsed' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFamily(familyIds);
                    }}
                    type="button"
                  >
                    {isCollapsed
                      ? t('branch.showChildren', { count: childCount })
                      : t('branch.hideChildren')}
                  </button>
                )}
                {unit.members.map((member, memberIndex) => {
                  const previousMember = memberIndex > 0 ? unit.members[memberIndex - 1] : null;
                  const relationship = previousMember
                    ? unit.relationshipByPair?.get(
                        pairKeyOf(previousMember.id, member.id)
                      )
                    : null;
                  const isFormerLink = relationship?.status === 'former';
                  const heartKey = previousMember
                    ? `heart-${unit.id}-${previousMember.id}-${String(member.id)}`
                    : null;

                  return (
                    <Fragment key={String(member.id)}>
                      {previousMember && (
                        <span
                          aria-hidden="true"
                          className={`spouse-link${isFormerLink ? ' is-former' : ''}`}
                          style={{ width: `${unit.linkWidths[memberIndex - 1]}px` }}
                        >
                          {relationship && (
                            <span
                              className="spouse-link-heart"
                              ref={(node) => setHeartRef(heartKey, node)}
                            >
                              <HeartIcon broken={isFormerLink} />
                            </span>
                          )}
                        </span>
                      )}
                      <PersonCard
                        cardRef={getCardRef(member.id)}
                        muted={formerMemberIds.has(String(member.id))}
                        onAddChild={onAddChild}
                        onAddParent={onAddParent}
                        onAddSibling={onAddSibling}
                        onAddSpouse={onAddSpouse}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onFocus={onFocus}
                        onView={onView}
                        person={member}
                        showSpouseName={false}
                        spouseStatus={relationship?.status || unit.status}
                        suppressClickRef={suppressClickRef}
                      />
                    </Fragment>
                  );
                })}
                {railRelationships.map((relationship) => {
                  const firstIndex = unit.members.findIndex(
                    (member) => String(member.id) === String(relationship.firstId)
                  );
                  const secondIndex = unit.members.findIndex(
                    (member) => String(member.id) === String(relationship.secondId)
                  );
                  const leftIndex = Math.min(firstIndex, secondIndex);
                  const rightIndex = Math.max(firstIndex, secondIndex);
                  const exIndex = formerMemberIds.has(
                    String(unit.members[firstIndex].id)
                  )
                    ? firstIndex
                    : secondIndex;
                  const leftX = unit.memberCenters[leftIndex];
                  const rightX = unit.memberCenters[rightIndex];
                  const exX = unit.memberCenters[exIndex];
                  const former = relationship.status === 'former';

                  return (
                    <Fragment key={`rail-${relationship.firstId}-${relationship.secondId}`}>
                      <span
                        aria-hidden="true"
                        className={`spouse-rail${former ? ' is-former' : ''}`}
                        style={{ left: `${leftX}px`, width: `${rightX - leftX}px` }}
                      />
                      <span
                        aria-hidden="true"
                        className="spouse-heart-float"
                        ref={(node) =>
                          setHeartRef(
                            `heart-${unit.id}-${unit.members[leftIndex].id}-${unit.members[rightIndex].id}`,
                            node
                          )
                        }
                        style={{ left: `${exX}px` }}
                      >
                        <span className="spouse-link-heart">
                          <HeartIcon broken={former} />
                        </span>
                      </span>
                    </Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
