import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';
import { buildShareUrl } from '../share';

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy failed');
}

export default function TreesModal({
  trees,
  activeTreeId,
  onClose,
  onSelect,
  onCreated,
  onUpdated,
  onDeleted,
}) {
  const { t, tn, translateApiError } = useI18n();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sharingBusyId, setSharingBusyId] = useState('');
  const [copiedTreeId, setCopiedTreeId] = useState('');
  const [shareError, setShareError] = useState('');
  const renameRef = useRef(null);

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

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!copiedTreeId) return undefined;
    const timer = window.setTimeout(() => setCopiedTreeId(''), 2500);
    return () => window.clearTimeout(timer);
  }, [copiedTreeId]);

  useEffect(() => {
    if (renameId && renameRef.current) renameRef.current.focus();
  }, [renameId]);

  const createTree = async (event) => {
    event.preventDefault();
    const title = name.trim();
    if (!title) return;

    setError('');
    setNotice('');
    setCreating(true);

    try {
      const response = await api.post('/trees', { name: title });
      setName('');
      onCreated(response.data);
      setNotice(t('notice.treeCreated'));
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.createTree'));
    } finally {
      setCreating(false);
    }
  };

  const beginRename = (tree) => {
    setError('');
    setNotice('');
    setRenameId(tree.id);
    setRenameName(tree.name);
  };

  const cancelRename = () => {
    setRenameId(null);
    setRenameName('');
  };

  const saveRename = async (event) => {
    event.preventDefault();
    const title = renameName.trim();
    if (!title || !renameId) return;

    setError('');
    setNotice('');
    setSavingId(renameId);

    try {
      const response = await api.put(`/trees/${renameId}`, { name: title });
      onUpdated(response.data);
      setNotice(t('notice.treeRenamed'));
      cancelRename();
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.renameTree'));
    } finally {
      setSavingId(null);
    }
  };

  const deleteTree = async (tree) => {
    const confirmed = window.confirm(
      t('confirm.deleteTree', { name: tree.name, count: tree.peopleCount })
    );
    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingId(tree.id);

    try {
      await api.delete(`/trees/${tree.id}`);
      onDeleted(tree.id);
      setNotice(t('notice.treeDeleted'));
      if (renameId === tree.id) cancelRename();
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.deleteTree'));
    } finally {
      setDeletingId(null);
    }
  };

  const updateSharing = async (tree, body) => {
    setSharingBusyId(tree.id);
    setShareError('');
    setNotice('');

    try {
      const response = await api.put(`/trees/${tree.id}/sharing`, body);
      onUpdated(response.data);
      setNotice(
        body.rotate
          ? t('trees.shareRotatedNotice')
          : body.enabled
            ? t('trees.shareEnabledNotice')
            : t('trees.shareDisabledNotice')
      );
    } catch (requestError) {
      setShareError(translateApiError(requestError, 'errors.saveSettings'));
    } finally {
      setSharingBusyId('');
    }
  };

  const toggleSharing = (tree, enabled) => {
    updateSharing(tree, { enabled });
  };

  const rotateSharing = (tree) => {
    if (!window.confirm(t('trees.shareRotateConfirm'))) return;
    updateSharing(tree, { rotate: true });
  };

  const copyShareLink = async (tree) => {
    const url = buildShareUrl(tree.sharing?.token);
    if (!url) return;

    setShareError('');
    try {
      await copyToClipboard(url);
      setCopiedTreeId(tree.id);
    } catch (_error) {
      setShareError(t('trees.shareCopyError'));
    }
  };

  const openTree = (treeId) => {
    onSelect(treeId);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="trees-modal-title"
        aria-modal="true"
        className="modal-card trees-card"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('trees.manageEyebrow')}</p>
            <h2 id="trees-modal-title">{t('trees.manageTitle')}</h2>
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

        <p className="settings-copy">{t('trees.manageCopy')}</p>

        {notice && (
          <div className="alert success settings-alert" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <ul className="tree-list">
          {trees.map((tree) => {
            const isActive = tree.id === activeTreeId;
            const isRenaming = renameId === tree.id;

            return (
              <li
                className={`tree-list-item${isActive ? ' is-active' : ''}`}
                key={tree.id}
              >
                {isRenaming ? (
                  <form className="tree-rename-form" onSubmit={saveRename}>
                    <label className="sr-only" htmlFor={`rename-${tree.id}`}>
                      {t('trees.renameLabel', { name: tree.name })}
                    </label>
                    <input
                      id={`rename-${tree.id}`}
                      maxLength={120}
                      onChange={(event) => setRenameName(event.target.value)}
                      ref={renameRef}
                      required
                      value={renameName}
                    />
                    <button
                      className="button primary small"
                      disabled={savingId === tree.id}
                      type="submit"
                    >
                      {savingId === tree.id
                        ? t('trees.saving')
                        : t('trees.save')}
                    </button>
                    <button
                      className="button ghost small"
                      onClick={cancelRename}
                      type="button"
                    >
                      {t('trees.cancelRename')}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="tree-list-copy">
                      <div className="tree-list-title">
                        <strong>{tree.name}</strong>
                        {isActive && (
                          <span className="mode-badge">
                            {t('trees.currentBadge')}
                          </span>
                        )}
                        {tree.sharing?.enabled && (
                          <span className="mode-badge share-badge">
                            {t('trees.sharingOn')}
                          </span>
                        )}
                      </div>
                      <span className="tree-list-meta">
                        {tn('trees.people', tree.peopleCount || 0)}
                      </span>
                    </div>

                    <div className="tree-list-actions">
                      {!isActive && (
                        <button
                          className="button secondary small"
                          onClick={() => openTree(tree.id)}
                          type="button"
                        >
                          {t('trees.open')}
                        </button>
                      )}
                      <button
                        className="button ghost small"
                        onClick={() => beginRename(tree)}
                        type="button"
                      >
                        {t('trees.rename')}
                      </button>
                      <button
                        className="button ghost small danger-text"
                        disabled={trees.length <= 1 || deletingId === tree.id}
                        onClick={() => deleteTree(tree)}
                        title={
                          trees.length <= 1 ? t('trees.lastTreeHint') : undefined
                        }
                        type="button"
                      >
                        {t('trees.delete')}
                      </button>
                    </div>

                    <div className="share-tree-item share-tree-inline">
                      <div className="share-tree-top">
                        <div className="tree-list-copy">
                          <div className="tree-list-title">
                            <strong>{t('trees.sharingTitle')}</strong>
                            <span className="mode-badge">
                              {tree.sharing?.enabled && tree.sharing?.token
                                ? t('trees.sharingOn')
                                : t('trees.sharingOff')}
                            </span>
                          </div>
                          <span className="tree-list-meta">
                            {tree.sharing?.enabled && tree.sharing?.token
                              ? t('trees.sharingOnHint')
                              : t('trees.sharingOffHint')}
                          </span>
                        </div>

                        <label className="switch">
                          <input
                            aria-label={t('trees.shareToggleAria', {
                              name: tree.name,
                            })}
                            checked={Boolean(
                              tree.sharing?.enabled && tree.sharing?.token
                            )}
                            disabled={sharingBusyId === tree.id}
                            onChange={(event) =>
                              toggleSharing(tree, event.target.checked)
                            }
                            type="checkbox"
                          />
                          <span className="switch-track" aria-hidden="true">
                            <span className="switch-thumb" />
                          </span>
                        </label>
                      </div>

                      <p className="settings-copy">{t('trees.sharingCopy')}</p>

                      {shareError && sharingBusyId === '' && (
                        <div className="form-error" role="alert">
                          {shareError}
                        </div>
                      )}

                      {tree.sharing?.enabled && tree.sharing?.token && (
                        <>
                          <div className="share-link-row">
                            <input
                              aria-label={t('trees.shareLinkLabel', {
                                name: tree.name,
                              })}
                              onFocus={(event) => event.target.select()}
                              readOnly
                              value={buildShareUrl(tree.sharing.token)}
                            />
                            <button
                              className="button secondary small"
                              onClick={() => copyShareLink(tree)}
                              type="button"
                            >
                              {copiedTreeId === tree.id
                                ? t('trees.shareCopied')
                                : t('trees.shareCopy')}
                            </button>
                          </div>

                          <div className="share-link-actions">
                            <button
                              className="button ghost small"
                              onClick={() =>
                                window.open(
                                  buildShareUrl(tree.sharing.token),
                                  '_blank',
                                  'noopener,noreferrer'
                                )
                              }
                              type="button"
                            >
                              {t('trees.shareOpen')}
                            </button>
                            <button
                              className="button ghost small"
                              disabled={sharingBusyId === tree.id}
                              onClick={() => rotateSharing(tree)}
                              type="button"
                            >
                              {t('trees.shareNewLink')}
                            </button>
                            {sharingBusyId === tree.id && (
                              <span className="settings-saving" role="status">
                                {t('settings.savingPreferences')}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {trees.length <= 1 && (
          <p className="settings-mode-note">{t('trees.lastTreeHint')}</p>
        )}

        <section className="settings-section" aria-labelledby="create-tree-title">
          <h3 id="create-tree-title">{t('trees.createTitle')}</h3>
          <p className="settings-copy">{t('trees.createCopy')}</p>

          <form className="tree-create-form" onSubmit={createTree}>
            <label>
              <span>{t('trees.name')}</span>
              <input
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('trees.namePlaceholder')}
                required
                value={name}
              />
            </label>
            <button className="button primary" disabled={creating} type="submit">
              {creating ? t('trees.creating') : t('trees.create')}
            </button>
          </form>
        </section>

        <div className="modal-actions">
          <button className="button secondary" onClick={onClose} type="button">
            {t('common.close')}
          </button>
        </div>
      </section>
    </div>
  );
}
