import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

function initialState(person, initialParentId, initialSpouseId) {
  return {
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    gender: person?.gender || 'unknown',
    birthDate: person?.birthDate || '',
    deathDate: person?.deathDate || '',
    spouseId: person?.spouseId
      ? String(person.spouseId)
      : initialSpouseId
        ? String(initialSpouseId)
        : '',
    spouseName: person?.spouseName || '',
    notes: person?.notes || '',
    parentId: initialParentId || '',
    secondParentId: person?.secondParentId ? String(person.secondParentId) : '',
  };
}

export default function PersonModal({
  anchorName,
  initialParentId,
  initialSpouseId,
  mode,
  onClose,
  onSubmit,
  people,
  person,
  relationship,
}) {
  const { t, translateApiError } = useI18n();
  const [form, setForm] = useState(() =>
    initialState(person, initialParentId, initialSpouseId)
  );
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

  const updateSpouse = (event) => {
    const nextSpouseId = event.target.value;

    setForm((current) => {
      const previousPartner = current.spouseId
        ? people.find((entry) => entry.id === current.spouseId)
        : null;
      const previousName = previousPartner
        ? `${previousPartner.firstName} ${previousPartner.lastName}`.trim()
        : '';

      return {
        ...current,
        spouseId: nextSpouseId,
        spouseName:
          !nextSpouseId && current.spouseName === previousName
            ? ''
            : current.spouseName,
      };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await onSubmit({
        ...form,
        parentId: form.parentId || null,
        spouseId: form.spouseId || null,
      });
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.savePerson'));
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = people.filter((entry) => entry.id !== person?.id);
  const spouseOptions = people.filter((entry) => {
    if (entry.id === person?.id) return false;
    if (!entry.spouseId) return true;
    return String(entry.spouseId) === String(person?.id);
  });

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
                : form.parentId
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
        className="modal-card"
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
              <span>{t('modal.gender')}</span>
              <select name="gender" onChange={update} value={form.gender}>
                <option value="unknown">{t('modal.genderUnknown')}</option>
                <option value="female">{t('modal.genderFemale')}</option>
                <option value="male">{t('modal.genderMale')}</option>
                <option value="other">{t('modal.genderOther')}</option>
              </select>
            </label>
            <label>
              <span>{t('modal.parent')}</span>
              <select name="parentId" onChange={update} value={form.parentId}>
                <option value="">{t('modal.noParent')}</option>
                {parentOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {`${entry.firstName} ${entry.lastName}`.trim()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('modal.secondParent')}</span>
              <select
                name="secondParentId"
                onChange={update}
                value={form.secondParentId}
              >
                <option value="">{t('modal.noSecondParent')}</option>
                {parentOptions
                  .filter((entry) => entry.id !== form.parentId)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {`${entry.firstName} ${entry.lastName}`.trim()}
                    </option>
                  ))}
              </select>
              <small className="field-hint">{t('modal.secondParentHint')}</small>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>{t('modal.birth')}</span>
              <input
                name="birthDate"
                onChange={update}
                placeholder={t('modal.birthPlaceholder')}
                value={form.birthDate}
              />
            </label>
            <label>
              <span>{t('modal.death')}</span>
              <input
                name="deathDate"
                onChange={update}
                placeholder={t('modal.deathPlaceholder')}
                value={form.deathDate}
              />
            </label>
          </div>

          <label>
            <span>{t('modal.linkedSpouse')}</span>
            <select
              name="spouseId"
              onChange={updateSpouse}
              value={form.spouseId}
            >
              <option value="">{t('modal.noLinkedSpouse')}</option>
              {spouseOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {`${entry.firstName} ${entry.lastName}`.trim()}
                </option>
              ))}
            </select>
            <small className="field-hint">{t('modal.linkedSpouseHint')}</small>
          </label>

          <label>
            <span>{t('modal.spouse')}</span>
            <input
              disabled={Boolean(form.spouseId)}
              name="spouseName"
              onChange={update}
              placeholder={t('modal.spousePlaceholder')}
              value={form.spouseName}
            />
            <small className="field-hint">{t('modal.spouseHint')}</small>
          </label>

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
