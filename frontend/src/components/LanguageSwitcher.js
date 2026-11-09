import React from 'react';
import { useI18n } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'lt', label: 'LT' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="language-switch" role="group" aria-label={t('common.language')}>
      {LANGUAGES.map((entry) => (
        <button
          aria-pressed={language === entry.code}
          className={language === entry.code ? 'is-active' : ''}
          key={entry.code}
          onClick={() => setLanguage(entry.code)}
          type="button"
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
