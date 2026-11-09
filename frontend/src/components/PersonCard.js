import React from 'react';
import { useI18n } from '../i18n';

function initials(person) {
  const first = (person.firstName || '').trim().charAt(0);
  const last = (person.lastName || '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

export default function PersonCard({
  person,
  onAddChild,
  onAddSpouse,
  onDelete,
  onEdit,
  onView,
  showSpouseName = true,
  cardRef,
}) {
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

  const handleCardClick = () => {
    if (onView) onView(person);
  };

  const handleKeyDown = (event) => {
    if (!onView) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onView(person);
    }
  };

  return (
    <article
      className={`person-card gender-${person.gender}${
        onView ? ' is-clickable' : ''
      }`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      ref={cardRef}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
    >
      <div className="person-main">
        <div className="avatar" aria-hidden="true">
          {initials(person)}
        </div>
        <div className="person-details">
          <h3>{fullName}</h3>
          <p className="person-life">{life}</p>
          {showSpouseName && person.spouseName && (
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
        {onAddSpouse && (
          <button
            aria-label={t('person.addSpouse', { name: fullName })}
            className="icon-button spouse"
            onClick={(event) => {
              event.stopPropagation();
              onAddSpouse(person);
            }}
            title={t('person.addSpouseTitle')}
            type="button"
          >
            ♥
          </button>
        )}
        <button
          aria-label={t('person.addChild', { name: fullName })}
          className="icon-button add"
          onClick={(event) => {
              event.stopPropagation();
              onAddChild(person);
            }}
          title={t('person.addChildTitle')}
          type="button"
        >
          +
        </button>
        <button
          aria-label={t('person.edit', { name: fullName })}
          className="icon-button"
          onClick={(event) => {
              event.stopPropagation();
              onEdit(person);
            }}
          title={t('person.editTitle')}
          type="button"
        >
          ✎
        </button>
        <button
          aria-label={t('person.delete', { name: fullName })}
          className="icon-button danger"
          onClick={(event) => {
              event.stopPropagation();
              onDelete(person);
            }}
          title={t('person.deleteTitle')}
          type="button"
        >
          ×
        </button>
      </div>
    </article>
  );
}
