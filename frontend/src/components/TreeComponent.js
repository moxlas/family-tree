import React, { useMemo } from 'react';

function initials(person) {
  const first = (person.firstName || '').trim().charAt(0);
  const last = (person.lastName || '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

function lifespan(person) {
  if (person.birthDate && person.deathDate) {
    return `${person.birthDate} – ${person.deathDate}`;
  }
  if (person.birthDate) return `Born ${person.birthDate}`;
  if (person.deathDate) return `Died ${person.deathDate}`;
  return 'Dates not added';
}

function PersonCard({ person, onAddChild, onEdit, onDelete }) {
  const fullName = `${person.firstName} ${person.lastName}`.trim();

  return (
    <article className={`person-card gender-${person.gender}`}>
      <div className="person-main">
        <div className="avatar" aria-hidden="true">
          {initials(person)}
        </div>
        <div className="person-details">
          <h3>{fullName}</h3>
          <p className="person-life">{lifespan(person)}</p>
          {person.spouseName && (
            <p className="person-spouse">
              <span aria-hidden="true">♥</span> {person.spouseName}
            </p>
          )}
        </div>
      </div>

      <div className="person-actions">
        <button
          aria-label={`Add a child of ${fullName}`}
          className="icon-button add"
          onClick={() => onAddChild(person)}
          title="Add child"
          type="button"
        >
          +
        </button>
        <button
          aria-label={`Edit ${fullName}`}
          className="icon-button"
          onClick={() => onEdit(person)}
          title="Edit person"
          type="button"
        >
          ✎
        </button>
        <button
          aria-label={`Delete ${fullName}`}
          className="icon-button danger"
          onClick={() => onDelete(person)}
          title="Delete person"
          type="button"
        >
          ×
        </button>
      </div>
    </article>
  );
}

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

export default function TreeComponent({ people, onAddChild, onEdit, onDelete }) {
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
            person={person}
          />
        ))}
      </ul>
    </div>
  );
}
