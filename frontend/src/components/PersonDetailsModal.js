import React, { useEffect } from 'react';
import { formatDateForDisplay } from '../dates';
import { previousSurnameFor } from '../gedcom';
import { personDeceasedLabel, useI18n } from '../i18n';
import { describeRelationship, formatRelationship } from '../relationships';

function genderLabel(t, gender) {
  if (gender === 'male') return t('modal.genderMale');
  if (gender === 'female') return t('modal.genderFemale');
  if (gender === 'other') return t('modal.genderOther');
  return t('modal.genderUnknown');
}

export default function PersonDetailsModal({
  families,
  onClose,
  onEdit,
  people,
  person,
  referenceKind = 'home',
  referencePersonId,
}) {
  const { language, t } = useI18n();

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
  const previousSurname = previousSurnameFor(person);
  const byId = new Map((people || []).map((entry) => [entry.id, entry]));

  const relatedFamilies = (families || []).filter(
    (family) =>
      family.husband === person.id ||
      family.wife === person.id ||
      (family.children || []).includes(person.id)
  );

  const parentIds = [];
  const childIds = [];
  const currentSpouseIds = [];
  const previousSpouseIds = [];

  function addSpouseId(ids, spouseId) {
    if (spouseId && !ids.includes(spouseId)) ids.push(spouseId);
  }

  relatedFamilies.forEach((family) => {
    const otherSpouseId =
      family.husband === person.id
        ? family.wife
        : family.wife === person.id
          ? family.husband
          : null;
    if (otherSpouseId) {
      addSpouseId(
        family.status === 'former' ? previousSpouseIds : currentSpouseIds,
        otherSpouseId
      );
    }
    if ((family.children || []).includes(person.id)) {
      if (family.husband && !parentIds.includes(family.husband)) {
        parentIds.push(family.husband);
      }
      if (family.wife && !parentIds.includes(family.wife)) {
        parentIds.push(family.wife);
      }
    }
    if (family.husband === person.id || family.wife === person.id) {
      (family.children || []).forEach((childId) => {
        if (!childIds.includes(childId)) childIds.push(childId);
      });
    }
  });

  if (person.spouseId) {
    addSpouseId(
      person.spouseStatus === 'former' ? previousSpouseIds : currentSpouseIds,
      person.spouseId
    );
  }

  [person.parentId, person.secondParentId].filter(Boolean).forEach((parentId) => {
    if (!parentIds.includes(String(parentId))) parentIds.push(String(parentId));
  });

  const currentSpouseIdSet = new Set(currentSpouseIds);
  const uniquePreviousSpouseIds = previousSpouseIds.filter(
    (id) => !currentSpouseIdSet.has(id)
  );

  const currentSpouseNames = currentSpouseIds
    .map((id) => {
      const entry = byId.get(String(id));
      return entry ? `${entry.firstName} ${entry.lastName}`.trim() : null;
    })
    .filter(Boolean);

  const previousSpouseNames = uniquePreviousSpouseIds
    .map((id) => {
      const entry = byId.get(String(id));
      return entry ? `${entry.firstName} ${entry.lastName}`.trim() : null;
    })
    .filter(Boolean);

  const currentSpouseFallback =
    !currentSpouseNames.length &&
    person.spouseName &&
    person.spouseStatus !== 'former'
      ? [person.spouseName]
      : [];
  const previousSpouseFallback =
    !previousSpouseNames.length &&
    person.spouseName &&
    person.spouseStatus === 'former'
      ? [person.spouseName]
      : [];

  const currentSpouseDisplay = currentSpouseNames.length
    ? currentSpouseNames
    : currentSpouseFallback;
  const previousSpouseDisplay = previousSpouseNames.length
    ? previousSpouseNames
    : previousSpouseFallback;

  const parentNames = parentIds
    .map((id) => {
      const entry = byId.get(String(id));
      return entry ? `${entry.firstName} ${entry.lastName}`.trim() : null;
    })
    .filter(Boolean);

  const childNames = childIds
    .map((id) => {
      const entry = byId.get(String(id));
      return entry ? `${entry.firstName} ${entry.lastName}`.trim() : null;
    })
    .filter(Boolean);

  let life = t('person.datesUnknown');
  if (person.birthDate && person.deathDate) {
    life = `${formatDateForDisplay(
      person.birthDate,
      language
    )} – ${formatDateForDisplay(person.deathDate, language)}`;
  } else if (person.birthDate) {
    life = t('person.born', {
      date: formatDateForDisplay(person.birthDate, language),
    });
  } else if (person.deathDate) {
    life = t('person.died', {
      date: formatDateForDisplay(person.deathDate, language),
    });
  } else if (person.deceased) {
    life = personDeceasedLabel(t, person);
  }

  const referencePerson = referencePersonId
    ? byId.get(String(referencePersonId))
    : null;
  let relationText = '';

  if (referencePerson) {
    const descriptor = describeRelationship({
      families,
      people,
      referenceId: referencePerson.id,
      targetId: person.id,
    });

    if (descriptor?.key === 'relation.self') {
      relationText =
        referenceKind === 'branch'
          ? t('relation.branchPerson')
          : t('relation.homePerson');
    } else if (descriptor) {
      relationText = t('details.relationTo', {
        relation: formatRelationship(descriptor, t, language),
        name: `${referencePerson.firstName} ${referencePerson.lastName}`.trim(),
      });
    }
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
            {relationText && (
              <p className="details-relation">{relationText}</p>
            )}
          </div>
        </div>

        <dl className="details-list">
          <div>
            <dt>{t('details.gender')}</dt>
            <dd>{genderLabel(t, person.gender)}</dd>
          </div>
          {previousSurname && (
            <div>
              <dt>{t('details.previousName')}</dt>
              <dd>{previousSurname}</dd>
            </div>
          )}
          {(person.birthDate || person.birthPlace) && (
            <div>
              <dt>{t('details.birth')}</dt>
              <dd>
                {[
                  person.birthDate
                    ? formatDateForDisplay(person.birthDate, language)
                    : '',
                  person.birthPlace || '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </dd>
            </div>
          )}
          {person.deathDate && (
            <div>
              <dt>{t('details.death')}</dt>
              <dd>{formatDateForDisplay(person.deathDate, language)}</dd>
            </div>
          )}
          {person.deceased && (
            <div>
              <dt>{t('details.status')}</dt>
              <dd>{personDeceasedLabel(t, person)}</dd>
            </div>
          )}
          <div>
            <dt>{t('details.currentSpouse')}</dt>
            <dd>
              {currentSpouseDisplay.length
                ? currentSpouseDisplay.join(', ')
                : t('modal.noLinkedSpouse')}
            </dd>
          </div>
          {previousSpouseDisplay.length > 0 && (
            <div>
              <dt>{t('details.previousSpouses')}</dt>
              <dd>{previousSpouseDisplay.join(', ')}</dd>
            </div>
          )}
          {parentNames.length > 0 && (
            <div>
              <dt>{t('details.parent')}</dt>
              <dd>{parentNames.join(', ')}</dd>
            </div>
          )}
          {childNames.length > 0 && (
            <div>
              <dt>{t('details.children')}</dt>
              <dd>{childNames.join(', ')}</dd>
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
