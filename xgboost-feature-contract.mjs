export const XGBOOST_FEATURE_SCHEMA = Object.freeze({
  categorical: [
    'item_type',
    'item_slot',
    'item_class',
    'mode',
    'market'
  ],
  numeric: [
    'required_level',
    'option_count',
    'market_median_price',
    'market_sample_count',
    'market_volume_7d',
    'ladder_flag'
  ],
  optionPrefixes: [
    'option_'
  ],
  synergyPrefixes: [
    'synergy_'
  ],
  target: 'sale_price'
});

export function buildXgboostFeatures(input = {}) {
  const features = {
    item_type: input.itemType ?? 'unknown',
    item_slot: input.itemSlot ?? 'unknown',
    item_class: input.itemClass ?? 'unknown',
    mode: input.mode ?? 'unknown',
    market: input.market ?? 'unknown',
    required_level: Number(input.requiredLevel ?? 0),
    option_count: Array.isArray(input.options)
      ? input.options.length
      : 0,
    market_median_price: Number(input.market?.medianPrice ?? 0),
    market_sample_count: Number(input.market?.sampleCount ?? 0),
    market_volume_7d: Number(input.market?.volume7d ?? 0),
    ladder_flag: input.ladder === true ? 1 : 0
  };

  for (const option of input.options ?? []) {
    if (!option?.optionId) continue;

    features[`option_${option.optionId}`] = Number(
      option.value ?? 0
    );
  }

  for (const synergy of input.synergies ?? []) {
    if (!synergy?.id) continue;

    features[`synergy_${synergy.id}`] = Number(
      synergy.score ?? 0
    );
  }

  return features;
}
