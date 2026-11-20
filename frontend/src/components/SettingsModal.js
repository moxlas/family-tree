import React, { useEffect, useMemo, useState } from 'react';
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

export default function SettingsModal({
  onClose,
  onTokenUpdate,
  onUserUpdate,
  user,
}) {
  const { language, t, translateApiError } = useI18n();
  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [bloodlineOnly, setBloodlineOnly] = useState(
    Boolean(user.settings?.bloodlineOnly)
  );
  const [showFormerSpouses, setShowFormerSpouses] = useState(
    user.settings?.showFormerSpouses !== false
  );
  const [textSize, setTextSize] = useState(
    ['normal', 'large', 'xlarge'].includes(user.settings?.textSize)
      ? user.settings.textSize
      : 'normal'
  );
  const [highContrast, setHighContrast] = useState(
    Boolean(user.settings?.highContrast)
  );
  const [reducedMotion, setReducedMotion] = useState(
    Boolean(user.settings?.reducedMotion)
  );
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notice, setNotice] = useState('');

  const sections = useMemo(
    () => [
      { id: 'settings-profile', label: t('settings.profileTitle') },
      { id: 'settings-password', label: t('settings.passwordTitle') },
      { id: 'settings-preferences', label: t('settings.preferencesTitle') },
      { id: 'settings-accessibility', label: t('settings.accessibilityTitle') },
      { id: 'settings-account', label: t('settings.accountTitle') },
    ],
    [t]
  );

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
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const jumpTo = (id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  const updateProfile = (event) => {
    setProfile((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const updatePasswordField = (event) => {
    setPasswordForm((current) => ({
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

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setNotice('');

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError(t('api.passwordRequired'));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('errors.passwordMismatch'));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError(t('errors.passwordShort'));
      return;
    }

    setSavingPassword(true);
    try {
      const response = await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (onTokenUpdate) onTokenUpdate(response.data.token);
      onUserUpdate(response.data.user);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPassword(false);
      setNotice(t('settings.passwordSaved'));
    } catch (requestError) {
      setPasswordError(
        translateApiError(requestError, 'errors.changePassword')
      );
    } finally {
      setSavingPassword(false);
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

  const saveAccessibility = async (patch) => {
    setSettingsError('');
    setNotice('');
    setSavingSettings(true);

    const previous = {
      textSize,
      highContrast,
      reducedMotion,
    };
    if (patch.textSize !== undefined) setTextSize(patch.textSize);
    if (patch.highContrast !== undefined) setHighContrast(patch.highContrast);
    if (patch.reducedMotion !== undefined) setReducedMotion(patch.reducedMotion);

    try {
      const response = await api.put('/auth/settings', patch);
      onUserUpdate(response.data.user);
      setNotice(t('settings.accessibilitySaved'));
    } catch (requestError) {
      setTextSize(previous.textSize);
      setHighContrast(previous.highContrast);
      setReducedMotion(previous.reducedMotion);
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
        <header className="modal-heading settings-heading">
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
        </header>

        {notice && (
          <div className="alert success settings-alert" role="status">
            {notice}
          </div>
        )}

        <div className="settings-layout">
          <aside className="settings-sidebar" aria-label={t('settings.title')}>
            <div className="settings-identity">
              <div className="avatar settings-avatar" aria-hidden="true">
                {initials(user.name)}
              </div>
              <div>
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>
            </div>

            <nav className="settings-nav" aria-label={t('settings.sectionsTitle')}>
              <p className="settings-nav-title">{t('settings.sectionsTitle')}</p>
              {sections.map((section) => (
                <button
                  className="settings-nav-item"
                  key={section.id}
                  onClick={() => jumpTo(section.id)}
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                  {section.label}
                </button>
              ))}
            </nav>

            <div className="settings-sidebar-note">
              <span className="sidebar-note-label">{t('settings.privacy')}</span>
              <span>{t('settings.privateTree')}</span>
            </div>
          </aside>

          <div className="settings-content">
            <section
              aria-labelledby="profile-heading"
              className="settings-panel"
              id="settings-profile"
            >
              <div className="settings-panel-heading">
                <span className="panel-number" aria-hidden="true">1</span>
                <div>
                  <h3 id="profile-heading">{t('settings.profileTitle')}</h3>
                  <p className="settings-copy">{t('settings.profileCopy')}</p>
                </div>
              </div>

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
                    {savingProfile
                      ? t('settings.savingProfile')
                      : t('settings.saveProfile')}
                  </button>
                </div>
              </form>
            </section>

            <section
              aria-labelledby="password-heading"
              className="settings-panel"
              id="settings-password"
            >
              <div className="settings-panel-heading">
                <span className="panel-number" aria-hidden="true">2</span>
                <div>
                  <h3 id="password-heading">{t('settings.passwordTitle')}</h3>
                  <p className="settings-copy">{t('settings.passwordCopy')}</p>
                </div>
              </div>

              <form className="person-form password-form" onSubmit={changePassword}>
                <div className="form-grid">
                  <label>
                    <span>{t('settings.currentPassword')}</span>
                    <input
                      autoComplete="current-password"
                      name="currentPassword"
                      onChange={updatePasswordField}
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                    />
                  </label>
                  <label>
                    <span>{t('settings.newPassword')}</span>
                    <input
                      autoComplete="new-password"
                      name="newPassword"
                      onChange={updatePasswordField}
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                    />
                  </label>
                </div>
                <label>
                  <span>{t('settings.confirmPassword')}</span>
                  <input
                    autoComplete="new-password"
                    name="confirmPassword"
                    onChange={updatePasswordField}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                  />
                </label>

                <button
                  className="password-reveal"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword
                    ? t('settings.hidePassword')
                    : t('settings.showPassword')}
                </button>

                {passwordError && (
                  <div className="form-error" role="alert">
                    {passwordError}
                  </div>
                )}

                <div className="settings-actions">
                  <button
                    className="button primary"
                    disabled={savingPassword}
                    type="submit"
                  >
                    {savingPassword
                      ? t('settings.savingPassword')
                      : t('settings.savePassword')}
                  </button>
                </div>
              </form>
            </section>

            <section
              aria-labelledby="preferences-heading"
              className="settings-panel"
              id="settings-preferences"
            >
              <div className="settings-panel-heading">
                <span className="panel-number" aria-hidden="true">3</span>
                <div>
                  <h3 id="preferences-heading">
                    {t('settings.preferencesTitle')}
                  </h3>
                </div>
              </div>

              <div className="settings-stack">
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
                    <span
                      className="toggle-title"
                      id="former-spouses-toggle-label"
                    >
                      {t('settings.showFormerSpouses')}
                    </span>
                    <span
                      className="toggle-hint"
                      id="former-spouses-toggle-hint"
                    >
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
              </div>
            </section>

            <section
              aria-labelledby="accessibility-heading"
              className="settings-panel"
              id="settings-accessibility"
            >
              <div className="settings-panel-heading">
                <span className="panel-number" aria-hidden="true">4</span>
                <div>
                  <h3 id="accessibility-heading">
                    {t('settings.accessibilityTitle')}
                  </h3>
                  <p className="settings-copy">{t('settings.accessibilityCopy')}</p>
                </div>
              </div>

              <div className="settings-stack">
                <label className="settings-field">
                  <span>{t('settings.textSize')}</span>
                  <select
                    aria-describedby="text-size-hint"
                    disabled={savingSettings}
                    onChange={(event) =>
                      saveAccessibility({ textSize: event.target.value })
                    }
                    value={textSize}
                  >
                    <option value="normal">{t('settings.textSizeNormal')}</option>
                    <option value="large">{t('settings.textSizeLarge')}</option>
                    <option value="xlarge">{t('settings.textSizeXLarge')}</option>
                  </select>
                  <span className="field-hint" id="text-size-hint">
                    {t('settings.textSizeHint')}
                  </span>
                </label>

                <div className="toggle-row">
                  <div className="toggle-copy">
                    <span
                      className="toggle-title"
                      id="high-contrast-toggle-label"
                    >
                      {t('settings.highContrast')}
                    </span>
                    <span
                      className="toggle-hint"
                      id="high-contrast-toggle-hint"
                    >
                      {t('settings.highContrastHint')}
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      aria-describedby="high-contrast-toggle-hint"
                      aria-labelledby="high-contrast-toggle-label"
                      checked={highContrast}
                      disabled={savingSettings}
                      onChange={(event) =>
                        saveAccessibility({
                          highContrast: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span className="switch-track" aria-hidden="true">
                      <span className="switch-thumb" />
                    </span>
                  </label>
                </div>

                <div className="toggle-row">
                  <div className="toggle-copy">
                    <span
                      className="toggle-title"
                      id="reduced-motion-toggle-label"
                    >
                      {t('settings.reducedMotion')}
                    </span>
                    <span
                      className="toggle-hint"
                      id="reduced-motion-toggle-hint"
                    >
                      {t('settings.reducedMotionHint')}
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      aria-describedby="reduced-motion-toggle-hint"
                      aria-labelledby="reduced-motion-toggle-label"
                      checked={reducedMotion}
                      disabled={savingSettings}
                      onChange={(event) =>
                        saveAccessibility({
                          reducedMotion: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span className="switch-track" aria-hidden="true">
                      <span className="switch-thumb" />
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section
              aria-labelledby="account-heading"
              className="settings-panel"
              id="settings-account"
            >
              <div className="settings-panel-heading">
                <span className="panel-number" aria-hidden="true">5</span>
                <div>
                  <h3 id="account-heading">{t('settings.accountTitle')}</h3>
                </div>
              </div>

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
          </div>
        </div>

        <div className="modal-actions settings-footer">
          <button className="button secondary" onClick={onClose} type="button">
            {t('common.close')}
          </button>
        </div>
      </section>
    </div>
  );
}
