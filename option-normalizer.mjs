const OPTION_ALIASES = Object.freeze({
  '화염 저항': 'FIRE_RESIST',
  '화염저항': 'FIRE_RESIST',
  'fire resist': 'FIRE_RESIST',
  '냉기 저항': 'COLD_RESIST',
  '냉기저항': 'COLD_RESIST',
  'cold resist': 'COLD_RESIST',
  '번개 저항': 'LIGHTNING_RESIST',
  '번개저항': 'LIGHTNING_RESIST',
  'lightning resist': 'LIGHTNING_RESIST',
  '독 저항': 'POISON_RESIST',
  '독저항': 'POISON_RESIST',
  'poison resist': 'POISON_RESIST'
});

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

export function normalizeOptions(options = []) {
  const grouped = new Map();
  const unresolved = [];

  for (const option of options) {
    const sourceName = option?.name ?? option?.label ?? '';
    const key = OPTION_ALIASES[normalizeName(sourceName)];

    if (!key) {
      unresolved.push({ ...option, reason: 'OPTION_UNKNOWN' });
      continue;
    }

    const entry = grouped.get(key) ?? {
      optionId: key,
      values: [],
      sources: []
    };

    if (typeof option.value === 'number') entry.values.push(option.value);
    entry.sources.push(sourceName);
    grouped.set(key, entry);
  }

  const normalized = [];
  const conflicts = [];

  for (const entry of grouped.values()) {
    const uniqueValues = [...new Set(entry.values)];
    if (uniqueValues.length > 1) {
      conflicts.push({
        optionId: entry.optionId,
        values: uniqueValues,
        sources: entry.sources,
        reason: 'OPTION_VALUE_CONFLICT'
      });
      continue;
    }

    normalized.push({
      optionId: entry.optionId,
      value: uniqueValues[0] ?? null,
      sources: entry.sources
    });
  }

  return {
    normalized,
    unresolved,
    conflicts,
    needsReview: unresolved.length > 0 || conflicts.length > 0
  };
}
