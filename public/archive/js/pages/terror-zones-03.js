(()=>{
const G=window.SKR_TERROR_GROUPS||[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
const norm=s=>String(s||'').toLowerCase().replace(/[’‘`]/g,"'").replace(/[^0-9a-z가-힣']+/g,'');
const FEATURED_ITEMS=[
 {ko:'그리폰의 눈',en:"Griffon's Eye",q:84,alias:'그리폰'},
 {ko:'죽음의 거미줄',en:"Death's Web",q:74,alias:'죽웹'},
 {ko:'죽음의 깊이',en:"Death's Fathom",q:81,alias:'패덤'},
 {ko:'시대의 왕관',en:'Crown of Ages',q:86,alias:'유닉 코로나'},
 {ko:'거미 그물띠',en:'Arachnid Mesh',q:87,alias:'스웹'},
 {ko:'바람살',en:'Windforce',q:80,alias:'윈포'},
 {ko:'할리퀸 관모',en:'Harlequin Crest',q:69,alias:'샤코'},
 {ko:'안다리엘의 두개골',en:"Andariel's Visage",q:85,alias:'안뚜'},
 {ko:'무덤 강탈자',en:'Tomb Reaver',q:86,alias:'툼리버'},
 {ko:'강철찢개',en:'Steelrend',q:78,alias:'오거장'}
];
const ITEM_PRESETS={
 'a4-chaos':['그리폰의 눈','죽음의 거미줄','죽음의 깊이','시대의 왕관','거미 그물띠','바람살'],
 'a5-worldstone':['그리폰의 눈','죽음의 거미줄','시대의 왕관','거미 그물띠','안다리엘의 두개골','무덤 강탈자'],
 'a3-durance':['그리폰의 눈','거미 그물띠','할리퀸 관모','안다리엘의 두개골','죽음의 깊이','강철찢개'],
 'a3-trav':['거미 그물띠','할리퀸 관모','안다리엘의 두개골','그리폰의 눈','죽음의 깊이','바람살'],
 'a1-pit':['그리폰의 눈','죽음의 거미줄','죽음의 깊이','시대의 왕관','바람살','무덤 강탈자']
};
function charLevel(){return Math.max(1,Math.min(99,Number($('tzCharLevel')?.value||93)))}
function terrorMlvl(kind='normal'){const L=charLevel();return kind==='unique'?Math.min(99,L+5):kind==='champ'?Math.min(98,L+4):Math.min(96,L+2)}
function featuredFor(g){const names=ITEM_PRESETS[g?.id]||FEATURED_ITEMS.slice(0,6).map(x=>x.ko);return names.map(n=>FEATURED_ITEMS.find(x=>x.ko===n)).filter(Boolean).slice(0,6)}
function renderFeatured(prefix,g){const box=$(prefix+'Items');if(!box||!g)return;const u=terrorMlvl('unique');box.innerHTML=featuredFor(g).map((it,i)=>`<a class="tz-item-chip ${it.q<=u?'eligible':'level-lock'}" href="drop-calculator.html?tz=${encodeURIComponent(g.id)}&item=${encodeURIComponent(it.alias)}"><span class="tz-item-icon">${i+1}</span><span><b>${esc(it.ko)}</b><small>${esc(it.alias)} · qlvl ${it.q}${it.q<=u?' · 레벨조건 충족':' · 레벨조건 미충족'}</small></span><em>T${i<2?'1':i<5?'2':'3'}</em></a>`).join('')}

// ---- tabs
[...document.querySelectorAll('.skr-tab')].forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.skr-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.skr-tabpanel').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); $('tab-'+b.dataset.tab)?.classList.add('active');
}));

// ---- DB
let act='all'; const grid=$('tzGrid'), q=$('tzSearch');
function renderDb(){
  const s=(q?.value||'').trim().toLowerCase();
  const rows=G.filter(x=>(act==='all'||String(x.act)===act)&&(!s||[x.ko,x.en,...x.areas].join(' ').toLowerCase().includes(s)));
  grid.innerHTML=rows.map(x=>`<article class="tz-card" id="tz-${x.id}"><div class="tz-act">ACT ${x.act}</div><h3>${esc(x.ko)}</h3><div class="tz-en">${esc(x.en)}</div><div class="tz-facts"><span><b>대표 Hell Lv</b>${x.anchorHellAreaLevel}</span><span><b>밀도</b>${esc(x.reference?.density||'—')}</span><span><b>엘리트팩</b>${esc(x.reference?.elitePacks||'—')}</span></div><div class="tz-areas">${x.areas.map(a=>`<span>${esc(a)}</span>`).join('')}</div>${x.reference?.immunities?.length?`<div class="tz-immunities"><b>면역 참고</b>${x.reference.immunities.map(i=>`<span>${esc(i)}</span>`).join('')}</div>`:''}</article>`).join('')||'<div class="verify-note">검색 결과 없음</div>';
}
document.querySelectorAll('.act-filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.act-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');act=b.dataset.act;renderDb()}));
q?.addEventListener('input',renderDb); renderDb();

// ---- curated farm tiers (v74.3)
// Current-patch guide consensus + Sanctuary KR practical clear-speed weighting.
// Do not derive S/A/B from opaque arithmetic: users should see stable, explainable tiers.
const FARM_TIERS={
 overall:{
  S:['a2-canyon','a4-chaos','a5-worldstone','a1-cathedral','a2-rocky','a1-black','a3-flayer','a1-pit','a3-kurast'],
  A:['a1-cow','a2-sewers','a2-dry','a2-lost','a3-trav','a4-river','a5-crystal','a5-glacial','a5-temple','a1-jail'],
  B:['a1-cold-plains','a1-stony','a1-dark','a2-palace','a3-spider','a3-marsh','a4-steppes','a5-foothills','a5-ancients','a5-tundra','a5-arreat'],
  C:['a1-burial','a2-oasis','a3-durance'], D:[]
 },
 xp:{
  S:['a2-canyon','a4-chaos','a5-worldstone','a1-cathedral','a3-flayer'],
  A:['a2-rocky','a1-black','a3-kurast','a5-temple','a1-cow','a4-river'],
  B:['a1-pit','a2-sewers','a2-dry','a2-lost','a3-trav','a5-crystal','a5-glacial','a1-jail'],
  C:['a1-cold-plains','a1-stony','a1-dark','a2-palace','a3-spider','a3-marsh','a4-steppes','a5-foothills','a5-ancients','a5-tundra','a5-arreat'],
  D:['a1-burial','a2-oasis','a3-durance']
 },
 unique:{
  S:['a4-chaos','a5-worldstone','a1-cathedral','a2-canyon','a3-trav'],
  A:['a1-pit','a2-rocky','a1-black','a2-lost','a3-kurast','a4-river','a5-temple'],
  B:['a1-cow','a2-sewers','a2-dry','a3-flayer','a5-crystal','a5-glacial','a1-jail'],
  C:['a1-cold-plains','a1-stony','a1-dark','a2-palace','a3-spider','a3-marsh','a4-steppes','a5-foothills','a5-ancients','a5-tundra','a5-arreat'],
  D:['a1-burial','a2-oasis','a3-durance']
 },
 base:{
  S:['a1-cow','a2-canyon','a4-chaos','a5-worldstone','a3-flayer','a1-pit'],
  A:['a2-rocky','a1-black','a3-kurast','a4-river','a2-sewers','a5-crystal'],
  B:['a1-cathedral','a2-dry','a2-lost','a3-trav','a5-glacial','a5-temple','a1-jail'],
  C:['a1-cold-plains','a1-stony','a1-dark','a2-palace','a3-spider','a3-marsh','a4-steppes','a5-foothills','a5-ancients','a5-tundra','a5-arreat'],
  D:['a1-burial','a2-oasis','a3-durance']
 },
 rune:{
  S:['a3-trav','a4-chaos','a1-cow','a2-canyon','a5-worldstone','a1-black'],
  A:['a3-flayer','a3-kurast','a1-pit','a2-rocky','a4-river'],
  B:['a1-cathedral','a2-sewers','a2-dry','a2-lost','a5-crystal','a5-temple'],
  C:['a1-cold-plains','a1-stony','a1-dark','a2-palace','a3-spider','a3-marsh','a4-steppes','a5-foothills','a5-glacial','a5-ancients','a5-tundra','a5-arreat','a1-jail'],
  D:['a1-burial','a2-oasis','a3-durance']
 }
};
const TIER_SCORE={S:96,A:84,B:72,C:60,D:45};
const FARM_REASON={
 'a2-canyon':'탈 라샤 무덤 다수 · 높은 몹 밀도 · XP 최상급',
 'a4-chaos':'고밀도 · 다수 정예팩 · 디아블로 · 동선 우수',
 'a5-worldstone':'높은 지역 가치 · 정예팩 · 바알/왕좌 연계',
 'a1-cathedral':'안다리엘 연계 · 정예/보스 동선 우수',
 'a2-rocky':'돌무덤 포함 · 밀도와 정예팩 효율 우수',
 'a1-black':'잊힌 탑/구렁 연계 · 룬과 정예 사냥 병행',
 'a3-flayer':'매우 높은 몹 밀도 · 광역 빌드 효율 우수',
 'a1-pit':'고레벨 베이스/유니크 사냥에 안정적',
 'a3-kurast':'다수 권역/사원 · 팩 수와 밀도 우수',
 'a3-trav':'의회원 집중 · 룬 파밍 특화',
 'a1-cow':'초고밀도 · 룬/베이스/보석 파밍 특화'
};
function tierFor(g,mode='overall'){
 const map=FARM_TIERS[mode]||FARM_TIERS.overall;
 for(const t of ['S','A','B','C','D']) if((map[t]||[]).includes(g.id)) return t==='D'?'C':t;
 return 'C';
}
function score100(g,mode='overall'){return TIER_SCORE[tierFor(g,mode)]||60}
function grade(score){return score>=90?'S':score>=80?'A':score>=68?'B':score>=55?'C':'D'}
function gradeClass(sc){return `grade-${grade(sc)}`}
let farmMode='overall';
function renderFarm(){
 const box=$('farmGrid');if(!box)return;
 const order=['S','A','B','C'];
 box.className='farm-tier-board';
 box.innerHTML=order.map(t=>{
  const rows=G.filter(g=>tierFor(g,farmMode)===t);
  if(!rows.length)return '';
  return `<section class="farm-tier-section tier-${t}"><div class="farm-tier-head"><span class="farm-grade grade-${t}">${t}</span><div><h3>${t} TIER</h3><p>${t==='S'?'최우선 추천 · 공역이 뜨면 적극적으로 도는 구간':t==='A'?'매우 좋은 효율 · 빌드가 맞으면 적극 추천':t==='B'?'준수한 효율 · 목적/빌드에 따라 추천':t==='C'?'선택적 파밍 · 동선/면역 확인 권장':'효율 낮음 · 특별한 목적이 아니면 스킵'}</p></div></div><div class="farm-tier-grid">${rows.map(g=>{const s=TIER_SCORE[t];return `<article class="tz-card farm-card"><div class="tz-act">ACT ${g.act}</div><h3>${esc(g.ko)}</h3><div class="farm-reason">${esc(FARM_REASON[g.id]||`${g.reference?.density||'밀도 정보'} · 엘리트 ${g.reference?.elitePacks||'—'}`)}</div><div class="tz-facts"><span><b>대표 Lv</b>${g.anchorHellAreaLevel}</span><span><b>밀도</b>${esc(g.reference?.density||'—')}</span><span><b>엘리트팩</b>${esc(g.reference?.elitePacks||'—')}</span></div><div class="tz-areas">${g.areas.slice(0,5).map(a=>`<span>${esc(a)}</span>`).join('')}</div></article>`}).join('')}</div></section>`;
 }).join('');
}
document.querySelectorAll('.farm-filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.farm-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');farmMode=b.dataset.farm;renderFarm()}));renderFarm();

// ---- matching helpers
function scoreGroup(text){const n=norm(text);if(!n)return null;let best=null,bestScore=0;for(const g of G){let s=0;const terms=[g.en,g.ko,...g.areas];for(const t of terms){const z=norm(t);if(!z)continue;if(n===z)s+=140;else if(n.includes(z))s+=36+Math.min(z.length,30);else if(z.includes(n)&&n.length>=5)s+=18}if(s>bestScore){best=g;bestScore=s}}return bestScore>=20?best:null}
function scoreGroupFromAreas(areas){if(!Array.isArray(areas))return null;return scoreGroup(areas.join(' '))}
const immuneClass={'냉기':'cold','화염':'fire','번개':'light','독':'poison','물리':'physical','마법':'magic'};
function cardFill(prefix,g,label){
  const card=$(prefix==='current'?'currentCard':'nextCard');
  if(!g){clearCard(prefix);return}
  card?.classList.remove('loading','unresolved');
  const sc=score100(g,'overall');
  $(prefix+'Grade').textContent=grade(sc); $(prefix+'Grade').className='tz-grade '+gradeClass(sc);
  $(prefix+'Act').textContent=`Act ${g.act}`; $(prefix+'Level').textContent=`TZ 일반 mlvl ${terrorMlvl('normal')} · 유니크 ${terrorMlvl('unique')}`; $(prefix+'Packs').textContent=`엘리트팩 ${g.reference?.elitePacks||'—'}`;
  $(prefix+'Areas').innerHTML=g.areas.map(a=>`<span>${esc(a)}</span>`).join('');
  const ims=g.reference?.immunities||[]; $(prefix+'Immune').innerHTML=ims.length?ims.map(i=>`<span class="immune ${immuneClass[i]||''}">${esc(i)}</span>`).join(''):'<span class="immune none">특이 면역 집계 없음</span>';
  $(prefix+'FarmScore').textContent=sc; $(prefix+'FarmBar').style.width=sc+'%'; $(prefix+'FarmNote').textContent=`${grade(sc)}등급 · ${g.reference?.density||'밀도 미확인'} · 엘리트 ${g.reference?.elitePacks||'—'}`; renderFeatured(prefix,g);
  $(prefix==='current'?'tzCurrentEn':'tzNextEn').textContent=g.en;
  const dbBtn=$(prefix+'DbBtn'); dbBtn.onclick=()=>{document.querySelector('[data-tab="db"]')?.click();setTimeout(()=>{const c=$('tz-'+g.id);c?.scrollIntoView({behavior:'smooth',block:'center'});c?.classList.add('search-hit');setTimeout(()=>c?.classList.remove('search-hit'),2200)},80)};
  const link=$(prefix+'DropBtn'); link.href=`drop-calculator.html?tz=${encodeURIComponent(g.id)}`;
}

function clearCard(prefix){
 const card=$(prefix==='current'?'currentCard':'nextCard');card?.classList.remove('loading');card?.classList.add('unresolved');
 for(const suffix of ['Grade','Act','Level','Packs','FarmScore','FarmNote'])if($(prefix+suffix))$(prefix+suffix).textContent='—';
 for(const suffix of ['Areas','Immune','Items'])if($(prefix+suffix))$(prefix+suffix).innerHTML='';
 if($(prefix+'FarmBar'))$(prefix+'FarmBar').style.width='0%';
 if($(prefix+'DbBtn'))$(prefix+'DbBtn').onclick=null;
 if($(prefix+'DropBtn'))$(prefix+'DropBtn').removeAttribute('href');
 $(prefix==='current'?'tzCurrentEn':'tzNextEn').textContent='';
}
function clearLive(message){
 liveCurrentGroup=null;liveNextGroup=null;serverRemain=null;validUntil=0;
 clearCard('current');clearCard('next');$('tzCurrent').textContent=message;$('tzNext').textContent='확인 불가';
 $('tzVerifyBadge').className='live-pill error';$('tzVerifyBadge').textContent='실시간 확인 불가';
 $('tzLastSync').textContent='오래된 값을 대신 표시하지 않음';$('tzSource').textContent='게임 내 /terrorized 확인';$('tzSourceDetail').textContent='';
}
// ---- countdown
let serverRemain=null,lastSync=0,validUntil=0;
function tick(){
 if(validUntil&&Date.now()>=validUntil)clearLive('교체 시각 경과 · 재확인 중');
 const sec=validUntil?Math.max(0,Math.floor((validUntil-Date.now())/1000)):null;
 if($('tzTimer'))$('tzTimer').textContent=sec===null?'시간 확인 불가':String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')+' 후 변경';
}

tick();setInterval(tick,1000);

// ---- live
const LIVE_ENDPOINTS=['/api/public/terror-zone'];
async function fetchLive(){let err;for(const url of LIVE_ENDPOINTS){try{const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();if(!d?.ok)throw new Error(d?.error||'upstream');if(d.schemaVersion!==2||!(Date.parse(d.validUntil)>Date.now())||!(Date.parse(d.currentStartsAt)<=Date.now()))throw Error('만료되었거나 검증할 수 없는 응답');return d}catch(e){err=e}}throw err||new Error('live unavailable')}
let liveCurrentGroup=null,liveNextGroup=null;
let lastCurrentId=localStorage.getItem('skr:lastTzId')||'';
function maybeNotify(g){if(!g||!('Notification' in window)||Notification.permission!=='granted')return;if(lastCurrentId&&lastCurrentId!==g.id)new Notification('Sanctuary KR · 공포의 영역 변경',{body:`${g.ko} (Act ${g.act})`,tag:'skr-tz-change'});lastCurrentId=g.id;localStorage.setItem('skr:lastTzId',g.id)}
async function live(){
 try{
  const d=await fetchLive();
  const cg=G.find(x=>x.id===d.currentGroupId)||scoreGroupFromAreas(d.currentAreas)||scoreGroup(d.current);
  const ng=G.find(x=>x.id===d.nextGroupId)||scoreGroupFromAreas(d.nextAreas)||scoreGroup(d.next);
  $('tzCurrent').textContent=cg?.ko||d.current||'현재 지역 확인 불가'; $('tzNext').textContent=ng?.ko||d.next||'다음 지역 예측 대기';
  liveCurrentGroup=cg;liveNextGroup=ng;cardFill('current',cg); cardFill('next',ng);validUntil=Date.parse(d.validUntil);
  $('currentAreas').textContent=(d.currentAreas||[]).join(' / ');$('nextAreas').textContent=(d.nextAreas||[]).join(' / ');
  serverRemain=Number.isFinite(+d.secondsRemaining)?+d.secondsRemaining:null;lastSync=Date.now();
  const badge=$('tzVerifyBadge');badge.className='live-pill '+(d.verified?'ok':'single');badge.textContent=d.verified?`● LIVE · ${d.agreement}소스 일치`:`● LIVE · 공개 트래커 ${d.transportCount||1}개 확인`;
  $('tzLastSync').textContent=`마지막 갱신 ${d.fetchedAtKst||''}`;
  $('tzSource').textContent=(d.source||'공개 트래커');
  $('tzSourceDetail').innerHTML=(d.sources||[]).slice(0,4).map(x=>`<span>${esc(x.source)} ${x.ok===false?'×':'✓'}</span>`).join('');
  if(window.self===window.top) maybeNotify(cg);
 }catch(e){
  clearLive('실시간 연결 실패');
 }
}
live();setInterval(live,60000);

// ---- top search
$('tzSearchTop')?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const g=scoreGroup(e.currentTarget.value);if(!g)return;document.querySelector('[data-tab="db"]')?.click();q.value=e.currentTarget.value;renderDb();setTimeout(()=>$('tz-'+g.id)?.scrollIntoView({behavior:'smooth',block:'center'}),80)});

$('tzCharLevel')?.addEventListener('input',()=>{if(liveCurrentGroup)cardFill('current',liveCurrentGroup);if(liveNextGroup)cardFill('next',liveNextGroup)});

// ---- notifications
$('tzNotifyBtn')?.addEventListener('click',async()=>{
 if(!('Notification'in window)){alert('이 브라우저는 알림을 지원하지 않습니다.');return}
 const p=await Notification.requestPermission();$('tzNotifyBtn').textContent=p==='granted'?'🔔 TZ 변경 알림 켜짐':'🔕 알림 권한 필요';
});
})();
