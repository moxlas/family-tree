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
  onEdit,
  onDelete,
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

  return (
    <article className={`person-card gender-${person.gender}`} ref={cardRef}>
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
            onClick={() => onAddSpouse(person)}
            title={t('person.addSpouseTitle')}
            type="button"
          >
            ♥
          </button>
        )}
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
