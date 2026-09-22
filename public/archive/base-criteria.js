import {baseRows,socketCap,runeSockets} from './base-loot.js';
import {esc,norm} from './unified-core.js?v=112';
const mapping={'kurast-shield':'pad','colossus-sword':'7fb'};
export function curatedRows(data,curated){
 const all=baseRows(data),rows=curated.map(c=>{const x=all.find(x=>x.b.code===mapping[c.id]||norm(x.b.name)===norm(c.en));if(!x)throw Error('기존 득환 기준 연결 실패: '+c.ko);return {...x,title:c.ko,curated:c,aliases:[...x.aliases,...c.aliases],checks:c.conditions};});
 for(const x of all.filter(x=>x.pal&&!rows.some(r=>r.b.code===x.b.code)))rows.push({...x,curated:{ko:x.title,en:x.b.name,aliases:x.aliases.filter(a=>!a.includes(' ')).slice(0,4),conditions:[],use:[]}});
 return rows;
}
function shieldCriteria(){return [
 ['저항형 · 최대','45올레 + 4솟 → 영혼·불사조 재료'],
 ['저항형 · 무형','에테 + 45올레 + 4솟 → 망명 재료'],
 ['증어레 · 최대','65증뎀 + 121명중률 + 4솟 → 증어레 으뜸 조합'],
 ['증어레 · 상위 구간','51–65증뎀 + 101–121명중률 + 4솟 → 불사조·망명 제작 가능'],
 ['추가 고급 옵션','15방상 → 저항·증어레 전용 옵션과 별도로 방어력 증가'],
 ['소켓별 용도','3솟 → 꿈·성역 / 4솟 → 영혼·불사조·망명']
 ];}
export function criteriaCard(x,data){
 const c=x.curated,b=x.b,caps=[1,26,41].map(l=>socketCap(b,data.types,l));
 const states=x.pal?shieldCriteria():c.conditions.map(s=>{const i=s.indexOf('·');return [s.slice(0,i).trim(),s.slice(i+1).trim()];});
 if(c.id==='mage-plate')states[states.length-1]=['용도 다름','1–2솟 → 수수께끼 불가 / 2솟은 연기 제작 가능'];
 const used=x.pal?['4솟 영혼 · 불사조 · 추방(망명)','3솟 꿈 · 성역','무형 망명: 내구도 회복 효과 포함']:c.use;
 const stats=b.family==='armor'?['일반 방어력 '+b.minac+'–'+b.maxac,'요구 힘 '+(b.reqstr||0)+' / 민첩 '+(b.reqdex||0)]:['기본 무기 속도 '+(b.speed||0),'요구 힘 '+(b.reqstr||0)+' / 민첩 '+(b.reqdex||0)];
 stats.push('최대 '+socketCap(b,data.types)+'소켓',caps.every(v=>v===caps[0])?'라주크: '+caps[0]+'소켓':'라주크: 아이템 레벨 1–25 / 26–40 / 41 이상 → '+caps.join(' / ')+'소켓','일반 무소켓 큐빙 가능 · 고급 큐빙 불가');
 const tip=c.id==='mage-plate'?'15방상 3솟과 일반 261방 3솟을 구분해 봅니다. 수수께끼의 소켓 조건은 3개입니다.':x.pal?'저항이 없어도 증어레형은 별도 기준으로 봅니다. 59증뎀·117명중률·4솟은 상위 전용 옵션 구간이며, 65/121 으뜸 조합과는 구분합니다.':'등급은 기존 사이트의 상태별 비교 기준입니다. 같은 베이스라도 소켓·무형·전용 옵션 조합에 따라 용도가 달라집니다.';
 return `<article class="criterion-card base criterion-open" data-base-card="${b.code}" id="${esc(c.id||x.id)}"><header><div><span class="criterion-kind">베이스 득환 기준 · ${esc(x.cat)}</span><h3>${esc(x.title)}</h3><p>${esc(c.en)}</p></div><a href="unified.html?id=${encodeURIComponent(x.record.id)}&view=detail">아이템 상세 →</a></header><div class="decision-columns"><section><h4>게임 고정 데이터</h4><ul>${stats.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul><h4>대표 용도</h4><ul>${used.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul></section><section class="decision-priority"><h4>상태별 득/환 기준</h4><div class="decision-rows">${states.map(([rank,text])=>'<div><b>'+esc(rank)+'</b><span>'+esc(text)+'</span></div>').join('')}</div></section><section><h4>국내 검색 별칭</h4><p class="base-aliases">${c.aliases.map(esc).join(' · ')}</p><h4>소켓별 제작 룬워드</h4><div class="decision-runes">${x.runes.map(r=>`<a href="unified.html?id=${encodeURIComponent(r.id)}&view=detail">${runeSockets(r)}솟 ${esc(r.en==='Exile'?'추방(망명)':r.name)}</a>`).join('')}</div></section></div><p class="decision-note">${esc(tip)}</p></article>`;
}
