import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PersonDetailsModal from './PersonDetailsModal';
import { LanguageProvider } from '../i18n';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const target = {
  id: 'target',
  firstName: 'Vanda',
  lastName: 'Mikėnienė',
};

const reference = {
  id: 'ref',
  firstName: 'Vytautas',
  lastName: 'Mikėnas',
};

let container;
let root;

function renderModal(people, referencePersonId) {
  act(() => {
    root = createRoot(container);
    root.render(
      <LanguageProvider>
        <PersonDetailsModal
          families={[]}
          onClose={jest.fn()}
          people={people}
          person={target}
          referencePersonId={referencePersonId}
        />
      </LanguageProvider>
    );
  });
}

function generationRows() {
  return [...container.querySelectorAll('.details-list > div')].filter(
    (row) => row.querySelector('dt')?.textContent === 'Generation'
  );
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

describe('PersonDetailsModal generation', () => {
  it('shows the absolute generation with the reference name inline', () => {
    const people = [
      target,
      { id: 'a', firstName: 'A', lastName: 'B', parentId: 'target' },
      { id: 'b', firstName: 'C', lastName: 'D', parentId: 'a' },
      { ...reference, parentId: 'b' },
    ];

    renderModal(people, reference.id);

    const rows = generationRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('dd').textContent).toBe(
      '1 (3 above Vytautas Mikėnas)'
    );
  });

  it('shows "Same generation" when the generations match', () => {
    renderModal([target, reference], reference.id);

    expect(generationRows()[0].querySelector('dd').textContent).toBe(
      '1 (Same generation)'
    );
  });

  it('shows "Main person" when viewing the reference person', () => {
    renderModal([target], target.id);

    expect(generationRows()[0].querySelector('dd').textContent).toBe(
      '1 (Main person)'
    );
  });

  it('shows only the generation when there is no reference person', () => {
    renderModal([target], undefined);

    expect(generationRows()[0].querySelector('dd').textContent).toBe('1');
  });

  it('does not add a row for a stale reference person id', () => {
    renderModal([target], 'missing');

    const rows = generationRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('dd').textContent).toBe('1');
  });
});
