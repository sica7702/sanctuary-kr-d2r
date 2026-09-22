export const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function search(records,query,kind=''){const q=norm(query);return records.filter(x=>(!kind||x.kind===kind)&&(!q||x.search.includes(q))).sort((a,b)=>Number(b.terms.some(t=>norm(t)===q))-Number(a.terms.some(t=>norm(t)===q))||a.name.localeCompare(b.name,'ko'));}
export function chanceOverRuns(p,n){if(!Number.isFinite(p)||p<0||p>1||!Number.isInteger(n)||n<0)throw Error('확률·횟수를 확인하세요.');return -Math.expm1(n*Math.log1p(-p));}
export function requiredRuns(p,target=.5){if(p<=0)return null;if(p>=1)return 1;return Math.ceil(Math.log1p(-target)/Math.log1p(-p));}
export function validateSave(raw,ids){if(!raw||raw.schema!==1||!Array.isArray(raw.items)||!Array.isArray(raw.goals))throw Error('지원하는 보관함 백업 형식이 아닙니다.');if(raw.items.length>10000||raw.goals.length>10000)throw Error('저장 항목이 너무 많습니다.');const known=new Set(ids),uuids=new Set();const items=raw.items.map(x=>{if(!known.has(x.itemId)||typeof x.id!=='string'||uuids.has(x.id)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>9999)throw Error('보관함에 잘못된 아이템·수량·중복 ID가 있습니다.');uuids.add(x.id);return {id:x.id,itemId:x.itemId,quantity:x.quantity,location:String(x.location||'').slice(0,100),note:String(x.note||'').slice(0,2000),createdAt:String(x.createdAt||'')};});const goals=[...new Set(raw.goals)];if(goals.some(id=>!known.has(id)))throw Error('현재 자료에 없는 목표 아이템이 있습니다.');return {schema:1,items,goals};}
export const statNames={fcr:'시전 속도 (패캐)',fhr:'피격 회복 (패힛)',ias:'공격 속도 (공속)',frw:'이동 속도 (달려)',str:'힘',dex:'민첩',vit:'활력',enr:'마력',hp:'생명력',mana:'마나',resfire:'화염 저항',rescold:'냉기 저항',reslight:'번개 저항',respois:'독 저항',mf:'마법 아이템 발견 (매찬)',allskills:'모든 기술'};
export const propertyStats={'cast3':'fcr','cast2':'fcr','cast1':'fcr','balance3':'fhr','balance2':'fhr','balance1':'fhr','swing3':'ias','swing2':'ias','swing1':'ias','move3':'frw','move2':'frw','move1':'frw',str:'str',dex:'dex',vit:'vit',enr:'enr',hp:'hp',mana:'mana','res-fire':'resfire','res-cold':'rescold','res-ltng':'reslight','res-pois':'respois',mag:'mf',allskills:'allskills'};
Object.assign(propertyStats,{'mag%':'mf','gold%':'gold','gold':'gold','lifesteal':'lifesteal','manasteal':'manasteal','regen':'regen','regen-mana':'regenmana','crush':'crush','deadly':'deadly','openwounds':'openwounds','red-dmg':'dr','red-dmg%':'drpercent','red-mag':'mdr','att':'ar','mana-kill':'maek','heal-kill':'laek','block1':'fbr','block2':'fbr','block3':'fbr'});
Object.assign(statNames,{gold:'금화 획득 (삥)',lifesteal:'생명력 훔침 (%)',manasteal:'마나 훔침 (%)',regen:'생명력 회복',regenmana:'마나 재생 (%)',crush:'강타 확률 (%)',deadly:'치명적 공격 (%)',openwounds:'상처 악화 (%)',dr:'피해 감소',drpercent:'물리 피해 감소 (%)',mdr:'마법 피해 감소',ar:'추가 명중률',maek:'처치 시 마나',laek:'처치 시 생명력',fbr:'막기 속도'});
export function sumEquipment(items,{level=1,classId='sor',properties={}}={}){const totals=Object.fromEntries(Object.keys(statNames).map(k=>[k,[0,0]])),unmodeled=[];for(const item of items.filter(Boolean)){for(const mod of item.mods||[]){let code=mod.code,min=Number(mod.min),max=Number(mod.max);if(code.endsWith('/lvl')&&properties[code]?.['*Parameter']==='#/8 per Level'){code=code.slice(0,-4);min=max=Math.floor(Number(mod.param)*level/8);}let keys=code==='res-all'?['resfire','rescold','reslight','respois']:code==='all-stats'?['str','dex','vit','enr']:[propertyStats[code]].filter(Boolean);if(['ama','sor','nec','pal','bar','dru','ass','war'].includes(code)){if(code!==classId)continue;keys=['classskills'];statNames.classskills='선택 직업 기술';}
if(code==='skilltab'||code==='oskill'||code==='skill'){const key=code+'|'+mod.param;keys=[key];statNames[key]=mod.label||key;}
if(!keys.length||!Number.isFinite(min)||!Number.isFinite(max)){unmodeled.push({item:item.name,...mod});continue;}for(const key of keys){totals[key]||=[0,0];totals[key][0]+=min;totals[key][1]+=max;}}}return {totals,unmodeled};}
// A tooltip line is evidence. Recognition, interpretation and source validation remain separate.
export function evidenceLedger(lines,detect){
 const ledger=[],keys=new Map();
 const interpret=(raw,reading)=>{try{return detect(raw,reading);}catch{return null;}};
 for(const l of lines){
  const raw=String(l.text||'').trim();if(!raw)continue;
  const key=raw.normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
  const reading={pass:l.pass,confidence:l.conf,position:l.i,bbox:l.bbox};
  if(keys.has(key)){
   const row=keys.get(key),priorBest=Math.max(-Infinity,...row.readings.map(x=>Number.isFinite(x.confidence)?x.confidence:-Infinity));
   row.readings.push(reading);
   if(row.status==='unresolved'&&Number.isFinite(l.conf)&&l.conf>priorBest){
    const result=interpret(raw,l);
    if(result){row.status='interpreted';row.options=Array.isArray(result)?result:[result];}
   }
   continue;
  }
  const metadata=/^(?:방어력|내구도|막기 확률|막기 가능성|필요 힘|필요 민첩|요구 레벨|요구 힘|요구 민첩|Defense|Durability|Chance to Block|Required Level|Required Strength|Required Dexterity)\s*[:：]/i.test(raw);
  const result=metadata?null:interpret(raw,l);
  const row={id:'line-'+ledger.length,raw,readings:[reading],status:metadata?'metadata':result?'interpreted':'unresolved',options:result?(Array.isArray(result)?result:[result]):[],reviewed:false};
  ledger.push(row);keys.set(key,row);
 }
 return ledger;
}
export function closure(code,typeDb){const out=new Set(),todo=[code];while(todo.length){const c=todo.pop();if(!c||out.has(c))continue;out.add(c);const r=typeDb[c];if(r)todo.push(r.Equiv1,r.Equiv2);}return out;}
export function alvl(ilvl,qlvl,magicLevel=0){const i=Math.max(ilvl,qlvl);return Math.min(99,magicLevel>0?i+magicLevel:i<99-Math.floor(qlvl/2)?i-Math.floor(qlvl/2):2*i-99);}
export function affixCandidates(data,base,quality,ilvl){if(!base)return [];const types=new Set([...closure(base.type,data.types),...closure(base.type2,data.types)]);const level=ilvl==null?99:alvl(ilvl,+base.level||1,+base['magic lvl']||0);return data.affixes.filter(a=>a.spawnable==='1'&&+a.frequency>0&&(quality!=='rare'||a.rare==='1')&&+a.level<=level&&(ilvl==null||!+a.maxlevel||+a.maxlevel>=level)&&(!a.include.length||a.include.some(t=>types.has(t)))&&!a.exclude.some(t=>types.has(t)));}
export function matchAffixes(data,base,quality,ilvl,options){const pool=affixCandidates(data,base,quality,ilvl);return options.map(o=>({...o,candidates:pool.filter(a=>a.mods.some(m=>canonicalOptionProperty(m)===canonicalOptionProperty(o)&&Number(o.value)>=Number(m.min)&&Number(o.value)<=Number(m.max)))}));}
// Exact matching is deliberately restricted to simple additive rolls. Other effects retain evidence.
export function solveMagic(options,pool){if(!options.length)return {status:'empty',solutions:[]};const wanted=new Map();for(const o of options){const key=canonicalOptionProperty(o);if(!o.code||!Number.isFinite(Number(o.value)))return {status:'unresolved',solutions:[]};wanted.set(key,(wanted.get(key)||0)+Number(o.value));}const compatible=pool.filter(a=>a.mods.length&&a.mods.every(m=>wanted.has(canonicalOptionProperty(m))));const prefixes=compatible.filter(a=>a.kind==='prefix'),suffixes=compatible.filter(a=>a.kind==='suffix'),solutions=[];for(const p of [null,...prefixes])for(const s of [null,...suffixes]){if(!p&&!s||p&&s&&p.group===s.group)continue;const sum=new Map();for(const a of [p,s].filter(Boolean))for(const m of a.mods){const k=canonicalOptionProperty(m);const r=sum.get(k)||[0,0];r[0]+=+m.min;r[1]+=+m.max;sum.set(k,r);}if(sum.size!==wanted.size)continue;if([...wanted].every(([k,v])=>sum.has(k)&&v>=sum.get(k)[0]&&v<=sum.get(k)[1]))solutions.push([p,s].filter(Boolean));}return {status:solutions.length?'conditional':'no-match',solutions};}
const SCALAR_PARAMETER_ALIASES=new Set(['red-mag','dmg%','dmg-to-mana','regen-stam','stam','att','howl','mag%','light','mana','res-all','res-cold','res-fire','res-ltng','res-pois','ama','pal','nec','sor','bar','mana-kill']);
export function canonicalOptionProperty(option){
 const code=String(option.code||'').replace(/^(cast|swing|balance|move)[123]$/,'$1');
 let param=String(option.param??'').trim();
 if(SCALAR_PARAMETER_ALIASES.has(code)&&param==='0')param='';
 return code?code+'|'+param:(option.catalogId||option.name||'unknown')+'|'+param;
}
export function reconcileOptions(ledger){
 const groups=new Map();
 for(const line of ledger.filter(l=>!['metadata','ignored'].includes(l.status)))for(const option of line.options||[]){
  const canonical=canonicalOptionProperty(option);
  const display=String(option.name||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
  const code=String(option.code||'').replace(/^(cast|swing|balance|move)[123]$/,'$1');
  const key=code&&display?code+'|'+display:canonical==='unknown|'?line.id:canonical;
  const group=groups.get(key)||{rows:[],sources:[]};
  group.rows.push({option,line,canonical});group.sources.push(line.id);groups.set(key,group);
 }
 return [...groups.values()].map(group=>{
  const values=[...new Set(group.rows.map(({option})=>String(option.value)))];
  const identities=[...new Set(group.rows.map(({canonical})=>canonical))];
  const first=group.rows[0],identityConflict=identities.length>1,conflict=values.length>1||identityConflict;
  return {...first.option,value:conflict?'':first.option.value,raw:first.line.raw,sources:[...new Set(group.sources)],reviewed:!conflict&&group.rows.every(({line})=>line.reviewed),conflict,identityConflict,alternatives:conflict?values:[]};
 });
}
export function equipmentIssues(items,bases,types,classId,level){const issues=[];const bySlot=Object.fromEntries(items.filter(Boolean).map(x=>[x.slot,x]));const getBase=x=>x&&bases.find(b=>b.code===(x.baseCode||x.code));const getTypes=b=>b?new Set([...closure(b.type,types),...closure(b.type2,types)]):new Set();for(const x of items.filter(Boolean)){const b=getBase(x);if(!b){issues.push(x.name+': 베이스를 선택해야 착용 조건을 검사할 수 있습니다.');continue;}const t=getTypes(b);const required=[...t].map(c=>types[c]?.Class).filter(Boolean);if(required.some(c=>c!==classId))issues.push(x.name+': 선택한 직업이 착용할 수 없는 전용 아이템입니다.');if(Math.max(Number(x.req)||0,Number(b.levelreq)||0)>level)issues.push(x.name+': 캐릭터 레벨이 착용 요구 레벨보다 낮습니다.');if(x.slot==='offhand'&&t.has('weap')&&!(classId==='bar'&&b['2handed']!=='1'||classId==='bar'&&b['1or2handed']==='1'||classId==='ass'&&t.has('h2h')))issues.push(x.name+': 이 직업의 보조 손 무기로 사용할 수 없습니다.');}
const main=getBase(bySlot.weapon),off=getBase(bySlot.offhand);if(main&&off&&main['2handed']==='1'){const allowed=classId==='bar'&&main['1or2handed']==='1'||classId==='war'&&getTypes(off).has('grim');if(!allowed)issues.push(classId==='war'?'악마술사는 양손 무기와 함께 일반 방패를 사용할 수 없습니다. 보조 손에 마법서가 필요합니다.':'양손 무기와 보조 손 장비를 동시에 착용할 수 없습니다.');}return issues;}
