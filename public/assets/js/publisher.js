/* UI presentation only: no OCR, appraisal, search, market or storage state writes. */
(()=>{
 'use strict';
 const html=document.documentElement;
 const $=(s,host=document)=>host.querySelector(s);
 const all=(s,host=document)=>[...host.querySelectorAll(s)];
 const page=html.dataset.publisherPage;
 const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
 function element(tag,className,content){const node=document.createElement(tag);if(className)node.className=className;if(content)node.textContent=content;return node;}
 function disclose(nodes,label,className){
  nodes=nodes.filter(Boolean);if(!nodes.length)return null;
  const details=element('details','publisher-disclosure '+(className||''));
  details.append(element('summary','',label));nodes[0].before(details);nodes.forEach(node=>details.append(node));return details;
 }
 function revealParents(node){for(let p=node?.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}
 function start(){
  if(html.classList.contains('tz-compact'))return;
  const main=$('main')||$('.main');
  if(main){if(!main.id)main.id='publisher-main';main.tabIndex=-1;const skip=element('a','publisher-skip','본문으로 바로 가기');skip.href='#'+main.id;document.body.prepend(skip);}
  const nav=$('.primary-navigation');
  if(nav){nav.setAttribute('aria-label','원하는 작업 선택');if(html.hasAttribute('data-unified')){nav.setAttribute('role','tablist');all('button[data-view]',nav).forEach(b=>{b.setAttribute('role','tab');b.setAttribute('aria-controls','content');});
   nav.addEventListener('keydown',e=>{const tabs=all('button[data-view]',nav);const i=tabs.indexOf(document.activeElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length].focus();});
  }else{const current=all('a',nav).find(a=>new URL(a.href).pathname===location.pathname);current?.setAttribute('aria-current','page');}}
  if(page==='library')library();
  if(html.hasAttribute('data-unified')){
   const h1=$('.intro h1');text(h1,'아이템을 찾고, 다음 행동을 선택하세요');
   text($('.hero-description'),'아이템 이름이나 별명을 입력하세요. 감정 기준·드랍 장소·장비 비교로 이어집니다.');
   const content=$('#content');if(content){content.setAttribute('role','tabpanel');content.setAttribute('aria-label','선택한 작업');}
  }
  document.addEventListener('click',e=>{
   if(e.target.closest('#openManualOptions'))revealParents($('#sourceOptionSearch'));
   if(e.target.closest('#openSourceCheck'))revealParents($('#checkSource'));
   if(e.target.closest('#runAppraisal'))requestAnimationFrame(()=>{const result=$('#assessmentResult');if(result?.textContent.trim()){result.scrollIntoView({block:'start',behavior:'instant'});result.focus({preventScroll:true});}});
  },true);
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  if(nav)new MutationObserver(schedule).observe(nav,{attributes:true,subtree:true,attributeFilter:['aria-selected']});
  document.addEventListener('change',e=>{if(e.target.matches('[data-search],#farmDifficulty,#farmPlayers,#farmMf'))schedule();});
  refresh();
 }
 function refresh(){
  if(html.hasAttribute('data-unified'))unified();
  if(page==='image-appraisal')photo();
  accessibility();
 }
 function unified(){
  const selected=$('.primary-navigation [aria-selected=true]');
  const view=selected?.dataset.view||'detail';
  if(html.dataset.publisherView!==view)html.dataset.publisherView=view;
  all('.primary-navigation button[data-view]').forEach(b=>b.tabIndex=b===selected?0:-1);
  const host=$('#content>.box');if(!host)return;
  const hints={farm:'① 사냥 지역과 목표 아이템을 선택하세요. ② 필요하면 사냥 조건을 바꾸세요. ③ 아래 버튼으로 계산하세요.',gear:'① 현재 장비를 고르세요. ② ‘현재 장비를 변경 후에 복사’를 누르세요. ③ 바꿀 장비만 선택하면 아래에서 차이를 볼 수 있습니다.',collection:'보유 아이템과 목표를 관리하는 곳입니다. 아이템을 추가하려면 상단 ‘아이템 검색’에서 먼저 찾아보세요.'};
  if(hints[view]&&!$('.publisher-task-hint',host)){
   const hint=element('p','publisher-task-hint',hints[view]);const intro=$(':scope>h2',host);(intro?.nextElementSibling||intro||host.firstChild)?.after(hint);
  }
  if(view==='farm'){
   const conditions=$('#farmDifficulty')?.closest('.formrow');
   if(conditions&&!conditions.closest('details'))disclose([conditions],'사냥 조건 변경 · 난이도, 매찬, 인원','publisher-farm-settings');
   text($('.publisher-farm-settings>summary'),'사냥 조건 변경 · '+($('#farmDifficulty')?.selectedOptions[0]?.textContent||'')+' / '+($('#farmPlayers')?.value||'1')+'인 / 매찬 '+($('#farmMf')?.value||'0')+'%');
  }
 }
 function photo(){
  // Wait for the existing OCR UI to finish moving its controls. Never clone inputs.
  if(!window.SKR_APPRAISAL_UI||!$('#restoredAssessment'))return;
  const drop=$('#drop'),left=drop?.closest('section'),lab=drop?.closest('.lab');
  if($('#evidenceStatus')?.textContent==='이미지를 불러온 뒤 OCR을 실행하세요.')text($('#evidenceStatus'),'왼쪽에서 사진을 선택하고 ‘사진 읽기’를 눌러주세요.');
  if(left&&!left.dataset.publisherReady){
   left.dataset.publisherReady='true';
   text($(':scope>h3',left),'1. 사진을 올려주세요');
   text($('#pick'),'사진 선택');text($('#scan'),'사진 읽기');text($('#clear'),'사진 지우기');
   const pickRow=element('div','publisher-photo-actions');
   drop.before(pickRow);pickRow.append($('#pick'),$('#scan'),element('small','','사진을 끌어 놓거나 Ctrl+V로 붙여넣어도 됩니다.'));
   const toolbar=$('.toolbar',left);
   if(toolbar)disclose([toolbar,$('#refineOCR'),$('#clear')],'사진 확대·인식 영역 조정','publisher-image-tools');
   const raw=$('#raw'),chips=$('#chips'),audit=$('#audit')?.closest('.audit');
   disclose([chips,raw,audit],'글자가 잘못 읽혔나요? · 판독 내용 보기','publisher-ocr-details');
   const h=lab?.previousElementSibling;
   if(h&&$('h1',h)){
    text($('h1',h),'사진으로 아이템 감정');
    text($('p',h),'사진을 올리고 읽기 버튼을 누르세요. 인식된 옵션을 확인한 뒤 감정할 수 있습니다.');
    const steps=element('ol','publisher-steps');steps.setAttribute('aria-label','사진 감정 이용 순서');
    ['사진 올리기','옵션 확인','결과·시세 확인'].forEach(s=>steps.append(element('li','',s)));h.append(steps);
   }
   const labels={minus:'사진 축소',plus:'사진 확대',fit:'사진을 화면에 맞추기',select:'글자 인식 영역 선택',resetCrop:'인식 영역 초기화'};
   for(const [id,label]of Object.entries(labels))$('#'+id)?.setAttribute('aria-label',label);
   $('#ocrStatus')?.setAttribute('role','status');
  }
  const panel=$('.evidence-panel');
  if(panel&&!panel.dataset.publisherReady){
   panel.dataset.publisherReady='true';text($(':scope>h2',panel),'2. 읽어 온 옵션을 확인하세요');
   text($(':scope>p',panel),'사진과 종류·수치를 대조하세요. 틀린 수치는 직접 고칠 수 있습니다.');
   text($('#runAppraisal'),'감정 결과 보기');text($('#openManualOptions'),'빠진 옵션 추가·수정');
   const sourceSearch=$('#sourceOptionSearch')?.closest('details');
   if(sourceSearch)text($('summary',sourceSearch),'옵션 이름으로 찾아 추가하기');
   const nodes=[$('#missingRaw')?.closest('.formrow'),sourceSearch,$('.ocr-raw-details'),$('.ocr-source-details')].filter(Boolean);
   const more=disclose(nodes,'인식이 잘못됐거나 옵션이 빠졌나요?','publisher-corrections');
   if(more){const helper=element('p','','대부분은 위 옵션의 숫자만 고치면 됩니다. 빠진 옵션이나 자세한 판독 내용이 필요할 때 아래 도구를 이용하세요.');$('summary',more).after(helper);}
  }
  const bridge=$('#tradeBridge');
  const result=$('#assessmentResult');
  if(result&&bridge&&lab){
   let layout=$('.publisher-result-layout');
   if(!layout){layout=element('section','publisher-result-layout');layout.setAttribute('aria-label','감정 결과와 시세 확인');lab.after(layout);layout.append(result,bridge);result.classList.add('box');result.tabIndex=-1;result.setAttribute('aria-label','아이템 감정 결과');}
   layout.hidden=!result.textContent.trim()&&bridge.hidden;
  }
  if(bridge){
   const preview=$('#tradePreview');if(preview&&!preview.closest('.publisher-sale-copy'))disclose([preview],'판매용 옵션 요약 보기','publisher-sale-copy');
   const settings=$('.market-search-settings');
   if(settings&&!settings.closest('.publisher-market-settings')){
    const d=disclose([settings],'시세 검색 조건 변경','publisher-market-settings');
    const state=$('#marketAppliedState');if(state&&d)d.after(state); // Keep real search status visible.
   }
   const summary=$('.publisher-market-settings>summary');
   const choice=key=>$('[data-search="'+key+'"]')?.selectedOptions?.[0]?.textContent||'';
   text(summary,'시세 검색 조건 변경 · '+[choice('start'),choice('days')].filter(Boolean).join(' / '));
   all('#marketRangePreview details').forEach(d=>{if(!d.dataset.publisherReady){d.dataset.publisherReady='true';d.open=false;}});
   const heading=$(':scope>h2',bridge);text(heading,'3. 트레더리 시세 확인');
   text($('[data-trade=market]',bridge),'최근 매물 조회');
  }
 }
 function library(){
  const hero=$('.hero'),hub=$('.resource-hub');if(!hub)return;
  text($('.hero h1'),'무엇을 도와드릴까요?');
  text($('.hero-card>p'),'사진 감정, 아이템 검색, 사냥터 찾기부터 시작하세요. 나머지 도구는 아래에서 용도별로 찾을 수 있습니다.');
  const search=$('#globalSearch');if(search){search.setAttribute('aria-label','아이템 또는 필요한 기능 검색');search.placeholder='아이템이나 궁금한 내용을 입력하세요. 예: 샤코, 룬워드, 라주크';}
  const start=element('section','publisher-start');start.setAttribute('aria-labelledby','publisher-start-title');
  const heading=element('h2','','자주 쓰는 기능부터 시작하세요');heading.id='publisher-start-title';start.append(heading);
  const grid=element('div','publisher-start-grid');
  for(const [title,desc,action,url]of [
   ['사진으로 감정하기','아이템 사진을 올려 옵션과 감정 결과를 확인합니다.','사진 올리러 가기 →','image-appraisal.html'],
   ['아이템 이름으로 찾기','이름이나 별명으로 능력치와 관련 정보를 찾습니다.','아이템 검색하기 →','unified.html?view=detail'],
   ['사냥터 찾기','원하는 아이템이 어디서 나오는지 확인합니다.','파밍·드랍 확인하기 →','unified.html?view=farm']
  ]){const a=element('a');a.href=url;a.append(element('strong','',title),element('span','',desc),element('b','',action));grid.append(a);}
  start.append(grid);(hero||hub).after(start);
  const categories=element('nav','publisher-category-nav');categories.setAttribute('aria-label','자료실 용도별 바로가기');
  all('.resource-group',hub).forEach((group,i)=>{const title=$('.group-head h3',group)?.textContent;if(!title)return;if(!group.id)group.id='publisher-resource-'+i;const a=element('a','',title);a.href='#'+group.id;categories.append(a);});
  hub.prepend(categories);
 }
 function accessibility(){
  // Give existing unlabeled controls a meaningful name without changing their values.
  all('input:not([type=hidden]),select,textarea').forEach(control=>{
   if(control.hasAttribute('aria-label')||control.hasAttribute('aria-labelledby')||control.labels?.length||control.type==='button'||control.type==='submit')return;
   const preceding=control.previousElementSibling;
   const nearby=preceding?.tagName==='LABEL'?preceding:control.closest('.field')?.querySelector('label');
   if(nearby&&control.id&&!nearby.htmlFor&&!nearby.contains(control)){nearby.htmlFor=control.id;return;}
   const names={baseSelect:'베이스 아이템 선택',quality:'아이템 종류',ilvl:'아이템 레벨',cat:'아이템 분류',grade:'베이스 등급',pick:'아이템 선택',cubecat:'조합법 분류',globalType:'검색 자료 종류',itemSelect:'목표 아이템',terror:'공포의 영역 적용',clvl:'캐릭터 레벨',rws:'소켓 개수',setFilter:'세트 선택',difficulty:'난이도',tzCharLevel:'캐릭터 레벨',in_itemtype:'아이템 부위',in_mode:'사용 용도',in_realm:'래더 또는 스탠다드',in_proc_trigger:'발동 조건'};
   let label=names[control.id]||control.getAttribute('placeholder')||control.getAttribute('title');
   const cell=control.closest('td');if(!label&&cell){const row=cell.parentElement,table=cell.closest('table');label=[row.cells[0]?.textContent,table?.tHead?.rows[0]?.cells[cell.cellIndex]?.textContent].filter(Boolean).join(' · ');}
   if(!label&&control.id==='file')label='아이템 사진 파일';
   if(label)control.setAttribute('aria-label',label.trim().slice(0,150));
  });
  all('table').forEach(table=>{
   if(table.closest('.publisher-table-scroll,.tablewrap,.table-wrap,.market-table-wrap,details')||table.offsetParent===null)return;
   if(!table.closest('main,.main'))return;
   const wrap=element('div','publisher-table-scroll');table.before(wrap);wrap.append(table);
  });
  all('.publisher-table-scroll,.tablewrap,.table-wrap,.market-table-wrap').forEach(wrap=>{
   if(wrap.scrollWidth>wrap.clientWidth+2){wrap.tabIndex=0;wrap.setAttribute('role','region');if(!wrap.hasAttribute('aria-label'))wrap.setAttribute('aria-label','표 내용 · 좌우로 스크롤할 수 있습니다');}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
