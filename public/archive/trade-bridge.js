import {connectTraderie,marketUrl,marketSearchPlan} from './traderie-connect.js?v=129';
import {esc} from './unified-core.js?v=129';
import {tradeDraft} from './trade-draft.js?v=129';
import {marketIdentity,searchProjection} from './market-identity.js?v=123';
import {searchStageLabels} from './market-search.js?v=129';
import {GAME_VERSIONS,TIERS,pricedSample} from './market-contract.js?v=123';
import {findRecentMarket} from './recent-market.js?v=129';

export function mountTradeBridge(api){
 const panel=document.createElement('section');panel.id='tradeBridge';panel.className='box';panel.hidden=true;
 document.getElementById('assessmentResult').after(panel);
 if(!document.getElementById('marketSearchStyle')){const css=document.createElement('link');css.id='marketSearchStyle';css.rel='stylesheet';css.href=new URL('./market-search.css?v=122',import.meta.url).href;document.head.append(css);}
 let draft=null,map=null,catalog=null,mappingError='',identityInfo=null,identity={},controller=null,sequence=0,busy=false;
 const market={platform:'',ladder:'',mode:'',region:'',gameVersion:''};
 const settings={start:'5',days:7,completed:false,autoWiden:true};
 const tierNames={Normal:'일반',Exceptional:'익셉셔널',Elite:'엘리트'};
 let searchState='원본과 거래 조건을 확인하면 검색할 수 있습니다.';
 const node=id=>panel.querySelector('#'+id);
 const select=(attribute,key,label,values,value,empty='선택하세요')=>'<label>'+label+'<select '+attribute+'="'+key+'"><option value="">'+empty+'</option>'+values.map(v=>{const [id,text]=Array.isArray(v)?v:[v,v];return '<option value="'+esc(id)+'" '+(String(value)===String(id)?'selected':'')+'>'+esc(text)+'</option>';}).join('')+'</select></label>';
 function cancel(){sequence++;controller?.abort();controller=null;busy=false;panel.removeAttribute('aria-busy');}
 function payload(){return {...draft,market:{...market},identity:{...identity}};}
 function connect(){if(draft&&map&&catalog)draft=connectTraderie(draft,map,catalog);}
 async function loadMapping(){
  mappingError='';
  try{
   const [m,c]=await Promise.all(['traderie-map.json?v=122','traderie-catalog.json?v=122'].map(async p=>{const r=await fetch(new URL(p,import.meta.url),{cache:'no-cache'});if(!r.ok)throw Error('상품 연결표 로드 실패');return r.json();}));
   if(!Array.isArray(m.items)||!m.properties||c.schema!==1||!c.byRecord)throw Error('상품 연결표 형식 오류');
   map=m;catalog=c;connect();
  }catch(e){mappingError=e.message;}
  update();
 }
 void loadMapping();
 function refresh(result){
  cancel();searchState='원본과 거래 조건을 확인하면 검색할 수 있습니다.';
  const data=api.getData();
  draft=tradeDraft({result,data,ledger:api.getLedger(),quality:document.getElementById('sourceQuality').value,baseCode:document.getElementById('evidenceBase').value});
  panel.hidden=!draft;if(!draft)return;
  draft=searchProjection(draft,data);
  identityInfo=marketIdentity(draft,data,document.getElementById('evidenceBase').value);identity={...identityInfo.identity};
  connect();
  panel.innerHTML='<h2>③ 트레더리 시세 확인</h2><p>같은 아이템·거래 환경의 매물을 비교합니다. 판매 등록 기능은 제공하지 않습니다.</p><h3>'+esc(draft.name||'베이스 선택 필요')+'</h3>'+
   '<div class="formrow">'+select('data-market','platform','플랫폼',['PC','PlayStation','Xbox','Nintendo Switch'],market.platform)+select('data-market','ladder','시즌 구분',[['Ladder','래더'],['Non-Ladder','스탠다드']],market.ladder)+
   select('data-market','mode','모드',[['Softcore','소프트코어'],['Hardcore','하드코어']],market.mode)+select('data-market','gameVersion','게임 버전',GAME_VERSIONS,market.gameVersion)+'</div>'+
   '<div class="formrow">'+select('data-identity','ethereal','무형 여부 (사진과 확인)',[['false','일반 · 무형 아님'],['true','무형']],identity.ethereal,'확인 필요')+
   (identityInfo.upgradable?select('data-identity','tier','현재 베이스 등급',TIERS.slice(Math.max(0,TIERS.indexOf(identityInfo.originalTier))).map(t=>[t,tierNames[t]]),identity.tier,'확인 필요'):'')+
   select('data-identity','sockets','소켓 수',[0,1,2,3,4,5,6].map(n=>[String(n),n+'개']),identity.sockets,'조건 지정 안 함')+
   select('data-market','region','거래 지역 (선택)',[['Asia','아시아'],['Americas','아메리카'],['Europe','유럽']],market.region,'전체 지역')+'</div>'+
   (identityInfo.upgradable?'<p id="marketIdentityNote"></p>':'')+
   '<fieldset class="market-search-settings"><legend>시세 검색 조건</legend><div class="formrow">'+
   select('data-search','start','옵션 범위',Object.entries(searchStageLabels),settings.start)+
   select('data-search','autoWiden','유효 가격 표본이 부족할 때',[['true','변동 옵션 범위만 자동 확장'],['false','선택 범위 유지']],String(settings.autoWiden))+
   select('data-search','days','최근 기간',[1,7,30].map(n=>[String(n),'최근 '+n+'일']),String(settings.days))+
   select('data-search','completed','가격 자료',[['false','판매 매물의 호가'],['true','완료 매물의 표시 가격']],String(settings.completed))+'</div>'+
   '<p>자동 확장은 정상 조회가 끝난 경우에만 ±5% → ±10% → DB 범위 안에서 진행합니다. 무형·업그레이드·버전·주요 옵션은 유지합니다. 같은 품목 참고는 직접 선택해야 합니다.</p>'+
   '<div id="marketRangePreview"></div></fieldset>'+
   '<div id="marketAppliedState" role="status"></div><div id="marketMappingState"></div><div id="marketCoverage"></div>'+
   '<label><input id="tradeReviewed" type="checkbox"> 사진의 아이템·수치와 위 거래 조건을 확인했습니다.</label>'+
   '<nav class="actions" aria-label="시세 확인"><a class="btn" id="directMarketLink" target="_blank" rel="noopener noreferrer" aria-disabled="true">트레더리에서 시세 보기 ↗</a><button type="button" data-trade="market" disabled>최근 매물 조회</button></nav>'+
   '<p class="market-manual-note" id="marketRemoteStateNote"></p><p class="market-manual-note">트레더리 링크의 실제 필터와 날짜를 열린 화면에서 확인하세요. 최근 기간은 아래 자동 조회 결과에만 적용됩니다. 호가·완료 표시만으로 최종 실거래가가 확정되지는 않습니다.</p>'+
   '<p id="tradeNotice" role="status"></p><div id="marketSearchResults" aria-live="polite"></div>';
  update();
 }
 function getLink(){
  if(![1,7,30].includes(settings.days)||!Object.hasOwn(searchStageLabels,settings.start))throw Error('검색 범위와 최근 기간을 선택하세요.');
  if(!draft?.englishName)throw Error('정확한 아이템 이름을 먼저 확인하세요.');
  if(identity.ethereal===null)throw Error('무형 여부를 사진과 확인해 선택하세요.');
  if(identityInfo.upgradable&&!identity.tier)throw Error('업그레이드 아이템의 현재 베이스 등급을 선택하세요.');
  return marketUrl(payload(),{stage:settings.start,recent:settings.completed});
 }
 function update(){
  if(!draft||panel.hidden||!node('directMarketLink'))return;
  connect();
  const mapping=node('marketMappingState');mapping.replaceChildren();
  if(mappingError){mapping.textContent=mappingError+' ';const retry=document.createElement('button');retry.type='button';retry.dataset.reloadMapping='true';retry.textContent='연결표 다시 불러오기';mapping.append(retry);}
  else mapping.textContent=!map||!catalog?'상품 연결표를 불러오는 중입니다.':draft.traderieItem?'연결 상품: '+draft.traderieItem.name:'이 품목의 정확한 상품 연결을 확인하지 못했습니다. 다른 상품으로 대신 검색하지 않습니다.';
  let link=null,problem='';try{link=getLink();}catch(e){problem=e.message;}
  const reviewed=!!node('tradeReviewed')?.checked,ready=!!link&&reviewed&&!mappingError;
  const anchor=node('directMarketLink');anchor.setAttribute('aria-disabled',String(!ready));anchor.tabIndex=ready?0:-1;
  if(ready)anchor.href=link.url;else anchor.removeAttribute('href');
  panel.querySelector('[data-trade=market]').disabled=!ready||busy;
  node('marketAppliedState').textContent=searchState;
  if(!busy)node('tradeNotice').textContent=problem||(!reviewed?'사진과 거래 조건을 확인한 뒤 체크하세요.':'직접 검색 또는 최근 매물 조회를 선택하세요.');
  const coverage=node('marketCoverage');coverage.textContent=(link?.unapplied.length?'검색에 적용하지 못한 옵션 '+link.unapplied.length+'개: '+link.unapplied.map(r=>r.name).join(', ')+'. 이 항목까지 일치한다고 판단하지 않습니다. ':'')+(draft.unresolvedLines?.length?'해석 확인 원문 '+draft.unresolvedLines.length+'줄이 있어 연결된 옵션만 검색에 사용합니다.':'');
  node('marketRemoteStateNote').textContent=link?.remoteStateNotes.length?'매물 누락을 막기 위해 ‘아님’ 상태는 링크에서 강제 제외하지 않습니다. '+link.remoteStateNotes.join(' · ')+'은 열린 매물에서 대조하세요. 자동 조회 결과는 선택 상태를 계속 비교합니다.':'';
  if(node('marketIdentityNote'))node('marketIdentityNote').textContent='인식된 베이스: '+(identityInfo.baseName||'미확인')+' / 검색 등급: '+(tierNames[identity.tier]||'확인 필요')+(identity.upgraded?' · 업그레이드':'')+'. 사진과 다르면 위 검색 등급만 조정하세요. OCR 원본은 유지됩니다.';
  if(link){
   node('marketRangePreview').innerHTML='<details><summary>원본 옵션과 적용 범위 확인</summary><div class="market-table-wrap"><table><thead><tr><th>옵션</th><th>원본</th><th>검색 조건</th></tr></thead><tbody>'+link.constraints.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.original??'미확인')+'</td><td>'+esc(r.min!=null?r.min+' ~ '+r.max:({fixed:'고유 옵션 · 수치 필터 제외',unread:'미인식 · 비교 불가',unmapped:'연결 미확인 · 비교 불가','out-of-range':'DB 범위 밖 · 직접 확인',conflict:'판독 충돌 · 직접 확인',reference:'수치 제한 없음'}[r.state]||'직접 확인'))+'</td></tr>').join('')+'</tbody></table></div></details>';
  }else node('marketRangePreview').textContent=problem;
 }
 panel.addEventListener('change',e=>{
  if(!e.target.matches('[data-market],[data-search],[data-identity],#tradeReviewed'))return;
  cancel();node('marketSearchResults').replaceChildren();
  if(e.target.dataset.market)market[e.target.dataset.market]=e.target.value;
  if(e.target.dataset.search){const key=e.target.dataset.search;settings[key]=key==='days'?Number(e.target.value):['autoWiden','completed'].includes(key)?e.target.value==='true':e.target.value;}
  if(e.target.dataset.identity){const key=e.target.dataset.identity,value=e.target.value;
   identity[key]=value===''?null:key==='ethereal'?value==='true':key==='sockets'?Number(value):value;
   if(key==='tier')identity.upgraded=value?TIERS.indexOf(value)>TIERS.indexOf(identityInfo.originalTier):null;
  }
  if(e.target.id!=='tradeReviewed')node('tradeReviewed').checked=false;
  searchState='조건이 변경됐습니다. 원본 대조 후 다시 검색하세요.';update();
 });
 panel.addEventListener('click',async e=>{
  if(e.target.closest('[data-reload-mapping]')){await loadMapping();return;}
  if(e.target.closest('#directMarketLink')){
   if(node('directMarketLink').getAttribute('aria-disabled')==='true'){e.preventDefault();return;}
   searchState='트레더리 직접 검색 · 적용된 필터와 매물 날짜를 확인하세요.';node('marketAppliedState').textContent=searchState;return;
  }
  if(!e.target.closest('[data-trade=market]')||busy)return;
  if(!node('tradeReviewed').checked)return;
  let snapshot,searchSettings;try{getLink();snapshot=structuredClone(payload());searchSettings={...settings};}catch(error){node('tradeNotice').textContent=error.message;return;}
  cancel();const run=sequence;controller=new AbortController();busy=true;panel.setAttribute('aria-busy','true');update();
  searchState='최근 매물 조회 중 · 원본 수치는 바뀌지 않습니다.';node('marketAppliedState').textContent=searchState;node('marketSearchResults').replaceChildren();
  try{
   const result=await findRecentMarket(snapshot,searchSettings,{signal:controller.signal,onProgress:p=>{if(run===sequence)node('tradeNotice').textContent='최근 매물 확인 중 · '+p.page+'/4페이지';}});
   if(run!==sequence)return;
   const partialOptions=!!snapshot.unresolvedLines?.length;
   const scopedResult={...result,partialOptions,evidenceSufficient:result.evidenceSufficient&&!partialOptions};
   searchState=(scopedResult.partial?'부분 조회 · 선택 범위 유지':'조회 완료')+' / '+searchStageLabels[scopedResult.stage]+(scopedResult.referenceOnly?' · 동일 옵션 시세 아님':'')+(scopedResult.evidenceSufficient?'':' · 가격 근거 부족');
   renderRecent(scopedResult,snapshot,searchSettings);
  }catch(error){
   if(run!==sequence||error.name==='AbortError')return;
   searchState='조회 실패 · 선택 범위 유지 · 최근 매물이 없다는 뜻이 아닙니다.';
   node('marketSearchResults').textContent=error.message+' 자동 조회로 확인한 가격은 없습니다. 위의 트레더리에서 시세 보기를 이용하세요. 다른 품목이나 넓은 범위로 바꾸지 않았습니다.';
  }finally{if(run===sequence){busy=false;controller=null;panel.removeAttribute('aria-busy');update();}}
 });
 function renderRecent(result,snapshot,searchSettings){
  const host=node('marketSearchResults'),sample=result.samples,dateLabel=searchSettings.completed?'완료일':'등록일';
  host.innerHTML='<h3>최근 '+result.days+'일 · '+(searchSettings.completed?'완료 매물의 표시 가격':'판매 호가')+'</h3><p>조건을 확인한 매물 '+result.listings.length+'개 · 수량 1개 기준 가격 '+sample.priced+'개 · 확인 가능한 판매자 '+sample.independent+'명</p>'+
   (result.partialOptions?'<p class="notice">해석 확인 원문 '+snapshot.unresolvedLines.length+'줄이 남아 있습니다. 연결된 옵션만 비교했으며, 아이템 옵션 전체가 일치하거나 가격 근거가 충분하다고 판단하지 않습니다.</p>':'')+
   '<p>다른 환경 '+result.excluded.environment+'개 · 상태 확인 불가 '+result.excluded.unverified+'개 · 오래된 매물 '+result.excluded.old+'개 · 날짜 확인 불가 '+result.excluded.undated+'개 제외</p>'+
   (result.partial?'<p class="notice">조회가 끝까지 완료되지 않았습니다 ('+esc(result.stopReason)+'). 이 자료로 매물 부족이나 전체 시세를 판단하지 않습니다.</p>':'')+
   (result.error?'<p>'+esc(result.error)+'</p>':'')+
   '<p>'+result.attempts.map(a=>esc(searchStageLabels[a.stage])+': 매물 '+a.count+'개 / 가격 '+a.priced+'개').join(' → ')+'</p>'+
   (sample.unknownSellers?'<p>판매자 구분이 확인되지 않는 가격 '+sample.unknownSellers+'개는 독립 표본 수에 포함하지 않았습니다.</p>':'')+
   (searchSettings.completed?'<p>완료 매물에 표시된 가격입니다. 최종 합의·결제 가격이 확인됐다는 뜻은 아닙니다.</p>':'')+
   (!result.listings.length?'<p>조회한 자료에서 조건을 확인할 수 있는 매물을 찾지 못했습니다. 트레더리 전체에 매물이 없다는 뜻은 아닙니다.</p>':'<div class="market-table-wrap"><table><thead><tr><th>'+dateLabel+'</th><th>비교 조건</th><th>표시 가격·수량</th></tr></thead><tbody>'+result.listings.slice(0,20).map(l=>'<tr><td><a href="'+esc(l.url||'https://traderie.com/diablo2resurrected/listing/'+encodeURIComponent(l.id))+'" target="_blank" rel="noopener noreferrer">'+esc(new Date(l.timestamp).toLocaleString('ko-KR'))+'</a></td><td>'+esc(result.referenceOnly?'품목 참고 · 동일 옵션 아님':result.partialOptions?'연결된 옵션만 비교 · 전체 확인 전':result.stage==='exact'?'확인한 옵션 일치':'확인한 옵션 범위 일치')+'<br>'+esc(l.market.gameVersion)+'<br>'+l.comparison.differences.map(d=>esc(d.name)+': '+esc(d.original)+' → '+esc(d.actual)).join('<br>')+(l.comparison.missing.length?'<br>미확인: '+l.comparison.missing.map(esc).join(', '):'')+'</td><td>'+esc(l.priceText)+'<br>판매 수량: '+esc(l.quantity??'미확인')+(l.stock?' · 재고 매물':'')+'<br>'+esc(pricedSample(l)?'1개 매물의 표시 가격':'단가/묶음 기준 확인 필요 · 가격 표본 제외')+'</td></tr>').join('')+'</tbody></table></div>')+
   (result.listings.length>20?'<p>상위 20개를 표시합니다. 나머지 매물은 아래 검색 링크에서 확인하세요.</p>':'')+
   '<nav class="market-search-links" aria-label="다른 범위로 직접 확인">'+marketSearchPlan(snapshot,{start:searchSettings.start,recent:searchSettings.completed}).map(p=>'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.stage==='item'?'같은 품목 참고 · 동일 시세 아님':p.label)+'</a>').join('')+'</nav>';
 }
 document.addEventListener('input',e=>{if(panel.contains(e.target))return;if(e.target.closest('.evidence-panel,#restoredAssessment')){cancel();draft=null;panel.hidden=true;}});
 return {refresh};
}
