// Shared, market-only request contract. Never writes OCR/appraisal state.
export const MARKET_SCHEMA=2;
export const GAME_VERSIONS=['classic','lord of destruction','reign of the warlock'];
export const PLATFORMS=['PC','PlayStation','Xbox','Nintendo Switch'];
export const QUALITIES=['normal','superior','magic','rare','crafted','unique','set'];
export const TIERS=['Normal','Exceptional','Elite'];
export const isNumber=v=>v!==null&&v!==undefined&&typeof v!=='boolean'&&String(v).trim()!==''&&Number.isFinite(Number(v));
export const triBool=v=>v===true||v===1||v==='1'||String(v).toLowerCase()==='true'?true:v===false||v===0||v==='0'||String(v).toLowerCase()==='false'?false:null;
const clean=v=>typeof v==='string'?v.trim().toLowerCase():'';
export function platformsOf(value){
 const rows=Array.isArray(value)?value:typeof value==='string'?value.split(/[,;|/]/):[];
 const aliases={pc:'PC',playstation:'PlayStation',ps4:'PlayStation',ps5:'PlayStation',xbox:'Xbox','nintendo switch':'Nintendo Switch',switch:'Nintendo Switch'};
 return [...new Set(rows.map(v=>aliases[clean(v)]).filter(Boolean))];
}
export function canonicalQuality(value){return {normal:'normal',base:'normal',superior:'superior',magic:'magic',rare:'rare',crafted:'crafted',unique:'unique',uniques:'unique',set:'set',sets:'set'}[clean(value)]||null;}
export function canonicalTier(value){return TIERS.find(t=>clean(t)===clean(value))||null;}
export function validateContract(input){
 if(!input||input.schema!==MARKET_SCHEMA||!/^\d{1,20}$/.test(String(input.itemId)))throw Error('상품 연결 정보를 확인하세요.');
 const m=input.market||{},identity=input.identity||{};
 if(!PLATFORMS.includes(m.platform)||!['Ladder','Non-Ladder'].includes(m.ladder)||!['Softcore','Hardcore'].includes(m.mode))throw Error('플랫폼·래더·모드를 선택하세요.');
 if(!GAME_VERSIONS.includes(m.gameVersion))throw Error('게임 버전을 선택하세요.');
 if(!['','Asia','Americas','Europe'].includes(m.region||''))throw Error('지역 조건을 확인하세요.');
 if(!QUALITIES.includes(input.quality))throw Error('아이템 종류를 확인하세요.');
 for(const key of ['ethereal','upgraded','unidentified'])if(identity[key]!=null&&typeof identity[key]!=='boolean')throw Error('아이템 상태를 확인하세요.');
 if(identity.tier!=null&&!TIERS.includes(identity.tier))throw Error('베이스 등급을 확인하세요.');
 if(identity.sockets!=null&&(!Number.isInteger(identity.sockets)||identity.sockets<0||identity.sockets>6))throw Error('소켓 수를 확인하세요.');
 if(!Array.isArray(input.ranges)||input.ranges.length>80)throw Error('검색 옵션이 너무 많습니다.');
 const seen=new Map();
 const ranges=input.ranges.map(r=>{
  if(!/^prop_\d{1,8}$/.test(r.property)||!isNumber(r.min)||!isNumber(r.max)||Math.abs(Number(r.min))>1e7||Math.abs(Number(r.max))>1e7||Number(r.min)>Number(r.max))throw Error('검색 수치 범위를 확인하세요.');
  const item={property:r.property,min:Number(r.min),max:Number(r.max)};
  if(seen.has(r.property)&&JSON.stringify(seen.get(r.property))!==JSON.stringify(item))throw Error('같은 옵션의 수치가 서로 다릅니다.');
  seen.set(r.property,item);return item;
 });
 if(identity.sockets!=null&&seen.has('prop_402')){
  const sockets=seen.get('prop_402');
  if(sockets.min!==identity.sockets||sockets.max!==identity.sockets)throw Error('소켓 조건과 원본 옵션이 다릅니다.');
 }
 return {schema:MARKET_SCHEMA,itemId:String(input.itemId),quality:input.quality,market:{platform:m.platform,ladder:m.ladder,mode:m.mode,gameVersion:m.gameVersion,region:m.region||''},
  identity:{ethereal:identity.ethereal??null,unidentified:identity.unidentified??null,upgraded:identity.upgraded??null,tier:identity.tier??null,sockets:identity.sockets??null},ranges:[...new Map(ranges.map(r=>[r.property,r])).values()]};
}
export function filterParams(input){
 const c=validateContract(input),p=new URLSearchParams(),m=c.market,i=c.identity;
 p.set('prop_Platform',m.platform);p.set('prop_Ladder',String(m.ladder==='Ladder'));p.set('prop_Mode',m.mode.toLowerCase());p.set('prop_Game version',m.gameVersion);
 if(m.region)p.set('prop_Region',m.region);
 if(!['unique','set'].includes(c.quality))p.set('prop_Rarity',c.quality);
 // Do not assume an absent property is equivalent to an explicit false filter.
 // In particular amulets have no Ethereal field; sending false eliminated their listings.
 // Keep false in the local comparison contract, but never invent a negative remote filter.
 for(const [key,label]of [['ethereal','Ethereal'],['unidentified','Unidentified'],['upgraded','Upgraded']])if(i[key]===true)p.set('prop_'+label,'true');
 if(i.tier&&i.upgraded===true)p.set('prop_Base Tier',i.tier);
 if(i.sockets!==null){p.set('prop_402Min',String(i.sockets));p.set('prop_402Max',String(i.sockets));}
 for(const r of c.ranges){p.set(r.property+'Min',String(r.min));p.set(r.property+'Max',String(r.max));}
 return p;
}
export function remoteStateNotes(input){
 const {identity:i}=validateContract(input),notes=[];
 if(i.ethereal===false)notes.push('무형 아님');
 if(i.unidentified===false)notes.push('미확인 아님');
 if(i.upgraded===false)notes.push('업그레이드 안 함');
 if(i.tier&&i.upgraded!==true)notes.push('베이스 등급 '+i.tier);
 return notes;
}
// Missing metadata is not evidence of a match. No false=missing shortcuts.
export function environmentMatch(draft,listing){
 const m=draft.market||{},i=draft.identity||{},actual=listing.identity||{},lm=listing.market||{};
 const missing=[...(listing.validationIssues||[])],different=[];
 const compare=(name,want,got)=>{if(want==null||want==='')return;if(got==null||got==='')missing.push(name);else if(clean(String(want))!==clean(String(got)))different.push(name);};
 compare('상품',draft.traderieItem?.id,listing.itemId);
 if(!['unique','set'].includes(draft.quality))compare('아이템 종류',draft.quality,canonicalQuality(listing.quality));
 const platforms=platformsOf(lm.platforms||lm.platform);
 if(m.platform){if(!platforms.length)missing.push('플랫폼');else if(!platforms.includes(m.platform))different.push('플랫폼');}
 for(const [key,name] of [['ladder','래더'],['mode','모드'],['gameVersion','게임 버전'],['region','지역']])compare(name,m[key],lm[key]);
 for(const [key,name] of [['ethereal','무형'],['unidentified','미확인 여부'],['tier','베이스 등급'],['upgraded','업그레이드'],['sockets','소켓']])compare(name,i[key],actual[key]);
 return {matches:!missing.length&&!different.length,missing,different};
}
export function pricedSample(listing){
 const inferred=listing.quantityBasis==='implicit_single_nonstackable_rare';
 // The API may infer one item only for recognized, non-stackable rare
 // equipment.  Currency quantities in priceAlternatives are never item counts.
 if(inferred&&!(listing.quality==='rare'&&listing.sourceQuantity==null&&
   ['ring','amulet','circlet','gloves','boots','belt','claw','jav','bow','crossbow','orb','wand'].includes(listing.quantitySlot)))return false;
 if(listing.quantityBasis!=null&&!inferred&&listing.quantityBasis!=='explicit_single')return false;
 return listing.priceComplete===true&&listing.priceKind==='asking'&&listing.quantity===1&&listing.stock!==true&&listing.priceBasis==='single-item';
}
export function priceSamples(rows){
 const priced=rows.filter(pricedSample),sellers=new Set();let independent=0,unknownSellers=0;
 for(const row of priced){if(!row.sellerKey){unknownSellers++;continue;}if(!sellers.has(row.sellerKey)){sellers.add(row.sellerKey);independent++;}}
 return {priced:priced.length,independent,unknownSellers,offers:rows.filter(r=>r.priceKind==='offer').length,quantityUnclear:rows.filter(r=>r.priceBasis!=='single-item').length};
}
