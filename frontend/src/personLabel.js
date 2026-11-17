import { personGenerationMap } from './treeView';

export function yearFrom(value) {
  const match = String(value || '').match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

function baseName(person) {
  return `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Unnamed';
}

function generationLabel(generation, t) {
  return t
    ? t('person.generationShort', { count: generation })
    : `gen. ${generation}`;
}

export function personOptionLabels(people, families, t) {
  const labels = new Map();
  const groups = new Map();
  const list = Array.isArray(people) ? people : [];

  list.forEach((person) => {
    const name = baseName(person);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(person);
  });

  const generations = personGenerationMap(list, families);

  groups.forEach((group, name) => {
    if (group.length === 1) {
      labels.set(group[0].id, name);
      return;
    }

    const byDate = new Map();
    group.forEach((person) => {
      const key = yearFrom(person.birthDate);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(person);
    });

    byDate.forEach((members, key) => {
      const year = key || '';

      // A recorded year already distinguishes this person from the others.
      if (year && members.length === 1) {
        labels.set(members[0].id, `${name} (${year})`);
        return;
      }

      const generationCounts = new Map();
      members.forEach((person) => {
        const generation = generations.get(String(person.id)) || 1;
        generationCounts.set(
          generation,
          (generationCounts.get(generation) || 0) + 1
        );
      });

      // Generation is only useful here if it makes every member of this
      // date group distinguishable. Otherwise fall back to counters.
      const useGeneration = generationCounts.size === members.length;
      let counter = 0;

      members.forEach((person) => {
        counter += 1;
        const generation = generations.get(String(person.id)) || 1;
        const detail = useGeneration
          ? generationLabel(generation, t)
          : String(counter);
        labels.set(
          person.id,
          year ? `${name} (${year}, ${detail})` : `${name} (${detail})`
        );
      });
    });
  });

  return labels;
}

export function personOptionLabel(person, families, t) {
  return personOptionLabels([person], families, t).get(person?.id) || baseName(person);
}
