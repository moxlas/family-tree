import React, { useEffect, useState } from 'react';
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

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || '?';
}

export default function SettingsModal({
  onClose,
  onTreeUpdated,
  onUserUpdate,
  trees = [],
  user,
}) {
  const { language, t, translateApiError } = useI18n();
  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email || '',
  });
  const [bloodlineOnly, setBloodlineOnly] = useState(
    Boolean(user.settings?.bloodlineOnly)
  );
  const [showFormerSpouses, setShowFormerSpouses] = useState(
    user.settings?.showFormerSpouses !== false
  );
  const [profileError, setProfileError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sharingBusyId, setSharingBusyId] = useState('');
  const [copiedTreeId, setCopiedTreeId] = useState('');
  const [shareError, setShareError] = useState('');
  const [notice, setNotice] = useState('');

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

  const updateProfile = (event) => {
    setProfile((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    setNotice('');
    setSavingProfile(true);

    try {
      const response = await api.put('/auth/profile', {
        name: profile.name.trim(),
        email: profile.email.trim(),
      });
      onUserUpdate(response.data.user);
      setNotice(t('settings.profileSaved'));
    } catch (requestError) {
      setProfileError(
        translateApiError(requestError, 'errors.saveProfile')
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleBloodlineOnly = async (event) => {
    const nextValue = event.target.checked;
    const previousValue = bloodlineOnly;

    setBloodlineOnly(nextValue);
    setSettingsError('');
    setNotice('');
    setSavingSettings(true);

    try {
      const response = await api.put('/auth/settings', {
        bloodlineOnly: nextValue,
      });
      onUserUpdate(response.data.user);
      setNotice(
        nextValue
          ? t('settings.bloodlineEnabledNotice')
          : t('settings.spouseModeEnabledNotice')
      );
    } catch (requestError) {
      setBloodlineOnly(previousValue);
      setSettingsError(
        translateApiError(requestError, 'errors.saveSettings')
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleFormerSpouses = async (event) => {
    const nextValue = event.target.checked;
    const previousValue = showFormerSpouses;

    setShowFormerSpouses(nextValue);
    setSettingsError('');
    setNotice('');
    setSavingSettings(true);

    try {
      const response = await api.put('/auth/settings', {
        bloodlineOnly,
        showFormerSpouses: nextValue,
      });
      onUserUpdate(response.data.user);
      setNotice(
        nextValue
          ? t('settings.showFormerSpousesNotice')
          : t('settings.hideFormerSpousesNotice')
      );
    } catch (requestError) {
      setShowFormerSpouses(previousValue);
      setSettingsError(
        translateApiError(requestError, 'errors.saveSettings')
      );
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    if (!copiedTreeId) return undefined;
    const timer = window.setTimeout(() => setCopiedTreeId(''), 2500);
    return () => window.clearTimeout(timer);
  }, [copiedTreeId]);

  const updateSharing = async (tree, body) => {
    setSharingBusyId(tree.id);
    setShareError('');
    setNotice('');

    try {
      const response = await api.put(`/trees/${tree.id}/sharing`, body);
      onTreeUpdated?.(response.data);
      setNotice(
        body.rotate
          ? t('settings.shareRotatedNotice')
          : body.enabled
            ? t('settings.shareEnabledNotice')
            : t('settings.shareDisabledNotice')
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
    if (!window.confirm(t('settings.shareRotateConfirm'))) return;
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
      setShareError(t('settings.shareCopyError'));
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(
        language === 'lt' ? 'lt-LT' : 'en-US',
        { day: 'numeric', month: 'long', year: 'numeric' }
      )
    : t('settings.unknownDate');

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="settings-modal-title"
        aria-modal="true"
        className="modal-card settings-card"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t('settings.eyebrow')}</p>
            <h2 id="settings-modal-title">{t('settings.title')}</h2>
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

        <div className="settings-identity">
          <div className="avatar settings-avatar" aria-hidden="true">
            {initials(user.name)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <p>{user.email}</p>
          </div>
        </div>

        {notice && (
          <div className="alert success settings-alert" role="status">
            {notice}
          </div>
        )}

        <section className="settings-section" aria-labelledby="profile-heading">
          <h3 id="profile-heading">{t('settings.profileTitle')}</h3>
          <p className="settings-copy">{t('settings.profileCopy')}</p>

          <form className="person-form" onSubmit={saveProfile}>
            <div className="form-grid">
              <label>
                <span>{t('settings.name')}</span>
                <input
                  autoFocus
                  name="name"
                  onChange={updateProfile}
                  required
                  value={profile.name}
                />
              </label>
              <label>
                <span>{t('settings.email')}</span>
                <input
                  name="email"
                  onChange={updateProfile}
                  required
                  type="email"
                  value={profile.email}
                />
              </label>
            </div>

            {profileError && (
              <div className="form-error" role="alert">
                {profileError}
              </div>
            )}

            <div className="settings-actions">
              <button
                className="button primary"
                disabled={savingProfile}
                type="submit"
              >
                {savingProfile ? t('settings.savingProfile') : t('settings.saveProfile')}
              </button>
            </div>
          </form>
        </section>

        <section
          className="settings-section"
          aria-labelledby="preferences-heading"
        >
          <h3 id="preferences-heading">{t('settings.preferencesTitle')}</h3>

          <div className="toggle-row">
            <div className="toggle-copy">
              <span className="toggle-title" id="bloodline-toggle-label">
                {t('settings.bloodlineOnly')}
              </span>
              <span className="toggle-hint" id="bloodline-toggle-hint">
                {t('settings.bloodlineOnlyHint')}
              </span>
            </div>
            <label className="switch">
              <input
                aria-describedby="bloodline-toggle-hint"
                aria-labelledby="bloodline-toggle-label"
                checked={bloodlineOnly}
                disabled={savingSettings}
                onChange={toggleBloodlineOnly}
                type="checkbox"
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-copy">
              <span className="toggle-title" id="former-spouses-toggle-label">
                {t('settings.showFormerSpouses')}
              </span>
              <span className="toggle-hint" id="former-spouses-toggle-hint">
                {t('settings.showFormerSpousesHint')}
              </span>
            </div>
            <label className="switch">
              <input
                aria-describedby="former-spouses-toggle-hint"
                aria-labelledby="former-spouses-toggle-label"
                checked={showFormerSpouses}
                disabled={savingSettings}
                onChange={toggleFormerSpouses}
                type="checkbox"
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </label>
          </div>

          <p className="settings-mode-note">
            {bloodlineOnly
              ? t('settings.modeBloodlineNote')
              : t('settings.modeSpouseNote')}
          </p>

          {savingSettings && (
            <p className="settings-saving" role="status">
              {t('settings.savingPreferences')}
            </p>
          )}

          {settingsError && (
            <div className="form-error" role="alert">
              {settingsError}
            </div>
          )}
        </section>

        <section
          className="settings-section"
          aria-labelledby="sharing-heading"
        >
          <h3 id="sharing-heading">{t('settings.sharingTitle')}</h3>
          <p className="settings-copy">{t('settings.sharingCopy')}</p>

          {shareError && (
            <div className="form-error" role="alert">
              {shareError}
            </div>
          )}

          <ul className="share-tree-list">
            {trees.map((tree) => {
              const token = tree.sharing?.token || '';
              const enabled = Boolean(tree.sharing?.enabled && token);
              const url = enabled ? buildShareUrl(token) : '';
              const busy = sharingBusyId === tree.id;

              return (
                <li className="share-tree-item" key={tree.id}>
                  <div className="share-tree-top">
                    <div className="tree-list-copy">
                      <div className="tree-list-title">
                        <strong>{tree.name}</strong>
                        <span className="mode-badge">
                          {enabled
                            ? t('settings.sharingOn')
                            : t('settings.sharingOff')}
                        </span>
                      </div>
                      <span className="tree-list-meta">
                        {enabled
                          ? t('settings.sharingOnHint')
                          : t('settings.sharingOffHint')}
                      </span>
                    </div>

                    <label className="switch">
                      <input
                        aria-label={t('settings.shareToggleAria', {
                          name: tree.name,
                        })}
                        checked={enabled}
                        disabled={busy}
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

                  {enabled && (
                    <>
                      <div className="share-link-row">
                        <input
                          aria-label={t('settings.shareLinkLabel', {
                            name: tree.name,
                          })}
                          onFocus={(event) => event.target.select()}
                          readOnly
                          value={url}
                        />
                        <button
                          className="button secondary small"
                          onClick={() => copyShareLink(tree)}
                          type="button"
                        >
                          {copiedTreeId === tree.id
                            ? t('settings.shareCopied')
                            : t('settings.shareCopy')}
                        </button>
                      </div>

                      <div className="share-link-actions">
                        <button
                          className="button ghost small"
                          onClick={() =>
                            window.open(url, '_blank', 'noopener,noreferrer')
                          }
                          type="button"
                        >
                          {t('settings.shareOpen')}
                        </button>
                        <button
                          className="button ghost small"
                          disabled={busy}
                          onClick={() => rotateSharing(tree)}
                          type="button"
                        >
                          {t('settings.shareNewLink')}
                        </button>
                        {busy && (
                          <span className="settings-saving" role="status">
                            {t('settings.savingPreferences')}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="settings-section" aria-labelledby="account-heading">
          <h3 id="account-heading">{t('settings.accountTitle')}</h3>
          <dl className="account-meta">
            <div>
              <dt>{t('settings.memberSince')}</dt>
              <dd>{memberSince}</dd>
            </div>
            <div>
              <dt>{t('settings.privacy')}</dt>
              <dd>{t('settings.privateTree')}</dd>
            </div>
          </dl>
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
