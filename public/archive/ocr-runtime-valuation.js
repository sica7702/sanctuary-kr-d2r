// Photo-appraisal adapter for approved runtime valuation rules. The OCR and
// established item engine remain the source of the original score and grade.
const SLOT_IDS={반지:'ring',목걸이:'amulet',써클릿:'circlet',장갑:'gloves',부츠:'boots',벨트:'belt',클러:'claw',자벨린:'jav',활:'bow',오브:'orb',완드:'wand'};
const VALUE_IDS={
 '시전 속도 증가':'fcr','달리기/걷기 속도 증가':'frw','타격 회복 속도 증가':'fhr','공격 속도 증가':'ias',
 '힘':'str','민첩':'dex','생명력':'life','마나':'mana','모든 저항':'allres',
 '화염 저항':'fire','번개 저항':'light','냉기 저항':'cold','독 저항':'poison',
 '명중률':'ar','적중당 생명력 훔침':'ll','적중당 마나 훔침':'ml','마법 아이템 발견 확률':'mf',
 '소켓':'sockets','활력':'vit','마력':'energy','적에게서 얻는 금화 증가':'gf',
 '피해 증가':'ed','방어력 증가':'edef','방어력':'defense',
 '최소 피해':'mindmg','최대 피해':'maxdmg','생명력 회복':'rep',
 '피해 감소':'dr','피해 감소 %':'dr_pct','마법 피해 감소':'mdr',
 '강타 확률':'cb','치명적 공격':'ds','상처 악화':'ow',
 '적 처치 시 마나':'mpk','마나 재생':'mregen',
 '받는 피해의 %만큼 마나 회복':'dtm','최대 지구력':'maxstam',
 '중독 지속시간 감소':'plr'
};
const CLASS_SKILL=/^(?:아마존|원소술사|강령술사|성기사|야만용사|드루이드|암살자|악마술사) 기술 레벨$/;
const CLASS_CHAR={아마존:'아마존',원소술사:'소서리스',강령술사:'네크로맨서',성기사:'팔라딘',야만용사:'야만용사',드루이드:'드루이드',암살자:'어쌔신',악마술사:'악마술사'};
const RES_KEYS=['fire','light','cold','poison'];
const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

export function ocrRuleContext({slot,rarity,items=[],realm,reqlevel,socketState,resistInference}={}){
 const values={},ambiguous=new Set();
 const observedClasses=new Set();
 for(const item of items){
  if(item?.conflict||item?.identityConflict)continue;
  if(CLASS_SKILL.test(item?.name||''))observedClasses.add(CLASS_CHAR[item.name.split(' ')[0]]);
  const key=VALUE_IDS[item?.name]||(CLASS_SKILL.test(item?.name||'')?'classskill':null);
  const value=Number(item?.value);
   if(!key){if(item?.value!==''&&Number.isFinite(value)&&value!==0)values.__unsupported=1;continue;}
   if(item.value===''||!Number.isFinite(value)||value<0)continue;
  // A second conflicting reading is not an additional affix or a higher roll.
  if(has(values,key)&&values[key]!==value)ambiguous.add(key);
  else values[key]=value;
 }
 for(const key of ambiguous)delete values[key];
 // Tooltip elemental resistance can already include the all-resistance roll.
 // Rules use the manual appraiser's extra-resistance convention, not the sum.
 if(resistInference?.allres>0){
  values.allres=Number(resistInference.allres);
  for(const [name,extra] of Object.entries(resistInference.extras||{})){
   const key=VALUE_IDS[name];if(RES_KEYS.includes(key)&&!ambiguous.has(key)&&Number.isFinite(Number(extra)))values[key]=Number(extra);
  }
 }else if(values.allres>0){
  for(const key of RES_KEYS)if(has(values,key))values[key]=Math.max(0,values[key]-values.allres);
 }
 if(socketState!=='auto'&&socketState!==''&&socketState!=null){
  const n=Number(socketState);if(Number.isInteger(n)&&n>=0&&n<=6)values.sockets=n;
 }
 const level=Number(reqlevel);
 if(reqlevel!==''&&reqlevel!=null&&Number.isInteger(level)&&level>=1&&level<=99)values.reqlevel=level;
 return {slot:SLOT_IDS[slot]||null,item_type:rarity||null,profile:{realm:realm||null,char:observedClasses.size===1?[...observedClasses][0]:null},values};
}

function criterion(actual,spec){
 if(actual===undefined||actual===null||spec===undefined||spec===null)return false;
 if(typeof spec!=='object'||Array.isArray(spec))return actual===spec;
 const allowed=new Set(['eq','neq','gte','lte','gt','lt','truthy','in','contains']);
 if(!Object.keys(spec).length||Object.keys(spec).some(k=>!allowed.has(k)))return false;
 if(has(spec,'eq')&&actual!==spec.eq)return false;
 if(has(spec,'neq')&&actual===spec.neq)return false;
 for(const [key,test] of [['gte',(a,b)=>a>=b],['lte',(a,b)=>a<=b],['gt',(a,b)=>a>b],['lt',(a,b)=>a<b]]){
  if(!has(spec,key))continue;
  const a=Number(actual),b=Number(spec[key]);
  if(!Number.isFinite(a)||!Number.isFinite(b)||!test(a,b))return false;
 }
 if(has(spec,'truthy')&&Boolean(actual)!==Boolean(spec.truthy))return false;
 if(has(spec,'in')&&(!Array.isArray(spec.in)||!spec.in.includes(actual)))return false;
 if(has(spec,'contains')&&!String(actual).includes(String(spec.contains)))return false;
 return true;
}

export function evaluateOcrRules(state,context){
 const empty={scoreDelta:0,matched:[],online:!!state?.online,revision:state?.revision??null};
 if(!state?.ready||!state.online||!Array.isArray(state.rules)||!context?.slot||!context?.item_type)return empty;
 let total=0;const matched=[];
 for(const rule of state.rules){
  if(rule?.active===0||rule?.active===false||!rule||rule.slot!==context.slot||rule.item_type!==context.item_type)continue;
  const effects=rule.effects||{};
  // Single-listing market observations are evidence, never valuation rules.
  if(effects.market_watch_only||String(rule.rule_key||'').startsWith('market_watch_')||effects.tags?.includes?.('market-observation'))continue;
  const delta=Number(effects.score_delta);
  if(!Number.isFinite(delta)||delta===0)continue;
  const conditions=rule.conditions||{},profile=rule.profile||{};
  if(typeof conditions!=='object'||Array.isArray(conditions)||typeof profile!=='object'||Array.isArray(profile))continue;
  // A numeric +class-skill roll alone cannot identify which class was approved.
  if(has(conditions,'classskill')&&(!has(profile,'char')||!criterion(context.profile?.char,profile.char)))continue;
  if(Object.entries(conditions).some(([key,spec])=>!criterion(context.values?.[key],spec)))continue;
  if(Object.entries(profile).some(([key,spec])=>!criterion(context.profile?.[key],spec)))continue;
  total+=delta;matched.push({rule_key:rule.rule_key,label:rule.label,delta});
 }
 return {...empty,scoreDelta:Math.max(-30,Math.min(30,total)),matched};
}

export function adjustedOcrScore(baseScore,delta){
 return Math.max(0,Math.min(100,Math.round(Number(baseScore)||0)+Number(delta||0)));
}

export function ocrGrade(score){return score>=94?'S++':score>=88?'S+':score>=80?'S':score>=72?'A+':score>=64?'A':score>=54?'B':'C';}
