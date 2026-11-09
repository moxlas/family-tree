import React from 'react';
import { useI18n } from '../i18n';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="language-switcher">
      <span className="sr-only">{t('common.language')}</span>
      <svg
        aria-hidden="true"
        className="globe-icon"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          fill="none"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.2 3.2 8.5s-1.1 6.2-3.2 8.5c-2.1-2.3-3.2-5.2-3.2-8.5s1.1-6.2 3.2-8.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
      <select
        aria-label={t('common.language')}
        onChange={(event) => setLanguage(event.target.value)}
        value={language}
      >
        <option value="en">English</option>
        <option value="lt">Lietuvių</option>
      </select>
      <span aria-hidden="true" className="select-chevron">
        ▾
      </span>
    </label>
  );
}
