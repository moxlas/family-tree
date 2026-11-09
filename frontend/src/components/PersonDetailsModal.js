import React, { useEffect } from 'react';
import { useI18n } from '../i18n';

function genderLabel(t, gender) {
  if (gender === 'male') return t('modal.genderMale');
  if (gender === 'female') return t('modal.genderFemale');
  if (gender === 'other') return t('modal.genderOther');
  return t('modal.genderUnknown');
}

export default function PersonDetailsModal({ person, people, onClose, onEdit }) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  if (!person) return null;

  const fullName = `${person.firstName} ${person.lastName}`.trim();
  const byId = new Map((people || []).map((entry) => [entry.id, entry]));
  const spouse = person.spouseId ? byId.get(String(person.spouseId)) : null;
  const parent = person.parentId ? byId.get(String(person.parentId)) : null;

  let life = t('person.datesUnknown');
  if (person.birthDate && person.deathDate) {
    life = `${person.birthDate} – ${person.deathDate}`;
  } else if (person.birthDate) {
    life = t('person.born', { date: person.birthDate });
  } else if (person.deathDate) {
    life = t('person.died', { date: person.deathDate });
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="person-details-title"
        aria-modal="true"
        className="modal-card details-card"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('details.eyebrow')}</p>
            <h2 id="person-details-title">
              {t('details.title', { name: fullName })}
            </h2>
          </div>
          <button
            aria-label={t('common.close')}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="details-identity">
          <div className={`avatar details-avatar gender-${person.gender}`}>
            {`${(person.firstName || '').charAt(0)}${(person.lastName || '').charAt(0)}`.toUpperCase() || '?'}
          </div>
          <div>
            <strong>{fullName}</strong>
            <p>{life}</p>
          </div>
        </div>

        <dl className="details-list">
          <div>
            <dt>{t('details.gender')}</dt>
            <dd>{genderLabel(t, person.gender)}</dd>
          </div>
          {person.birthDate && (
            <div>
              <dt>{t('details.birth')}</dt>
              <dd>{person.birthDate}</dd>
            </div>
          )}
          {person.deathDate && (
            <div>
              <dt>{t('details.death')}</dt>
              <dd>{person.deathDate}</dd>
            </div>
          )}
          <div>
            <dt>{t('details.spouse')}</dt>
            <dd>
              {spouse
                ? `${spouse.firstName} ${spouse.lastName}`.trim()
                : person.spouseName || t('modal.noLinkedSpouse')}
            </dd>
          </div>
          {parent && (
            <div>
              <dt>{t('details.parent')}</dt>
              <dd>{`${parent.firstName} ${parent.lastName}`.trim()}</dd>
            </div>
          )}
          <div>
            <dt>{t('details.notes')}</dt>
            <dd className="details-notes">
              {person.notes || t('details.noNotes')}
            </dd>
          </div>
        </dl>

        <div className="modal-actions">
          {onEdit && (
            <button
              className="button secondary"
              onClick={() => {
                onEdit(person);
                onClose();
              }}
              type="button"
            >
              {t('person.editTitle')}
            </button>
          )}
          <button className="button primary" onClick={onClose} type="button">
            {t('details.close')}
          </button>
        </div>
      </section>
    </div>
  );
}
