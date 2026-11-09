import React, { useState } from 'react';
import api from '../api';
import { useI18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';

const EMPTY_FORM = { name: '', email: '', password: '' };

export default function Login({ onAuth }) {
  const { t, translateApiError } = useI18n();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password };
      const response = await api.post(`/auth/${mode}`, payload);
      onAuth(response.data);
    } catch (requestError) {
      setError(translateApiError(requestError, 'errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-art-glow" />
        <svg viewBox="0 0 520 520" role="presentation">
          <path
            d="M260 420V245"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M260 315c-58 0-94-34-94-90"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M260 345c58 0 94-34 94-90"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <circle cx="260" cy="205" r="62" fill="currentColor" opacity="0.95" />
          <circle cx="150" cy="205" r="45" fill="currentColor" opacity="0.8" />
          <circle cx="370" cy="230" r="52" fill="currentColor" opacity="0.85" />
          <circle cx="205" cy="125" r="38" fill="currentColor" opacity="0.7" />
          <circle cx="322" cy="130" r="34" fill="currentColor" opacity="0.65" />
          <rect
            x="234"
            y="390"
            width="52"
            height="74"
            rx="10"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      </div>

      <section className="auth-card">
        <div className="auth-card-top">
          <div className="brand-lockup">
            <span className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" role="presentation">
                <path
                  d="M16 28V17M16 20c-5 0-8-3-8-7M16 22c5 0 8-3 8-7"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.2"
                />
                <circle cx="16" cy="12" r="5" fill="currentColor" />
                <circle cx="8" cy="13" r="3.5" fill="currentColor" />
                <circle cx="24" cy="15" r="4" fill="currentColor" />
              </svg>
            </span>
            <span>{t('app.title')}</span>
          </div>
          <LanguageSwitcher />
        </div>

        <h1>{isRegister ? t('auth.startStory') : t('auth.welcome')}</h1>
        <p className="auth-lede">
          {isRegister ? t('auth.registerLede') : t('auth.signInLede')}
        </p>

        <div className="auth-tabs" role="tablist" aria-label={t('auth.signIn')}>
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={!isRegister ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            {t('auth.signIn')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={isRegister ? 'active' : ''}
            onClick={() => switchMode('register')}
          >
            {t('auth.createAccount')}
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <label>
              <span>{t('auth.yourName')}</span>
              <input
                autoComplete="name"
                name="name"
                onChange={update}
                placeholder={t('auth.namePlaceholder')}
                required
                type="text"
                value={form.name}
              />
            </label>
          )}

          <label>
            <span>{t('auth.email')}</span>
            <input
              autoComplete="email"
              name="email"
              onChange={update}
              placeholder={t('auth.emailPlaceholder')}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label>
            <span>{t('auth.password')}</span>
            <input
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={6}
              name="password"
              onChange={update}
              placeholder={t('auth.passwordPlaceholder')}
              required
              type="password"
              value={form.password}
            />
          </label>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button className="button primary full" disabled={loading} type="submit">
            {loading
              ? t('common.loading')
              : isRegister
                ? t('auth.createTree')
                : t('auth.signIn')}
          </button>
        </form>

        <p className="auth-footnote">{t('auth.footnote')}</p>
      </section>
    </main>
  );
}
