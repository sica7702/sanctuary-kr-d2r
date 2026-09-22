// Public tracker adapter. A retrieval timestamp is never a rotation timestamp.
import { ZONES } from './tz-zones.mjs';
export const PERIOD_MS=30*60*1000;
export const SOURCES=[
 {name:'diablo2.io',lineage:'d2emu/diablo2.io',url:'https://diablo2.io/tzonetracker.php'},
 {name:'terrorzonetracker.com',lineage:'unverified-public-tracker',format:'state',url:'https://terrorzonetracker.com/api/state'},
 {name:'Sanctuary Hub',lineage:'d2emu/diablo2.io',format:'hub',url:'https://d2r.baeklab.com/ko/terror-zone'}
];
function decode(s){return String(s).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(?:apos|rsquo|lsquo);/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
export function plainText(raw){
 return decode(String(raw).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,tag=>{const iso=tag.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})\b/);return iso?' '+iso[0]+' ':' '})
 ).replace(/\s+/g,' ').trim();
}
const norm=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
function zone(text){
 const source=' '+norm(text)+' ',hits=[];
 for(const [id,names] of ZONES){const found=names.filter(n=>source.includes(' '+norm(n)+' '));if(found.length)hits.push({id,areas:found.sort((a,b)=>b.length-a.length).filter((n,i,a)=>!a.slice(0,i).some(long=>norm(long).includes(norm(n))))})}
 if(hits.length!==1)throw Error(hits.length?'ambiguous_zone':'unknown_zone');
 return hits[0];
}
function stamp(text){const match=text.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})\b/);if(!match)throw Error('rotation_timestamp_missing');const t=Date.parse(match[0]);if(!Number.isFinite(t)||t%PERIOD_MS!==0)throw Error('invalid_rotation_timestamp');return t}
export function parseTracker(raw,now=Date.now()){
 const text=plainText(raw),marker=text.indexOf('Upcoming and current online terror zones:');
 if(marker<0)throw Error('tracker_marker_missing');
 const scope=text.slice(marker).split(/Online terror zones over|Offline terror zones/i)[0];
 const current=/\bCurrent\b([\s\S]*?)(?=\bNext\b|$)/i.exec(scope);
 if(!current)throw Error('current_row_missing');
 const at=stamp(current[1]);
 if(now<at||now>=at+PERIOD_MS)throw Error('stale_or_future_rotation');
 const currentZone=zone(current[1]);
 const next=/\bNext\b([\s\S]*)/i.exec(scope);let nextZone=null,nextAt=null,nextError=null;
 if(next){try{nextAt=stamp(next[1]);if(nextAt!==at+PERIOD_MS)throw Error('next_timestamp_mismatch');nextZone=zone(next[1])}catch(e){nextAt=null;nextError=e.message}}
 return {current:currentZone,next:nextZone,currentAt:at,nextAt,validUntil:at+PERIOD_MS,nextError};
}
export function parseHub(raw,now=Date.now()){
 // Read Next.js flight JSON data, never execute upstream scripts.
 const records=[];
 function visit(value){if(!value||typeof value!=='object')return;if(value.zoneId&&typeof value.name?.en==='string')records.push(value);for(const child of Object.values(value))visit(child)}
 for(const match of String(raw).matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)){
  let chunk;try{chunk=JSON.parse(match[1])}catch{continue}
  for(const line of chunk.split('\n')){const colon=line.indexOf(':');if(colon<0)continue;try{visit(JSON.parse(line.slice(colon+1)))}catch{}}
 }
 const currents=records.filter(x=>x.endsAt&&!x.startsAt);if(currents.length!==1)throw Error('hub_current_schema_mismatch');
 const row=currents[0],end=Date.parse(row.endsAt);if(!Number.isFinite(end)||end%PERIOD_MS!==0||now<end-PERIOD_MS||now>=end)throw Error('stale_or_future_rotation');
 const current=zone(row.name.en),nextRows=records.filter(x=>x.startsAt);let next=null,nextError=null;
 if(nextRows.length===1){try{if(Date.parse(nextRows[0].startsAt)!==end||Date.parse(nextRows[0].currentEndsAt)!==end)throw Error('next_timestamp_mismatch');next=zone(nextRows[0].name.en)}catch(e){nextError=e.message}}
 return {current,next,currentAt:end-PERIOD_MS,nextAt:next?end:null,validUntil:end,nextError};
}
export function parseState(raw,now=Date.now()){
 const data=JSON.parse(raw),end=Number(data.end_unix)*1000;
 if(!Number.isSafeInteger(end)||end%PERIOD_MS!==0||now<end-PERIOD_MS||now>=end)throw Error('stale_or_future_rotation');
 if(typeof data.current_zone!=='string'||!data.current_zone.trim())throw Error('current_row_missing');
 const current=zone(data.current_zone);let next=null,nextError=null;
 if(data.next_zone){try{next=zone(data.next_zone)}catch(e){nextError=e.message}}
 return {current,next,currentAt:end-PERIOD_MS,nextAt:next?end:null,validUntil:end,nextError};
}
export async function getLive({fetcher=fetch,now=()=>Date.now(),sources=SOURCES,timeoutMs=7000}={}){
 const checks=await Promise.all(sources.map(async source=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const r=await fetcher(source.url,{signal:controller.signal,redirect:'follow',headers:{Accept:'text/html','Cache-Control':'no-cache'},cf:{cacheTtl:0,cacheEverything:false}});
   if(!r.ok)throw Error('HTTP_'+r.status);
   if(!(source.format==='state'?/application\/json/i:/text\/(?:html|plain)/i).test(r.headers.get('content-type')||''))throw Error('unexpected_content_type');
   const raw=await r.text();if(raw.length>2000000)throw Error('response_too_large');
   return {source:source.name,lineage:source.lineage,ok:true,...(source.format==='state'?parseState(raw,now()):source.format==='hub'?parseHub(raw,now()):parseTracker(raw,now()))};
  }catch(e){return {source:source.name,lineage:source.lineage,ok:false,error:e.name==='AbortError'?'timeout':String(e.message||e)}}finally{clearTimeout(timer)}
 }));
 const time=now(),valid=checks.filter(x=>x.ok&&time<x.validUntil),summary=checks.map(x=>({source:x.source,ok:x.ok&&time<x.validUntil,error:x.ok&&time>=x.validUntil?'expired_during_fetch':x.error,current:x.current?.id,next:x.next?.id}));
 if(!valid.length)return {ok:false,error:'live_tracker_unavailable',current:null,next:null,sources:summary};
 const ids=new Set(valid.map(x=>x.current.id+'|'+x.currentAt));
 if(ids.size!==1)return {ok:false,error:'source_conflict',current:null,next:null,sources:summary};
 const first=valid[0],lineages=new Set(valid.map(x=>x.lineage)),nexts=valid.filter(x=>x.next),nextKeys=new Set(nexts.map(x=>x.next.id+'|'+x.nextAt)),next=nextKeys.size===1?nexts[0]?.next:null;
 return {ok:true,schemaVersion:2,current:first.current.areas.join(' / '),currentAreas:first.current.areas,currentGroupId:first.current.id,
  next:next?.areas.join(' / ')||null,nextAreas:next?.areas||[],nextGroupId:next?.id||null,nextStatus:nextKeys.size>1?'conflict':next?'prediction':'pending',
  currentStartsAt:new Date(first.currentAt).toISOString(),validUntil:new Date(first.validUntil).toISOString(),
  nextStartsAt:next?new Date(first.nextAt||nexts[0].nextAt).toISOString():null,
  verified:false,agreement:lineages.size,totalSources:lineages.size,transportCount:valid.length,
  source:valid.map(x=>x.source).join(' · '),transport:valid.map(x=>x.source).join(', '),sources:summary,
  fetchedAt:new Date(time).toISOString(),fetchedAtKst:new Date(time).toLocaleString('sv-SE',{timeZone:'Asia/Seoul',hour12:false})+' KST',
  secondsRemaining:Math.max(0,Math.floor((first.validUntil-time)/1000)),attribution:'Public trackers; upstream independence is not established. Next zone is a prediction.'};
}
export async function liveResponse(request,options){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept, Content-Type'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{...headers,Allow:'GET, OPTIONS'}});
 const data=await getLive(options);return new Response(JSON.stringify(data),{status:data.ok?200:503,headers});
}
