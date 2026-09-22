// Shared numeric contract: used by dataset export, PC training and edge inference.
// These scales are numerical normalization, NOT legal affix caps or value scores.
export const AI_SCHEMA = 'sanctuary-value-neural-v1';
export const TIERS = ['낮은 가치', '거래 가능', '높은 가치', '최상급 후보'];
export const SLOTS = ['ring','amulet','circlet','gloves','boots','belt','classarmor','melee','polearm','bow','crossbow','jav','claw','orb','wand','caster','armor','shield','helm'];
export const TYPES = ['레어','매직','크래프트'];
export const CLASSES = ['unknown','아마존','소서리스','네크로맨서','팔라딘','야만용사','드루이드','어쌔신','악마술사'];
export const SCALES = Object.freeze({fcr:20,frw:40,fhr:30,ias:40,str:30,dex:30,life:100,mana:100,allres:30,fire:40,light:40,cold:40,poison:40,ar:150,ll:10,ml:10,mf:40,gf:100,sockets:6,classskill:3,vit:30,energy:30,ed:400,edef:200,defense:500,mindmg:30,maxdmg:60,rep:15,dr:15,dr_pct:20,mdr:15,cb:25,ds:30,ow:30,mpk:10,mregen:30,dtm:20,maxstam:50,plr:75,fbr:30,block_chance:30,all_attributes:10,requirements:30,stamina_regen:30,damage_demons:200,damage_undead:200,ar_demons:200,ar_undead:200,thorns:20,light_radius:10,reduce_target_defense:100,defense_missile:100,defense_melee:100,ar_pct:100,life_after_kill:10,eth:1,repair:1,replenish:1,cbf:1,indestructible:1});
const ALIASES = {fireres:'fire',lightres:'light',coldres:'cold',poisonres:'poison',replenish_life:'rep',dr_flat:'dr',min_damage:'mindmg',max_damage:'maxdmg',mana_regen:'mregen',mana_after_kill:'mpk',damage_to_mana:'dtm',max_stamina:'maxstam',poison_length_reduced:'plr',ethereal:'eth'};
const CLASS_KEYS = {amazon_skills:'아마존',sorc_skills:'소서리스',necro_skills:'네크로맨서',paladin_skills:'팔라딘',barbarian_skills:'야만용사',druid_skills:'드루이드',assassin_skills:'어쌔신',warlock_skills:'악마술사'};
const SLOT_NAMES = {반지:'ring',목걸이:'amulet',써클릿:'circlet',장갑:'gloves',부츠:'boots',신발:'boots',벨트:'belt',클러:'claw',자벨린:'jav',활:'bow',오브:'orb',완드:'wand',갑옷:'armor',방패:'shield',투구:'helm'};
const TYPE_NAMES = {rare:'레어',magic:'매직',crafted:'크래프트'};
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export function canonicalContext(input) {
  if(!input || typeof input!=='object' || input.uncertain===true) return null;
  const slot=SLOT_NAMES[input.slot]||input.slot;
  const rawType=String(input.item_type||'');
  const item_type=TYPE_NAMES[rawType]||(rawType.includes('크래프트')?'크래프트':rawType);
  if(!SLOTS.includes(slot)||!TYPES.includes(item_type)) return null;
  const raw=input.values;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>100) return null;
  const values={}; let char=input.profile?.char||'unknown';
  for(const [rawKey,rawValue] of Object.entries(raw)) {
    if(rawKey==='reqlevel'||rawKey==='proc_trigger'&&rawValue==='없음/선택') continue;
    // Empty form defaults are absent, but non-zero unknowns must never disappear.
    if(rawValue===0||rawValue===''||rawValue===null||rawValue===undefined) continue;
    const key=CLASS_KEYS[rawKey]?'classskill':ALIASES[rawKey]||rawKey;
    if(!own(SCALES,key)||typeof rawValue==='boolean') return null;
    const value=Number(rawValue);
    if(!Number.isFinite(value)||Math.abs(value)>10000||(value<0&&!['requirements','light_radius','reduce_target_defense'].includes(key))) return null;
    if(own(values,key)) return null;
    values[key]=value;
    if(CLASS_KEYS[rawKey]) { if(char!=='unknown'&&char!==CLASS_KEYS[rawKey])return null; char=CLASS_KEYS[rawKey]; }
  }
  if(!values.classskill)char='unknown';
  if(!Object.keys(values).length||!CLASSES.includes(char)||(values.classskill&&!CLASSES.slice(1).includes(char))) return null;
  const realm=/^(래더|ladder)$/i.test(String(input.profile?.realm||''))?'ladder':/스탠|non.?ladder|standard/i.test(String(input.profile?.realm||''))?'standard':'unknown';
  const req=Number(raw.reqlevel||input.reqlevel||0); if(!Number.isInteger(req)||req<0||req>99)return null;
  return {slot,item_type,profile:{char,realm},values:Object.fromEntries(Object.entries(values).sort(([a],[b])=>a<b?-1:1)),reqlevel:req};
}
export const FEATURE_NAMES = Object.freeze([
  ...SLOTS.map(x=>'slot:'+x),...TYPES.map(x=>'type:'+x),...CLASSES.map(x=>'class:'+x),
  ...['unknown','ladder','standard'].map(x=>'realm:'+x),
  ...Object.keys(SCALES).flatMap(x=>[x+':present',x+':roll']),
  'reqlevel:known','reqlevel:roll','fcr*classskill','ias*ed','life*resists','ll*ml','fcr*mana','sockets*ed'
]);
export function vector(context) {
  const c=canonicalContext(context);if(!c)throw new Error('unsupported_context');
  const v=c.values,scaled=k=>Math.sign(v[k]||0)*Math.log1p(Math.abs(v[k]||0)/SCALES[k]);
  return [...SLOTS.map(x=>+(x===c.slot)),...TYPES.map(x=>+(x===c.item_type)),...CLASSES.map(x=>+(x===c.profile.char)),
    ...['unknown','ladder','standard'].map(x=>+(x===c.profile.realm)),
    ...Object.keys(SCALES).flatMap(k=>[+(own(v,k)),scaled(k)]),+(c.reqlevel>0),c.reqlevel/99,
    scaled('fcr')*scaled('classskill'),scaled('ias')*scaled('ed'),scaled('life')*(scaled('allres')+scaled('fire')+scaled('light')+scaled('cold')+scaled('poison'))/4,
    scaled('ll')*scaled('ml'),scaled('fcr')*scaled('mana'),scaled('sockets')*scaled('ed')];
}
export function family(c) { return [c.slot,c.item_type,c.profile.char,c.profile.realm].join('|'); }
export function canonicalText(c) { return `${family(c)}; required level ${c.reqlevel||'unknown'}; `+Object.entries(c.values).map(([k,v])=>`${k} ${v}`).join('; '); }
export async function digest(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export function checkArtifact(m) {
  if(m?.schema!==AI_SCHEMA||m?.kind!=='minilm-distilled-mlp'||JSON.stringify(m.features)!==JSON.stringify(FEATURE_NAMES)) throw new Error('model_schema_mismatch');
  if(!/^[a-f0-9]{40}$/.test(m.teacher?.revision||'')||!m.teacher?.fine_tuned||!(m.teacher.steps>0)||!Number.isFinite(m.teacher.weight_delta)||m.teacher.weight_delta<=0) throw new Error('fine_tuning_proof_missing');
  if(!Array.isArray(m.layers)||m.layers.length!==2) throw new Error('invalid_layers');
  let inputs=FEATURE_NAMES.length;
  for(const [i,layer] of m.layers.entries()) {
    const outputs=layer.bias?.length;
    if(!Number.isInteger(outputs)||outputs<1||outputs>(i===0?64:6)||i===1&&outputs!==6||layer.weights?.length!==outputs) throw new Error('invalid_dimensions');
    if(!layer.bias.every(n=>Number.isFinite(n)&&Math.abs(n)<=100)||!layer.weights.every(row=>Array.isArray(row)&&row.length===inputs&&row.every(n=>Number.isFinite(n)&&Math.abs(n)<=100)))throw new Error('invalid_weights');
    inputs=outputs;
  }
  if(!Array.isArray(m.support)||m.support.length>1000||!m.support.length)throw new Error('missing_support');
  for(const s of m.support) {
    if(typeof s.family!=='string'||!Array.isArray(s.keys)||s.keys.some(k=>!own(SCALES,k))||!s.ranges||s.keys.some(k=>!Array.isArray(s.ranges[k])||s.ranges[k].length!==2||!s.ranges[k].every(Number.isFinite)||s.ranges[k][0]>s.ranges[k][1]))throw new Error('invalid_support');
    if(!Array.isArray(s.reqlevels)||!s.reqlevels.length||s.reqlevels.some(n=>!Number.isInteger(n)||n<0||n>99))throw new Error('invalid_required_level_support');
  }
  for(const task of ['value','review']) if(!Number.isFinite(m.thresholds?.[task])||m.thresholds[task]<(task==='value'?.7:.95)||m.thresholds[task]>.9999)throw new Error('invalid_threshold');
  return m;
}
export function probabilities(m,features) {
  let a=features;
  m.layers.forEach((layer,i)=>{a=layer.weights.map((row,j)=>{const z=row.reduce((sum,w,k)=>sum+w*a[k],layer.bias[j]);return i===0?Math.max(0,z):z;});});
  const softmax=z=>{const max=Math.max(...z),ex=z.map(x=>Math.exp(x-max)),sum=ex.reduce((a,b)=>a+b,0);return ex.map(x=>x/sum)};
  return {value:softmax(a.slice(0,4)),review:softmax(a.slice(4,6))};
}
export function infer(m,input,task='value') {
  const c=canonicalContext(input);
  if(!c||!['value','review'].includes(task))return {status:'abstain',reason:'unsupported_or_uncertain_input'};
  const support=m.support.find(s=>s.family===family(c)&&s.reqlevels.includes(c.reqlevel)&&Object.keys(c.values).every(k=>s.keys.includes(k)&&c.values[k]>=s.ranges[k][0]&&c.values[k]<=s.ranges[k][1]));
  if(!support)return {status:'abstain',reason:'outside_training_support'};
  const p=probabilities(m,vector(c))[task],confidence=Math.max(...p),label=p.indexOf(confidence);
  return {status:confidence>=m.thresholds[task]?'predicted':'abstain',reason:confidence>=m.thresholds[task]?null:'uncertain_prediction',label,confidence,probabilities:p};
}
