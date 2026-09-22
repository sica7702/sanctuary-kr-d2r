// Search-only metadata and comparisons. Never assign to an OCR option's value.
import {affixCandidates} from './unified-core.js?v=129';
import {sameOption} from './quality-unique.js?v=129';
import {environmentMatch,priceSamples} from './market-contract.js?v=123';

const compound = /skill$|charged|aura|\/lvl|^dmg-(pois|cold|fire|ltng|elem|mag)$|^pois-|Affix|affix|^rep-/;
const structural = /^(allskills|skilltab|skill|oskill|ama|sor|nec|pal|bar|dru|ass|war|sock|cast[123]|swing[123]|balance[123]|move[123])$/;
const present = n => n != null && typeof n !== 'boolean' && String(n).trim() !== '' && Number.isFinite(Number(n));

export function rollMetadata(mod, source = 'item-db') {
  if (!mod || compound.test(mod.code) || !present(mod.min) || !present(mod.max)) return null;
  const min = Math.min(Number(mod.min), Number(mod.max)), max = Math.max(Number(mod.min), Number(mod.max));
  return {min, max, step: Number.isInteger(min) && Number.isInteger(max) ? 1 : null, source};
}

export function observedRollMetadata(option, data, baseCode, quality) {
  // A crafted fixed bonus, socket addition or multiple affix groups can stack.
  // Do not invent a single-affix ceiling for such observations.
  if (!['magic', 'rare'].includes(quality) || !data.affixes || !data.types) return null;
  const base = data.bases?.find(b => b.code === baseCode);
  if (!base || compound.test(option.code)) return null;
  const candidates = affixCandidates(data, base, quality, null)
    .flatMap(a => a.mods.filter(m => sameOption(m, option)).map(mod => ({mod, group: a.kind + ':' + a.group})));
  if (!candidates.length || new Set(candidates.map(c => c.group)).size !== 1) return null;
  const ranges = candidates.map(c => rollMetadata(c.mod, 'affix-db'));
  if (ranges.some(r => !r)) return null;
  const min = Math.min(...ranges.map(r => r.min)), max = Math.max(...ranges.map(r => r.max));
  return {min, max, step: ranges.every(r => r.step === 1) ? 1 : null, source: 'affix-db'};
}

export function searchBounds(option) {
  const r = option.searchRange;
  if (!r || !present(r.min) || !present(r.max)) return null;
  let min = Number(r.min), max = Number(r.max);
  if (min > max) return null;
  if (option.traderie?.magnitude) {
    [min, max] = [min <= 0 && max >= 0 ? 0 : Math.min(Math.abs(min), Math.abs(max)), Math.max(Math.abs(min), Math.abs(max))];
  }
  return {min, max, step: present(r.step) && Number(r.step) > 0 ? Number(r.step) : null};
}

export function searchConstraints(draft, stage = '10') {
  if (!['exact', '5', '10', 'full', 'item'].includes(stage)) throw Error('지원하지 않는 검색 범위입니다.');
  const fixedByItem = ['unique', 'set'].includes(draft.quality);
  return draft.options.map((o, index) => {
    const row = {index, code: o.code, name: o.name || o.code, original: o.value, property: o.traderie ? 'prop_' + o.traderie.id : null};
    if (o.conflict || o.identityConflict || o.status === '서로 다른 판독값') return {...row, state: 'conflict'};
    if (fixedByItem && o.searchFixed) return {...row,state:'fixed'};
    if (fixedByItem && o.fixed && !present(o.value)) return {...row,state:'fixed'};
    if (!present(o.value)) return {...row, state: 'unread'};
    const value = o.traderie?.magnitude ? Math.abs(Number(o.value)) : Number(o.value), bounds = searchBounds(o);
    if (bounds && (value < bounds.min || value > bounds.max)) return {...row, state: 'out-of-range', value, bounds};
    if (fixedByItem && (o.fixed || o.searchFixed || bounds?.min === bounds?.max && bounds != null)) return {...row, state: 'fixed', value};
    if (stage === 'item') return {...row, state: 'reference', value};
    if (!o.traderie) return {...row, state: 'unmapped', value};
    if (!bounds || structural.test(o.code) || bounds.min === bounds.max) return {...row, state: 'exact', value, min: value, max: value, bounds, rangeKnown: !!bounds};
    let min = value, max = value;
    if (stage === 'full') ({min, max} = bounds);
    else if (stage !== 'exact') {
      const delta = Math.abs(value) * Number(stage) / 100;
      min = Math.max(bounds.min, value - delta);
      max = Math.min(bounds.max, value + delta);
      if (bounds.step) {
        min = bounds.min + Math.ceil((min - bounds.min) / bounds.step - 1e-9) * bounds.step;
        max = bounds.min + Math.floor((max - bounds.min) / bounds.step + 1e-9) * bounds.step;
      }
    }
    return {...row, state: stage === 'exact' ? 'exact' : 'range', value, min: Number(min.toFixed(8)), max: Number(max.toFixed(8)), bounds, rangeKnown: true};
  });
}

export const searchStageLabels = {exact:'동일 수치', '5':'변동 옵션 ±5%', '10':'변동 옵션 ±10%', full:'변동 옵션 전체 범위', item:'같은 품목 참고'};
export function stageOrder(start = '5') {
  const stages = ['exact', '5', '10', 'full', 'item'];
  if (!stages.includes(start)) throw Error('지원하지 않는 검색 범위입니다.');
  return stages.slice(stages.indexOf(start));
}

export function listingComparison(draft, listing, stage) {
  const rows = searchConstraints(draft, stage);
  const differences = [], missing = [];
  let matches = true;
  for (const row of rows) {
    if (row.state === 'fixed') continue;
    if (row.state === 'unread') { missing.push(row.name); matches = false; continue; }
    const raw = row.property ? listing.values?.[row.property] : null;
    if (!present(raw) || ['unmapped', 'out-of-range', 'conflict'].includes(row.state)) { missing.push(row.name); matches = false; continue; }
    const actual = draft.options[row.index].traderie?.magnitude ? Math.abs(Number(raw)) : Number(raw), expected = Number(row.value);
    differences.push({name:row.name, original:row.original, actual, delta:actual - expected});
    if (actual < row.min || actual > row.max) matches = false;
  }
  return {matches: stage === 'item' || matches, differences, missing};
}

export function chooseRecentMatches(draft, listings, {days = 7, minimum = 5, start = '5', autoWiden = true, now = Date.now(), completed = false, complete = true} = {}) {
  if (![1, 7, 30].includes(Number(days)) || !Number.isFinite(Number(now))) throw Error('검색 기간을 확인하세요.');
  const cutoff = Number(now) - Number(days) * 86400000;
  const seen = new Set(), recent = [], excluded = {old:0, undated:0, environment:0, unverified:0};
  for (const listing of listings) {
    if (!listing?.id || seen.has(String(listing.id))) continue;
    seen.add(String(listing.id));
    const environment=environmentMatch(draft,listing);
    if(environment.different.length || listing.completed !== completed && listing.completed != null || !completed && listing.active === false){excluded.environment++;continue;}
    if(environment.missing.length || listing.completed == null || !completed && listing.active !== true){excluded.unverified++;continue;}
    // Fetch time or update time must never turn an old post into a new post.
    const date = completed ? listing.completedAt : listing.postedAt;
    const timestamp = date ? Date.parse(date) : NaN;
    if (!Number.isFinite(timestamp) || timestamp > Number(now) + 60000) { excluded.undated++; continue; }
    if (timestamp < cutoff) { excluded.old++; continue; }
    recent.push({...listing, timestamp});
  }
  recent.sort((a,b) => b.timestamp - a.timestamp);
  const attempts = [];
  let selected = [], selectedStage = 'item';
  // Item-only reference is opt-in, never an automatic substitute for a price match.
  const stages = stageOrder(start).filter(stage=>stage!=='item'||start==='item');
  for (const stage of autoWiden && complete ? stages : stages.slice(0, 1)) {
    const matches = recent.map(l => ({...l, comparison:listingComparison(draft,l,stage)})).filter(l => l.comparison.matches);
    const samples=priceSamples(matches);
    attempts.push({stage, count:matches.length, priced:samples.priced, independent:samples.independent});
    selected = matches; selectedStage = stage;
    if (samples.independent >= minimum) break;
  }
  const samples=priceSamples(selected);
  const partialOptions=Array.isArray(draft.unresolvedLines)&&draft.unresolvedLines.length>0;
  return {stage:selectedStage, attempts, listings:selected, recentCount:recent.length, excluded, days:Number(days), cutoff:new Date(cutoff).toISOString(), referenceOnly:selectedStage === 'item',samples,
    partialOptions,evidenceSufficient:complete&&!partialOptions&&selectedStage!=='item'&&samples.independent>=minimum,complete};
}
