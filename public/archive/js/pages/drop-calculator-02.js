(()=>{
const G=window.SKR_TERROR_GROUPS||[], EA=window.SKR_TERROR_ENGINE_AREAS||{}, O=window.SKR_UNIQUE_OVERRIDES||{manual:{},aliasExtra:{},newKo:{},newBase:{}};
const RAW='/data/d2r/';
const SRC={levels:RAW+'levels.txt',monstats:RAW+'monstats.txt',tc:RAW+'treasureclassex.txt',unique:RAW+'uniqueitems.txt',ratio:RAW+'itemratio.txt',armor:RAW+'armor.txt',weapons:RAW+'weapons.txt',misc:RAW+'misc.txt',types:RAW+'itemtypes.txt',itemNames:RAW+'item-names.json'};
const cache={}; const el=id=>document.getElementById(id);
const strip=s=>String(s??'').replace(/ÿc[0-9!"+<;.*]/g,'').replace(/\\92/g,"'").trim();
const norm=s=>strip(s).toLowerCase().replace(/[’‘`]/g,"'").replace(/[^0-9a-z가-힣]+/g,'');
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
function tsv(txt){let lines=txt.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').filter(x=>x.trim().length);if(!lines.length)return[];let h=lines.shift().split('\t');return lines.map(line=>{let c=line.split('\t'),o={};h.forEach((k,i)=>o[k]=(c[i]??'').replace(/^"([\s\S]*)"$/,'$1').replace(/""/g,'"'));return o})}
async function getText(k){if(cache[k])return cache[k];const r=await fetch(SRC[k],{cache:'no-cache',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`${k} source HTTP ${r.status}`);return cache[k]=await r.text()}
async function getRows(k){const ck='rows:'+k;if(cache[ck])return cache[ck];const rows=tsv(await getText(k)),required={levels:['Id','nmon1','MonLvlEx(H)'],monstats:['Id','TreasureClass(H)'],tc:['Treasure Class','Picks','Item1','Prob1'],unique:['index','code','lvl','spawnable'],ratio:['Version','Unique','UniqueDivisor','UniqueMin'],armor:['code','level','type'],weapons:['code','level','type'],misc:['code'],types:['Code','Equiv1','Rarity']}[k];if(!rows.length||required?.some(key=>!(key in rows[0])))throw Error(k+' 원본 스키마 불일치');return cache[ck]=rows}
async function getJson(k){const ck='json:'+k;if(cache[ck])return cache[ck];const r=await fetch(SRC[k],{cache:'no-cache',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`${k} source HTTP ${r.status}`);return cache[ck]=await r.json()}
function tabs(){const t=[...document.querySelectorAll('.skr-tab')];t.forEach(b=>b.addEventListener('click',()=>{t.forEach(x=>x.classList.remove('active'));document.querySelectorAll('.skr-tabpanel').forEach(x=>x.classList.remove('active'));b.classList.add('active');el('tab-'+b.dataset.tab)?.classList.add('active');if(b.dataset.tab==='db')loadDropDb();if(b.dataset.tab==='rate')prepareMonsters()}))}
const sel=el('tzGroup'); function selectedGroup(){return G.find(x=>x.id===sel?.value)}
function fillGroups(){if(!sel)return;sel.innerHTML=G.map(g=>`<option value="${g.id}">Act ${g.act} · ${esc(g.ko)}</option>`).join('');sel.value='a4-chaos';sel.addEventListener('change',()=>{const g=selectedGroup();if(g){el('baseMlvl').value=g.anchorHellAreaLevel;levels();basicDrop();renderEngineScope();prepareMonsters()}});const g=selectedGroup();if(g)el('baseMlvl').value=g.anchorHellAreaLevel}
function levels(){const c=Math.max(1,Math.min(99,+el('clvl').value||1)),orig=Math.max(1,Math.min(99,+el('baseMlvl').value||1)),d=el('difficulty').value;let caps,add;if(d==='hell'){caps=[96,98,99];add=[2,4,5]}else if(d==='nightmare'){caps=[71,73,74];add=[2,4,5]}else{caps=[45,47,48];add=[2,4,5]};const names=['일반','챔피언','유니크/보스'];const vals=add.map((a,i)=>Math.max(orig+[0,2,3][i],Math.min(c+a,caps[i])));el('mlvlResults').innerHTML=vals.map((v,i)=>`<div class="result-card"><span>${names[i]}</span><b>Lv ${v}</b><small>+${add[i]} · cap ${caps[i]} · 원래 레벨과 큰 값</small></div>`).join('');return {base:vals[0],champ:vals[1],unique:vals[2],boss:vals[2]}}
function basicDrop(){const lv=levels(),q=Math.max(1,Math.min(99,+el('itemQlvl').value||1)),t=el('monsterType').value,m=lv[t]??lv.unique,ok=m>=q;el('dropResult').innerHTML=`<div class="drop-state ${ok?'ok':'no'}"><b>${ok?'qlvl 레벨 조건 충족':'qlvl 레벨 조건 미충족'}</b><span>아이템 qlvl ${q} / 대상 mlvl ${m}</span><small>${ok?'아래 최종 TC 판정에서 실제 베이스 도달 여부를 확인하세요.':'이 mlvl에서는 최종 TC 판정 이전에 탈락합니다.'}</small></div>`}
function renderEngineScope(){const g=selectedGroup(),x=el('engineScope');if(g&&x)x.textContent=(EA[g.id]||[]).join(' · ')}
function rowName(r){return r.Name||r.LevelName||r['*StringName']||r['Level Name']||''}
function levelId(r){return Number(r.Id||r.id||r['*Id']||-1)}
function matchLevels(rows,names){
 const special={'moomoofarm':['secretcowlevel','cowlevel'],'chaossanctuary':['thechaossanctuary','chaossanctum'],'nithlakathtemple':['nithlakathtemple','nihlathakstemple']};
 const wanted=[];for(const n of names){const z=norm(n);wanted.push(z);for(const a of (special[z]||[]))wanted.push(a)}
 return rows.filter(r=>{const vals=[r.Name,r['*StringName'],r.LevelName].map(norm).filter(Boolean);return vals.some(v=>wanted.some(w=>v===w||v==='the'+w||w==='the'+v))})
}
function monsterIdsFromLevels(ls){const ids=new Set();for(const l of ls){for(let i=1;i<=25;i++){for(const p of ['nmon']){const v=strip(l[p+i]);if(v)ids.add(v)}}}return ids}
function indexRows(rows,key){const o={};for(const r of rows){const k=strip(r[key]);if(k)o[k]=r}return o}
function tcKey(r){return strip(r['Treasure Class']||r['TreasureClass']||r.treasureclass)}
function tcField(type){return type==='champ'?'TreasureClassDesecratedChamp(H)':(type==='unique'||type==='boss')?'TreasureClassDesecratedUnique(H)':'TreasureClassDesecrated(H)'}
function normalTcField(type){return type==='champ'?'TreasureClassChamp(H)':(type==='unique'||type==='boss')?'TreasureClassUnique(H)':'TreasureClass(H)'}
function monsterTcForType(m,type){const dese=strip(m[tcField(type)]); if(dese)return {tc:dese,source:'공포영역 전용 TC'}; const fallback=strip(m[normalTcField(type)]); return {tc:fallback,source:fallback?'공포영역 TC 공란 → 일반 TC fallback':'TC 없음'} }
function upgradeTc(name,mlvl,tcdb){const base=tcdb[name];if(!base)return name;const group=Number(base.group||0);if(!group)return name;let bestName=name,bestLevel=Number(base.level||0);for(const [k,row] of Object.entries(tcdb)){if(Number(row.group||0)!==group)continue;const lv=Number(row.level||0);if(lv<=mlvl&&lv>=bestLevel){bestName=k;bestLevel=lv}}return bestName}
function parseItemRef(v){const parts=String(v||'').replace(/^"|"$/g,'').split(',').map(x=>x.trim()).filter(Boolean),ref=parts.shift()||'';const mods={};for(const x of parts){const [k,val]=x.split('=');if(k)mods[k]=Number(val)||val}return {ref,mods}}
function effectiveNoDrop(row,players){
 const nd=Math.max(0,Number(row.NoDrop||0));if(!nd)return 0;
 let sum=0;for(let i=1;i<=10;i++)sum+=Math.max(0,Number(row['Prob'+i]||0));
 if(sum<=0)return nd;
 const exp=Math.max(1,Math.floor((Math.min(8,Math.max(1,players))+1)/2));
 if(exp===1)return nd;
 if(!Number.isInteger(nd)||!Number.isInteger(sum))throw Error('NoDrop/Prob 정수 데이터 필요');
 const n=BigInt(nd)**BigInt(exp),d=BigInt(nd+sum)**BigInt(exp)-n;
 return Number(BigInt(sum)*n/d);
}
function qfactor(row,inherited=0,mods={}){let q=Math.max(Number(row.Unique||0),inherited||0);if(Number(mods.cu)>=0&&mods.cu!==undefined)q=Math.max(q,Number(mods.cu)||0);return q}
function getBaseIndex(baseRows){const m={};for(const r of baseRows){const code=strip(r.code);if(code)m[code]=r}return m}
function buildLocMap(arr){const m=new Map();for(const x of arr||[]){const en=strip(x.enUS),ko=strip(x.koKR);if(en&&ko)m.set(norm(en),ko);if(x.Key&&ko)m.set(norm(x.Key),ko)}return m}
function aliasesFor(item,loc){const rawEn=strip(item.index),en=rawEn==="Deaths's Web"?"Death's Web":Object.keys({...O.manual,...O.aliasExtra,...O.newKo}).find(k=>norm(k)===norm(rawEn))||rawEn,ko=({"Harlequin Crest":'할리퀸 관모',"Griffon's Eye":'그리폰의 눈',"Death's Web":'죽음의 거미줄'}[en])||loc.get(norm(en))||O.newKo?.[en]||O.manual?.[en]?.ko||en;let a=[en,rawEn,ko];if(O.manual?.[en]?.aliases)a.push(...O.manual[en].aliases);if(O.aliasExtra?.[en])a.push(...O.aliasExtra[en]);if(en==="Griffon's Eye")a.push('그리폰','그리폰의 눈','다뎀','다이어뎀','유닉다뎀','유니크다뎀');
if(en==="Harlequin Crest")a.push('샤코','유닉샤코','유니크샤코','할리퀸','할리퀸관모','할리퀸 크레스트');
if(en==="War Traveler")a.push('배추','워트래블러','워 트래블러');
if(en==="Death's Web")a.push('죽음의 거미줄','죽웹','데스웹','데쓰웹','유닉언어스드완드');
return {en,ko,aliases:[...new Set(a.filter(Boolean))]}}
let itemIndexPromise=null;
async function buildItemIndex(){if(itemIndexPromise)return itemIndexPromise.catch(e=>{itemIndexPromise=null;throw e});itemIndexPromise=(async()=>{const [uRows,names]=await Promise.all([getRows('unique'),getJson('itemNames').catch(()=>[])]);const loc=buildLocMap(names);const arr=[];for(const u of uRows){const en=strip(u.index),code=strip(u.code);if(!en||!code||Number(u.disabled||0)===1||String(u.enabled||u.spawnable||'1').trim()==='0')continue;const ax=aliasesFor(u,loc);arr.push({...u,...ax,search:norm([ax.en,ax.ko,...ax.aliases].join(' '))})}return arr})();return itemIndexPromise.catch(e=>{itemIndexPromise=null;throw e})}
async function findItem(q){const nq=norm(q);if(!nq)return null;const arr=await buildItemIndex();let exact=arr.find(x=>x.aliases.some(a=>norm(a)===nq)||norm(x.en)===nq||norm(x.ko)===nq);if(exact)return exact;const matches=arr.filter(x=>x.search.includes(nq));if(matches.length>1)throw Error('검색어가 여러 아이템과 일치합니다: '+matches.slice(0,5).map(x=>x.ko).join(', '));return matches[0]||null}
async function loadEngine(){if(cache.engine)return cache.engine.catch(e=>{delete cache.engine;throw e});cache.engine=(async()=>{const [levelsR,monR,tcR,uniR,ratioR,armorRaw,weapRaw,miscRaw,typeR]=await Promise.all(['levels','monstats','tc','unique','ratio','armor','weapons','misc','types'].map(getRows));const armorR=armorRaw.map(r=>({...r,__kind:'armo'})),weapR=weapRaw.map(r=>({...r,__kind:'weap'})),miscR=miscRaw.map(r=>({...r,__kind:'misc'}));const tcdb={};for(const r of tcR){const k=tcKey(r);if(k)tcdb[k]=r}const monDb=indexRows(monR,'Id'),monByHc={};for(const r of monR){const hc=strip(r['*hcIdx']??r.hcIdx);if(hc)monByHc[hc]=r}const bases=[...armorR,...weapR,...miscR];return {levelsR,monR,monDb,monByHc,tcR,tcdb,uniR,ratioR,bases,armorR,weapR,miscR,baseDb:getBaseIndex(bases),typeDb:indexRows(typeR,'Code')}})();return cache.engine.catch(e=>{delete cache.engine;throw e})}
function runtimeTcSpec(name){const m=/^(armo|weap)(\d{1,2})$/i.exec(strip(name));if(!m)return null;return {kind:m[1].toLowerCase(),tier:Number(m[2])}}
function baseLevel(row){return Number(row.level||row.Level||row.lvl||0)||0}
function runtimeTierForLevel(level){const lv=Math.max(1,Number(level)||1);return Math.ceil(lv/3)*3}
function typeAncestors(engine,code,seen=new Set()){
 if(!code||seen.has(code))return seen;seen.add(code);const t=engine.typeDb[code];
 if(!t)throw Error('itemtypes 매핑 없음: '+code);
 for(const parent of [t.Equiv1,t.Equiv2])if(strip(parent))typeAncestors(engine,strip(parent),seen);
 return seen;
}
function runtimeItemWeight(engine,row){
 const type=engine.typeDb[strip(row.type)];
 if(!type||!Number.isFinite(Number(type.Rarity)))throw Error('itemtypes Rarity 없음: '+row.type);
 return Math.max(0,Number(type.Rarity));
}
function runtimeTcMembers(engine,name){
 const spec=runtimeTcSpec(name); if(!spec)return null;
 const source=spec.kind==='armo'?engine.armorR:engine.weapR;
 const rows=source.filter(r=>runtimeTierForLevel(baseLevel(r))===spec.tier && strip(r.spawnable||'1')!=='0' && typeAncestors(engine,strip(r.type)).has(spec.kind));
 return rows.map(r=>({ref:strip(r.code),weight:runtimeItemWeight(engine,r),row:r})).filter(x=>x.ref&&x.weight>0);
}
function runtimeTcLeafProb(engine,name,target,mlvl,mf,inheritedQ=0){
 const members=runtimeTcMembers(engine,name);if(!members)return null;
 const total=members.reduce((a,x)=>a+x.weight,0);if(total<=0)return {p:0,paths:0,runtime:true,members:0};
 const targetMember=members.find(x=>x.ref===strip(target.code));if(!targetMember)return {p:0,paths:0,runtime:true,members:members.length,total};
 const base=engine.baseDb[strip(target.code)];if(!base)return {p:0,paths:0,runtime:true,members:members.length,total,error:'base data 없음'};
 const q=uniqueQualityProb(engine,target,base,mlvl,mf,inheritedQ);
 return {p:(targetMember.weight/total)*q.p,paths:1,runtime:true,members:members.length,total,baseWeight:targetMember.weight,quality:q};
}
function baseKindAndTier(engine,target){
 const code=strip(target.code),base=engine.baseDb[code];
 if(!base)return {kind:null,tier:0,level:0};
 const kind=strip(base.__kind);const lv=baseLevel(base);return {kind,tier:runtimeTierForLevel(lv),level:lv};
}
function tcEligibilitySanity(engine,start,target,mlvl){
 const info=baseKindAndTier(engine,target),seen=new Set(),stack=[{name:upgradeTc(start,mlvl,engine.tcdb),path:[]}];
 let nodes=0;const missing=[];
 while(stack.length){
  const {name,path}=stack.pop();if(path.includes(name))throw Error('TC 순환 참조: '+name);if(seen.has(name))continue;seen.add(name);
  if(++nodes>20000)throw Error('TC 그래프 탐색 한도 초과');
  const trail=[...path,name],members=runtimeTcMembers(engine,name);
  if(members){if(members.some(x=>x.ref===strip(target.code)))return {ok:true,...info,nodes,path:trail};continue}
  const row=engine.tcdb[name];
  if(!row){if(name===strip(target.code)||name===target.en)return {ok:true,...info,nodes,path:trail};if(!engine.baseDb[name]&&!engine.uniR.some(u=>strip(u.index)===name))missing.push(name);continue}
  let remaining=Math.abs(Number(row.Picks||1));
  for(let i=1;i<=10;i++){
   const w=Number(row['Prob'+i]||0),{ref}=parseItemRef(row['Item'+i]);
   if(!ref||w<=0)continue;
   if(Number(row.Picks)<0){if(remaining<=0)break;remaining-=Math.min(w,remaining)}
   stack.push({name:ref,path:trail});
  }
 }
 if(missing.length)throw Error('TC 참조 데이터 누락: '+missing.slice(0,5).join(', '));
 return {ok:false,...info,nodes,path:[]};
}
function uniqueEligibility(item,mlvl){if(strip(item.DropConditionCalc)||strip(item.firstLadderSeason)||strip(item.lastLadderSeason))throw Error('시즌/전용 드랍 조건이 있는 아이템: 추가 조건 검증 필요');return Number(item.disabled||0)!==1&&String(item.spawnable??'1')!=='0'&&mlvl>=Number(item.lvl||0)}
function itemRatioRow(engine,base){const code=strip(base.code),normal=strip(base.normcode||base.code),uber=code!==normal?1:0;const type=engine.typeDb[strip(base.type)]||{};const cls=strip(type.Class)?1:0;return engine.ratioR.find(r=>Number(r.Version||0)===1&&Number(r.Uber||0)===uber&&Number(r['Class Specific']||0)===cls)||engine.ratioR.find(r=>Number(r.Version||0)===1&&Number(r['Class Specific']||0)===cls)||engine.ratioR.find(r=>Number(r.Version||0)===1)}
function uniqueQualityProb(engine,item,base,mlvl,mf,qualityFactor){if(!uniqueEligibility(item,mlvl))return {p:0,reason:'unique qlvl 미충족'};const rr=itemRatioRow(engine,base);if(!rr)return {p:0,reason:'itemratio 행 없음'};const baseQ=Number(base.level||item.lvl||0),div=Math.max(1,Number(rr.UniqueDivisor||1));let chance=(Number(rr.Unique||0)-Math.trunc((mlvl-baseQ)/div))*128;const eff=mf<=10?Math.max(0,Math.floor(mf)):Math.floor(Math.max(0,mf)*250/(Math.max(0,mf)+250));chance=Math.floor(chance*100/(100+eff));chance=Math.max(chance,Number(rr.UniqueMin||0));if(qualityFactor>0)chance=chance-Math.floor(chance*qualityFactor/1024);chance=Math.max(128,chance);const qroll=Math.min(1,128/chance);const candidates=engine.uniR.filter(u=>Number(u.disabled||0)!==1&&strip(u.code)===strip(item.code)&&Number(u.lvl||0)<=mlvl&&String(u.enabled||u.spawnable||'1').trim()!=='0');const total=candidates.reduce((a,u)=>a+Math.max(0,Number(u.rarity||0)),0),target=Math.max(0,Number(item.rarity||0));const select=total?target/total:1;return {p:qroll*select,qroll,select,chance,eff,baseQ,ratio:rr.Function||''}}
function leafUniqueProb(engine,ref,target,mlvl,mf,qf){if(ref===target.en||ref===target.index)return {p:1,paths:1};if(ref!==strip(target.code))return {p:0,paths:0};const base=engine.baseDb[strip(target.code)];if(!base)return {p:0,paths:0,error:'base data 없음'};const q=uniqueQualityProb(engine,target,base,mlvl,mf,qf);return {p:q.p,paths:1,quality:q}}
function tcUniqueProb(engine,start,target,mlvl,mf,players){
 const memo=new Map(),active=new Set();let paths=0,successReachable=false;
 // Distribution of item counts while the requested unique has NOT dropped.
 // Missing probability mass is success. At six items, subsequent picks stop.
 function walk(name,q,budget){
  if(budget===0)return [1];const key=name+'|'+q+'|'+budget;
  if(memo.has(key))return memo.get(key);if(active.has(key))throw Error('TC 순환 참조: '+name);
  active.add(key);let result=Array(budget+1).fill(0);
  const members=runtimeTcMembers(engine,name),row=engine.tcdb[name];
  if(members){
   const total=members.reduce((v,x)=>v+x.weight,0);if(!total)throw Error('빈 런타임 TC: '+name);
   const hit=members.find(x=>x.ref===strip(target.code));
   const chance=hit?hit.weight/total*uniqueQualityProb(engine,target,hit.row,mlvl,mf,q).p:0;
   if(hit)paths++;if(chance>0)successReachable=true;result[1]=1-chance;
  }else if(!row){
   const direct=engine.uniR.find(x=>strip(x.index)===name);
   if(!engine.baseDb[name]&&!direct)throw Error('TC 말단 데이터 없음: '+name);
   const chance=leafUniqueProb(engine,name,target,mlvl,mf,q).p;
   if(chance){paths++;successReachable=true;}result[1]=1-chance;
  }else{
   const picks=Number(row.Picks||1)||1,quality=qfactor(row,q),entries=[];
   for(let i=1;i<=10;i++){const weight=Number(row['Prob'+i]||0),parsed=parseItemRef(row['Item'+i]);if(weight>0&&parsed.ref)entries.push({...parsed,weight})}
   const nd=effectiveNoDrop(row,players),total=nd+entries.reduce((v,x)=>v+x.weight,0);
   if(!entries.length||!total)throw Error('비어 있는 TC: '+name);
   result[0]=1;
   const sequence=[];
   if(picks<0){let remaining=-picks;for(const entry of entries){for(let j=0;j<entry.weight&&remaining>0;j++,remaining--)sequence.push(entry)}}
   else for(let i=0;i<picks;i++)sequence.push(null);
   if(sequence.length>100)throw Error('지원 범위를 넘는 Picks');
   for(const forced of sequence){
    const next=Array(budget+1).fill(0);
    for(let count=0;count<=budget;count++){
     const prob=result[count];if(!prob)continue;
     if(count===budget){next[count]+=prob;continue}
     if(!forced)next[count]+=prob*nd/total;
     for(const entry of forced?[forced]:entries){
      const child=walk(entry.ref,qfactor(row,quality,entry.mods),budget-count),weight=forced?1:entry.weight/total;
      for(let n=0;n<child.length;n++)next[count+n]+=prob*weight*child[n];
     }
    }
    result=next;
   }
  }
  active.delete(key);memo.set(key,result);return result;
 }
 const distribution=walk(upgradeTc(start,mlvl,engine.tcdb),0,6);
 return {p:successReachable?Math.max(0,Math.min(1,1-distribution.reduce((a,b)=>a+b,0))):0,paths,itemCap:6};
}
function effectiveMlvl(m,type,ls,clvl=Number(el('clvl').value)||1,terrorized=true){
 const add=type==='base'?2:type==='champ'?4:5,cap=type==='base'?96:type==='champ'?98:99;
 const area=Math.max(...ls.map(l=>Number(l['MonLvlEx(H)']||0)));
 const original=Number(m.boss||m.Boss||0)===1?Number(m['Level(H)']||area):area+(type==='champ'?2:type==='unique'?3:0);
 return terrorized?Math.max(original,Math.min(Math.max(1,Math.min(99,clvl))+add,cap)):original;
}
async function areaMonsters(type){
 const engine=await loadEngine(),g=selectedGroup(),names=EA[g.id]||[],ls=matchLevels(engine.levelsR,names).filter(l=>Number(l.Act)===g.act-1);
 if(!ls.length)throw new Error(`원본 levels.txt 매핑 실패: ${names.join(', ')}`);
 const ids=monsterIdsFromLevels(ls);
 if(type==='boss'){
   const bosses={'a1-cathedral':['andariel'],'a2-canyon':['duriel'],'a3-durance':['mephisto'],'a4-chaos':['diablo'],'a5-worldstone':['baalcrab']};
   for(const id of (bosses[g.id]||[]))ids.add(id)
 }
 const out=[];
 for(const id of ids){
   const m=engine.monDb[id]||engine.monByHc[String(id)]; if(!m)continue;
   if(type==='boss'&&Number(m.boss||m.Boss||0)!==1)continue;if(type!=='boss'&&Number(m.boss||m.Boss||0)===1)continue;
   const picked=monsterTcForType(m,type); if(!picked.tc)continue;
   out.push({id,name:strip(m.NameStr||m['*hcIdx']||m.Id),tc:picked.tc,tcSource:picked.source,row:m,mlvl:effectiveMlvl(m,type,type==='boss'?ls:ls.filter(l=>monsterIdsFromLevels([l]).has(id)))})
 }
 if(!out.length)throw Error('선택 범위의 몬스터/TC 매핑을 확인하지 못했습니다.');return {engine,ls,out,monsterIds:[...ids]}
}
async function finalTc(){const box=el('tcFinalResult'),btn=el('runTc');if(el('difficulty').value!=='hell'){box.innerHTML='<div class="drop-state no"><b>지옥 공포영역에서만 계산할 수 있습니다.</b></div>';return}btn.disabled=true;try{const target=await findItem(el('itemName').value);if(!target){box.innerHTML='<div class="drop-state no"><b>아이템을 찾지 못했습니다.</b><span>한글·영문·통칭·약칭을 다시 확인해 주세요.</span></div>';return}btn.textContent='게임 원본 확인 중…';const type=el('monsterType').value,{engine,ls,out}=await areaMonsters(type);let hit=[];for(const m of out){const start=upgradeTc(m.tc,m.mlvl,engine.tcdb),r=tcUniqueProb(engine,start,target,m.mlvl,0,1),sanity=tcEligibilitySanity(engine,start,target,m.mlvl);if(r.p>0&&sanity.ok&&uniqueEligibility(target,m.mlvl))hit.push({...m,start,p:r.p,sanity})}const levelOk=out.some(m=>uniqueEligibility(target,m.mlvl)),ok=levelOk&&hit.length>0,why=!levelOk?'몬스터 레벨이 아이템 등급 조건보다 낮습니다.':!hit.length?'이 몬스터의 드랍 목록에서 해당 아이템 베이스로 이어지는 경로가 없습니다.':hit.length+'종의 몬스터에서 실제 드랍 경로를 확인했습니다.';box.innerHTML='<div class="drop-state '+(ok?'ok':'no')+'"><b>'+(ok?'이 조건에서 드랍 가능합니다':'이 조건에서는 드랍되지 않습니다')+'</b><span>'+esc(target.ko)+' · '+esc(target.en)+'</span><small>'+why+'</small></div><div class="tc-proof"><b>바로 읽는 결과</b><div>선택 지역 '+ls.length+'곳 · 검사 몬스터 '+out.length+'종 · '+(ok?'레벨 조건과 아이템 베이스 경로 모두 충족':'위 사유로 조건 미충족')+'</div><details><summary>게임 원본 경로와 전문 수치 보기</summary><div>베이스 코드 '+esc(target.code)+' · 아이템 등급 '+(target.lvl||'-')+' · 몬스터 레벨 '+Math.min(...out.map(m=>m.mlvl))+'~'+Math.max(...out.map(m=>m.mlvl))+'</div>'+hit.slice(0,15).map(x=>'<div><code>'+esc(x.id)+'</code> · '+esc(x.name)+' · '+esc(x.tc)+(x.start!==x.tc?' → <b>'+esc(x.start)+'</b>':'')+' · 레벨 '+x.mlvl+(x.sanity?.ok?' · '+esc(x.sanity.path.join(' → ')):'')+'</div>').join('')+'</details></div>'}catch(e){box.innerHTML='<div class="drop-state no"><b>검증 실패 — 결과를 확정하지 않음</b><span>'+esc(e.message||e)+'</span><small>원본 데이터 로딩 실패 시 추정값을 표시하지 않습니다.</small></div>'}finally{btn.disabled=false;btn.textContent='드랍 가능 여부 확인'}}
let monstersPreparedFor=''; async function prepareMonsters(){const mt=el('rateMonsterType'),ms=el('rateMonster');if(!mt||!ms)return;const key=(sel?.value||'')+'|'+mt.value;if(monstersPreparedFor===key)return;ms.innerHTML='<option>원본 데이터 로딩 중…</option>';try{const {out}=await areaMonsters(mt.value);monstersPreparedFor=key;ms.innerHTML=out.map((m,i)=>`<option value="${esc(m.id)}">${esc(m.name||m.id)} · ${esc(m.id)}</option>`).join('')||'<option value="">해당 분류 몬스터 없음</option>'}catch(e){ms.innerHTML=`<option value="">${esc(e.message||'로드 실패')}</option>`}}
function fmtPct(p){if(!Number.isFinite(p)||p<=0)return'0%';if(p>=.01)return (p*100).toFixed(4)+'%';if(p>=.000001)return (p*100).toFixed(7)+'%';return (p*100).toExponential(3)+'%'}
async function runRate(){const box=el('rateResult'),btn=el('runRate');btn.disabled=true;btn.textContent='드랍률 계산 중…';try{const target=await findItem(el('rateItem').value);if(!target)throw new Error('아이템 검색 실패');const players=+el('players').value||1,mf=Math.max(0,+el('mf').value||0),type=el('rateMonsterType').value,runs=Math.max(1,+el('runs').value||1);if(target.en==='Harlequin Crest'&&type!=='base'||target.en==="Griffon's Eye"&&type==='base'&&players>1)throw new Error('계산기 간 차이 확인 중 · 이 조건의 확률 공개를 보류합니다.');const {engine,out}=await areaMonsters(type),id=el('rateMonster').value,m=out.find(x=>x.id===id)||out[0];if(!m)throw new Error('계산할 몬스터가 없습니다.');const mlvl=m.mlvl,start=upgradeTc(m.tc,mlvl,engine.tcdb),res=tcUniqueProb(engine,start,target,mlvl,mf,players),sanity=tcEligibilitySanity(engine,start,target,mlvl),p=res.p,oneIn=p>0?1/p:Infinity,atLeast=1-Math.pow(1-p,runs);if(p<=0&&sanity.ok)throw new Error(`드랍 가능은 확인됨(실제 베이스 경로 확인) · 정확 확률 경로는 아직 계산 불가`);const base=engine.baseDb[strip(target.code)],q=base?uniqueQualityProb(engine,target,base,mlvl,mf,Number(engine.tcdb[start]?.Unique||0)):null;const root=engine.tcdb[start],nd=root?effectiveNoDrop(root,players):0;box.innerHTML=`<div class="drop-state ${p>0?'ok':'no'}"><b>${p>0?`한 번 잡을 때 ${fmtPct(p)} · 약 ${Math.round(oneIn).toLocaleString()}분의 1`:'현재 조건에서는 드랍되지 않습니다'}</b><span>${esc(target.ko)} · ${esc(m.name||m.id)} · ${players}인 난이도 · 매찬 ${mf}%</span><small>${p>0?`${runs.toLocaleString()}번 사냥해 1개 이상 볼 확률 ${fmtPct(atLeast)}`:'몬스터 드랍 목록 또는 유니크 등급 조건 미충족'}</small></div><details class="tc-proof"><summary><b>계산 근거와 전문 수치 보기</b></summary><div>mlvl ${mlvl} · 시작 TC <code>${esc(m.tc)}</code>${start!==m.tc?` → <code>${esc(start)}</code>`:''}</div><div>Players ${players} → 루트 NoDrop ${root?root.NoDrop||0:'-'} → 조정 ${root?nd:'-'} · MF ${mf} → Unique 유효 MF ${q?q.eff:'-'}</div>${q?`<div>base qlvl ${q.baseQ} · unique qlvl ${target.lvl||'-'} · quality roll ${fmtPct(q.qroll)} · 동일 베이스 유니크 선택 ${fmtPct(q.select)}</div>`:''}<div class="source-line">확률 = TC 재귀 경로 × 조정 NoDrop × Unique quality roll × 동일 베이스 유니크 rarity 선택. 퀘스트 전용 상태/파티 근접 보너스는 별도 조건이므로 제외. 샤코의 일부 챔피언·유니크 확률은 외부 계산기와 차이가 있어 추가 대조 중입니다.</div></details>`}catch(e){box.innerHTML=`<div class="drop-state no"><b>드랍률 계산 실패</b><span>${esc(e.message||e)}</span><small>추정값을 대신 표시하지 않습니다.</small></div>`}finally{btn.disabled=false;btn.textContent='드랍률 계산'}}
const BASE_KO={uap:'샤코',ci3:'다이어뎀','7gw':'언어스드 완드'};
let dropDbLoaded=false;
async function farmingProof(item,engine){
 const rows=[];
 for(const id of ['a4-chaos','a2-canyon','a1-pit','a5-worldstone','a1-cathedral','a3-durance']){
  const g=G.find(x=>x.id===id);if(!g)continue;
  const ls=matchLevels(engine.levelsR,EA[id]||[]).filter(l=>Number(l.Act)===g.act-1);if(!ls.length)continue;
  for(const type of ['base','champ','unique']){
   const candidates=[...monsterIdsFromLevels(ls)].map(id=>engine.monDb[id]||engine.monByHc[id]).filter(Boolean);
   for(const tz of [false,true]){
    let hit=null;
    for(const m of candidates){const tc=tz?monsterTcForType(m,type).tc:strip(m[normalTcField(type)]);if(!tc)continue;
     const level=effectiveMlvl(m,type,ls.filter(l=>monsterIdsFromLevels([l]).has(m.Id)),93,tz);
     if(uniqueEligibility(item,level)&&tcEligibilitySanity(engine,tc,item,level).ok){hit=m;break}}
    if(hit)rows.push({area:g.ko,type,tz,monster:strip(hit.NameStr||hit.Id),id});
   }
  }
 }
 return rows;
}
async function loadDropDb(){
 if(dropDbLoaded)return;dropDbLoaded=true;
 const body=el('dropDbBody'),count=el('dropDbCount'),input=el('dropDbSearch');
 try{
  const [arr,engine]=await Promise.all([buildItemIndex(),loadEngine()]);
  function render(){
   const q=norm(input?.value||''),matched=q?arr.filter(x=>x.search.includes(q)):arr,rows=matched.slice(0,250);
   count.textContent='유니크 '+arr.length+'개 · 검색 '+matched.length+'개 · 표시 '+rows.length+'개';
   body.innerHTML=rows.map(x=>{
    const base=engine.baseDb[strip(x.code)],info=baseKindAndTier(engine,x),baseName=BASE_KO[x.code]||base?.name||x['*ItemName']||x.code;
    return '<tr data-en="'+esc(x.en)+'"><td><b>'+esc(x.ko)+'</b><div class="muted tiny">'+esc(x.en)+'</div><div class="tiny">'+esc(x.aliases.filter(a=>a!==x.en&&a!==x.ko).slice(0,5).join(' · '))+'</div></td><td>'+esc(baseName)+'<div class="tiny">'+esc(x.code)+'</div></td><td>'+esc(x.lvl)+' / '+(base?baseLevel(base):'미확인')+'</td><td>'+esc(x['lvl req']||'—')+'</td><td>'+(['armo','weap'].includes(info.kind)?info.kind+' TC'+info.tier:'별도 TC')+'</td><td><button class="db-proof action-btn" type="button">주요 파밍처 확인</button><div class="db-proof-result tiny">일반 지역 / 공포영역을 실제 TC로 비교</div></td><td><button class="db-use" type="button">판정기에 넣기</button></td></tr>';
   }).join('')||'<tr><td colspan="7">검색 결과 없음</td></tr>';
   body.querySelectorAll('.db-use').forEach(btn=>btn.addEventListener('click',()=>{const name=btn.closest('tr').dataset.en;el('itemName').value=name;el('rateItem').value=name;document.querySelector('[data-tab="item"]')?.click()}));
   body.querySelectorAll('.db-proof').forEach(btn=>btn.addEventListener('click',async()=>{
    btn.disabled=true;const tr=btn.closest('tr'),out=tr.querySelector('.db-proof-result');out.textContent='TC 경로 확인 중…';
    try{const item=arr.find(x=>x.en===tr.dataset.en),proof=await farmingProof(item,engine);out.innerHTML=proof.length?'<b>추천: '+esc([...new Set(proof.filter(x=>x.id==='a4-chaos'||x.id==='a2-canyon').map(x=>x.area+(x.tz?' (공포영역)':'')))].join(' · ')||'아래 검증 지역 참고')+'</b><br>'+proof.map(x=>'<div><b>'+esc(x.area)+'</b> · '+({base:'일반',champ:'챔피언',unique:'유니크'}[x.type])+' · '+(x.tz?'공포영역 clvl 93':'일반 지역')+' · '+esc(x.monster)+'</div>').join(''):'검사한 주요 지역에서 확인된 경로 없음 — 모든 몬스터의 드랍 불가를 뜻하지 않습니다.'}catch(e){out.textContent='확인 불가: '+e.message}finally{btn.disabled=false}
   }));
  }
  input?.addEventListener('input',render);render();
 }catch(e){dropDbLoaded=false;count.textContent='원본 로딩 실패 · 탭을 다시 선택하여 재시도';body.innerHTML='<tr><td colspan="7">'+esc(e.message)+'</td></tr>'}
}
function init(){tabs();fillGroups();['clvl','baseMlvl','difficulty'].forEach(id=>el(id)?.addEventListener('input',()=>{levels();basicDrop();monstersPreparedFor='';prepareMonsters()}));['itemQlvl','monsterType'].forEach(id=>el(id)?.addEventListener('input',basicDrop));el('runTc')?.addEventListener('click',finalTc);el('rateMonsterType')?.addEventListener('change',()=>{monstersPreparedFor='';prepareMonsters()});el('runRate')?.addEventListener('click',runRate);const params=new URLSearchParams(location.search),area=params.get('tz')||params.get('area'),item=params.get('item')||params.get('q');if(G.some(g=>g.id===area)){sel.value=area;el('baseMlvl').value=selectedGroup().anchorHellAreaLevel}if(item){el('itemName').value=item;el('rateItem').value=item}levels();basicDrop();renderEngineScope();setTimeout(()=>buildItemIndex().catch(()=>{}),300)}
window.SKRDropEngine={itemRatioRow,tsv,norm,aliasesFor,upgradeTc,runtimeTcMembers,runtimeItemWeight,tcEligibilitySanity,tcUniqueProb,uniqueQualityProb,uniqueEligibility,effectiveNoDrop,qfactor,monsterIdsFromLevels,matchLevels,monsterTcForType,effectiveMlvl,farmingProof,areaMonsters,loadEngine,buildItemIndex,findItem,levels};if(window.__SKR_TEST__)window.__SKR_ENGINE__=window.SKRDropEngine;else if(!document.documentElement.hasAttribute("data-unified"))init();
})();

