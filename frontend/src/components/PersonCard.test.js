import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PersonCard from './PersonCard';
import { LanguageProvider } from '../i18n';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const basePerson = {
  id: '1',
  firstName: 'Birutė',
  lastName: 'Šiukščiuvienė',
  previousName: 'Strumskytė',
  gender: 'female',
};

let container;
let root;

function renderCard(props = {}) {
  act(() => {
    root = createRoot(container);
    root.render(
      <LanguageProvider>
        <PersonCard person={basePerson} {...props} />
      </LanguageProvider>
    );
  });
}

function click(element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function pressKey(element, key) {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function visibleText(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('.sr-only').forEach((node) => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
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

describe('PersonCard', () => {
  it('shows the previous surname inline in parentheses after the name', () => {
    renderCard();

    const name = container.querySelector('.person-details h3');
    expect(visibleText(name)).toBe('Birutė Šiukščiuvienė (Strumskytė)');

    const maiden = name.querySelector('.person-maiden');
    expect(maiden).not.toBeNull();
    expect(maiden.textContent).toContain('Maiden / previous last name:');
    expect(container.querySelector('p.person-maiden')).toBeNull();
  });

  it('does not repeat the previous surname when it matches the current one', () => {
    renderCard({ person: { ...basePerson, previousName: basePerson.lastName } });
    expect(container.querySelector('.person-maiden')).toBeNull();
    expect(visibleText(container.querySelector('.person-details h3'))).toBe(
      'Birutė Šiukščiuvienė'
    );
  });

  it('shows no parenthetical when the previous surname is blank', () => {
    renderCard({ person: { ...basePerson, previousName: '' } });
    expect(container.querySelector('.person-maiden')).toBeNull();
    expect(visibleText(container.querySelector('.person-details h3'))).toBe(
      'Birutė Šiukščiuvienė'
    );
  });

  it('keeps desktop action icons and exposes the compact More menu', () => {
    renderCard({
      childCount: 2,
      onDelete: jest.fn(),
      onEdit: jest.fn(),
      onFocus: jest.fn(),
      onToggleChildren: jest.fn(),
    });

    expect(
      container.querySelectorAll('.person-actions-secondary .icon-button')
    ).toHaveLength(4);

    const moreButton = container.querySelector('.person-more-menu button');
    expect(moreButton).not.toBeNull();

    click(moreButton);

    const menu = document.body.querySelector('.person-more-options');
    expect(menu).not.toBeNull();
    expect(menu.textContent).toContain('Show only this branch');
    expect(menu.textContent).toContain('Hide children');
    expect(menu.textContent).toContain('Edit person');
    expect(menu.textContent).toContain('Delete person');
  });

  it('runs a More menu action and closes the menu', () => {
    const onEdit = jest.fn();
    renderCard({ onEdit });

    click(container.querySelector('.person-more-menu button'));

    const editItem = [...document.body.querySelectorAll('.person-more-options button')].find(
      (button) => button.textContent === 'Edit person'
    );
    expect(editItem).toBeDefined();

    click(editItem);

    expect(onEdit).toHaveBeenCalledWith(basePerson);
    expect(document.body.querySelector('.person-more-options')).toBeNull();
  });

  it('reports selection state and selects the card on click', () => {
    const onSelect = jest.fn();
    const onView = jest.fn();
    renderCard({ isSelected: true, onSelect, onView });

    const card = container.querySelector('.person-card');
    expect(card.classList.contains('is-selected')).toBe(true);
    expect(card.getAttribute('aria-pressed')).toBe('true');

    click(card);

    expect(onSelect).toHaveBeenCalledWith(basePerson);
    expect(onView).toHaveBeenCalledWith(basePerson);
  });

  it('selects the card from the keyboard', () => {
    const onSelect = jest.fn();
    renderCard({ onSelect });

    const card = container.querySelector('.person-card');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');

    pressKey(card, 'Enter');
    pressKey(card, ' ');

    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('does not select while a drag is suppressing clicks', () => {
    const onSelect = jest.fn();
    renderCard({ onSelect, suppressClickRef: { current: true } });

    click(container.querySelector('.person-card'));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
