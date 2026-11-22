import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider, useI18n } from './i18n';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function readDeathPlaceholder(language) {
  localStorage.setItem('familyTreeLanguage', language);
  let placeholder = '';

  function Probe() {
    const { t } = useI18n();
    placeholder = t('modal.deathPlaceholder');
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
  });

  return placeholder;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  root = null;
});

describe('death date placeholder', () => {
  it('uses unknown wording in English', () => {
    expect(readDeathPlaceholder('en')).toBe('Leave empty if unknown');
  });

  it('uses unknown wording in Lithuanian', () => {
    expect(readDeathPlaceholder('lt')).toBe('Palikite tuščią, jei nežinoma');
  });
});
