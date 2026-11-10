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

// A previous marriage with children needs room for those children to hang
// under their own heart instead of under the ex-partner's card.
const SPOUSE_LINK_WIDTH = 36;
const FORMER_LINK_WIDTH = 76;
const FORMER_LINK_CHILDREN_WIDTH = 152;
const CURRENT_LINK_CHILDREN_MAX = 112;
const MAX_ROUTING_LANES = 6;

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
  while (walk.length < ids.length) {
    const current = walk[walk.length - 1];
    const before = walk[walk.length - 2];
    const next = (adjacent.get(current) || []).find(
      (candidate) => candidate !== before
    );
    if (!next || walk.includes(next)) return null;
    walk.push(next);
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
    // A marriage with only one partner in view has no relationship to draw.
    const relationships = relatedFamilyRecords
      .filter((record) => record.members.length > 1)
      .map((record) => {
      const firstId = String(record.members[0].id);
      const secondId = String(record.members[1].id);
      return {
        familyId: record.family.id,
        firstId,
        secondId,
        status: record.status,
        hasChildren: (record.children || []).length > 0,
        childCount: (record.children || []).length,
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
      formerMemberIds: new Set(
        members
          .filter((member) => {
            const links = relationships.filter(
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
      ),
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


  // Place the descendant in a two-card spouse pair at the same side as the
  // linked parent where possible. Longer marriage chains must keep their
  // chain order, otherwise an ex-partner can end up between a couple and the
  // children of the current marriage appear attached to the ex.
  units.forEach((childUnit) => {
    if (!childUnit.parentUnits?.size || childUnit.members.length !== 2) return;

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

  // 5. Compute depths. Generations are strictly parent-based so every child
  // sits exactly one row below its parents. A spouse's depth is only used
  // for people who have no recorded parents.
  const unitParents = units.map((u) => [...(u.parentUnits || [])]);
  const depths = new Array(units.length).fill(0);
  const resolved = new Array(units.length).fill(false);
  const visiting = new Set();

  function resolveParentDepth(unitIndex) {
    if (resolved[unitIndex]) return depths[unitIndex];
    if (visiting.has(unitIndex)) return 0;
    visiting.add(unitIndex);
    let depth = 0;
    for (const parentIndex of unitParents[unitIndex]) {
      depth = Math.max(depth, resolveParentDepth(parentIndex) + 1);
    }
    visiting.delete(unitIndex);
    resolved[unitIndex] = true;
    depths[unitIndex] = depth;
    return depth;
  }

  units.forEach((_unit, unitIndex) => resolveParentDepth(unitIndex));

  // Units without parents follow the deepest partner so a spouse is never
  // placed above the family they married into.
  let partnerChanged = true;
  let partnerPasses = 0;

  while (partnerChanged && partnerPasses <= units.length) {
    partnerChanged = false;
    partnerPasses += 1;

    for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
      if (unitParents[unitIndex].length) continue;
      for (const partnerIndex of unitPartners[unitIndex]) {
        if (depths[partnerIndex] > depths[unitIndex]) {
          depths[unitIndex] = depths[partnerIndex];
          partnerChanged = true;
        }
      }
    }
  }

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

  // 8. Remove crossings with adjacent swaps. Only swaps that strictly reduce
  // the number of crossing links are kept, so this pass is deterministic and
  // cannot make a row worse.
  const gapEdges = () => {
    const gaps = new Map();
    units.forEach((unit, childIndex) => {
      (unitParents[childIndex] || []).forEach((parentIndex) => {
        const key = `${depths[parentIndex]}-${depths[childIndex]}`;
        if (!gaps.has(key)) gaps.set(key, []);
        gaps.get(key).push({
          parent: orderInRow.get(parentIndex),
          child: orderInRow.get(childIndex),
        });
      });
    });
    return gaps;
  };

  const countCrossings = (gaps) => {
    let total = 0;
    gaps.forEach((edges) => {
      for (let first = 0; first < edges.length; first += 1) {
        for (let second = first + 1; second < edges.length; second += 1) {
          if (
            (edges[first].parent - edges[second].parent) *
              (edges[first].child - edges[second].child) <
            0
          ) {
            total += 1;
          }
        }
      }
    });
    return total;
  };

  let currentCrossings = countCrossings(gapEdges());

  for (let pass = 0; pass < 4 && currentCrossings > 0; pass += 1) {
    let improved = false;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];

      for (let index = 0; index < row.length - 1; index += 1) {
        const first = row[index];
        const second = row[index + 1];

        row[index] = second;
        row[index + 1] = first;
        orderInRow.set(first, index + 1);
        orderInRow.set(second, index);

        const nextCrossings = countCrossings(gapEdges());
        if (nextCrossings < currentCrossings) {
          currentCrossings = nextCrossings;
          improved = true;
        } else {
          row[index] = first;
          row[index + 1] = second;
          orderInRow.set(first, index);
          orderInRow.set(second, index + 1);
        }
      }
    }

    if (!improved) break;
  }

  // Layout: every connected family is laid out as one block and children
  // are reserved bottom-up, so each parent is centred over its descendants
  // without any later shifting.
  const CARD_WIDTH = 232;
  const BASE_UNIT_GAP = 44;
  const ROUTING_UNIT_GAP = 76;
  const COMPONENT_GAP = 140;

  // Links that skip a generation need a free vertical column between card
  // groups, so leave more room between units when the scene has any.
  const hasSkippingEdges = units.some((unit, childIndex) =>
    [...(unit.parentUnits || [])].some(
      (parentIndex) => (depths[childIndex] || 0) - (depths[parentIndex] || 0) > 1
    )
  );
  const UNIT_GAP = hasSkippingEdges ? ROUTING_UNIT_GAP : BASE_UNIT_GAP;

  // Where the heart for a marriage is drawn: in the gap between the partners
  // when they are neighbours, otherwise in the gap beside the partner with
  // fewer marriages (the ex-partner rather than the shared hub). The marriage
  // line then runs behind the cards in between.
  function heartGapIndex(unitIndex, relationship) {
    const unit = units[unitIndex];
    if (!unit?.heartGapByPair) return null;
    const gapIndex = unit.heartGapByPair.get(
      pairKeyOf(relationship.firstId, relationship.secondId)
    );
    return gapIndex == null ? null : gapIndex;
  }

  units.forEach((unit) => {
    const relationships = unit.relationships || [];
    const degree = new Map();
    relationships.forEach((relationship) => {
      [relationship.firstId, relationship.secondId].forEach((personId) => {
        const id = String(personId);
        degree.set(id, (degree.get(id) || 0) + 1);
      });
    });

    const indexOfMember = (personId) =>
      unit.members.findIndex((member) => String(member.id) === String(personId));
    const gapKey = (relationship) =>
      pairKeyOf(relationship.firstId, relationship.secondId);

    unit.heartGapByPair = new Map();
    const occupied = new Set();

    // Neighbouring partners always keep the heart in their own gap.
    relationships.forEach((relationship) => {
      const firstIndex = indexOfMember(relationship.firstId);
      const secondIndex = indexOfMember(relationship.secondId);
      if (firstIndex < 0 || secondIndex < 0) return;
      if (Math.abs(firstIndex - secondIndex) !== 1) return;
      const gapIndex = Math.min(firstIndex, secondIndex);
      unit.heartGapByPair.set(gapKey(relationship), gapIndex);
      occupied.add(gapIndex);
    });

    // Marriages drawn behind the cards get the gap beside the partner with
    // fewer marriages (the ex rather than the shared hub). If that gap already
    // holds a heart, take the nearest free gap so two hearts never overlap.
    relationships
      .filter((relationship) => {
        const firstIndex = indexOfMember(relationship.firstId);
        const secondIndex = indexOfMember(relationship.secondId);
        return (
          firstIndex >= 0 &&
          secondIndex >= 0 &&
          Math.abs(firstIndex - secondIndex) !== 1
        );
      })
      .sort(
        (first, second) =>
          Number(Boolean(second.hasChildren)) -
          Number(Boolean(first.hasChildren))
      )
      .forEach((relationship) => {
        const firstIndex = indexOfMember(relationship.firstId);
        const secondIndex = indexOfMember(relationship.secondId);
        const firstIsLeaf =
          (degree.get(String(relationship.firstId)) || 0) <=
          (degree.get(String(relationship.secondId)) || 0);
        const leafIndex = firstIsLeaf ? firstIndex : secondIndex;
        const preferred =
          leafIndex + 1 < unit.members.length
            ? leafIndex
            : Math.max(0, leafIndex - 1);
        const lastGap = unit.members.length - 2;

        let gapIndex = preferred;
        if (occupied.has(gapIndex)) {
          let found = null;
          for (let distance = 1; distance <= lastGap + 1 && found == null; distance += 1) {
            const candidates = [preferred - distance, preferred + distance];
            for (let index = 0; index < candidates.length; index += 1) {
              const candidate = candidates[index];
              if (candidate < 0 || candidate > lastGap) continue;
              if (occupied.has(candidate)) continue;
              found = candidate;
              break;
            }
          }
          if (found != null) gapIndex = found;
        }

        unit.heartGapByPair.set(gapKey(relationship), gapIndex);
        occupied.add(gapIndex);
      });
  });

  // The gap widths follow the hearts: a previous marriage with children gets
  // a wide gap so those children hang under their own heart instead of under
  // an unrelated card. Marriages drawn behind the cards need the room too.
  // A marriage with several children also gets a wider gap so their drop
  // lines can fan out under the heart instead of stacking on one column.
  const gapWidthFor = (relationship, behind) => {
    const childCount = relationship.childCount || 0;

    if (behind || relationship.status === 'former') {
      return childCount ? FORMER_LINK_CHILDREN_WIDTH : FORMER_LINK_WIDTH;
    }

    if (!childCount) return SPOUSE_LINK_WIDTH;

    return Math.min(
      CURRENT_LINK_CHILDREN_MAX,
      SPOUSE_LINK_WIDTH + childCount * 28
    );
  };

  units.forEach((unit, unitIndex) => {
    const gapWidths = unit.members.slice(1).map(() => 0);
    (unit.relationships || []).forEach((relationship) => {
      const gapIndex = heartGapIndex(unitIndex, relationship);
      if (gapIndex == null) return;
      const firstIndex = unit.members.findIndex(
        (member) => String(member.id) === String(relationship.firstId)
      );
      const secondIndex = unit.members.findIndex(
        (member) => String(member.id) === String(relationship.secondId)
      );
      const behind = Math.abs(firstIndex - secondIndex) !== 1;
      gapWidths[gapIndex] = Math.max(
        gapWidths[gapIndex],
        gapWidthFor(relationship, behind)
      );
    });
    unit.linkWidths = gapWidths.map((width) => width || SPOUSE_LINK_WIDTH);
  });

  const unitWidths = units.map(
    (unit) =>
      unit.members.length * CARD_WIDTH +
      unit.linkWidths.reduce((sum, width) => sum + width, 0)
  );

  function memberCenterOffset(unitIndex, memberIndex) {
    const width = unitWidths[unitIndex];
    const linkWidths = units[unitIndex].linkWidths;
    let left = 0;
    for (let index = 0; index < memberIndex; index += 1) {
      left += CARD_WIDTH + (linkWidths[index] || 0);
    }
    return left + CARD_WIDTH / 2 - width / 2;
  }

  // Children are laid out under the heart of their own marriage, including
  // marriages whose heart sits in the gap beside an ex-partner.
  function marriageAnchorOffset(unitIndex, relationship) {
    const gapIndex = heartGapIndex(unitIndex, relationship);
    if (gapIndex == null) return 0;
    return (
      (memberCenterOffset(unitIndex, gapIndex) +
        memberCenterOffset(unitIndex, gapIndex + 1)) /
      2
    );
  }

  const primaryParentOf = new Map();

  units.forEach((unit, unitIndex) => {
    const parents = [...(unit.parentUnits || [])].sort(
      (first, second) =>
        depths[second] - depths[first] ||
        orderInRow.get(first) - orderInRow.get(second) ||
        first - second
    );
    if (parents.length) primaryParentOf.set(unitIndex, parents[0]);
  });

  const primaryChildrenByParent = new Map();
  primaryParentOf.forEach((parentIndex, childIndex) => {
    if (depths[childIndex] <= depths[parentIndex]) return;
    if (!primaryChildrenByParent.has(parentIndex)) primaryChildrenByParent.set(parentIndex, []);
    primaryChildrenByParent.get(parentIndex).push(childIndex);
  });

  // Children are ordered by the marriage that produced them (left to right
  // by partner order), then by name so siblings stay together.
  primaryChildrenByParent.forEach((children, parentIndex) => {
    const groupOffset = (childIndex) => {
      const context = units[childIndex].parentLinks?.get(parentIndex)?.relationshipContext;
      if (!context?.firstId || !context?.secondId) return 0;
      return marriageAnchorOffset(parentIndex, context);
    };
    children.sort(
      (first, second) =>
        groupOffset(first) - groupOffset(second) ||
        orderInRow.get(first) - orderInRow.get(second) ||
        labelOf(first).localeCompare(labelOf(second))
    );
  });

  // Connected components keep one family's rows contiguous, so unrelated
  // families never interleave and produce long cross-tree lines.
  const componentOf = new Array(units.length).fill(-1);
  let componentCursor = 0;

  for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
    if (componentOf[unitIndex] >= 0) continue;
    const componentId = componentCursor;
    const queue = [unitIndex];
    componentOf[unitIndex] = componentId;
    while (queue.length) {
      const current = queue.shift();
      const neighbours = [
        ...(unitParents[current] || []),
        ...(primaryChildrenByParent.get(current) || []),
      ];
      neighbours.forEach((neighbourIndex) => {
        if (componentOf[neighbourIndex] >= 0) return;
        componentOf[neighbourIndex] = componentId;
        queue.push(neighbourIndex);
      });
    }
    componentCursor += 1;
  }

  const layoutX = new Map();
  let layoutCursor = 0;

  // Reserve a width for every subtree first, then place parents centred
  // over their children's block. This is deterministic and cannot overlap.
  const subtreeWidths = new Map();

  function subtreeWidth(unitIndex) {
    if (subtreeWidths.has(unitIndex)) return subtreeWidths.get(unitIndex);
    const children = primaryChildrenByParent.get(unitIndex) || [];
    const childrenTotal = children.reduce(
      (sum, childIndex, index) =>
        sum + subtreeWidth(childIndex) + (index > 0 ? UNIT_GAP : 0),
      0
    );
    const width = Math.max(unitWidths[unitIndex], childrenTotal);
    subtreeWidths.set(unitIndex, width);
    return width;
  }

  function placeUnit(unitIndex, left, preferredX = null, seen = new Set()) {
    if (layoutX.has(unitIndex) || seen.has(unitIndex)) return;
    seen.add(unitIndex);

    const children = primaryChildrenByParent.get(unitIndex) || [];
    const width = subtreeWidth(unitIndex);
    const unitWidth = unitWidths[unitIndex];
    const minX = left + unitWidth / 2;
    const maxX = left + width - unitWidth / 2;
    let center = left + width / 2;

    if (preferredX != null) {
      center = Math.min(Math.max(preferredX, minX), maxX);
    }

    layoutX.set(unitIndex, center);

    if (!children.length) return;

    const childrenTotal = children.reduce(
      (sum, childIndex, index) =>
        sum + subtreeWidth(childIndex) + (index > 0 ? UNIT_GAP : 0),
      0
    );
    let childLeft = Math.min(
      Math.max(center - childrenTotal / 2, left),
      left + width - childrenTotal
    );

    children.forEach((childIndex) => {
      const context = units[childIndex].parentLinks?.get(unitIndex)?.relationshipContext;
      const anchorOffset =
        context?.firstId && context?.secondId
          ? marriageAnchorOffset(unitIndex, context)
          : 0;

      placeUnit(childIndex, childLeft, center + anchorOffset, seen);
      childLeft += subtreeWidth(childIndex) + UNIT_GAP;
    });
  }

  // Roots are laid out component by component so unrelated families never
  // interleave inside a generation row.
  const rootUnits = units
    .map((_unit, unitIndex) => unitIndex)
    .filter((unitIndex) => !primaryParentOf.has(unitIndex));

  rootUnits.sort((first, second) => labelOf(first).localeCompare(labelOf(second)));

  const componentOrder = [
    ...new Set(rootUnits.map((unitIndex) => componentOf[unitIndex])),
  ];
  componentOrder.sort((first, second) => {
    const firstRoot = rootUnits.find(
      (unitIndex) => componentOf[unitIndex] === first
    );
    const secondRoot = rootUnits.find(
      (unitIndex) => componentOf[unitIndex] === second
    );
    return labelOf(firstRoot).localeCompare(labelOf(secondRoot));
  });

  componentOrder.forEach((componentIndex, index) => {
    if (index > 0) layoutCursor += COMPONENT_GAP;
    rootUnits
      .filter((unitIndex) => componentOf[unitIndex] === componentIndex)
      .forEach((unitIndex) => {
        if (layoutX.has(unitIndex)) return;
        placeUnit(unitIndex, layoutCursor);
        layoutCursor += subtreeWidth(unitIndex) + UNIT_GAP;
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
  branchFlagsById,
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
          parentBottom: (parentRect.bottom - containerRect.top) / scale,
          junctionX,
          junctionY,
          endX,
          endY,
          isFormerSpouseEdge,
        };
        descriptorById.set(connector.id, connector);
      });
    });

    // Every child link leaves its marriage heart, runs down to a lane in the
    // empty gap, across to the child column and down into the child. Lanes are
    // allocated per gap so two different families never share one horizontal.
    // Edges that skip a generation get a reserved vertical channel between
    // card groups, so they never cut through a heart or a card in between.
    const descriptors = [...descriptorById.values()];

    const rowTops = new Map();
    const rowBottoms = new Map();
    const rowColumns = new Map();

    scene.units.forEach((unit, unitIndex) => {
      const depth = scene.depths[unitIndex] || 0;
      let left = Infinity;
      let right = -Infinity;

      unit.members.forEach((member) => {
        const node = cardRefs.current.get(String(member.id));
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const cardLeft = (rect.left - containerRect.left) / scale;
        const cardRight = (rect.right - containerRect.left) / scale;
        const cardTop = (rect.top - containerRect.top) / scale;
        const cardBottom = (rect.bottom - containerRect.top) / scale;
        left = Math.min(left, cardLeft);
        right = Math.max(right, cardRight);
        rowTops.set(
          depth,
          Math.min(rowTops.has(depth) ? rowTops.get(depth) : Infinity, cardTop)
        );
        rowBottoms.set(
          depth,
          Math.max(rowBottoms.has(depth) ? rowBottoms.get(depth) : 0, cardBottom)
        );
      });

      if (!Number.isFinite(left)) return;
      if (!rowColumns.has(depth)) rowColumns.set(depth, []);
      rowColumns.get(depth).push({ left, right });
    });

    // Card groups (hearts and spouse lines live inside them) that a long
    // edge must not cross, merged into one sorted list.
    const channelBlockers = (fromDepth, toDepth) => {
      const blocked = [];
      for (let depth = fromDepth + 1; depth < toDepth; depth += 1) {
        (rowColumns.get(depth) || []).forEach((column) => {
          blocked.push({ left: column.left - 14, right: column.right + 14 });
        });
      }
      blocked.sort((first, second) => first.left - second.left);

      const merged = [];
      blocked.forEach((interval) => {
        const previous = merged[merged.length - 1];
        if (previous && interval.left <= previous.right) {
          previous.right = Math.max(previous.right, interval.right);
        } else {
          merged.push({ ...interval });
        }
      });
      return merged;
    };

    const usedChannels = [];
    const channelFor = (descriptor) => {
      const blocked = channelBlockers(
        descriptor.parentDepth,
        descriptor.childDepth
      );
      const ideal = descriptor.endX;

      const isFree = (candidate) => {
        if (candidate < 16) return false;
        const insideBlocked = blocked.some(
          (interval) => candidate > interval.left && candidate < interval.right
        );
        if (insideBlocked) return false;
        return !usedChannels.some((used) => Math.abs(used - candidate) < 14);
      };

      let channel = ideal;
      if (!isFree(channel)) {
        let found = null;
        for (let offset = 14; offset <= 420 && found == null; offset += 14) {
          const before = ideal - offset;
          if (isFree(before)) {
            found = before;
            break;
          }
          const after = ideal + offset;
          if (isFree(after)) {
            found = after;
            break;
          }
        }
        channel = found == null ? ideal : found;
      }

      usedChannels.push(channel);
      return channel;
    };

    const segments = [];
    const channelById = new Map();

    descriptors.forEach((descriptor) => {
      const skipsRows = descriptor.childDepth - descriptor.parentDepth > 1;
      const straight =
        !skipsRows && Math.abs(descriptor.endX - descriptor.junctionX) < 0.5;

      if (straight) return;

      if (skipsRows) {
        const channelX = channelFor(descriptor);
        channelById.set(descriptor.id, channelX);
        const heartGroup = `p${descriptor.parentIndex}:${Math.round(
          descriptor.junctionX
        )}`;
        if (Math.abs(channelX - descriptor.junctionX) >= 1) {
          segments.push({
            gapDepth: descriptor.parentDepth,
            group: heartGroup,
            x1: descriptor.junctionX,
            x2: channelX,
          });
        }
        if (Math.abs(descriptor.endX - channelX) >= 1) {
          segments.push({
            gapDepth: descriptor.childDepth - 1,
            group: `e${descriptor.id}`,
            x1: channelX,
            x2: descriptor.endX,
          });
        }
        return;
      }

      if (Math.abs(descriptor.endX - descriptor.junctionX) < 1) return;

      segments.push({
        gapDepth: descriptor.parentDepth,
        group: `p${descriptor.parentIndex}:${Math.round(descriptor.junctionX)}`,
        x1: descriptor.junctionX,
        x2: descriptor.endX,
      });
    });

    const gapGroups = new Map();
    segments.forEach((segment) => {
      if (!gapGroups.has(segment.gapDepth)) {
        gapGroups.set(segment.gapDepth, new Map());
      }
      const groups = gapGroups.get(segment.gapDepth);
      const left = Math.min(segment.x1, segment.x2);
      const right = Math.max(segment.x1, segment.x2);
      const existing = groups.get(segment.group);
      if (existing) {
        existing.left = Math.min(existing.left, left);
        existing.right = Math.max(existing.right, right);
      } else {
        groups.set(segment.group, { left, right });
      }
    });

    const laneYByKey = new Map();

    gapGroups.forEach((groups, gapDepth) => {
      const list = [...groups.entries()].map(([group, interval]) => ({
        group,
        ...interval,
      }));
      list.sort(
        (first, second) =>
          first.left - second.left || first.right - second.right
      );

      const laneEnds = [];
      const laneOf = new Map();

      list.forEach((interval) => {
        let lane = laneEnds.findIndex((end) => end <= interval.left - 10);
        if (lane < 0) {
          lane = laneEnds.length;
          laneEnds.push(interval.right);
        } else {
          laneEnds[lane] = Math.max(laneEnds[lane], interval.right);
        }
        if (lane >= MAX_ROUTING_LANES) {
          // Extremely dense rows reuse the last lane instead of drawing lines
          // outside the gap.
          lane = MAX_ROUTING_LANES - 1;
        }
        laneOf.set(interval.group, lane);
      });

      const top = rowBottoms.get(gapDepth);
      const bottom = rowTops.get(gapDepth + 1);
      if (top == null || bottom == null || bottom <= top) return;

      const laneCount = Math.max(
        1,
        Math.min(laneEnds.length, MAX_ROUTING_LANES)
      );
      list.forEach((interval) => {
        const lane = laneOf.get(interval.group) || 0;
        laneYByKey.set(
          `${gapDepth}:${interval.group}`,
          top + ((bottom - top) * (lane + 1)) / (laneCount + 1)
        );
      });
    });

    const nextEdges = descriptors.map((descriptor) => {
      const skipsRows = descriptor.childDepth - descriptor.parentDepth > 1;
      const straight =
        !skipsRows && Math.abs(descriptor.endX - descriptor.junctionX) < 0.5;
      const midGapY =
        descriptor.parentBottom +
        (descriptor.endY - descriptor.parentBottom) / 2;
      const heartGroup = `p${descriptor.parentIndex}:${Math.round(
        descriptor.junctionX
      )}`;

      let path;

      if (straight) {
        path = `M ${descriptor.junctionX} ${descriptor.junctionY} V ${descriptor.endY}`;
      } else if (skipsRows) {
        const channelX =
          channelById.get(descriptor.id) ?? descriptor.endX;
        const laneA =
          laneYByKey.get(`${descriptor.parentDepth}:${heartGroup}`) ??
          midGapY;
        const laneB =
          laneYByKey.get(
            `${descriptor.childDepth - 1}:e${descriptor.id}`
          ) ?? descriptor.endY - 28;
        path = `M ${descriptor.junctionX} ${descriptor.junctionY} V ${laneA} H ${channelX} V ${laneB} H ${descriptor.endX} V ${descriptor.endY}`;
      } else {
        const laneY =
          laneYByKey.get(`${descriptor.parentDepth}:${heartGroup}`) ??
          midGapY;
        path = `M ${descriptor.junctionX} ${descriptor.junctionY} V ${laneY} H ${descriptor.endX} V ${descriptor.endY}`;
      }

      return {
        id: descriptor.id,
        path,
        isFormerSpouseEdge: descriptor.isFormerSpouseEdge,
      };
    });

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
            const formerMemberIds =
              unit.formerMemberIds || new Set();
            const familyIds = unit.familyIds || [];
            const childCount = familyIds.reduce(
              (sum, familyId) => sum + (childCounts[String(familyId)] || 0),
              0
            );
            const collapsedSet = new Set(collapsedFamilyIds.map(String));
            const isCollapsed =
              familyIds.length > 0 &&
              familyIds.some((familyId) => collapsedSet.has(String(familyId)));

            // Partners who are not beside each other get a line that runs
            // behind the cards, with the heart in the visible gap beside the
            // ex-spouse (or the first partner for a current marriage).
            const behindLinks = unitRelationships
              .map((relationship) => {
                const firstIndex = unit.members.findIndex(
                  (member) => String(member.id) === String(relationship.firstId)
                );
                const secondIndex = unit.members.findIndex(
                  (member) => String(member.id) === String(relationship.secondId)
                );
                if (firstIndex < 0 || secondIndex < 0) return null;
                if (Math.abs(firstIndex - secondIndex) === 1) return null;

                const leftIndex = Math.min(firstIndex, secondIndex);
                const rightIndex = Math.max(firstIndex, secondIndex);
                const gapIndex = unit.heartGapByPair?.get(
                  pairKeyOf(relationship.firstId, relationship.secondId)
                );
                if (gapIndex == null) return null;
                const gapX =
                  (unit.memberCenters[gapIndex] +
                    unit.memberCenters[gapIndex + 1]) /
                  2;

                return {
                  key: `behind-${relationship.firstId}-${relationship.secondId}`,
                  heartKey: `heart-${unit.id}-${unit.members[leftIndex].id}-${unit.members[rightIndex].id}`,
                  left: unit.memberCenters[leftIndex],
                  width: unit.memberCenters[rightIndex] - unit.memberCenters[leftIndex],
                  heartX: gapX,
                  broken: relationship.status === 'former',
                  former: relationship.status === 'former',
                };
              })
              .filter(Boolean);

            return (
              <div
                className={`spouse-unit${unit.members.length > 1 ? ' is-couple' : ''}`}
                key={unit.id}
                role="listitem"
                style={{ left: `${unit.x || 0}px` }}
              >
                {behindLinks.map((link) => (
                  <span
                    aria-hidden="true"
                    className={`spouse-link-behind${link.former ? ' is-former' : ''}`}
                    key={`${link.key}-line`}
                    style={{ left: `${link.left}px`, width: `${link.width}px` }}
                  />
                ))}
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
                      ? childCount === 1
                        ? t('branch.showChild')
                        : t('branch.showChildren', { count: childCount })
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
                          style={{
                            width: `${
                              unit.linkWidths?.[memberIndex - 1] ||
                              SPOUSE_LINK_WIDTH
                            }px`,
                          }}
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
                        hasBranch={Boolean(branchFlagsById?.get(String(member.id))?.hasBranch)}
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
                {behindLinks.map((link) => (
                  <span
                    aria-hidden="true"
                    className="spouse-gap-heart"
                    key={`${link.key}-heart`}
                    ref={(node) => setHeartRef(link.heartKey, node)}
                    style={{ left: `${link.heartX}px` }}
                  >
                    <span className="spouse-link-heart">
                      <HeartIcon broken={link.broken} />
                    </span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
