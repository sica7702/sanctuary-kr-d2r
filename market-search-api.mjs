import {propertyNumber,parsePrice,isMeta} from './traderie-integrity.mjs';
import {validateContract,filterParams,triBool,platformsOf,canonicalQuality,canonicalTier,isNumber} from './public/archive/market-contract.js';
import {RARE_SINGLE_SLOTS,rareEquipmentSingleQuantity} from './rare-singleton.mjs';
const ENDPOINT='https://traderie.com/api/diablo2resurrected/listings';
const text=v=>typeof v==='string'?v.trim().slice(0,160):'';
const date=v=>typeof v==='string'&&/(?:Z|[+-]\d{2}:?\d{2})$/i.test(v)&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const count=v=>isNumber(v)&&Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
const positiveStock=v=>triBool(v)===true||isNumber(v)&&Number(v)>0||typeof v==='string'&&/^(?:yes|stock|bulk|bundle|lot)$/i.test(v.trim());
const bundleText=v=>typeof v==='string'&&/\b(?:bundle|bulk|stock listing|pack of|lot of|multiple items?|multi[- ]?item)\b|묶음|일괄|대량/i.test(v);
const ladderBool=v=>triBool(v)??(/^ladder$/i.test(text(v))?true:/^non[- ]?ladder$/i.test(text(v))?false:null);
export function normalizeMarketListing(raw){
 if(!raw||!/^\d{1,30}$/.test(String(raw.id)))return null;
 const props=Array.isArray(raw.properties)?raw.properties:[];
 const meta=name=>{const p=props.find(p=>String(p?.property||p?.name||'').toLowerCase()===name.toLowerCase());return p?.string??p?.value??p?.bool??p?.number??null;};
 const values={},conflicts=new Set();
 for(const p of props){
  if(!p||isMeta(p)||/Charges|Chance to Cast|per (?:Character )?Level|Based on Character Level/i.test(p.property||p.name||''))continue;
  const id=p.property_id??p.id,value=propertyNumber(p);
  if(!/^\d{1,8}$/.test(String(id))||value===null)continue;
  const key='prop_'+id;if(key in values&&values[key]!==value)conflicts.add(key);values[key]=value;
 }
 for(const key of conflicts)delete values[key];
 const ladderValue=raw.ladder??meta('Ladder'),ladder=ladderBool(ladderValue),hardcore=triBool(raw.hardcore);
 const mode=text(raw.mode||meta('Mode'))||(hardcore===null?'':hardcore?'Hardcore':'Softcore');
 const quantityValues=[raw.quantity,raw.amount,meta('Quantity')].filter(x=>x!=null);
 const quantities=quantityValues.map(count),explicitQuantity=quantities.length&&quantities.every(x=>x!==null&&x===quantities[0])?quantities[0]:null;
 // Missing quantity is normal for a single, non-stackable rare item. Keep the
 // source value separate from the effective one; never override a conflicting
 // or malformed explicit item quantity.
 const inferred=quantityValues.length===0?RARE_SINGLE_SLOTS.map(slot=>({slot,...rareEquipmentSingleQuantity(raw,slot)}))
  .find(row=>row.single&&row.basis==='implicit_single_nonstackable_rare'):null;
 const quantity=explicitQuantity??(inferred?1:null);
 const otherItemCounts=[raw.item?.quantity,raw.item?.amount,raw.item?.count,raw.item_count,raw.count,raw.available_quantity]
  .filter(value=>value!=null);
 const quantityConflict=otherItemCounts.some(value=>count(value)===null||quantity!==count(value));
 const stockProperties=props.filter(p=>/^(?:Stock Listing|Bulk|Bundle|Lot|Stackable)$/i.test(String(p?.property||p?.name||'').trim()))
  .map(p=>p?.number??p?.value??p?.string??p?.bool);
 const stockSignals=[raw.stock_listing,raw.stock,raw.is_stock_listing,raw.is_stock,raw.item?.stock_listing,raw.item?.stock,
  raw.item?.is_stock_listing,raw.item?.is_stock,raw.bulk,raw.bundle,raw.lot,raw.stackable,
  raw.item?.bulk,raw.item?.bundle,raw.item?.lot,raw.item?.stackable,raw.stock_count,raw.item?.stock_count,...stockProperties];
 const stock=stockSignals.some(positiveStock)?true:triBool(raw.stock_listing??raw.stock??meta('Stock Listing'));
 const bundled=bundleText(raw.title)||bundleText(raw.description)||bundleText(raw.listing_type);
 const quantityBasis=quantityConflict?'explicit_or_conflicting':inferred?'implicit_single_nonstackable_rare':
  quantityValues.length===0?'missing':explicitQuantity===1?'explicit_single':'explicit_or_conflicting';
 const price=parsePrice(raw),priceBasis=quantity===1&&stock!==true&&!quantityConflict&&!bundled?'single-item':'unverified';
 const socketValue=raw.sockets??meta('Sockets')??values.prop_402;
 const sockets=isNumber(socketValue)&&Number.isInteger(Number(socketValue))&&Number(socketValue)>=0&&Number(socketValue)<=6?Number(socketValue):null;
 const sellerId=raw.seller_id??raw.user_id??raw.seller?.id??raw.user?.id;
 const sellerKey=typeof sellerId==='string'||typeof sellerId==='number'?String(sellerId):'';
 const platforms=platformsOf(raw.platforms??raw.platform??meta('Platform'));
 const result={id:String(raw.id),itemId:String(raw.item?.id??raw.item_id??''),name:text(raw.item?.name||raw.name),
  quality:canonicalQuality(raw.quality||raw.rarity||meta('Rarity')||raw.item?.rarity),completed:triBool(raw.completed),active:triBool(raw.active),
  postedAt:date(raw.created_at),updatedAt:date(raw.updated_at),completedAt:date(raw.completed_at),
  market:{platforms,platform:platforms.join(','),ladder:ladder===null?text(ladderValue):ladder?'Ladder':'Non-Ladder',mode,
   region:text(raw.region||meta('Region')),gameVersion:text(raw.game_version||meta('Game version')).toLowerCase()},
  identity:{ethereal:triBool(raw.ethereal??meta('Ethereal')),upgraded:triBool(raw.upgraded??meta('Upgraded')),
   unidentified:triBool(raw.unidentified??meta('Unidentified')),tier:canonicalTier(raw.base_tier??meta('Base Tier')),sockets},
  values,conflicts:[...conflicts],quantity,sourceQuantity:explicitQuantity,quantityBasis,quantitySlot:inferred?.slot??null,
  stock,priceBasis,priceKind:price.kind,priceComplete:price.complete,priceAlternatives:price.alternatives,
  priceText:price.kind==='offer'?'가격 제안':price.complete?price.display:'가격 조건 확인 필요',
  // An opaque public identifier is only used to avoid counting one seller repeatedly.
  sellerKey:/^[\w-]{1,100}$/.test(sellerKey)?sellerKey:null,
  priceEvidence:'listing-price-not-confirmed-settlement',url:'https://traderie.com/diablo2resurrected/listing/'+raw.id};
 // Conflicting representations are not silently resolved by field order.
 const issues=[];
 if(raw.item?.id!=null&&raw.item_id!=null&&String(raw.item.id)!==String(raw.item_id))issues.push('상품 ID 정보 충돌');
 if(conflicts.has('prop_402'))issues.push('소켓 정보 충돌');
 for(const [name,sources,normalize] of [
  ['Platform',[raw.platforms,raw.platform],v=>platformsOf(v).sort().join(',')],
  ['Ladder',[raw.ladder],ladderBool],
  ['Mode',[raw.mode,hardcore===null?null:hardcore?'hardcore':'softcore'],v=>text(v).toLowerCase()],
  ['Game version',[raw.game_version],v=>text(v).toLowerCase()],
  ['Region',[raw.region],v=>text(v).toLowerCase()],
  ['Rarity',[raw.quality,raw.rarity,raw.item?.rarity],canonicalQuality],
  ['Ethereal',[raw.ethereal],triBool],['Unidentified',[raw.unidentified],triBool],['Upgraded',[raw.upgraded],triBool],
  ['Base Tier',[raw.base_tier],canonicalTier],['Sockets',[raw.sockets,values.prop_402],v=>isNumber(v)?Number(v):null]
 ]){
  const candidates=[...sources,...props.filter(p=>String(p?.property||p?.name||'').toLowerCase()===name.toLowerCase()).map(p=>p.string??p.value??p.bool??p.number)].filter(v=>v!=null).map(normalize).filter(v=>v!==null&&v!=='');
  if(new Set(candidates).size>1)issues.push(name+' 정보 충돌');
 }
 result.validationIssues=issues;
 return result;
}
export async function readBoundedJson(response,limit=3000000){
 if(!response.body)throw Error('empty_response');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('response_too_large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('invalid_json');}
}
export async function recentMarketResponse(request,{fetcher=fetch,timeoutMs=4500}={}){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
 const url=new URL(request.url),origin=request.headers.get('Origin');
 if(origin&&origin!==url.origin)return reply({ok:false,error:'invalid_origin'},403);
 const page=url.searchParams.get('page')||'0',completed=url.searchParams.get('completed')||'false',encoded=url.searchParams.get('q')||'';
 if(!/^[0-3]$/.test(page)||!['true','false'].includes(completed)||encoded.length>18000)return reply({ok:false,error:'invalid_search'},400);
 let contract;try{contract=validateContract(JSON.parse(encoded));}catch{return reply({ok:false,error:'invalid_search'},400);}
 const upstream=new URL(ENDPOINT);upstream.search=filterParams(contract).toString();
 for(const [key,value]of Object.entries({item:contract.itemId,page,selling:'true',auction:'false',completed,active:completed==='true'?'all':'true'}))upstream.searchParams.set(key,value);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),cancel=()=>controller.abort();
 request.signal.addEventListener('abort',cancel,{once:true});
 try{
  if(request.signal.aborted)controller.abort();
  const response=await fetcher(upstream.href,{headers:{accept:'application/json'},redirect:'error',signal:controller.signal,cache:'no-store'});
  if(!response.ok){await response.body?.cancel();return reply({ok:false,error:'upstream_http',upstreamStatus:response.status},502);}
  const data=await readBoundedJson(response);
  if(!Array.isArray(data?.listings)||data.listings.length>500)throw Error('invalid_schema');
  const normalized=data.listings.map(normalizeMarketListing).filter(Boolean);
  const listings=normalized.filter(l=>l.itemId===contract.itemId&&l.completed===(completed==='true')&&(completed==='true'||l.active!==false));
  // The local page cap is not a statement about upstream exhaustion.
  const more=data.has_more??data.hasMore??data.pagination?.has_more;
  const exhausted=data.listings.length===0||more===false;
  const limitReached=Number(page)===3&&!exhausted;
  return reply({ok:true,schema:2,contract,listings,page:Number(page),exhausted,limitReached,hasMore:!exhausted&&!limitReached,
   scanned:data.listings.length,discarded:data.listings.length-listings.length,scopeMismatch:data.listings.length>0&&listings.length===0,fetchedAt:new Date().toISOString()});
 }catch(error){
  return reply({ok:false,error:controller.signal.aborted?'timeout':['invalid_json','invalid_schema','response_too_large','empty_response'].includes(error.message)?error.message:'upstream_unavailable'},502);
 }finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);}
}
