export function yearFrom(value) {
  const match = String(value || '').match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

export function personOptionLabel(person) {
  const name =
    `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Unnamed';
  const birthYear = yearFrom(person?.birthDate);
  const deathYear = yearFrom(person?.deathDate);
  const deceased = Boolean(person?.deceased);

  if (birthYear && deathYear) {
    return `${name} (${birthYear}–${deathYear})`;
  }
  if (birthYear && deceased) {
    return `${name} (b. ${birthYear}, deceased)`;
  }
  if (birthYear) {
    return `${name} (b. ${birthYear})`;
  }
  if (deathYear) {
    return `${name} (d. ${deathYear})`;
  }
  if (deceased) {
    return `${name} (deceased)`;
  }

  const suffix = String(person?.id || '').slice(-4);
  return suffix ? `${name} (#${suffix})` : name;
}
