import React, { useEffect, useState } from 'react';

function initialState(person, initialParentId) {
  return {
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    gender: person?.gender || 'unknown',
    birthDate: person?.birthDate || '',
    deathDate: person?.deathDate || '',
    spouseName: person?.spouseName || '',
    notes: person?.notes || '',
    parentId: initialParentId || '',
  };
}

export default function PersonModal({
  mode,
  person,
  people,
  initialParentId,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(() => initialState(person, initialParentId));
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

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await onSubmit({ ...form, parentId: form.parentId || null });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          'Could not save this person. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = people.filter((entry) => entry.id !== person?.id);

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
            <p className="eyebrow">{mode === 'edit' ? 'Update details' : 'New relative'}</p>
            <h2 id="person-modal-title">
              {mode === 'edit'
                ? `Edit ${person?.firstName || 'person'}`
                : form.parentId
                  ? 'Add a child'
                  : 'Add a person'}
            </h2>
          </div>
          <button
            aria-label="Close"
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
              <span>First name *</span>
              <input
                autoFocus
                name="firstName"
                onChange={update}
                placeholder="Maria"
                required
                value={form.firstName}
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                name="lastName"
                onChange={update}
                placeholder="Doe"
                value={form.lastName}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Gender</span>
              <select name="gender" onChange={update} value={form.gender}>
                <option value="unknown">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Parent in this tree</span>
              <select name="parentId" onChange={update} value={form.parentId}>
                <option value="">No parent / family root</option>
                {parentOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {`${entry.firstName} ${entry.lastName}`.trim()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Birth date or year</span>
              <input
                name="birthDate"
                onChange={update}
                placeholder="e.g. 1945 or 1945-06-12"
                value={form.birthDate}
              />
            </label>
            <label>
              <span>Death date or year</span>
              <input
                name="deathDate"
                onChange={update}
                placeholder="Leave empty if living"
                value={form.deathDate}
              />
            </label>
          </div>

          <label>
            <span>Spouse or partner</span>
            <input
              name="spouseName"
              onChange={update}
              placeholder="Name shown beside this person"
              value={form.spouseName}
            />
          </label>

          <label>
            <span>Notes and memories</span>
            <textarea
              name="notes"
              onChange={update}
              placeholder="A story, occupation, place, or anything worth remembering…"
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
              Cancel
            </button>
            <button className="button primary" disabled={saving} type="submit">
              {saving
                ? 'Saving…'
                : mode === 'edit'
                  ? 'Save changes'
                  : 'Add to tree'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
