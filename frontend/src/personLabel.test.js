import { personOptionLabels } from './personLabel';

const en = (key, values) =>
  key === 'person.generationShort' ? `gen. ${values.count}` : key;
const lt = (key, values) =>
  key === 'person.generationShort' ? `${values.count} karta` : key;

const person = (id, overrides = {}) => ({
  id,
  firstName: 'Jonas',
  lastName: 'Jonaitis',
  ...overrides,
});

describe('personOptionLabels', () => {
  it('keeps a unique name unchanged', () => {
    const labels = personOptionLabels([person('a')], [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis');
  });

  it('uses generation for undated duplicates in different generations', () => {
    const people = [
      person('a'),
      person('b', { firstName: 'Other', lastName: 'Person', parentId: 'a' }),
      person('c', { parentId: 'b' }),
    ];

    const labels = personOptionLabels(people, [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (gen. 1)');
    expect(labels.get('c')).toBe('Jonas Jonaitis (gen. 3)');
  });

  it('falls back to counters when undated duplicates share a generation', () => {
    const labels = personOptionLabels([person('a'), person('b')], [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (1)');
    expect(labels.get('b')).toBe('Jonas Jonaitis (2)');
  });

  it('uses generation when duplicate birth years are tied but generations differ', () => {
    const people = [
      person('a', { birthDate: '1950-05-01' }),
      person('b', { firstName: 'Other', lastName: 'Person', parentId: 'a' }),
      person('c', { birthDate: '1950-09-12', parentId: 'b' }),
    ];

    const labels = personOptionLabels(people, [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (1950, gen. 1)');
    expect(labels.get('c')).toBe('Jonas Jonaitis (1950, gen. 3)');
  });

  it('falls back to counters when tied birth years also share a generation', () => {
    const people = [
      person('a', { birthDate: '1950-05-01' }),
      person('b', { birthDate: '1950-09-12' }),
    ];

    const labels = personOptionLabels(people, [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (1950, 1)');
    expect(labels.get('b')).toBe('Jonas Jonaitis (1950, 2)');
  });

  it('keeps distinct birth years as the differentiator', () => {
    const people = [
      person('a', { birthDate: '1950-05-01' }),
      person('b', { birthDate: '1960-09-12', parentId: 'a' }),
    ];

    const labels = personOptionLabels(people, [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (1950)');
    expect(labels.get('b')).toBe('Jonas Jonaitis (1960)');
  });

  it('labels an undated duplicate alongside a dated one with its generation', () => {
    const people = [
      person('a', { birthDate: '1950-05-01' }),
      person('b', { parentId: 'a' }),
    ];

    const labels = personOptionLabels(people, [], en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (1950)');
    expect(labels.get('b')).toBe('Jonas Jonaitis (gen. 2)');
  });

  it('uses the supplied localized generation wording', () => {
    const people = [
      person('a'),
      person('b', { firstName: 'Other', lastName: 'Person', parentId: 'a' }),
      person('c', { parentId: 'b' }),
    ];

    const labels = personOptionLabels(people, [], lt);
    expect(labels.get('c')).toBe('Jonas Jonaitis (3 karta)');
  });

  it('reads generations from families as well as parent fields', () => {
    const people = [
      person('a'),
      person('b', { firstName: 'Other', lastName: 'Person' }),
      person('c'),
    ];
    const families = [
      {
        husband: 'a',
        wife: 'b',
        children: ['c'],
      },
    ];

    const labels = personOptionLabels(people, families, en);
    expect(labels.get('a')).toBe('Jonas Jonaitis (gen. 1)');
    expect(labels.get('c')).toBe('Jonas Jonaitis (gen. 2)');
  });

  it('uses supplied canvas rows instead of absolute generations', () => {
    const people = [
      person('a'),
      person('b', { firstName: 'Other', lastName: 'Person', parentId: 'a' }),
      person('c', { parentId: 'b' }),
    ];
    const rows = new Map([['a', 7], ['c', 9]]);

    const labels = personOptionLabels(people, [], en, rows);
    expect(labels.get('a')).toBe('Jonas Jonaitis (gen. 7)');
    expect(labels.get('c')).toBe('Jonas Jonaitis (gen. 9)');
  });

  it('falls back to counters when same-name people share a canvas row', () => {
    const people = [person('a'), person('b', { parentId: 'a' })];
    // Absolute generations differ (1 and 2), but the canvas draws both on row 5.
    const rows = new Map([['a', 5], ['b', 5]]);

    const labels = personOptionLabels(people, [], en, rows);
    expect(labels.get('a')).toBe('Jonas Jonaitis (1)');
    expect(labels.get('b')).toBe('Jonas Jonaitis (2)');
  });
});
