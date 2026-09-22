export const PARSER_VERSION='traderie-integrity-v77';
const number=v=>v!==null&&v!==undefined&&typeof v!=='boolean'&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
export function isMeta(p){return /^(?:Game version|Platform|Region|Server|Mode|Rarity|Quality|Variant|Ladder|Hardcore|Softcore|Expansion|Classic|Season|League|Difficulty|Item Type|Body Location|Tier|Quantity)$/i.test(clean(p?.property||p?.name));}
export function propertyNumber(p){
 for(const v of [p?.number,p?.value,p?.string]){const n=number(v);if(n!==null)return n;if(v&&typeof v==='object'){for(const k of ['number','value']){const x=number(v[k]);if(x!==null)return x;}}}
 for(const v of [p?.string,p?.value,p?.property,p?.name]){if(typeof v!=='string')continue;const m=v.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*(?:%|to\b|$)/i);if(m)return Number(m[1]);}
 return null;
}
const rules=[
 ['fbr',/Faster Block Rate/i,'막기 속도','%'],['block_chance',/Increased Chance of Blocking/i,'막기 확률','%'],['all_attributes',/All Attributes/i,'모든 능력치',''],
 ['requirements',/Requirements/i,'착용 조건','%'],['max_stamina',/Maximum Stamina|Max Stamina/i,'최대 지구력',''],['stamina_regen',/Heal Stamina|Stamina Regeneration/i,'지구력 회복','%'],
 ['damage_to_mana',/Damage Taken Goes To Mana/i,'받는 피해를 마나로 전환','%'],['damage_demons',/Damage to Demons/i,'악마에게 주는 피해','%'],['damage_undead',/Damage to Undead/i,'언데드에게 주는 피해','%'],
 ['ar_demons',/Attack Rating (?:against|to) Demons/i,'악마에 대한 명중률',''],['ar_undead',/Attack Rating (?:against|to) Undead/i,'언데드에 대한 명중률',''],
 ['thorns',/Attacker Takes Damage/i,'공격자가 받는 피해',''],['light_radius',/Light Radius/i,'시야',''],['reduce_target_defense',/Target Defen[cs]e/i,'대상 방어력','%'],

 ['fcr',/Faster Cast Rate|\bFCR\b/i,'시전 속도','%'],['frw',/Faster Run\/?Walk|\bFRW\b/i,'달리기/걷기 속도','%'],['fhr',/Faster Hit Recovery|\bFHR\b/i,'타격 회복 속도','%'],['ias',/Increased Attack Speed|\bIAS\b/i,'공격 속도','%'],
 ['replenish_life',/Replenish Life/i,'생명력 회복',''],['mana_regen',/Regenerate Mana|Mana Regeneration/i,'마나 재생','%'],['life_after_kill',/Life After Each Kill/i,'적 처치 시 생명력',''],['mana_after_kill',/Mana After Each Kill/i,'적 처치 시 마나',''],
 ['ll',/Life (?:stolen per hit|Leech|Stolen)/i,'생명력 흡수','%'],['ml',/Mana (?:stolen per hit|Leech|Stolen)/i,'마나 흡수','%'],
 ['mdr',/Magic Damage Reduced/i,'마법 피해 감소',''],['dr_pct',/(?:Damage Reduced|Physical Damage Reduced).*%|%.*(?:Damage Reduced|Physical Damage Reduced)/i,'물리 피해 감소','%'],['dr_flat',/Damage Reduced by|Physical Damage Reduced/i,'피해 감소',''],['poison_length_reduced',/Poison Length Reduced/i,'독 지속시간 감소','%'],
 ['edef',/Enhanced Defen[cs]e/i,'방어력 증가','%'],['ed',/Enhanced Damage/i,'피해 증가','%'],['defense_missile',/Defen[cs]e (?:vs\.?|versus) Missile/i,'원거리 공격 방어력',''],['defense_melee',/Defen[cs]e (?:vs\.?|versus) Melee/i,'근접 공격 방어력',''],
 ['mf',/Better Chance of Getting Magic Items|Magic Find/i,'매직 아이템 발견 확률','%'],['gf',/Extra Gold from Monsters|Gold Find/i,'괴물에게서 얻는 금화','%'],
 ['allres',/All Resistances?|All Resists/i,'모든 저항',''],['fireres',/Fire Resist/i,'화염 저항','%'],['lightres',/Lightning Resist/i,'번개 저항','%'],['coldres',/Cold Resist/i,'냉기 저항','%'],['poisonres',/Poison Resist/i,'독 저항','%'],
 ['cb',/Crushing Blow/i,'강타 확률','%'],['ds',/Deadly Strike/i,'치명적 공격','%'],['ow',/Open Wounds/i,'상처 악화','%'],['sockets',/Socketed|Sockets?/i,'소켓',''],
 ['str',/(?:^|\b)(?:to )?Strength\b/i,'힘',''],['dex',/\bDexterity\b/i,'민첩',''],['vit',/\bVitality\b/i,'활력',''],['energy',/\bEnergy\b/i,'마력',''],
 ['max_damage',/Maximum Damage/i,'최대 피해',''],['min_damage',/Minimum Damage/i,'최소 피해',''],['ar_pct',/Attack Rating.*%|%.*Attack Rating/i,'명중률 증가','%'],['ar',/Attack Rating/i,'명중률',''],
 ['life',/(?:^|\b)to Life\b|^Life$/i,'생명력',''],['mana',/(?:^|\b)to Mana\b|^Mana$/i,'마나',''],['defense',/Defen[cs]e/i,'방어력','']
];
const classes={Amazon:['amazon','아마존'],Sorceress:['sorc','원소술사'],Necromancer:['necro','강령술사'],Paladin:['paladin','성기사'],Barbarian:['barbarian','야만용사'],Druid:['druid','드루이드'],Assassin:['assassin','암살자'],Warlock:['warlock','악마술사']};
const tabs=[['Bow and Crossbow','amazon_bow_crossbow','활과 쇠뇌 기술'],['Javelin and Spear','amazon_javelin_spear','투창과 창 기술'],['Passive and Magic','amazon_passive_magic','지속 효과와 마법 기술'],['Traps','assassin_traps','덫'],['Martial Arts','assassin_martial_arts','무술'],['Shadow Disciplines','assassin_shadow','그림자 단련'],['Poison and Bone','necro_poison_bone','독과 뼈 기술'],['Curses','necro_curses','저주'],['Defensive Auras','paladin_defensive_auras','방어 오라'],['Offensive Auras','paladin_offensive_auras','공격 오라'],['Warcries','barbarian_warcries','함성'],['Combat Masteries','barbarian_masteries','전투 숙련'],['Shape Shifting','druid_shapeshifting','변신 기술'],['Shapeshifting','druid_shapeshifting','변신 기술'],['Elemental','druid_elemental','원소 기술']];
function slug(s){return clean(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
export function parseProperty(p,index=0){
 const name=clean(p?.property||p?.name),n=propertyNumber(p);
 let text=name.replace(/\{\{\s*(value|number|string|charges|level|max_charges)\s*\}\}/gi,(m,k)=>p?.[k]!==undefined&&p[k]!==null?String(p[k]):['value','number','string'].includes(k)&&n!==null?String(n):m);
 if(typeof p?.string==='string'&&/^\s*(?:[+-]?\d+|Level\s+\d+)/i.test(p.string)&&/[a-z]/i.test(p.string))text=clean(p.string);
 else if(n!==null&&!text.match(/[+-]?\d/))text=`${text}: ${n}`;
 const row={index,property_id:p?.property_id??p?.id??null,raw:p,name,text,status:'unmapped',key:null,value:null,label:null};
 if(isMeta(p))return {...row,status:'metadata',value:p?.string??p?.value??p?.number??p?.bool??null};
 const mapped=(key,value,label,unit='')=>({...row,status:'mapped',key,value,label,display:`${label} ${typeof value==='number'&&value>0?'+':''}${value}${unit}`});
 // Charges / on-hit / per-level modifiers must not be mistaken for ordinary stats.
 if(/Charges/i.test(text)){
  const m=text.match(/Level\s+(\d+)\s+(.+?)\s*\((\d+)\s*\/\s*(\d+)\s+Charges\)/i);
  if(!m)return {...row,reason:'충전 기술의 레벨·현재/최대 충전 횟수 확인 필요'};
  const level=+m[1],current=+m[3],max=+m[4];if(current>max||max<=0)return {...row,reason:'충전 횟수 불일치'};
  return {...mapped('charges_'+slug(m[2]),{skill:m[2],level,current,max},m[2]+' 충전'),display:`${m[2]} ${level}레벨 · 충전 ${current}/${max}`,parts:{['charged_'+slug(m[2])+'_level']:level,['charged_'+slug(m[2])+'_current']:current,['charged_'+slug(m[2])+'_max']:max}};
 }
 if(/Chance to Cast|When Struck|On Striking|On Attack|per (?:Character )?Level|Based on Character Level/i.test(text))return {...row,reason:'조건부 옵션: 원문 보존, 자동 평탄화 제외'};
 if(/Cannot Be Frozen|Ethereal|Indestructible/i.test(name)){
  const value=p?.bool??p?.value;if(value===true||value===1||value==='true'||(value===undefined&&n===null))return mapped(/Ethereal/i.test(name)?'ethereal':/Indestructible/i.test(name)?'indestructible':'cbf',1,name);
  if(value===false||value===0||value==='false')return {...row,status:'not_present',value:false};
 }
 const range=text.match(/^(?:Adds\s+)?(\d+)\s*[-–]\s*(\d+)\s+(Fire|Cold|Lightning|Magic|Poison) Damage(?:\s+over\s+(\d+(?:\.\d+)?)\s+Seconds)?$/i);
 if(range){const min=+range[1],max=+range[2],kind=range[3].toLowerCase();if(min>max)return {...row,reason:'피해 범위 역전'};const parts={[kind+'_damage_min']:min,[kind+'_damage_max']:max};if(range[4])parts[kind+'_damage_seconds']=+range[4];return {...mapped(kind+'_damage',{min,max},range[3]+' 피해'),parts,display:text};}
 if(n===null)return {...row,reason:'수치 확인 필요'};
 if(/All Skill Levels|All Skills/i.test(name))return mapped('all_skills',n,'모든 기술');
 for(const [nameEn,[key,ko]] of Object.entries(classes)){if(new RegExp(nameEn+' (?:Skill Levels?|Skills?)','i').test(name))return mapped(key+'_skills',n,ko+' 모든 기술');}
 for(const [en,key,ko] of tabs){if(name.toLowerCase().includes(en.toLowerCase()))return mapped(key,n,ko);}
 const owner=/\((Amazon|Sorceress|Necromancer|Paladin|Barbarian|Druid|Assassin|Warlock) Only\)/i.exec(name)?.[1];
 if(owner&&/Combat Skills|Summoning Skills|Fire Skills|Cold Skills|Lightning Skills|Fire Spells|Cold Spells|Lightning Spells/i.test(name)){
  const cls=Object.keys(classes).find(x=>x.toLowerCase()===owner.toLowerCase()),tab=name.match(/(Combat|Summoning|Fire|Cold|Lightning) (?:Skills|Spells)/i)[1].toLowerCase();return mapped(classes[cls][0]+'_'+tab,n,classes[cls][1]+' '+({combat:'전투',summoning:'소환',fire:'화염',cold:'냉기',lightning:'번개'}[tab]||tab)+' 기술');
 }
 // Individual staffmods require an explicit class qualifier, excluding unidentified skill tabs.
 if(owner&&/\bto\s+(.+?)\s*\(/i.test(name)&&!/(?:Skills|Spells|Skill Tab)/i.test(name)){
  const skill=name.match(/\bto\s+(.+?)\s*\(/i)[1];return mapped('skill_'+slug(owner)+'_'+slug(skill),n,skill+' ('+owner+' 전용)');
 }
 if(/Skill|Spell|\bto (?:Fire|Cold|Lightning)\b/i.test(name))return {...row,reason:'기술 종류·직업 식별 필요'};
 for(const [key,rx,ko,unit] of rules){if(rx.test(name))return mapped(key,n,ko,unit);}
 return {...row,reason:'등록되지 않은 옵션 — 원문 보존'};
}
export function parseProperties(listing){
 const valid=Array.isArray(listing?.properties),rows=(valid?listing.properties:[]).map(parseProperty),affixes={};
 for(const row of rows){if(row.status!=='mapped')continue;const parts=row.parts||{[row.key]:row.value};for(const [key,value] of Object.entries(parts)){if(affixes[key]!==undefined){row.status='conflict';row.reason='동일 옵션 중복: 자동 합산/최댓값 선택 금지';}else affixes[key]=value;}}
 const props=rows.filter(x=>!['metadata','not_present'].includes(x.status)),mapped=props.filter(x=>x.status==='mapped'),unknown=props.filter(x=>x.status!=='mapped');
 return {affixes,rows,quality:{parser_version:PARSER_VERSION,meaningful_property_count:props.length,expected_known_count:props.length,mapped_known_count:mapped.length,property_coverage:props.length?mapped.length/props.length:0,complete:valid&&props.length>0&&unknown.length===0,critical_missing:unknown.filter(x=>/Skill|Spell|Traps|Martial/i.test(x.name)),unmapped_properties:unknown.map(x=>({...x,raw:x.name}))}};
}
export function parsePrice(listing){
 const prices=Array.isArray(listing?.prices)?listing.prices:[],raw=JSON.parse(JSON.stringify(prices)),groups=new Map(),issues=[];
 if(!prices.length)issues.push(listing?.make_offer?'가격 제안 매물: 고정 호가 없음':'가격 없음');
 for(const [index,p] of prices.entries()){
  const quantity=number(p?.quantity??p?.amount??p?.count??p?.price?.quantity),nameValue=p?.name??(typeof p?.currency==='object'?p?.currency?.name:p?.currency)??p?.item?.name??p?.price?.name,name=typeof nameValue==='string'?clean(nameValue):'',group=p?.group;
  if(!name||quantity===null||quantity<=0)issues.push(`가격 ${index+1}: 이름/수량 확인 필요`);
  if(prices.length>1&&(group===null||group===undefined||!['number','string'].includes(typeof group)||String(group).trim()===''||typeof group==='number'&&!Number.isFinite(group)))issues.push(`가격 ${index+1}: AND/OR 묶음 확인 필요`);
  const id=group===null||group===undefined?'ungrouped_'+index:String(group);
  if(!groups.has(id))groups.set(id,[]);groups.get(id).push({name,quantity,index});
 }
 const alternatives=[...groups].map(([group,items])=>({group,items}));
 const complete=issues.length===0,scalar=complete&&alternatives.length===1&&alternatives[0].items.length===1?alternatives[0].items[0]:null;
 return {amount:scalar?.quantity??null,currency:scalar?.name??null,raw,alternatives,complete,issues,kind:listing?.make_offer&&!prices.length?'offer':complete?'asking':'unresolved',display:alternatives.map(g=>'('+g.items.map(x=>`${x.name||'?'} ${x.quantity??'?'}`).join(' + ')+')').join(' OR ')};
}
export function snapshotListing(listing){
 const keys=['id','item','name','quantity','properties','prices','make_offer','rarity','quality','variant','ladder','hardcore','region','platform','game_version','active','completed','created_at','updated_at','description','title','listing_type','stock','is_stock','stock_listing','is_stock_listing','bulk','is_bulk','bundle','is_bundle','lot','is_lot','stackable','is_stackable','amount','count','item_count','stock_count','stack_size','available_quantity','inventory'];
 const out={};for(const k of keys)if(listing?.[k]!==undefined)out[k]=listing[k];return JSON.parse(JSON.stringify(out));
}
