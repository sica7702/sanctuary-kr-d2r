import {PARSER_VERSION} from './traderie-integrity.mjs';

// Queue placement is not permission to learn or publish a valuation rule.
// Keep the original source integrity intact, including an unknown quantity.
const IDENTITY_ISSUE = '등급/부위/아이템 수량 확인 필요';
const LEGACY_QUANTITY_VERSION = 'traderie-integrity-v76.1';
function evidenceOf(row) {
  try { return JSON.parse(row.evidence_json)?.[0] || {}; } catch { return {}; }
}
function isTraderie(row, e) {
  return e.source === 'traderie' || row.source_type === 'market_observation' && /^https:\/\/(?:www\.)?traderie\.com\//i.test(row.source_url || '');
}
function quantityOnly(e) {
  const i = e.integrity, s = e.source_snapshot;
  return [PARSER_VERSION,LEGACY_QUANTITY_VERSION].includes(i?.parser_version) && i.complete === false &&
    i.options_complete === true && i.price_complete === true && i.identity_complete === false &&
    e.parser_quality?.complete === true && e.price_structure?.complete === true &&
    e.item_type === '레어' && typeof e.slot === 'string' && e.slot.trim() !== '' && e.slot !== 'other' &&
    s !== null && typeof s === 'object' && !Array.isArray(s) && s.quantity == null &&
    Array.isArray(i.issues) && i.issues.length === 1 && i.issues[0] === IDENTITY_ISSUE;
}

export function candidateQueueState(row) {
  const e = evidenceOf(row), i = e.integrity;
  const traderie = isTraderie(row, e);
  const reviewOnly = traderie && (i?.complete !== true || i?.parser_version !== PARSER_VERSION);
  const quantityUnconfirmed = traderie && quantityOnly(e);
  const needsRepair = reviewOnly && !quantityUnconfirmed;
  const reasons = [];
  if (needsRepair) {
    if (i?.parser_version !== PARSER_VERSION) reasons.push('이전 수집 형식이거나 검증 정보가 없습니다. 원본 재수집이 필요합니다.');
    if (i?.options_complete === false) reasons.push('해석하지 못했거나 충돌하는 옵션이 있습니다.');
    if (i?.price_complete === false) reasons.push('고정 가격이 없거나 가격 해석을 확인해야 합니다.');
    if (i?.identity_complete === false) reasons.push('아이템 종류·부위·수량 확인이 필요합니다.');
    if (!reasons.length) reasons.push('수집 정보가 불완전합니다. 원본을 확인하세요.');
  }
  return {needs_repair: needsRepair, review_only_required: reviewOnly,
    quantity_unconfirmed: quantityUnconfirmed, repair_reasons: reasons};
}

// The same narrow exception must be used for list pagination and header counts.
// COALESCE keeps every predicate boolean, even for old or malformed evidence.
const doc = "(CASE WHEN json_valid(evidence_json) THEN evidence_json ELSE '[]' END)";
const j = field => `json_extract(${doc},'$[0].${field}')`;
const jt = field => `json_type(${doc},'$[0].${field}')`;
const eq = (field, value) => `COALESCE(${j(field)}=${typeof value === 'number' ? value : "'" + value.replaceAll("'", "''") + "'"},0)`;
const flag = (field, value) => `COALESCE(${jt(field)}='${value}',0)`;
const traderieSQL = `(${eq('source','traderie')} OR (COALESCE(source_type='market_observation',0) AND (COALESCE(lower(source_url) LIKE 'https://traderie.com/%',0) OR COALESCE(lower(source_url) LIKE 'https://www.traderie.com/%',0))))`;
const quantityOnlySQL = `(${[
  `(${eq('integrity.parser_version',PARSER_VERSION)} OR ${eq('integrity.parser_version',LEGACY_QUANTITY_VERSION)})`,
  flag('integrity.complete',false),flag('integrity.options_complete',true),flag('integrity.price_complete',true),flag('integrity.identity_complete',false),
  flag('parser_quality.complete',true),flag('price_structure.complete',true),eq('item_type','레어'),
  `COALESCE(${jt('slot')}='text' AND trim(${j('slot')})<>'' AND ${j('slot')}<>'other',0)`,
  `COALESCE(${jt('source_snapshot')}='object',0)`,`${j('source_snapshot.quantity')} IS NULL`,
  `COALESCE(${jt('integrity.issues')}='array' AND json_array_length(${doc},'$[0].integrity.issues')=1,0)`,
  eq('integrity.issues[0]',IDENTITY_ISSUE)
].join(' AND ')})`;
export const REPAIR_SQL = `(${traderieSQL} AND NOT (${flag('integrity.complete',true)} AND ${eq('integrity.parser_version',PARSER_VERSION)}) AND NOT ${quantityOnlySQL})`;
