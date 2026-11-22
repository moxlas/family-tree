import React, { useEffect } from 'react';
import { useI18n } from '../i18n';

export default function DeletePersonModal({
  descendantCount,
  onCancel,
  onConfirm,
  person,
}) {
  const { t, tn } = useI18n();
  const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="delete-person-title"
        aria-modal="true"
        className="modal-card confirm-card"
        role="dialog"
      >
        <header className="modal-heading">
          <div>
            <p className="eyebrow">{t('person.deleteTitle')}</p>
            <h2 id="delete-person-title">
              {t('confirm.deletePerson.title', { name })}
            </h2>
          </div>
          <button
            aria-label={t('common.close')}
            className="icon-button"
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </header>

        <p className="settings-copy">
          {t('confirm.deletePerson.copy', { name })}
        </p>
        <p className="delete-descendant-count">
          {tn('confirm.deletePerson.descendants', descendantCount)}
        </p>

        <div className="delete-options">
          <button
            className="delete-option"
            onClick={() => onConfirm('keep')}
            type="button"
          >
            <span aria-hidden="true" className="delete-option-icon">
              ↳
            </span>
            <span className="delete-option-copy">
              <strong>{t('confirm.deletePerson.keepTitle')}</strong>
              <span>{t('confirm.deletePerson.keepBody', { name })}</span>
            </span>
          </button>

          <button
            className="delete-option danger"
            onClick={() => onConfirm('all')}
            type="button"
          >
            <span aria-hidden="true" className="delete-option-icon">
              ×
            </span>
            <span className="delete-option-copy">
              <strong>{t('confirm.deletePerson.allTitle')}</strong>
              <span>{t('confirm.deletePerson.allBody', { name })}</span>
            </span>
          </button>
        </div>

        <div className="modal-actions">
          <button
            className="button ghost"
            onClick={onCancel}
            type="button"
          >
            {t('common.cancel')}
          </button>
        </div>
      </section>
    </div>
  );
}
