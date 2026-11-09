import React, { useEffect, useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';

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

export default function SettingsModal({ user, onClose, onUserUpdate }) {
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
