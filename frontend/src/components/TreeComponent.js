import React, { useMemo } from 'react';
import { useI18n } from '../i18n';

function initials(person) {
  const first = (person.firstName || '').trim().charAt(0);
  const last = (person.lastName || '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

function PersonCard({ person, onAddChild, onEdit, onDelete }) {
  const { t } = useI18n();
  const fullName = `${person.firstName} ${person.lastName}`.trim();

  let life = t('person.datesUnknown');
  if (person.birthDate && person.deathDate) {
    life = `${person.birthDate} – ${person.deathDate}`;
  } else if (person.birthDate) {
    life = t('person.born', { date: person.birthDate });
  } else if (person.deathDate) {
    life = t('person.died', { date: person.deathDate });
  }

  return (
    <article className={`person-card gender-${person.gender}`}>
      <div className="person-main">
        <div className="avatar" aria-hidden="true">
          {initials(person)}
        </div>
        <div className="person-details">
          <h3>{fullName}</h3>
          <p className="person-life">{life}</p>
          {person.spouseName && (
            <p
              aria-label={t('person.spouseLabel', { name: person.spouseName })}
              className="person-spouse"
            >
              <span aria-hidden="true">♥</span> {person.spouseName}
            </p>
          )}
        </div>
      </div>

      <div className="person-actions">
        <button
          aria-label={t('person.addChild', { name: fullName })}
          className="icon-button add"
          onClick={() => onAddChild(person)}
          title={t('person.addChildTitle')}
          type="button"
        >
          +
        </button>
        <button
          aria-label={t('person.edit', { name: fullName })}
          className="icon-button"
          onClick={() => onEdit(person)}
          title={t('person.editTitle')}
          type="button"
        >
          ✎
        </button>
        <button
          aria-label={t('person.delete', { name: fullName })}
          className="icon-button danger"
          onClick={() => onDelete(person)}
          title={t('person.deleteTitle')}
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
