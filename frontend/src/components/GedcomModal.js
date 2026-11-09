import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { MAX_INDIVIDUALS, parseGedcom } from '../gedcom';
import { useI18n } from '../i18n';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_VISIBLE_WARNINGS = 12;

function WarningList({ warnings, total }) {
  const { t, tn } = useI18n();
  const visible = (warnings || []).slice(0, MAX_VISIBLE_WARNINGS);
  const count = total == null ? visible.length : total;

  if (!count) {
    return <p className="gedcom-ok">{t('gedcom.noWarnings')}</p>;
  }

  return (
    <section className="gedcom-warning-box" aria-labelledby="gedcom-warnings">
      <div className="gedcom-warning-heading">
        <h4 id="gedcom-warnings">{t('gedcom.warnings')}</h4>
        <span className="warning-count">
          {tn('gedcom.warningCount', count)}
        </span>
      </div>
      <ul>
        {visible.map((warning, index) => (
          <li key={`${warning.code}-${index}`}>
            {t(`gedcom.warn.${warning.code}`, warning.values)}
          </li>
        ))}
      </ul>
      {count > visible.length && (
        <p className="gedcom-more">
          {t('gedcom.moreWarnings', { count: count - visible.length })}
        </p>
      )}
    </section>
  );
}

export default function GedcomModal({ tree, onClose, onImported }) {
  const { language, t, translateApiError } = useI18n();
  const [status, setStatus] = useState('idle');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !importing) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [importing, onClose]);

  const resetFile = () => {
    setStatus('idle');
    setFileName('');
    setParsed(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setParsed(null);
    setFileName(file.name);

    if (file.size > MAX_FILE_BYTES) {
      setError(t('gedcom.fileTooLarge'));
      setStatus('idle');
      return;
    }

    setStatus('parsing');

    try {
      const text = await file.text();
      const nextParsed = parseGedcom(text, language);

      if (!nextParsed.individuals.length) {
        setError(t('gedcom.noPeople'));
        setStatus('idle');
        return;
      }

      if (nextParsed.individuals.length > MAX_INDIVIDUALS) {
        setError(
          t('gedcom.tooMany', {
            count: nextParsed.individuals.length,
            max: MAX_INDIVIDUALS,
          })
        );
        setStatus('idle');
        return;
      }

      setParsed(nextParsed);
      setStatus('preview');
    } catch (_error) {
      setError(t('gedcom.parseError'));
      setStatus('idle');
    }
  };

  const runImport = async () => {
    if (!parsed) return;

    setError('');
    setImporting(true);

    try {
      const response = await api.post(`/trees/${tree.id}/import`, {
        individuals: parsed.individuals,
        families: parsed.families,
      });
      setResult(response.data);
      setStatus('result');
      onImported();
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.importGedcom'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !importing) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="gedcom-modal-title"
        aria-modal="true"
        className="modal-card gedcom-card"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('gedcom.eyebrow')}</p>
            <h2 id="gedcom-modal-title">{t('gedcom.importTitle')}</h2>
          </div>
          <button
            aria-label={t('common.close')}
            className="icon-button"
            disabled={importing}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {status !== 'result' && (
          <p className="settings-copy">
            {t('gedcom.mergeHint', { tree: tree.name })}
          </p>
        )}

        {status === 'idle' && (
          <div className="gedcom-picker">
            <p className="gedcom-picker-title">{t('gedcom.chooseFile')}</p>
            <p className="gedcom-picker-hint">{t('gedcom.fileHint')}</p>
            <input
              accept=".ged,.gedcom,text/plain"
              aria-label={t('gedcom.chooseFile')}
              onChange={chooseFile}
              ref={fileInputRef}
              type="file"
            />
            {fileName && (
              <p className="gedcom-file-name">
                {t('gedcom.selectedFile', { name: fileName })}
              </p>
            )}
          </div>
        )}

        {status === 'parsing' && (
          <div className="gedcom-loading" role="status">
            <div className="loading-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>{t('gedcom.reading')}</p>
          </div>
        )}

        {status === 'preview' && parsed && (
          <>
            <p className="gedcom-file-name">
              {t('gedcom.selectedFile', { name: fileName })}
            </p>

            <div className="gedcom-stats">
              <div>
                <strong>{parsed.stats.individuals}</strong>
                <span>{t('gedcom.individuals')}</span>
              </div>
              <div>
                <strong>{parsed.stats.families}</strong>
                <span>{t('gedcom.families')}</span>
              </div>
              <div>
                <strong>{parsed.stats.dated}</strong>
                <span>{t('gedcom.dated')}</span>
              </div>
              <div>
                <strong>{parsed.stats.notes}</strong>
                <span>{t('gedcom.notes')}</span>
              </div>
            </div>

            <div className="gedcom-preview-heading">
              <div>
                <h3>{t('gedcom.previewTitle')}</h3>
                <p>{t('gedcom.previewCopy')}</p>
              </div>
            </div>

            <WarningList warnings={parsed.warnings} total={parsed.warnings.length} />

            <div className="modal-actions">
              <button
                className="button ghost"
                disabled={importing}
                onClick={resetFile}
                type="button"
              >
                {t('gedcom.changeFile')}
              </button>
              <button className="button secondary" onClick={onClose} type="button">
                {t('common.cancel')}
              </button>
              <button
                className="button primary"
                disabled={importing}
                onClick={runImport}
                type="button"
              >
                {importing ? t('gedcom.importing') : t('gedcom.doImport')}
              </button>
            </div>
          </>
        )}

        {status === 'result' && result && (
          <>
            <div className="alert success gedcom-result-banner" role="status">
              {t('gedcom.resultCopy', { tree: tree.name })}
            </div>

            <div className="gedcom-stats gedcom-result-stats">
              <div>
                <strong>{result.created}</strong>
                <span>{t('gedcom.created')}</span>
              </div>
              <div>
                <strong>{result.updated}</strong>
                <span>{t('gedcom.updated')}</span>
              </div>
              <div>
                <strong>{result.spouseLinks}</strong>
                <span>{t('gedcom.spouseLinks')}</span>
              </div>
              <div>
                <strong>{result.parentLinks}</strong>
                <span>{t('gedcom.parentLinks')}</span>
              </div>
            </div>

            <WarningList
              warnings={result.warnings}
              total={result.warningCount}
            />

            <div className="modal-actions">
              <button className="button ghost" onClick={resetFile} type="button">
                {t('gedcom.importAnother')}
              </button>
              <button className="button primary" onClick={onClose} type="button">
                {t('gedcom.done')}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
