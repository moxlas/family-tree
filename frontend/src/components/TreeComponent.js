import React, { useMemo } from 'react';
import PersonCard from './PersonCard';

function TreeNode({
  childrenByParent,
  homePersonId,
  onAddChild,
  onAddParent,
  onAddSibling,
  onAddSpouse,
  onDelete,
  onEdit,
  onView,
  person,
  suppressClickRef,
}) {
  const children = childrenByParent.get(person.id) || [];

  return (
    <li className="tree-item">
      <PersonCard
        isHome={String(homePersonId || '') === String(person.id)}
        onAddChild={onAddChild}
        onAddParent={onAddParent}
        onAddSibling={onAddSibling}
        onAddSpouse={onAddSpouse}
        onDelete={onDelete}
        onEdit={onEdit}
        onView={onView}
        person={person}
        suppressClickRef={suppressClickRef}
      />
      {children.length > 0 && (
        <ul className="tree-children">
          {children.map((child) => (
            <TreeNode
              childrenByParent={childrenByParent}
              homePersonId={homePersonId}
              key={child.id}
              onAddChild={onAddChild}
              onAddParent={onAddParent}
              onAddSibling={onAddSibling}
              onAddSpouse={onAddSpouse}
              onDelete={onDelete}
              onEdit={onEdit}
              onView={onView}
              person={child}
              suppressClickRef={suppressClickRef}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TreeComponent({
  homePersonId,
  onAddChild,
  onAddParent,
  onAddSibling,
  onAddSpouse,
  onDelete,
  onEdit,
  onView,
  people,
  suppressClickRef,
}) {
  const { roots, childrenByParent } = useMemo(() => {
    const ids = new Set(people.map((person) => person.id));
    const children = new Map();

    people.forEach((person) => {
      const parentId = person.parentId ? String(person.parentId) : null;
      if (!parentId || !ids.has(parentId)) return;
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(person);
    });

    const sortByName = (a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`
      );

    children.forEach((list) => list.sort(sortByName));

    return {
      roots: people
        .filter(
          (person) =>
            !person.parentId || !ids.has(String(person.parentId))
        )
        .sort(sortByName),
      childrenByParent: children,
    };
  }, [people]);

  return (
    <div className="family-tree">
      <ul className="tree-roots">
        {roots.map((person) => (
          <TreeNode
            childrenByParent={childrenByParent}
            homePersonId={homePersonId}
            key={person.id}
            onAddChild={onAddChild}
            onAddParent={onAddParent}
            onAddSibling={onAddSibling}
            onAddSpouse={onAddSpouse}
            onDelete={onDelete}
            onEdit={onEdit}
            onView={onView}
            person={person}
            suppressClickRef={suppressClickRef}
          />
        ))}
      </ul>
    </div>
  );
}
