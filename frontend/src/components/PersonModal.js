import React, { useEffect, useRef, useState } from 'react';
import { normalizeDateValue } from '../dates';
import { previousSurnameFor } from '../gedcom';
import { personDeceasedLabel, useI18n } from '../i18n';
import DateField from './DateField';

const RELATIONSHIP_STATUSES = [
  'married',
  'partner',
  'engaged',
  'divorced',
  'widowed',
  'separated',
];
const ACTIVE_RELATIONSHIP_STATUSES = new Set([
  'married',
  'partner',
  'engaged',
]);
const ENDED_RELATIONSHIP_STATUSES = new Set([
  'divorced',
  'widowed',
  'separated',
]);

function relationshipStatusForFamily(family, partner) {
  let status = RELATIONSHIP_STATUSES.includes(family.relationshipStatus)
    ? family.relationshipStatus
    : '';

  if (!status) {
    if (family.status === 'former') {
      if (family.separationDate) status = 'separated';
      else if (family.divorceDate) status = 'divorced';
      else if (partner?.deceased) status = 'widowed';
      else status = 'divorced';
    } else {
      status = partner?.deceased ? 'widowed' : 'married';
    }
  }

  if (ACTIVE_RELATIONSHIP_STATUSES.has(status) && partner?.deceased) {
    return 'widowed';
  }

  return status;
}

function relationshipBlockForFamily(family, person, byId) {
  const partnerId =
    String(family.husband) === String(person.id)
      ? family.wife
      : family.husband;
  const partner = partnerId ? byId.get(String(partnerId)) : null;

  return {
    key: `family-${family.id}-${String(partnerId || '')}`,
    partnerId: partnerId ? String(partnerId) : '',
    status: relationshipStatusForFamily(family, partner),
    startDate: family.marriageDate || '',
    startPlace: family.marriagePlace || '',
    endDate: family.separationDate || family.divorceDate || '',
  };
}

function emptyRelationship(status = 'married') {
  return {
    partnerId: '',
    status,
    startDate: '',
    startPlace: '',
    endDate: '',
  };
}

function relationshipsForPerson(person, families, people, initialSpouseId) {
  const byId = new Map((people || []).map((entry) => [String(entry.id), entry]));
  const blocks = [];
  const seen = new Set();

  if (person) {
    (families || []).forEach((family) => {
      const isHusband = String(family.husband || '') === String(person.id);
      const isWife = String(family.wife || '') === String(person.id);
      if (!isHusband && !isWife) return;

      const partnerId = isHusband ? family.wife : family.husband;
      if (!partnerId || seen.has(String(partnerId))) return;
      seen.add(String(partnerId));
      blocks.push(relationshipBlockForFamily(family, person, byId));
    });
  }

  let current = emptyRelationship('married');
  let previous = blocks;

  if (person) {
    const preferredId = person.spouseId ? String(person.spouseId) : '';
    const preferred =
      person.spouseStatus === 'former'
        ? null
        : blocks.find((block) => block.partnerId === preferredId);

    if (preferred) {
      current = preferred;
      previous = blocks.filter((block) => block !== preferred);
    } else {
      const active = blocks.find((block) =>
        ACTIVE_RELATIONSHIP_STATUSES.has(block.status)
      );
      if (active) {
        current = active;
        previous = blocks.filter((block) => block !== active);
      } else {
        previous = blocks;
      }
    }

    if (!current.partnerId && person.spouseId) {
      const spouseId = String(person.spouseId);
      const alreadyListed = blocks.some(
        (block) => block.partnerId === spouseId
      );

      if (alreadyListed) {
        previous = blocks;
      } else {
        const partner = byId.get(spouseId);
        const legacyBlock = {
          key: `legacy-${spouseId}`,
          partnerId: spouseId,
          status:
            person.spouseStatus === 'former'
              ? partner?.deceased
                ? 'widowed'
                : 'divorced'
              : partner?.deceased
                ? 'widowed'
                : 'married',
          startDate: '',
          startPlace: '',
          endDate: '',
        };

        if (person.spouseStatus === 'former') {
          previous = [legacyBlock, ...previous];
        } else {
          current = legacyBlock;
        }
      }
    }
  } else if (initialSpouseId) {
    const partner = byId.get(String(initialSpouseId));
    current = {
      ...emptyRelationship(partner?.deceased ? 'widowed' : 'married'),
      key: `initial-${String(initialSpouseId)}`,
      partnerId: String(initialSpouseId),
    };
  }

  return {
    current,
    previous: previous
      .filter((block) => block.partnerId)
      .map((block, index) => ({
        ...block,
        key: block.key || `previous-${index}-${block.partnerId}`,
      })),
  };
}

function sortPeopleByName(entries) {
  return [...entries].sort((first, second) => {
    const firstName = `${first.firstName || ''} ${first.lastName || ''}`.trim();
    const secondName = `${second.firstName || ''} ${second.lastName || ''}`.trim();
    return firstName.localeCompare(secondName, undefined, {
      sensitivity: 'base',
    });
  });
}

function initialState(person, relationships) {
  return {
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    previousName: previousSurnameFor(person),
    gender: person?.gender || 'unknown',
    birthDate: person?.birthDate || '',
    birthPlace: person?.birthPlace || '',
    deathDate: person?.deathDate || '',
    deceased: Boolean(person?.deceased),
    spouseName: person?.spouseName || '',
    currentRelationship: relationships.current,
    previousRelationships: relationships.previous,
    notes: person?.notes || '',
  };
}

// Parents are stored both on the person and in their birth family, so gather
// every known parent before deciding which one belongs in the father slot and
// which one in the mother slot.
function parentIdsForPerson(person, families) {
  const ids = [];
  const add = (id) => {
    if (!id) return;
    const key = String(id);
    if (!ids.includes(key)) ids.push(key);
  };

  if (person) {
    add(person.parentId);
    add(person.secondParentId);
    (families || []).forEach((family) => {
      const isChild = (family.children || []).some(
        (childId) => String(childId) === String(person.id)
      );
      if (!isChild) return;
      add(family.husband);
      add(family.wife);
    });
  }

  return ids;
}

function parentRolesFor({
  families,
  initialParentId,
  initialSecondParentId,
  people,
  person,
}) {
  const byId = new Map((people || []).map((entry) => [String(entry.id), entry]));
  const ids = person
    ? parentIdsForPerson(person, families)
    : [initialParentId, initialSecondParentId]
        .filter(Boolean)
        .map(String);

  const unique = [...new Set(ids)];
  let fatherId = '';
  let motherId = '';
  const unassigned = [];

  unique.forEach((id) => {
    const gender = byId.get(id)?.gender;
    if (gender === 'male' && !fatherId) fatherId = id;
    else if (gender === 'female' && !motherId) motherId = id;
    else unassigned.push(id);
  });

  unassigned.forEach((id) => {
    if (!fatherId) fatherId = id;
    else if (!motherId) motherId = id;
  });

  return { fatherId, motherId };
}

export default function PersonModal({
  anchorName,
  families = [],
  initialParentId,
  initialSecondParentId,
  initialSpouseId,
  mode,
  onClose,
  onSubmit,
  people,
  person,
  relationship,
}) {
  const { t, translateApiError } = useI18n();
  const [form, setForm] = useState(() => {
    const relationships = relationshipsForPerson(
      person,
      families,
      people,
      initialSpouseId
    );

    return {
      ...initialState(person, relationships),
      ...parentRolesFor({
        families,
        initialParentId,
        initialSecondParentId,
        people,
        person,
      }),
    };
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const updateChecked = (event) => {
    const { checked, name } = event.target;
    setForm((current) => ({
      ...current,
      [name]: checked,
      ...(name === 'deceased' && !checked ? { deathDate: '' } : {}),
    }));
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const relationshipKeyRef = useRef(0);

  const nextRelationshipKey = () => {
    relationshipKeyRef.current += 1;
    return `relationship-${relationshipKeyRef.current}`;
  };

  const setCurrentRelationshipField = (name, value) => {
    setForm((current) => ({
      ...current,
      currentRelationship: {
        ...current.currentRelationship,
        [name]: value,
      },
    }));
  };

  const setCurrentPartner = (event) => {
    const nextPartnerId = event.target.value;

    setForm((current) => {
      const previousPartnerId = String(
        current.currentRelationship.partnerId || ''
      );
      const changingPartner = String(nextPartnerId) !== previousPartnerId;
      const partner = people.find(
        (entry) => String(entry.id) === String(nextPartnerId)
      );
      let status = current.currentRelationship.status;

      if (!nextPartnerId) status = 'married';
      else if (partner?.deceased) status = 'widowed';

      return {
        ...current,
        currentRelationship: {
          ...current.currentRelationship,
          partnerId: nextPartnerId,
          status,
          ...(changingPartner
            ? { startDate: '', startPlace: '', endDate: '' }
            : {}),
        },
        previousRelationships: current.previousRelationships.filter(
          (block) => String(block.partnerId) !== String(nextPartnerId)
        ),
        spouseName: nextPartnerId ? '' : current.spouseName,
      };
    });
  };

  const setCurrentStatus = (event) => {
    const nextStatus = event.target.value;

    setForm((current) => {
      const partner = people.find(
        (entry) =>
          String(entry.id) === String(current.currentRelationship.partnerId)
      );
      const status =
        partner?.deceased && ACTIVE_RELATIONSHIP_STATUSES.has(nextStatus)
          ? 'widowed'
          : nextStatus;

      return {
        ...current,
        currentRelationship: {
          ...current.currentRelationship,
          status,
          ...(status === 'divorced' || status === 'separated'
            ? {}
            : { endDate: '' }),
        },
      };
    });
  };

  const addPreviousRelationship = () => {
    setForm((current) => ({
      ...current,
      previousRelationships: [
        ...current.previousRelationships,
        {
          key: nextRelationshipKey(),
          partnerId: '',
          status: 'divorced',
          startDate: '',
          startPlace: '',
          endDate: '',
        },
      ],
    }));
  };

  const removePreviousRelationship = (key) => {
    setForm((current) => ({
      ...current,
      previousRelationships: current.previousRelationships.filter(
        (block) => block.key !== key
      ),
    }));
  };

  const setPreviousRelationshipField = (key, name, value) => {
    setForm((current) => ({
      ...current,
      previousRelationships: current.previousRelationships.map((block) =>
        block.key === key ? { ...block, [name]: value } : block
      ),
    }));
  };

  const setPreviousPartner = (key, nextPartnerId) => {
    setForm((current) => {
      const partner = people.find(
        (entry) => String(entry.id) === String(nextPartnerId)
      );

      return {
        ...current,
        currentRelationship:
          nextPartnerId &&
          String(current.currentRelationship.partnerId) ===
            String(nextPartnerId)
            ? {
                ...current.currentRelationship,
                partnerId: '',
                status: 'married',
                startDate: '',
                startPlace: '',
                endDate: '',
              }
            : current.currentRelationship,
        previousRelationships: current.previousRelationships.map((block) => {
          if (block.key !== key) return block;

          const changingPartner =
            String(block.partnerId || '') !== String(nextPartnerId || '');
          let status = block.status;
          if (partner?.deceased) status = 'widowed';

          return {
            ...block,
            partnerId: nextPartnerId,
            status,
            ...(changingPartner
              ? { startDate: '', startPlace: '', endDate: '' }
              : {}),
          };
        }),
      };
    });
  };

  const setPreviousStatus = (key, nextStatus) => {
    setForm((current) => ({
      ...current,
      previousRelationships: current.previousRelationships.map((block) => {
        if (block.key !== key) return block;

        const partner = people.find(
          (entry) => String(entry.id) === String(block.partnerId)
        );
        const status =
          partner?.deceased && ACTIVE_RELATIONSHIP_STATUSES.has(nextStatus)
            ? 'widowed'
            : nextStatus;

        return {
          ...block,
          status,
          ...(status === 'divorced' || status === 'separated'
            ? {}
            : { endDate: '' }),
        };
      }),
    }));
  };

  const relationshipPayload = (block) => ({
    partnerId: block.partnerId || null,
    status: block.status,
    startDate: normalizeDateValue(block.startDate),
    startPlace: block.startPlace || '',
    divorceDate:
      block.status === 'divorced'
        ? normalizeDateValue(block.endDate)
        : '',
    separationDate:
      block.status === 'separated'
        ? normalizeDateValue(block.endDate)
        : '',
  });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const orderedParents = [form.fatherId, form.motherId].filter(Boolean);
      const current = form.currentRelationship;
      const previous = form.previousRelationships.filter(
        (block) => block.partnerId
      );

      await onSubmit({
        ...form,
        birthDate: normalizeDateValue(form.birthDate),
        deathDate: normalizeDateValue(form.deathDate),
        parentId: orderedParents[0] || null,
        secondParentId: orderedParents[1] || null,
        currentRelationship: current.partnerId
          ? relationshipPayload(current)
          : null,
        previousRelationships: previous.map(relationshipPayload),
        spouseId: current.partnerId || null,
        spouseStatus: ENDED_RELATIONSHIP_STATUSES.has(current.status)
          ? 'former'
          : 'current',
        deceased: Boolean(form.deceased),
        // Free-text spouse names only apply when no spouse is linked in
        // the tree; a linked spouse always supplies the name.
        spouseName: current.partnerId ? '' : form.spouseName,
        previousSpouseIds: previous.map((block) => block.partnerId),
      });
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.savePerson'));
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = sortPeopleByName(
    people.filter((entry) => entry.id !== person?.id)
  );
  const fatherOptions = sortPeopleByName(
    parentOptions.filter(
      (entry) => String(entry.id) !== String(form.motherId || '')
    )
  );
  const motherOptions = sortPeopleByName(
    parentOptions.filter(
      (entry) => String(entry.id) !== String(form.fatherId || '')
    )
  );

  const currentPartnerId = String(
    form.currentRelationship.partnerId || ''
  );
  const previousPartnerIds = new Set(
    form.previousRelationships
      .map((block) => String(block.partnerId || ''))
      .filter(Boolean)
  );

  const spouseOptions = sortPeopleByName(
    people.filter((entry) => {
      if (entry.id === person?.id) return false;
      if (previousPartnerIds.has(String(entry.id))) return false;
      if (String(entry.id) === currentPartnerId) return true;
      if (!entry.spouseId) return true;
      return String(entry.spouseId) === String(person?.id);
    })
  );

  const previousOptionsFor = (blockKey) => {
    const selectedElsewhere = new Set(
      form.previousRelationships
        .filter((block) => block.key !== blockKey)
        .map((block) => String(block.partnerId || ''))
        .filter(Boolean)
    );

    return sortPeopleByName(
      people.filter((entry) => {
        if (entry.id === person?.id) return false;
        if (String(entry.id) === currentPartnerId) return false;
        if (selectedElsewhere.has(String(entry.id))) return false;
        return true;
      })
    );
  };

  const startLabels = (status) => {
    if (status === 'engaged') {
      return {
        date: t('modal.engagementDate'),
        place: t('modal.engagementPlace'),
      };
    }
    if (status === 'partner') {
      return {
        date: t('modal.meetingDate'),
        place: t('modal.meetingPlace'),
      };
    }
    return {
      date: t('modal.marriageDate'),
      place: t('modal.marriagePlace'),
    };
  };

  const endLabel = (status) =>
    status === 'separated' ? t('modal.separationDate') : t('modal.divorceDate');

  const statusLabel = (status) => t(`relationship.${status}`);

  const title =
    mode === 'edit'
      ? t('modal.editTitle', { name: person?.firstName || '' })
      : relationship === 'spouse'
        ? t('modal.addSpouseTitle')
        : relationship === 'parent'
          ? t('modal.addParentTitle')
          : relationship === 'sibling'
            ? t('modal.addSiblingTitle')
            : relationship === 'child'
              ? t('modal.addChild')
              : initialSpouseId
                ? t('modal.addSpouseTitle')
                : form.fatherId || form.motherId
                  ? t('modal.addChild')
                  : t('modal.addPerson');

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="person-modal-title"
        aria-modal="true"
        className="modal-card person-modal-card"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {mode === 'edit'
                ? t('modal.updateDetails')
                : t('modal.newRelative')}
            </p>
            <h2 id="person-modal-title">{title}</h2>
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

        <form className="person-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>{t('modal.firstName')}</span>
              <input
                autoFocus
                name="firstName"
                onChange={update}
                placeholder={t('modal.firstNamePlaceholder')}
                required
                value={form.firstName}
              />
            </label>
            <label>
              <span>{t('modal.lastName')}</span>
              <input
                name="lastName"
                onChange={update}
                placeholder={t('modal.lastNamePlaceholder')}
                value={form.lastName}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>{t('modal.father')}</span>
              <select
                name="fatherId"
                onChange={update}
                value={form.fatherId || ''}
              >
                <option value="">{t('modal.noFather')}</option>
                {fatherOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {`${entry.firstName} ${entry.lastName}`.trim()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('modal.mother')}</span>
              <select
                name="motherId"
                onChange={update}
                value={form.motherId || ''}
              >
                <option value="">{t('modal.noMother')}</option>
                {motherOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {`${entry.firstName} ${entry.lastName}`.trim()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>{t('modal.gender')}</span>
              <select name="gender" onChange={update} value={form.gender}>
                <option value="unknown">{t('modal.genderUnknown')}</option>
                <option value="female">{t('modal.genderFemale')}</option>
                <option value="male">{t('modal.genderMale')}</option>
                <option value="other">{t('modal.genderOther')}</option>
              </select>
            </label>

            <label>
              <span>{t('modal.previousName')}</span>
              <input
                name="previousName"
                onChange={update}
                placeholder={t('modal.previousNamePlaceholder')}
                value={form.previousName}
              />
              <small className="field-hint">
                {t('modal.previousNameHint')}
              </small>
            </label>
          </div>

          <div className="form-grid-block">
            <div className="form-grid">
              <label>
                <span>{t('modal.birth')}</span>
                <DateField
                  name="birthDate"
                  onChange={setField}
                  placeholder={t('modal.birthPlaceholder')}
                  value={form.birthDate}
                />
              </label>
              {form.deceased && (
                <label>
                  <span>{t('modal.death')}</span>
                  <DateField
                    name="deathDate"
                    onChange={setField}
                    placeholder={t('modal.deathPlaceholder')}
                    value={form.deathDate}
                  />
                </label>
              )}
            </div>
            <small className="field-hint">{t('modal.dateHint')}</small>
          </div>

          <div className="form-grid form-grid-birth-deceased">
            <label>
              <span>{t('modal.birthPlace')}</span>
              <input
                name="birthPlace"
                onChange={update}
                placeholder={t('modal.birthPlacePlaceholder')}
                value={form.birthPlace}
              />
            </label>

            <label className="checkbox-row">
              <input
                checked={Boolean(form.deceased)}
                name="deceased"
                onChange={updateChecked}
                type="checkbox"
              />
              <span>{personDeceasedLabel(t, form)}</span>
            </label>
          </div>
          <small className="field-hint">{t('modal.deceasedHint')}</small>

          <div className="relationship-section">
            <div className="relationship-block">
              <p className="relationship-section-title">
                {t('modal.currentSpouse')}
              </p>

              <div className="relationship-row">
                <label>
                  <span>{t('modal.partner')}</span>
                  <select
                    name="currentPartnerId"
                    onChange={setCurrentPartner}
                    value={form.currentRelationship.partnerId || ''}
                  >
                    <option value="">{t('modal.noCurrentSpouse')}</option>
                    {spouseOptions.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {`${entry.firstName} ${entry.lastName}`.trim()}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{startLabels(form.currentRelationship.status).date}</span>
                  <DateField
                    name="currentRelationshipStartDate"
                    onChange={(_name, value) =>
                      setCurrentRelationshipField('startDate', value)
                    }
                    placeholder={t('modal.relationshipDatePlaceholder')}
                    value={form.currentRelationship.startDate || ''}
                  />
                </label>
                <label>
                  <span>
                    {startLabels(form.currentRelationship.status).place}
                  </span>
                  <input
                    name="currentRelationshipStartPlace"
                    onChange={(event) =>
                      setCurrentRelationshipField(
                        'startPlace',
                        event.target.value
                      )
                    }
                    placeholder={t('modal.relationshipPlacePlaceholder')}
                    value={form.currentRelationship.startPlace || ''}
                  />
                </label>
              </div>

              <div className="relationship-status-row">
                <label>
                  <span>{t('modal.spouseStatus')}</span>
                  <select
                    name="currentRelationshipStatus"
                    onChange={setCurrentStatus}
                    value={form.currentRelationship.status}
                  >
                    {RELATIONSHIP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                {(form.currentRelationship.status === 'divorced' ||
                  form.currentRelationship.status === 'separated') && (
                  <label>
                    <span>{endLabel(form.currentRelationship.status)}</span>
                    <DateField
                      name="currentRelationshipEndDate"
                      onChange={(_name, value) =>
                        setCurrentRelationshipField('endDate', value)
                      }
                      placeholder={t('modal.relationshipDatePlaceholder')}
                      value={form.currentRelationship.endDate || ''}
                    />
                  </label>
                )}
              </div>

              {!form.currentRelationship.partnerId &&
                form.previousRelationships.length === 0 && (
                <label className="relationship-spouse-name">
                  <span>{t('modal.spouse')}</span>
                  <input
                    name="spouseName"
                    onChange={update}
                    placeholder={t('modal.spousePlaceholder')}
                    value={form.spouseName}
                  />
                  <small className="field-hint">{t('modal.spouseHint')}</small>
                </label>
              )}
            </div>

            <div className="relationship-section-title relationship-previous-title">
              {t('modal.previousSpouses')}
            </div>

            {form.previousRelationships.map((block) => (
              <div
                className="relationship-block relationship-block-previous"
                key={block.key}
              >
                <div className="relationship-block-head">
                  <span>{t('modal.previousSpouseBlock')}</span>
                  <button
                    className="relationship-remove"
                    onClick={() => removePreviousRelationship(block.key)}
                    type="button"
                  >
                    {t('modal.removeRelationship')}
                  </button>
                </div>

                <div className="relationship-row">
                  <label>
                    <span>{t('modal.partner')}</span>
                    <select
                      name={`previousPartner-${block.key}`}
                      onChange={(event) =>
                        setPreviousPartner(block.key, event.target.value)
                      }
                      value={block.partnerId || ''}
                    >
                      <option value="">{t('modal.noPreviousSpouse')}</option>
                      {previousOptionsFor(block.key).map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {`${entry.firstName} ${entry.lastName}`.trim()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{startLabels(block.status).date}</span>
                    <DateField
                      name={`previousStartDate-${block.key}`}
                      onChange={(_name, value) =>
                        setPreviousRelationshipField(
                          block.key,
                          'startDate',
                          value
                        )
                      }
                      placeholder={t('modal.relationshipDatePlaceholder')}
                      value={block.startDate || ''}
                    />
                  </label>
                  <label>
                    <span>{startLabels(block.status).place}</span>
                    <input
                      name={`previousStartPlace-${block.key}`}
                      onChange={(event) =>
                        setPreviousRelationshipField(
                          block.key,
                          'startPlace',
                          event.target.value
                        )
                      }
                      placeholder={t('modal.relationshipPlacePlaceholder')}
                      value={block.startPlace || ''}
                    />
                  </label>
                </div>

                <div className="relationship-status-row">
                  <label>
                    <span>{t('modal.spouseStatus')}</span>
                    <select
                      name={`previousStatus-${block.key}`}
                      onChange={(event) =>
                        setPreviousStatus(block.key, event.target.value)
                      }
                      value={block.status}
                    >
                      {RELATIONSHIP_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {(block.status === 'divorced' ||
                    block.status === 'separated') && (
                    <label>
                      <span>{endLabel(block.status)}</span>
                      <DateField
                        name={`previousEndDate-${block.key}`}
                        onChange={(_name, value) =>
                          setPreviousRelationshipField(
                            block.key,
                            'endDate',
                            value
                          )
                        }
                        placeholder={t('modal.relationshipDatePlaceholder')}
                        value={block.endDate || ''}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}

            <button
              className="relationship-add"
              onClick={addPreviousRelationship}
              type="button"
            >
              <span aria-hidden="true">+</span>
              {t('modal.addPreviousSpouse')}
            </button>
          </div>

          <label>
            <span>{t('modal.notes')}</span>
            <textarea
              name="notes"
              onChange={update}
              placeholder={t('modal.notesPlaceholder')}
              rows={4}
              value={form.notes}
            />
          </label>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              {t('common.cancel')}
            </button>
            <button className="button primary" disabled={saving} type="submit">
              {saving
                ? t('modal.saving')
                : mode === 'edit'
                  ? t('modal.save')
                  : t('modal.addToTree')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
