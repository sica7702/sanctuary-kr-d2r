export function isTrainableRecord(record) {
  return record?.label_status === 'human_verified'
    && record?.split === 'train'
    && Boolean(record?.source_snapshot_hash)
    && record?.quality?.source_complete === true
    && record?.quality?.media_complete !== false;
}

export function selectTrainingRecords(records = []) {
  const selected = []; const excluded = [];
  for (const record of Array.isArray(records) ? records : []) (isTrainableRecord(record) ? selected : excluded).push(record);
  return { selected, excluded, counts: { selected: selected.length, excluded: excluded.length } };
}
