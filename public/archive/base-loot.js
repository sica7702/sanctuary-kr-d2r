import {closure,esc,norm} from './unified-core.js?v=112';

export function socketCap(base,types,ilvl=99){
  const t=types[base.type];if(!t)return 0;
  const band=ilvl<=+(t.MaxSocketsLevelThreshold1||25)?1:ilvl<=+(t.MaxSocketsLevelThreshold2||40)?2:3;
  return Math.min(+base.gemsockets||0,+t['MaxSockets'+band]||0);
}
export function compatibleRunes(base,data){
  const ts=new Set([...closure(base.type,data.types),...closure(base.type2,data.types)]);
  return data.records.filter(r=>r.kind==='룬워드'&&r.raw.complete==='1').filter(r=>{
    const include=Array.from({length:6},(_,i)=>r.raw['itype'+(i+1)]).filter(Boolean),exclude=Array.from({length:3},(_,i)=>r.raw['etype'+(i+1)]).filter(Boolean);
    return include.some(t=>ts.has(t))&&!exclude.some(t=>ts.has(t))&&runeSockets(r)<=socketCap(base,data.types);
  });
}
export const runeSockets=r=>Array.from({length:6},(_,i)=>r.raw['Rune'+(i+1)]).filter(Boolean).length;
export const automods=(base,data)=>data.affixes.filter(a=>a.kind==='auto'&&a.spawnable==='1'&&a.group===base['auto prefix']);
export function checkShield(base,data,values){
  const entered=Object.entries(values).filter(([,v])=>v!==''&&v!==null);
  if(!entered.length)return {ok:false,text:'툴팁에 적힌 수치를 입력하세요.'};
  if(entered.some(([,v])=>!Number.isInteger(Number(v))||Number(v)<=0))return {ok:false,text:'옵션은 양의 정수로 입력하세요. 없는 옵션은 비워두세요.'};
  const matches=automods(base,data).filter(a=>a.mods.length===entered.length&&a.mods.every(m=>entered.some(([k,v])=>k===m.code&&+v>=+m.min&&+v<=+m.max)));
  if(!matches.length)return {ok:false,text:'같은 전용 옵션 묶음에서 일치하지 않습니다. 증뎀·명중률은 함께 입력하고, 모든 저항형과 동시에 입력하지 마세요.'};
  const best=automods(base,data).filter(a=>a.mods.some(m=>m.code===entered[0][0])).sort((a,b)=>Math.max(...b.mods.map(m=>+m.max))-Math.max(...a.mods.map(m=>+m.max)))[0];
  return {ok:true,text:(matches.includes(best)?'최상위 전용 옵션 구간에 해당합니다. ':'전용 옵션 수치 조합이 범위 안에 있습니다. ')+entered.map(([k,v])=>({ 'dmg%':'증뎀','att':'명중률','res-all':'모든 저항'}[k])+' '+v).join(' · ')+'. 수치 대조 결과이며 거래 가격이나 전체 아이템 진위 판정은 아닙니다.',ids:matches.map(x=>x.id)};
}
function category(b,d){const t=closure(b.type,d.types);return t.has('ashd')?'성기사 방패':t.has('abow')?'아마존 활':t.has('h2h')?'암살자 클러':t.has('grim')?'악마술사 마법서':t.has('phlm')?'야만용사 투구':t.has('pelt')?'드루이드 투구':t.has('shld')?'방패':t.has('tors')?'갑옷':t.has('helm')?'투구':t.has('pole')?'미늘창':t.has('spea')?'창':t.has('wand')?'완드':t.has('scep')?'셉터':t.has('staf')?'지팡이':t.has('swor')?'검':t.has('axe')?'도끼':t.has('bow')||t.has('xbow')?'활·쇠뇌':'기타 무기';}
export function baseRows(data){return data.bases.filter(b=>b.spawnable==='1'&&!+b.quest&&!+b.unique&&socketCap(b,data.types)>0).map(b=>{
  const record=data.records.find(r=>r.kind==='재료'&&r.code===b.code),runes=compatibleRunes(b,data);if(!record||!runes.length)return null;
  const t=closure(b.type,data.types),pal=t.has('ashd');
  return {kind:'base',id:'base-loot:'+b.code,title:record.name,bases:b.name,aliases:[...(record.aliases||[]),...runes.flatMap(r=>[r.name,r.en,...r.aliases]),...(pal?['증어레','증뎀','어레','올레','모저','모든 저항']:[])],checks:['소켓 '+[...new Set(runes.map(runeSockets))].sort().join('·')+'개별 룬워드 연결'],cat:category(b,data),b,record,runes,pal};
}).filter(Boolean).sort((a,b)=>a.title.localeCompare(b.title,'ko'));}
export function baseControls(state){return `<div class="base-controls"><label>주운 아이템 소켓<select id="baseSocket"><option value="">전체 소켓</option>${[0,1,2,3,4,5,6].map(n=>`<option value="${n}" ${state.socket===String(n)?'selected':''}>${n===0?'소켓 없음':n+'소켓'}</option>`).join('')}</select></label><label>아이템 품질<select id="baseQuality"><option value="normal">일반</option><option value="superior" ${state.quality==='superior'?'selected':''}>고급</option></select></label><p>흰색·회색 재료 기준입니다. 매직·레어는 룬워드 재료로 사용할 수 없습니다. 소켓이 이미 있다면 개수가 정확히 맞아야 합니다.</p></div>`;}
export function baseCard(x,data,state){
  const {b,record,runes,pal}=x,ts=closure(b.type,data.types),caps=[1,26,41].map(l=>socketCap(b,data.types,l));
  const shown=runes.filter(r=>!state.socket||state.socket==='0'||runeSockets(r)===+state.socket);
  const modText=m=>m.code.startsWith('pois-')?'독 피해·지속시간: 실제 툴팁 값 확인':(data.catalog.find(c=>c.code===m.code&&String(c.param||'')===String(m.param||''))?.label||{att:'명중률', 'dmg%':'피해 증가', 'res-all':'모든 저항',skilltab:'전용 기술 계열'}[m.code]||m.code)+' '+m.min+'–'+m.max+(m.code==='dmg%'||m.code==='res-all'?'%':'');
  const options=automods(b,data),staff=[...ts].some(t=>data.types[t]?.StaffMods);
  const general=b.family==='armor'?`일반 방어력 ${b.minac}–${b.maxac}`:`기본 무기 속도 ${b.speed||0}`;
  return `<details class="criterion-card base" data-base-card="${b.code}"><summary><span class="criterion-kind">베이스 재료 · ${esc(x.cat)}</span><h3>${esc(x.title)}</h3><p>${pal?'모든 저항형 / 증뎀·명중률형 모두 확인':esc(general)}<br>${[...new Set(shown.map(runeSockets))].sort().map(n=>n+'소켓').join(' · ')}</p><span class="expand-label">소켓·전용 옵션·룬워드 보기</span></summary><div class="criterion-body"><p>${esc(b.name)} · ${esc(record.aliases.join(' · '))}</p><p>${esc(general)}<br>요구 힘 ${b.reqstr||0} · 민첩 ${b.reqdex||0} · 레벨 ${b.levelreq||0}</p><h4>주웠을 때 확인할 것</h4><ul><li>소켓 수와 목표 룬워드를 먼저 맞추세요. 제작 가능한 재료라는 뜻이며 모든 베이스의 거래 가치를 보장하지 않습니다.</li><li>${b.family==='armor'?'고급 방어구의 방어력 증가·내구도 증가 수치를 확인하세요.':'고급 무기의 피해 증가·명중률·내구도 옵션을 확인하세요.'}</li><li>${b.nodurability==='1'?'이 베이스는 내구도 소모가 없는 종류입니다.':'무형(에테)은 일반 수리가 불가능합니다. 용병 장비는 내구도를 소모하지 않으며, 본캐용은 룬워드의 파괴 안 됨·내구도 회복 여부와 사용 방식을 확인하세요.'}</li>${staff?'<li>전용 개별 기술이 붙는 종류입니다. 기술 이름과 수치를 보존해 사용할 빌드와 대조하세요.</li>':''}</ul>
  ${pal?`<div class="paladin-check"><h4>성기사 방패 전용 옵션</h4><p>모든 저항형과 증뎀·명중률형 중 하나가 붙습니다. 증어레는 고급 방어력 증가와 별개의 전용 옵션입니다.</p><div class="auto-ranges">${options.map(a=>'<p>'+a.mods.map(m=>esc(modText(m))).join(' + ')+'</p>').join('')}</div><h4>내 방패 수치 대조</h4><div class="shield-inputs"><label>피해 증가 (%)<input type="number" data-shield-stat="dmg%" placeholder="예: 59"></label><label>명중률<input type="number" data-shield-stat="att" placeholder="예: 117"></label><label>모든 저항 (%)<input type="number" data-shield-stat="res-all" placeholder="없는 옵션은 빈칸"></label></div><button data-check-shield="${b.code}">전용 옵션 조합 확인</button><p class="shield-result" role="status"></p></div>`:options.length?'<h4>베이스에 붙는 전용 옵션</h4>'+options.map(a=>'<p>'+a.mods.map(m=>esc(modText(m))).join(' + ')+'</p>').join(''):''}
  <h4>소켓이 없다면</h4><p>라주크: 아이템 레벨 1–25 → ${caps[0]}개 / 26–40 → ${caps[1]}개 / 41 이상 → ${caps[2]}개. 캐릭터 레벨이나 요구 레벨과 다릅니다.</p><p>${state.quality==='superior'?'고급 재료는 소켓 큐빙이 불가능합니다. 라주크 소켓 수 또는 이미 뚫린 소켓을 확인하세요.':'일반 무소켓 재료는 해당 부위 소켓 큐빙을 확인할 수 있습니다. 결과는 무작위이며 고급·저품질에는 적용되지 않습니다.'}</p><a href="sockets.html">라주크·소켓 큐빙 설명</a>
  <h4>${state.socket==='0'?'소켓을 준비하면 연결되는':'소켓 수가 맞으면 연결되는'} 룬워드 ${shown.length}개</h4><p class="muted">제작 모드·시즌 제한은 각 룬워드 상세에서 확인하세요.</p><div class="base-runes">${shown.map(r=>`<a href="unified.html?id=${encodeURIComponent(r.id)}&view=detail"><strong>${esc(r.en==='Exile'?'추방 (망명)':r.name)}</strong><span>${runeSockets(r)}소켓 · ${esc(r.en)}</span></a>`).join('')}</div><div class="actions"><a class="button" href="unified.html?id=${encodeURIComponent(record.id)}&view=detail">상세·파밍·보관함 연결</a></div></div></details>`;
}
