import React, { useMemo } from 'react';
import PersonCard from './PersonCard';

function TreeNode({ person, childrenByParent, ...actions }) {
  const children = childrenByParent.get(person.id) || [];

  return (
    <li className="tree-item">
      <PersonCard person={person} {...actions} />
      {children.length > 0 && (
        <ul className="tree-children">
          {children.map((child) => (
            <TreeNode
              childrenByParent={childrenByParent}
              key={child.id}
              person={child}
              {...actions}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TreeComponent({
  people,
  onAddChild,
  onDelete,
  onEdit,
  onView,
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
            key={person.id}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onEdit={onEdit}
            onView={onView}
            person={person}
          />
        ))}
      </ul>
    </div>
  );
}
