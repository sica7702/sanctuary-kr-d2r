import {chooseRecentMatches} from './market-search.js?v=129';
import {searchContract} from './traderie-connect.js?v=123';

export async function findRecentMarket(draft,settings={}, {fetcher=fetch,signal,onProgress=()=>{},now=Date.now(),requestTimeoutMs=12000}={}){
 const listings=[],seen=new Set();let partial=false,error=null,pages=0,stopReason='unknown';
 const start=settings.start||'5';
 // Query the numeric envelope only when widening was explicitly enabled.
 // Item identity and trade environment are identical to the direct URL.
 const fetchedStage=settings.autoWiden&&start!=='item'?'full':start;
 const contract=searchContract(draft,fetchedStage);
 for(let page=0;page<4;page++){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const params=new URLSearchParams({q:JSON.stringify(contract),page:String(page),completed:String(!!settings.completed)});
  const pageController=new AbortController(),cancelPage=()=>pageController.abort();
  const timer=setTimeout(cancelPage,requestTimeoutMs);
  signal?.addEventListener('abort',cancelPage,{once:true});
  try{
   onProgress({page:page+1,count:listings.length});
   const response=await fetcher('/api/public/market-search?'+params,{signal:pageController.signal,cache:'no-store'});
   let data;try{data=await response.json();}catch{throw Error('조회 응답이 JSON이 아닙니다.');}
   if(!response.ok||data.ok!==true||data.schema!==2||!Array.isArray(data.listings))throw Error(data.upstreamStatus?'트레더리 조회 오류 (HTTP '+data.upstreamStatus+')':'최근 매물 조회 불가: '+(data.error||'응답 형식 확인 필요'));
   if(JSON.stringify(data.contract)!==JSON.stringify(contract))throw Error('조회 응답의 검색 조건이 요청과 다릅니다.');
   pages++;
   if(data.scopeMismatch||data.discarded>0){partial=true;error='조건이 다르거나 검증하지 못한 응답이 있어 부분 자료로 표시합니다.';}
   let added=0;
   for(const listing of data.listings)if(listing.id&&!seen.has(String(listing.id))){seen.add(String(listing.id));listings.push(listing);added++;}
   if(data.limitReached){partial=true;stopReason='page-limit';break;}
   if(data.exhausted===true){stopReason='exhausted';break;}
   if(data.hasMore!==true){partial=true;stopReason='pagination-unknown';break;}
   if(!added&&page>0){partial=true;stopReason='repeated-page';break;}
   if(page===3){partial=true;stopReason='page-limit';}
  }catch(problem){
   if(signal?.aborted)throw problem;
   if(pageController.signal.aborted)problem=Error('최근 매물 조회 시간이 초과되었습니다. 다시 시도하거나 트레더리에서 직접 확인하세요.');
   if(!pages)throw problem;
   partial=true;error=problem.message;stopReason='upstream-error';break;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancelPage);}
 }
 if(stopReason==='unknown'){partial=true;stopReason='pagination-unknown';}
 const complete=!partial&&stopReason==='exhausted';
 return {...chooseRecentMatches(draft,listings,{...settings,start,now,complete}),pages,partial:!complete,error,stopReason,fetchedStage};
}
