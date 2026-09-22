/* Additive presentation layer. Read existing results, never run or replace engines. */
import {DISCORD,archiveLink,resultLinks,reportText} from './journey-model.js?v=126';
const $=(s,host=document)=>host.querySelector(s);
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const link=(label,url,newTab=false)=>{const a=make('a','',label+(newTab?' ↗':''));a.href=url;if(newTab){a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',label+' (새 탭)');}return a;};
const css=make('link');css.rel='stylesheet';css.href=new URL('./journey.css?v=126',import.meta.url);document.head.append(css);
function goTo(node){
 if(!node)return;
 for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
 node.scrollIntoView({block:'center',behavior:'instant'});node.focus({preventScroll:true});
}
function support(){
 if($('.skr-support'))return;
 const host=$('footer,.footer')||$('main');if(!host)return;
 const bar=make('div','skr-support');bar.setAttribute('aria-label','도움과 데이터 관리');
 const report=make('button','','오류·의견 제보');report.type='button';report.onclick=()=>openReport(report);
 bar.append(report,link('보관함·백업',archiveLink('unified.html',{view:'collection'})),link('전체 도구',archiveLink('library.html')));
 host.append(bar);
}
function addDetailHint(){
 const host=$('#content');if(!host)return;
 const actions=$('[data-action="store"]',host)?.closest('.actions');
 if(actions&&!$('[data-action="export"]',actions)&&!actions.previousElementSibling?.classList.contains('skr-next-hint')){
  actions.before(make('p','skr-next-hint','다음으로 · 얻을 곳을 찾거나, 내 장비와 비교하거나, 보관함에 기록하세요.'));
 }
 if($('[data-action="export"]',host)&&!$('.skr-backup-help',host)){
  const controls=$('[data-action="export"]',host).closest('.actions');
  const note=make('div','skr-backup-help');
  note.append(make('strong','','이 브라우저에 보관됩니다. 자동 백업은 아닙니다.'),
   make('p','','브라우저 데이터 삭제·기기 변경 전에 ‘백업 내려받기’로 파일을 보관하세요. 다른 기기에서는 ‘백업 가져오기’를 누르면 됩니다.'));
  const details=make('details');details.append(make('summary','','백업에 포함되는 내용 확인'));
  details.append(make('p','','보관 아이템·수량·위치·메모와 파밍 목표가 포함됩니다. 장비 비교 세팅과 사진 감정 기록은 이 파일에 포함되지 않습니다. 가져오기는 기존 보관함에 병합되며, 같은 기록 ID가 이미 있으면 기존 내용을 유지합니다.'));
  note.append(details);controls.before(note);
  const chosen=new URL(location.href).searchParams.get('id');
  if(!chosen){const hint=make('p','skr-collection-start','아이템을 추가하려면 ');hint.append(link('아이템 검색에서 먼저 선택하세요 →',archiveLink('unified.html',{view:'detail'})));controls.after(hint);}
 }
}
let previousResult=null,previousHost=null;
function nextSteps(){
 const resultHost=$('#assessmentResult'),result=window.SKR_APPRAISAL_UI?.getResult();
 if(!resultHost||!result){$('.skr-result-next')?.remove();previousResult=null;previousHost=null;return;}
 const bridge=$('#tradeBridge');
 if(result===previousResult&&resultHost===previousHost&&$('.skr-result-next',resultHost)){
  const button=$('[data-skr-market]',resultHost);if(button)button.hidden=!bridge||bridge.hidden;
  return;
 }
 previousResult=result;previousHost=resultHost;
 $('.skr-result-next',resultHost)?.remove();
 const quality=$('#sourceQuality')?.value,data=window.SKR_OCR_EVIDENCE?.getData();
 if(!data||quality==='unknown')return;
 const record=data.records.find(r=>r.id===result.id),base=data.records.find(r=>r.id==='base:'+$('#evidenceBase')?.value);
 const section=make('section','skr-result-next');section.setAttribute('aria-label','감정 결과 다음 행동');
 section.append(make('h3','','이 결과로 무엇을 할까요?'));
 const actions=make('div','skr-next-actions');
 const market=make('button','primary','시세 확인으로 이동');market.type='button';market.dataset.skrMarket='';market.hidden=!bridge||bridge.hidden;
 market.onclick=()=>{const current=$('#tradeBridge');if(current&&!current.hidden)goTo($('[data-market]',current));};
 actions.append(market);
 for(const item of resultLinks({quality,record,base,slot:$('#slot')?.value||''}))actions.append(link(item.label,item.url,true));
 section.append(actions,make('p','','감정은 기준 비교, 시세는 별도 확인입니다. 가이드는 새 탭으로 열리며 이 화면의 사진과 입력값은 그대로 남습니다.'));
 const report=make('button','skr-inline-report','인식·결과가 이상한가요? 제보 내용 작성');report.type='button';report.onclick=()=>openReport(report,'인식·감정 결과');section.append(report);resultHost.append(section);
}
let dialog,returnTo;
function buildDialog(){
 dialog=make('dialog','skr-report');dialog.setAttribute('aria-labelledby','skr-report-title');dialog.setAttribute('aria-describedby','skr-report-description');
 const form=make('form');form.method='dialog';
 const header=make('div','skr-report-head');header.append(make('h2','','오류·의견 제보'));$('h2',header).id='skr-report-title';
 const close=make('button','','닫기');close.type='button';close.setAttribute('aria-label','제보 창 닫기');close.onclick=()=>dialog.close();header.append(close);
 const intro=make('p','','어떤 화면에서 무엇이 달랐는지 알려주세요. 내용을 확인·복사한 뒤 디스코드로 전달할 수 있습니다.');intro.id='skr-report-description';
 form.append(header,intro);
 function field(id,title,tag,placeholder){
  const wrap=make('label','',title),input=make(tag);input.id=id;input.name=id;
  if(placeholder)input.placeholder=placeholder;
  if(tag==='textarea'){input.rows=2;input.maxLength=2000;}
  wrap.htmlFor=id;wrap.append(input);form.append(wrap);return input;
 }
 const kind=field('skr-report-kind','어떤 내용인가요?','select');
 for(const title of ['화면·이용 방법','인식·감정 결과','시세 확인','자료·빌드 정보','보관함·백업','기타 의견'])kind.add(new Option(title,title));
 field('skr-report-steps','1. 어떤 순서로 사용했나요?','textarea','예: 아이템을 검색하고 드랍 장소 찾기를 눌렀습니다.');
 field('skr-report-expected','2. 어떤 결과를 기대했나요?','textarea','예: 선택한 아이템의 사냥터가 보이면 좋겠습니다.');
 field('skr-report-actual','3. 실제로 무엇이 보였나요?','textarea','오류 문구나 불편했던 점을 적어 주세요.');
 const details=make('details','skr-report-preview');details.append(make('summary','','전달할 내용 확인 · 주소 포함'));
 const preview=make('textarea');preview.id='skr-report-preview';preview.readOnly=true;preview.rows=9;preview.setAttribute('aria-label','복사할 제보 내용');details.append(preview);form.append(details);
 form.append(make('p','skr-report-privacy','사진·계정·보관함·감정 옵션은 자동 첨부하거나 전송하지 않습니다. 메모와 스크린샷에 개인정보가 없는지 확인해 주세요.'));
 const status=make('p','skr-report-status');status.id='skr-report-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const actions=make('div','skr-report-actions'),copy=make('button','primary','1. 제보 내용 복사');copy.type='button';copy.onclick=async()=>{
  const text=updateReport();
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(text);status.textContent='복사했습니다. 디스코드에 붙여넣어 전달해 주세요. 아직 접수된 것은 아닙니다.';
  }catch{
   details.open=true;goTo(preview);preview.select();status.textContent='자동 복사가 제한되어 내용을 선택했습니다. Ctrl+C 또는 길게 눌러 복사해 주세요.';
  }
 };
 const discord=link('2. 디스코드 열기',DISCORD,true);actions.append(copy,discord);form.append(actions,status);
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',updateReport);
 dialog.append(form);document.body.append(dialog);
 dialog.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button,select,textarea,a[href],summary')].filter(n=>!n.disabled&&n.tabIndex>=0&&n.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 });
 dialog.addEventListener('close',()=>{returnTo?.isConnected&&returnTo.focus({preventScroll:true});});
}
function updateReport(){
 if(!dialog)return '';
 const val=id=>$('#skr-report-'+id,dialog).value;
 const text=reportText({title:document.title,url:location.href,kind:val('kind'),steps:val('steps'),expected:val('expected'),actual:val('actual')});
 $('#skr-report-preview',dialog).value=text;$('#skr-report-status',dialog).textContent='';return text;
}
function openReport(trigger,kind){
 if(!dialog)buildDialog();returnTo=trigger;
 if(kind)$('#skr-report-kind',dialog).value=kind;
 updateReport();dialog.showModal();$('#skr-report-kind',dialog).focus();
}
support();
let queued=false;
function refresh(){queued=false;addDetailHint();nextSteps();}
const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(refresh);});
for(const host of [$('#content'),$('.lab')?.parentElement].filter(Boolean))observer.observe(host,{childList:true,subtree:true});
document.addEventListener('skr:ocr-ready',()=>{const host=$('#assessmentResult');if(host)observer.observe(host,{childList:true,subtree:true});refresh();},{once:true});
refresh();
