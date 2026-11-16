export function yearFrom(value) {
  const match = String(value || '').match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

function baseName(person) {
  return `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Unnamed';
}

export function personOptionLabels(people) {
  const labels = new Map();
  const groups = new Map();

  (people || []).forEach((person) => {
    const name = baseName(person);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(person);
  });

  groups.forEach((group, name) => {
    if (group.length === 1) {
      labels.set(group[0].id, name);
      return;
    }

    const yearCounts = new Map();
    group.forEach((person) => {
      const year = yearFrom(person.birthDate) || (person.deceased ? 'deceased' : '');
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });

    let noYearCounter = 0;

    group.forEach((person) => {
      const year = yearFrom(person.birthDate);
      if (year) {
        if (yearCounts.get(year) > 1) {
          noYearCounter += 1;
          labels.set(person.id, `${name} (${year}, ${noYearCounter})`);
        } else {
          labels.set(person.id, `${name} (${year})`);
        }
      } else {
        noYearCounter += 1;
        labels.set(person.id, `${name} (${noYearCounter})`);
      }
    });
  });

  return labels;
}

export function personOptionLabel(person) {
  return personOptionLabels([person]).get(person?.id) || baseName(person);
}
