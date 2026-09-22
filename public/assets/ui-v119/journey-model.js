/* Navigation and user-visible text only. No appraisal, search or storage writes. */
export const RELEASE='v126';
export const DISCORD='https://discord.gg/Ws3Bda7wHK';
export function archiveLink(page,params={}){
 const query=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==''&&v!=null));
 return '/archive/'+page+(query.size?'?'+query:'');
}
export function resultLinks({quality,record,base,slot}){
 const links=[];
 if(['unique','set'].includes(quality)&&record){
  links.push({label:'아이템 정보·드랍 보기',url:archiveLink('unified.html',{view:'detail',id:record.id})});
 }else if(['normal','superior','magic','rare'].includes(quality)){
  const type={normal:'base',superior:'base',magic:'magic',rare:'rare'}[quality];
  links.push({label:type==='base'?'이 베이스의 득환 기준':'같은 부위의 득환 기준',url:archiveLink('unified.html',{view:'loot',loot:type,q:type==='base'?base?.name:slot})});
 }
 links.push({label:'빌드 가이드 보기',url:archiveLink('integrated-tools.html',{pane:'builds'})});
 return links;
}
export function reportLocation(href){
 const source=new URL(href);
 // Never include free-text search, tokens, fragments or arbitrary query values.
 const keys=['view','id','loot','pane','stage','class','path'];
 const query=new URLSearchParams(keys.flatMap(k=>source.searchParams.has(k)?[[k,source.searchParams.get(k).slice(0,120)]]:[]));
 return source.origin+source.pathname+(query.size?'?'+query:'');
}
export function reportText({title,url,kind,steps,expected,actual}){
 return ['[Sanctuary KR 오류·의견 제보]', '화면: '+String(title||'').slice(0,180),
  '주소: '+reportLocation(url),'화면 버전: '+RELEASE,'분류: '+kind,
  '', '어떻게 사용했나요?',steps.trim()||'(입력해 주세요)',
  '', '기대한 결과',expected.trim()||'(입력해 주세요)',
  '', '실제로 보인 결과',actual.trim()||'(입력해 주세요)',
  '', '※ 이 내용은 자동 접수되지 않습니다. 복사 후 디스코드에 직접 전달해 주세요.'].join('\n');
}
