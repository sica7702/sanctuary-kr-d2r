import {canonicalContext,canonicalText,vector,digest,family,AI_SCHEMA,FEATURE_NAMES} from './ai-contract.mjs';
import {parseProperties} from './traderie-integrity.mjs';
const parse=(x,f)=>{try{return typeof x==='string'?JSON.parse(x):x??f}catch{return f}};
const VALUE_TAGS={value_low:0,value_trade:1,value_high:2,value_trophy:3};
const BAD_TAGS=new Set(['option_missing','parse_error','price_error','wrong_slot','wrong_base','duplicate_listing','source_mismatch','incomplete_data','test_only']);
const MARKET_TAGS=new Set(['synergy_good','highend_possible','build_demand_high','price_undervalued','socket_premium','rare_combo','build_demand_low','socket_missing','stat_missing','resist_missing','core_affix_missing','price_overvalued','synergy_weak']);
export async function sampleFromCandidate(row) {
  const excluded=reason=>({candidate_id:Number(row.id),eligible:false,reason,listing_key:'candidate:'+row.id});
  if(row.source_type!=='market_observation')return excluded('not_market_observation');
  const e=parse(row.evidence_json,[])[0],p=parse(row.proposal_json,{});
  if(!e||e.source!=='traderie'||e.integrity?.complete!==true||e.parser_quality?.complete!==true)return excluded('source_incomplete');
  const s=e.source_snapshot;
  if(!s||String(s.id)!==String(e.listing_id)||await digest(s)!==e.source_snapshot_hash)return excluded('snapshot_mismatch');
  const parsed=parseProperties(s);
  if(!parsed.quality.complete)return excluded('unmapped_or_conflicting_options');
  // Traderie can contain both aggregate and component resistance fields. Until
  // their decomposition is proven, never train on an assumed extra/total roll.
  if(parsed.affixes.allres&&['fireres','lightres','coldres','poisonres'].some(k=>parsed.affixes[k]))return excluded('ambiguous_resistance_decomposition');
  const snapshotRealm=s.ladder===true||s.ladder===1?'ladder':s.ladder===false||s.ladder===0?'standard':'unknown';
  const context=canonicalContext({slot:e.slot||p.slot,item_type:e.item_type||p.item_type,values:parsed.affixes,profile:{realm:snapshotRealm}});
  if(!context)return excluded('unsupported_affix_or_identity');
  const tags=parse(row.reviewer_tags_json,[]);
  if(!Array.isArray(tags)||tags.some(t=>BAD_TAGS.has(t)))return excluded('data_quality_review');
  const human=!!row.reviewer_email&&!/^(auto|system|cron|robot|bot)/i.test(row.reviewer_email);
  const reviewed=Date.parse(String(row.reviewed_at||'').replace(' ','T')+(String(row.reviewed_at||'').includes('T')?'':'Z'));
  const labeled=human&&['approved','rejected'].includes(row.status)&&Number(row.learning_eligible)===1&&Number.isFinite(reviewed);
  const vt=[...new Set(tags.filter(t=>Object.hasOwn(VALUE_TAGS,t)))];
  if(vt.length>1)return excluded('conflicting_value_labels');
  const value=labeled&&vt.length===1?VALUE_TAGS[vt[0]]:null;
  // Price-based decisions cannot teach an options-only approval classifier.
  const priceDependent=tags.some(t=>['price_undervalued','price_overvalued'].includes(t));
  const review=labeled&&!priceDependent&&(row.status==='approved'||tags.some(t=>MARKET_TAGS.has(t)||Object.hasOwn(VALUE_TAGS,t)))?+(row.status==='approved'):null;
  // No prices, seller identity, URLs, reviewer notes or contact data in model inputs.
  const fingerprint=await digest({slot:context.slot,item_type:context.item_type,profile:context.profile,values:context.values});
  return {candidate_id:Number(row.id),eligible:true,listing_key:'traderie:'+String(s.id),fingerprint,
    context,features:vector(context),text:canonicalText(context),family:family(context),labels:{value,review},
    provenance:{value:value===null?'unlabeled':'human',review:review===null?'unlabeled':'human'},
    source_hash:e.source_snapshot_hash,reviewed_at:Number.isFinite(reviewed)?reviewed:null,
    observed_at:Date.parse(e.fetched_at||e.listed_at||'')||0};
}
export function independentSamples(samples) {
  // Group re-listings and revisions together, before assigning a permanent fold.
  const parents=new Map(),find=x=>{if(!parents.has(x))parents.set(x,x);if(parents.get(x)!==x)parents.set(x,find(parents.get(x)));return parents.get(x)},join=(a,b)=>parents.set(find(a),find(b));
  const eligible=samples.filter(s=>s.eligible);
  for(const s of eligible)join('l:'+s.listing_key,'f:'+s.fingerprint);
  const groups=new Map();
  for(const s of eligible){const key=find('l:'+s.listing_key);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)}
  const out=[];
  for(const group of groups.values()) {
    if(['value','review'].some(task=>new Set(group.map(s=>s.labels[task]).filter(x=>x!==null)).size>1))continue;
    group.sort((a,b)=>(b.reviewed_at||b.observed_at)-(a.reviewed_at||a.observed_at)||b.candidate_id-a.candidate_id);
    // Never transplant a value label onto a different revision of the options.
    const representative=group.find(s=>s.labels.value!==null)||group.find(s=>s.labels.review!==null)||group[0];
    out.push({...representative,group_keys:[...new Set(group.flatMap(s=>['l:'+s.listing_key,'f:'+s.fingerprint]))].sort()});
  }
  return out;
}
export async function splitDataset(samples,previousGroups={}) {
  const rows=independentSamples(samples),split={train:[],calibration:[],test:[]},assignments={...previousGroups};
  for(const row of rows) {
    const previous=new Set(row.group_keys.map(k=>assignments[k]).filter(Boolean));
    const fold=previous.size>1?'quarantine':previous.size===1?[...previous][0]:['train','train','train','train','train','train','train','calibration','test','test'][parseInt((await digest(row.group_keys[0])).slice(0,8),16)%10];
    row.group_keys.forEach(k=>assignments[k]=fold);
    if(fold==='quarantine')continue;
    split[fold].push(row);
  }
  for(const rows of Object.values(split))rows.sort((a,b)=>(a.reviewed_at||a.observed_at)-(b.reviewed_at||b.observed_at));
  const dataset={schema:AI_SCHEMA,features:FEATURE_NAMES,...split};
  return {dataset,assignments,hash:await digest(dataset)};
}
