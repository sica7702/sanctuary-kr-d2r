(async()=>{
'use strict';
const $=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),N=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]+/g,'');
if(!$('buildList')||!window.SKRBuildProgress)return;
let rows;
try{const r=await fetch('build-guides.json?v=124');if(!r.ok)throw Error(r.status);rows=(await r.json()).builds.map(b=>SKRBuildProgress.prepare(b));}
catch(e){$('buildCounts').insertAdjacentHTML('beforebegin','<p role="alert">성장 단계 자료를 불러오지 못했습니다. 기존 빌드 목록은 계속 사용할 수 있습니다. 새로고침해 주세요.</p>');return;}
document.querySelector('#pane-builds .guide-intro').innerHTML='<small class="guide-kicker">CLASS BUILD LIBRARY</small><h2>내 캐릭터, 어디서부터 키울까요?</h2><p>직업과 빌드를 고르면 스타터부터 엔드 세팅까지 순서대로 안내합니다.<br>장비 교체 시점과 용병 구성도 같은 단계에서 함께 확인하세요.</p><p class="build-review-note">50개 빌드 · 4단계 성장 경로 · 2026.09.21 자료 대조 / 3.3 시즌 15<br>공식 패치와 공개 가이드 참고. 서버 실측 순위가 아니며 자료가 부족한 변형은 별도 표시합니다.</p>';
const form=document.querySelector('#pane-builds .build-tools'),q=$('buildQ'),c=$('buildClass');
for(const [el,title]of [[q,'빌드 이름·별명·장비 검색'],[c,'직업 선택']]){const label=document.createElement('label');label.append(document.createTextNode(title));el.before(label);label.append(el);}
form.insertAdjacentHTML('beforeend','<label>시작 방식<select id="buildPath"><option value="">모든 성장 경로</option><option value="direct">스타터에서 이어가기</option><option value="transition">장비 마련 후 전환</option><option value="variant">계열·변형 가이드</option></select></label><button type="button" id="buildReset">초기화</button>');
q.placeholder='예: 자벨마, 햄딘, 모자이크, 무한';q.autocomplete='off';
const p=new URLSearchParams(location.search);
q.value=p.get('buildq')||'';
if([...c.options].some(o=>o.value===p.get('class')))c.value=p.get('class');
if([...$('buildPath').options].some(o=>o.value===p.get('path')))$('buildPath').value=p.get('path');
$('buildCounts').setAttribute('role','status');$('buildCounts').setAttribute('aria-live','polite');
function render(){
 const word=N(q.value),cl=c.value,kind=$('buildPath').value;
 const found=rows.filter(v=>(!cl||v.build.className===cl)&&(!kind||(kind==='variant'?v.profile.variant:kind==='transition'?v.profile.gated:!v.profile.gated))&&(!word||N([v.build.name,v.build.aliases,v.build.className,v.profile.entry,v.profile.focus,...v.build.gear.map(g=>g.name)].join(' ')).includes(word)));
 $('buildCounts').innerHTML='<span class="chip">전체 '+rows.length+'개</span><span class="chip">검색 결과 '+found.length+'개</span>';
 $('buildList').innerHTML=found.map(v=>'<a class="build-card" href="build-guide.html?id='+encodeURIComponent(v.build.id)+'&stage=starter"><small>'+E(v.build.className)+(v.profile.variant?' · 변형 가이드':'')+'</small><h3>'+E(v.build.name)+'</h3><span class="build-aliases">'+E(v.build.aliases)+'</span><p>'+E(v.profile.entry)+'</p><span class="build-card-footer"><span class="build-path">'+(v.profile.gated?'장비 마련 후 전환':'스타터에서 이어가기')+'</span><span>4단계 가이드 →</span></span></a>').join('')||'<div class="build-empty"><h3>조건에 맞는 빌드가 없어요.</h3><p>검색어를 줄이거나 직업·시작 방식을 ‘전체’로 바꿔 보세요.</p><button type="button" id="clearBuildSearch">조건 초기화</button></div>';
 if($('clearBuildSearch'))$('clearBuildSearch').onclick=reset;
}
function update(){const url=new URL(location.href);for(const[k,v]of [['buildq',q.value],['class',c.value],['path',$('buildPath').value]])v?url.searchParams.set(k,v):url.searchParams.delete(k);history.replaceState(null,'',url.pathname+url.search+url.hash);render();}
function reset(){q.value='';c.value='';$('buildPath').value='';update();q.focus();}
q.oninput=update;c.onchange=update;$('buildPath').onchange=update;$('buildReset').onclick=reset;
render();
})();
