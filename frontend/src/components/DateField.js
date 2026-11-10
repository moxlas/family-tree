import React, { useEffect, useRef, useState } from 'react';
import {
  formatDateForDisplay,
  formatIsoDate,
  normalizeDateValue,
  toIsoDate,
} from '../dates';
import { useI18n } from '../i18n';

export default function DateField({ name, onChange, placeholder, value }) {
  const { language, t } = useI18n();
  const pickerRef = useRef(null);
  const lastEmitted = useRef(value || '');
  const [text, setText] = useState(() =>
    formatDateForDisplay(value || '', language)
  );

  useEffect(() => {
    setText(formatDateForDisplay(lastEmitted.current, language));
  }, [language]);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value || '';
      setText(formatDateForDisplay(value || '', language));
    }
  }, [value, language]);

  const emit = (next) => {
    lastEmitted.current = next;
    onChange(name, next);
  };

  const handleChange = (event) => {
    const next = event.target.value;
    setText(next);
    emit(next);
  };

  const handleBlur = () => {
    const normalized = normalizeDateValue(text);
    emit(normalized);
    setText(formatDateForDisplay(normalized, language));
  };

  const openPicker = () => {
    const input = pickerRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch (_error) {
        // Older browsers fall through to focus + click.
      }
    }
    try {
      input.focus();
      input.click();
    } catch (_error) {
      // The text field still supports manual input.
    }
  };

  return (
    <div className="date-field">
      <input
        name={name}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        type="text"
        value={text}
      />
      <button
        aria-label={t('date.pick')}
        className="date-picker-button"
        onClick={openPicker}
        title={t('date.pick')}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <rect height="12.5" rx="2.25" width="14.5" x="2.75" y="4.25" />
          <path d="M2.75 8.25h14.5M6.5 2.5v3M13.5 2.5v3" />
        </svg>
      </button>
      <input
        aria-hidden="true"
        className="date-picker-native"
        onChange={(event) => {
          const next = formatIsoDate(event.target.value);
          if (!next) return;
          emit(next);
          setText(formatDateForDisplay(next, language));
        }}
        ref={pickerRef}
        tabIndex={-1}
        type="date"
        value={toIsoDate(text)}
      />
    </div>
  );
}
