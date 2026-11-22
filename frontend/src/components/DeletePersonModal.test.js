import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DeletePersonModal from './DeletePersonModal';
import { LanguageProvider } from '../i18n';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const person = {
  id: '1',
  firstName: 'Anna',
  lastName: 'Doe',
};

let container;
let root;
let onCancel;
let onConfirm;

function renderModal(descendantCount = 3) {
  act(() => {
    root = createRoot(container);
    root.render(
      <LanguageProvider>
        <DeletePersonModal
          descendantCount={descendantCount}
          onCancel={onCancel}
          onConfirm={onConfirm}
          person={person}
        />
      </LanguageProvider>
    );
  });
}

function findButton(text) {
  return [...container.querySelectorAll('button')].find((button) =>
    button.textContent.includes(text)
  );
}

function click(element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function pressEscape() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
  });
}

beforeEach(() => {
  localStorage.setItem('familyTreeLanguage', 'en');
  container = document.createElement('div');
  document.body.appendChild(container);
  onCancel = jest.fn();
  onConfirm = jest.fn();
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  root = null;
});

describe('DeletePersonModal', () => {
  it('offers separate choices for keeping and removing children', () => {
    renderModal();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Delete Anna Doe');
    expect(dialog.textContent).toContain('3 descendants in this tree');
    expect(findButton('Keep children')).toBeTruthy();
    expect(findButton('Remove children too')).toBeTruthy();
  });

  it('uses the requested Lithuanian descriptions', () => {
    localStorage.setItem('familyTreeLanguage', 'lt');
    renderModal(1);

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain(
      'Pasirinkite, kas nutiks šio žmogaus palikuoniams.'
    );
    expect(dialog.textContent).toContain(
      'Tik Anna Doe bus pašalintas. Šio asmens vaikai liks medyje, bet nebebus susieti su šiuo asmeniu'
    );
    expect(dialog.textContent).toContain(
      'Anna Doe ir šio asmens palikuonys bus pašalinti. To negalima atšaukti.'
    );
  });

  it('confirms keeping children as a separate mode', () => {
    renderModal(1);

    click(findButton('Keep children'));

    expect(onConfirm).toHaveBeenCalledWith('keep');
  });

  it('confirms the full cascade as a separate mode', () => {
    renderModal(1);

    click(findButton('Remove children too'));

    expect(onConfirm).toHaveBeenCalledWith('all');
  });

  it('cancels with Escape', () => {
    renderModal();

    pressEscape();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
