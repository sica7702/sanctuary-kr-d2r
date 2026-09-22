// Conservative, deterministic learning from explicit human value labels.
// This does not modify the existing item score or grade. A pattern is published
// only after independent listings agree in chronological training/holdout sets.

export const REVIEW_VALUE_MODEL_VERSION='review-value-v1';
export const VALUE_TIER_TAGS=Object.freeze({
  value_low:0,
  value_trade:1,
  value_high:2,
  value_trophy:3
});

export const LEARNED_AFFIX_KEYS=Object.freeze([
  'fcr','frw','fhr','ias','str','dex','life','mana','allres',
  'fire','light','cold','poison','ar','ll','ml','mf','sockets',
  'classskill','vit','energy','gf','ed','edef','defense','mindmg',
  'maxdmg','rep','dr','dr_pct','mdr','cb','ds','ow','mpk','mregen',
  'dtm','maxstam','plr','visionary','skilltab','main','support'
]);

const KEY_ALIASES=Object.freeze({
  fireres:'fire',lightres:'light',coldres:'cold',poisonres:'poison',
  fire_res:'fire',light_res:'light',cold_res:'cold',poison_res:'poison',
  fire_resist:'fire',lightning_resist:'light',cold_resist:'cold',poison_resist:'poison',
  min_damage:'mindmg',max_damage:'maxdmg',replenish_life:'rep',
  dr_flat:'dr',life_replenish:'rep'
});
const CLASS_AFFIX_CHAR=Object.freeze({
  amazon_skills:'아마존',sorc_skills:'소서리스',necro_skills:'네크로맨서',
  paladin_skills:'팔라딘',barbarian_skills:'야만용사',druid_skills:'드루이드',
  assassin_skills:'어쌔신',warlock_skills:'악마술사'
});
const ALLOWED=new Set(LEARNED_AFFIX_KEYS);
const SLOT_ALIASES=Object.freeze({
  '반지':'ring','목걸이':'amulet','써클릿':'circlet','장갑':'gloves',
  '부츠':'boots','벨트':'belt','클러':'claw','자벨린':'jav',
  '활':'bow','오브':'orb','완드':'wand'
});
const TYPE_ALIASES=Object.freeze({rare:'레어',magic:'매직',crafted:'크래프트',unique:'유니크',set:'세트',base:'베이스'});
const has=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function stableDigest(value){
  // Two independent 32-bit streams make stable, compact D1 rule keys without
  // Node-only crypto dependencies in the Worker runtime.
  let a=2166136261,b=2166136261^0x9e3779b9;
  for(let index=0;index<value.length;index++){
    const code=value.charCodeAt(index);
    a=Math.imul(a^code,16777619);
    b=Math.imul(b^(code+index),16777619);
  }
  return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;
}
const modelRuleKey=identity=>`review_value:${stableDigest(identity)}`;
const safeJson=(value,fallback)=>{
  if(value&&typeof value==='object')return value;
  if(typeof value!=='string')return fallback;
  try{return JSON.parse(value)}catch{return fallback}
};
const token=value=>String(value??'').trim().toLowerCase();

function normalizeSlot(value){
  const raw=String(value??'').trim();
  return SLOT_ALIASES[raw]||raw.toLowerCase();
}

function normalizeItemType(value){
  const raw=String(value??'').trim();
  return TYPE_ALIASES[raw.toLowerCase()]||raw;
}

function orderedSignature(affixes,{context=false,profile=null}={}){
  if(!affixes||typeof affixes!=='object'||Array.isArray(affixes))return null;
  const signature={};let classChar=null;
  for(const [rawKey,rawValue] of Object.entries(affixes)){
    const original=token(rawKey),key=CLASS_AFFIX_CHAR[original]?'classskill':KEY_ALIASES[original]||original;
    if(context&&key==='reqlevel')continue; // item metadata, not an affix
    if(!ALLOWED.has(key))return null; // do not silently drop unmodeled options
    if(rawValue===''||rawValue===null||rawValue===undefined)return null;
    const value=Number(rawValue);
    if(!Number.isFinite(value)||value<0||value>100000)return null;
    if(value===0)continue; // zero-valued form defaults do not mean an affix is present
    if(CLASS_AFFIX_CHAR[original]){
      if(classChar&&classChar!==CLASS_AFFIX_CHAR[original])return null;
      classChar=CLASS_AFFIX_CHAR[original];
    }
    if(has(signature,key)&&signature[key]!==value)return null;
    signature[key]=value;
  }
  if(!Object.keys(signature).length)return null;
  if(context&&has(signature,'classskill')){
    classChar=String(profile?.char||'').trim();
    if(!classChar)return null;
  }
  return {values:Object.fromEntries(Object.entries(signature).sort(([a],[b])=>a.localeCompare(b))),class_char:classChar};
}

function reviewedTimestamp(value){
  if(typeof value!=='string'||!value.trim())return null;
  const normalized=value.includes('T')?value:value.trim().replace(' ','T')+'Z';
  const time=Date.parse(normalized);
  return Number.isFinite(time)?time:null;
}

function evidenceEnvironment(evidence){
  const snapshot=evidence?.source_snapshot||{};
  const fields=['platform','ladder','hardcore','game_version','season','region'];
  return Object.fromEntries(fields.map(field=>[field,snapshot[field]??evidence?.[field]??null]));
}

function humanReview(row){
  const actor=token(row?.reviewer_email);
  if(!actor||/^(?:auto[-_]|system|cron|robot|bot)/.test(actor))return false;
  const reason=token(row?.review_reason_type);
  if(/^(?:auto_validated_review|manual_review_only|data_quality_feedback|parser_incomplete|source_integrity_incomplete|structured_price_review_only)$/.test(reason))return false;
  return true;
}

export function reviewedValueSample(row){
  if(!row||typeof row!=='object')return {sample:null,reason:'invalid_row'};
  if(!humanReview(row))return {sample:null,reason:'not_human'};
  if(!['approved','rejected'].includes(String(row.status)))return {sample:null,reason:'not_final'};
  if(row.source_type!=='market_observation')return {sample:null,reason:'not_market_review'};
  if(Number(row.learning_eligible)!==1)return {sample:null,reason:'not_eligible'};
  const tags=safeJson(row.reviewer_tags_json,[]);
  const selected=Array.isArray(tags)?[...new Set(tags.filter(tag=>has(VALUE_TIER_TAGS,tag)))]:[];
  if(selected.length!==1)return {sample:null,reason:selected.length?'conflicting_value_tags':'no_value_tag'};
  const evidence=safeJson(row.evidence_json,[]);
  const e=Array.isArray(evidence)?evidence[0]:null;
  const proposal=safeJson(row.proposal_json,{});
  if(!e||e.source!=='traderie')return {sample:null,reason:'unverified_source'};
  if(e.integrity?.complete!==true||e.parser_quality?.complete!==true||
     Number(e.parser_quality.property_coverage)<0.95||e.price_structure?.complete!==true)
    return {sample:null,reason:'incomplete_source'};
  if(!e.source_snapshot||typeof e.source_snapshot!=='object'||Array.isArray(e.source_snapshot)||
     !/^[a-f0-9]{64}$/i.test(String(e.source_snapshot_hash||'')))
    return {sample:null,reason:'missing_snapshot'};
  const listingId=String(e.listing_id||e.source_snapshot.id||'').trim();
  if(!listingId||String(e.source_snapshot.id||'').trim()!==listingId)
    return {sample:null,reason:'listing_mismatch'};
  const reviewedAt=reviewedTimestamp(row.reviewed_at);
  if(reviewedAt===null)return {sample:null,reason:'missing_review_time'};
  const slot=normalizeSlot(proposal.slot||e.slot);
  const itemType=normalizeItemType(proposal.item_type||e.item_type);
  if(!slot||slot==='other'||!itemType)return {sample:null,reason:'missing_identity'};
  if(!['레어','매직','크래프트'].includes(itemType))return {sample:null,reason:'unsupported_item_type'};
  // A recorded zero socket is an explicit absence claim. Current appraiser
  // contexts only expose positive socket affixes, so they cannot distinguish
  // this from an unexamined socket state. Do not train on that ambiguity.
  if(e.affixes&&Object.entries(e.affixes).some(([key,value])=>token(key)==='sockets'&&Number(value)===0))
    return {sample:null,reason:'explicit_socket_absence_unsupported'};
  const normalized=orderedSignature(e.affixes);
  if(!normalized)return {sample:null,reason:'unsupported_affixes'};
  const affixKeys=Object.keys(normalized.values);
  const identity=JSON.stringify([slot,itemType,affixKeys,normalized.class_char]);
  return {sample:{
    id:Number(row.id)||null,
    listing_key:`traderie:${listingId}`,
    reviewed_at:reviewedAt,
    slot,item_type:itemType,
    affix_values:normalized.values,
    affix_keys:affixKeys,
    class_char:normalized.class_char,
    identity,
    value_tier:VALUE_TIER_TAGS[selected[0]],
    label_tag:selected[0],
    environment:evidenceEnvironment(e)
  },reason:null};
}

function majorityTier(rows){
  const counts=[0,0,0,0];
  for(const row of rows)counts[row.value_tier]++;
  const peak=Math.max(...counts);
  if(counts.filter(count=>count===peak).length!==1)return null;
  return {tier:counts.indexOf(peak),count:peak,counts};
}

export function trainReviewedValuePatterns(rows,{minTrain=5,minHoldout=2,minTrainAgreement=0.8,minHoldoutAccuracy=0.8}={}){
  const diagnostics={seen:0,accepted:0,independent:0,groups:0,promoted:0,
    rejected_reasons:{},group_abstentions:{},
    policy:{min_train:minTrain,min_holdout:minHoldout,min_train_agreement:minTrainAgreement,
      min_holdout_accuracy:minHoldoutAccuracy,holdout_rule:'Every holdout label and every affix value must agree with the training majority and lie inside the training min/max range.',
      zero_socket_rule:'Explicit sockets=0 is excluded because consumers cannot distinguish absence from unknown.',
      extrapolation:false,warning:'Rare items with many independent numeric affixes may remain in abstain for a long time.'}};
  const countReason=(key,field='rejected_reasons')=>{diagnostics[field][key]=(diagnostics[field][key]||0)+1};
  const byListing=new Map();
  for(const row of (Array.isArray(rows)?rows:[])){
    diagnostics.seen++;
    const {sample,reason}=reviewedValueSample(row);
    if(!sample){countReason(reason);continue}
    diagnostics.accepted++;
    if(!byListing.has(sample.listing_key))byListing.set(sample.listing_key,[]);
    byListing.get(sample.listing_key).push(sample);
  }
  const groups=new Map();
  for(const entries of byListing.values()){
    // Re-review of a listing is not another independent example. Conflicting
    // labels or identities are discarded rather than choosing a convenient one.
    if(new Set(entries.map(x=>`${x.identity}|${x.value_tier}`)).size!==1){countReason('conflicting_listing');continue}
    const sample=entries.sort((a,b)=>b.reviewed_at-a.reviewed_at)[0];
    diagnostics.independent++;
    if(!groups.has(sample.identity))groups.set(sample.identity,[]);
    groups.get(sample.identity).push(sample);
  }
  diagnostics.groups=groups.size;
  const patterns=[];
  const ruleKeys=new Map();
  for(const [identity,group] of groups){
    group.sort((a,b)=>a.reviewed_at-b.reviewed_at||(a.listing_key<b.listing_key?-1:1));
    const holdoutSize=Math.max(minHoldout,Math.ceil(group.length*0.25));
    const trainSize=group.length-holdoutSize;
    if(trainSize<minTrain){countReason('insufficient_independent_samples','group_abstentions');continue}
    const train=group.slice(0,trainSize),holdout=group.slice(trainSize);
    const majority=majorityTier(train);
    if(!majority){countReason('training_tie','group_abstentions');continue}
    const trainAgreement=majority.count/train.length;
    if(trainAgreement<minTrainAgreement){countReason('training_disagreement','group_abstentions');continue}
    const affixKeys=group[0].affix_keys;
    const ranges=Object.fromEntries(affixKeys.map(key=>[key,{
      gte:Math.min(...train.map(row=>row.affix_values[key])),
      lte:Math.max(...train.map(row=>row.affix_values[key]))
    }]));
    // Holdout must be correctly classified *and* fall within every training
    // range. A broad family must not extrapolate to an unseen high/low roll.
    const holdoutWithinRange=holdout.filter(row=>
      affixKeys.every(key=>row.affix_values[key]>=ranges[key].gte&&row.affix_values[key]<=ranges[key].lte)).length;
    const holdoutCorrect=holdout.filter(row=>row.value_tier===majority.tier&&
      affixKeys.every(key=>row.affix_values[key]>=ranges[key].gte&&row.affix_values[key]<=ranges[key].lte)).length;
    const holdoutAccuracy=holdoutCorrect/holdout.length;
    if(holdoutAccuracy<minHoldoutAccuracy){
      countReason(holdoutWithinRange/holdout.length<minHoldoutAccuracy?'holdout_outside_train_range':'holdout_label_failed','group_abstentions');
      continue;
    }
    const first=group[0];
    const environments=[...new Set(group.map(x=>JSON.stringify(x.environment)))].map(value=>JSON.parse(value));
    const ruleKey=modelRuleKey(identity);
    if(ruleKeys.has(ruleKey)&&ruleKeys.get(ruleKey)!==identity){countReason('rule_key_collision','group_abstentions');continue}
    ruleKeys.set(ruleKey,identity);
    patterns.push({
      rule_key:ruleKey,
      label:`검수 학습 · ${first.item_type} · ${first.slot}`,
      slot:first.slot,
      item_type:first.item_type,
      priority:0,
      conditions:ranges,
      ...(first.class_char?{profile:{char:{eq:first.class_char}}}:{}),
      effects:{learned_value_tier:majority.tier},
      learning_meta:{
        source:'reviewed_value',model_version:REVIEW_VALUE_MODEL_VERSION,
        affix_keys:affixKeys,
        affix_ranges:ranges,
        class_char:first.class_char,
        allowed_affix_keys:[...LEARNED_AFFIX_KEYS],
        sample_count:group.length,train_count:train.length,holdout_count:holdout.length,
        train_agreement:trainAgreement,holdout_accuracy:holdoutAccuracy,
        holdout_correct:holdoutCorrect,environment_summary:environments,
        latest_reviewed_at:new Date(group.at(-1).reviewed_at).toISOString(),
        score_unchanged:true
      }
    });
  }
  patterns.sort((a,b)=>a.rule_key.localeCompare(b.rule_key));
  diagnostics.promoted=patterns.length;
  return {version:REVIEW_VALUE_MODEL_VERSION,patterns,diagnostics};
}

export function inferReviewedValue(patterns,context){
  const abstain=reason=>({status:'abstain',value_tier:null,reason,pattern:null});
  if(!Array.isArray(patterns)||!patterns.length)return abstain('no_validated_pattern');
  const slot=normalizeSlot(context?.slot),itemType=normalizeItemType(context?.item_type);
  const normalized=orderedSignature(context?.values,{context:true,profile:context?.profile});
  if(!slot||!itemType||!normalized)return abstain('incomplete_or_unsupported_context');
  const affixKeys=Object.keys(normalized.values);
  const identity=JSON.stringify([slot,itemType,affixKeys,normalized.class_char]);
  const matching=patterns.filter(pattern=>
    pattern?.learning_meta?.model_version===REVIEW_VALUE_MODEL_VERSION&&
    pattern?.learning_meta?.source==='reviewed_value'&&
    pattern.rule_key===modelRuleKey(identity)&&
    JSON.stringify(pattern.learning_meta.affix_keys)===JSON.stringify(affixKeys)&&
    pattern.learning_meta.class_char===normalized.class_char&&
    Object.entries(pattern.conditions||{}).every(([key,spec])=>
      normalized.values[key]>=Number(spec?.gte)&&normalized.values[key]<=Number(spec?.lte))&&
    Number.isInteger(pattern.effects?.learned_value_tier)&&
    pattern.effects.learned_value_tier>=0&&pattern.effects.learned_value_tier<=3);
  if(matching.length!==1)return abstain(matching.length?'ambiguous_pattern':'no_matching_pattern');
  const pattern=matching[0];
  return {status:'learned',value_tier:pattern.effects.learned_value_tier,reason:null,pattern};
}
