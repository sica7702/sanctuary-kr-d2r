import test from 'node:test';
import assert from 'node:assert/strict';
import {belt,unique,data,map,catalog,listing,raw,request,envelope,now,market,settings} from './fixtures.mjs';
import {connectTraderie,marketUrl,marketSearchPlan,searchContract} from '../public/archive/traderie-connect.js';
import {searchConstraints,chooseRecentMatches,listingComparison,rollMetadata} from '../public/archive/market-search.js';
import {marketIdentity,searchProjection} from '../public/archive/market-identity.js';
import {validateContract,filterParams,environmentMatch,priceSamples} from '../public/archive/market-contract.js';
import {findRecentMarket} from '../public/archive/recent-market.js';
import {normalizeMarketListing,recentMarketResponse,readBoundedJson} from '../market-search-api.mjs';
import {parsePrice} from '../traderie-integrity.mjs';

test('98 ED ±5% = 94..102; fixed options omitted; no source mutation',()=>{
 const d=belt(),before=structuredClone(d),u=new URL(marketUrl(d,{stage:'5'}).url);
 assert.equal(u.searchParams.get('prop_425Min'),'94');assert.equal(u.searchParams.get('prop_425Max'),'102');
 for(const id of [400,520,587,584,617])assert(!u.searchParams.has('prop_'+id+'Min'));
 marketSearchPlan(d);chooseRecentMatches(d,[listing()],{now});assert.deepEqual(d,before);
});
test('Magefist maximum 30 ED stays 29..30 and innate fire skill/damage do not block',()=>{
 const d=unique('Magefist',{'ac%':30},'tgl'),rows=searchConstraints(d,'5');
 assert.deepEqual(rows.filter(x=>x.min!=null).map(x=>[x.code,x.min,x.max]),[['ac%',29,30]]);
 assert.equal(marketUrl(d).unapplied.length,0);
});
test('All database roll endpoints at all numeric stages stay inside DB bounds',()=>{
 let checked=0;
 for(const item of data.records.filter(x=>['유니크','세트'].includes(x.kind)))for(const mod of item.mods||[]){
  const bounds=rollMetadata(mod);if(!bounds||!Number.isInteger(bounds.min)||!Number.isInteger(bounds.max))continue;
  for(const value of [bounds.min,bounds.max])for(const stage of ['exact','5','10','full']){
   const row=searchConstraints({quality:'rare',options:[{...mod,value,searchRange:bounds,traderie:{id:1}}]},stage)[0];
   assert(row.min>=bounds.min&&row.max<=bounds.max&&row.min<=value&&row.max>=value,item.en+' '+mod.code);checked++;
  }
 }assert.equal(checked,21336);
});
test('Structural stats remain exact and manual range lock is retained',()=>{
 for(const code of ['sock','cast2','skilltab','swing2']){
  const row=searchConstraints({quality:'rare',options:[{code,value:20,traderie:{id:1},searchRange:{min:10,max:30,step:1}}]},'full')[0];assert.deepEqual([row.min,row.max],[20,20]);
 }
 const r=chooseRecentMatches(belt(),[listing(1),listing(2,{values:{prop_425:120}})],{now,...settings,autoWiden:false});
 assert.equal(r.stage,'5');assert.deepEqual(r.listings.map(x=>x.id),['1']);
});
test('Version, region, item state and numeric constraints share one URL/API contract',async()=>{
 const d=belt(),c=searchContract(d),p=new URL(marketUrl(d).url).searchParams;
 assert.equal(p.get('prop_Game version'),market.gameVersion);assert.equal(p.get('prop_Region'),'Asia');assert.equal(p.has('prop_Ethereal'),false);assert.equal(p.has('prop_Unidentified'),false);
 let params;const response=await recentMarketResponse(request(),{fetcher:async url=>{params=new URL(url).searchParams;return Response.json({listings:[],has_more:false});}});
 assert.equal(response.status,200);assert.deepEqual((await response.json()).contract,c);
 for(const[k,v]of filterParams(c))assert.equal(params.get(k),v,k);
});
test('Upgraded Magefist: Elite base and upgraded=true; original Normal=false; stale unrelated base rejected',()=>{
 const d=unique('Magefist',{'ac%':30},'utg');assert.equal(d.identity.tier,'Elite');assert.equal(d.identity.upgraded,true);
 const p=new URL(marketUrl(d).url).searchParams;assert.equal(p.get('prop_Base Tier'),'Elite');assert.equal(p.get('prop_Upgraded'),'true');
 assert.equal(unique('Magefist',{},'tgl').identity.upgraded,false);
 assert.equal(marketIdentity(d,data,'ne5').identity.tier,null);
 const wrong=listing(1,{itemId:d.traderieItem.id,identity:{...d.identity,tier:'Normal',upgraded:false}});assert(!environmentMatch(d,wrong).matches);
});
test('Tal Rasha amulet reproduces the exact user-confirmed working URL; no hidden unsupported flags',()=>{
 const d=unique("Tal Rasha's Adjudication",{},undefined,'set');d.market.region='';
 const url=new URL(marketUrl(d,{stage:'full'}).url);
 assert.equal(url.pathname,'/diablo2resurrected/product/tal-rashas-adjudication');
 assert.deepEqual(Object.fromEntries(url.searchParams),{prop_Platform:'PC',prop_Ladder:'true',prop_Mode:'softcore','prop_Game version':'reign of the warlock'});
 assert.equal(d.identity.ethereal,false);assert.equal(d.identity.unidentified,false);
 assert.equal(marketUrl(d).remoteStateNotes.length,2);
 assert.equal(marketUrl(d,{stage:'full'}).url,'https://traderie.com/diablo2resurrected/product/tal-rashas-adjudication?prop_Platform=PC&prop_Ladder=true&prop_Mode=softcore&prop_Game%20version=reign%20of%20the%20warlock');
});
test('Fixed Tal Rasha lightning endpoints do not become duplicate filters; actual extra damage and rare stats remain',()=>{
 const d=unique("Tal Rasha's Adjudication",{},undefined,'set');
 const options=[{code:'ltng-min',value:3,origin:'observed-extra'},{code:'ltng-max',value:32,origin:'observed-extra'},{code:'ltng-max',value:40,origin:'observed-extra'}];
 const input={...d,options},before=structuredClone(input),projected=searchProjection(input,data);
 assert.deepEqual(projected.options.map(o=>o.searchFixed),[true,true,false]);assert.deepEqual(input,before);
 assert.equal(searchProjection({...input,quality:'rare'},data).options[0].searchFixed,false);
});
test('Ars Dul Mephistos and all mapped set/unique items never get automatic false state URL filters',()=>{
 for(const record of data.records.filter(r=>['유니크','세트'].includes(r.kind)&&catalog.byRecord[r.id])){
  const quality=record.kind==='세트'?'set':'unique';
  const d=connectTraderie({itemId:record.id,englishName:record.en,quality,options:[],market:{...market},identity:{ethereal:false,unidentified:false,upgraded:false,tier:'Normal'}},map,catalog);
  const url=new URL(marketUrl(d).url);
  for(const key of ['prop_Ethereal','prop_Unidentified','prop_Upgraded','prop_Base Tier'])assert.equal(url.searchParams.has(key),false,record.en+' '+key);
 }
 const d=unique("Ars Dul'Mephistos");d.market.region='';const url=new URL(marketUrl(d,{stage:'full'}).url);
 assert.equal(url.searchParams.get('prop_425Min'),'140');assert.equal(url.searchParams.get('prop_425Max'),'170');assert.equal(url.searchParams.get('prop_510Min'),'70');assert.equal(url.searchParams.get('prop_461Max'),'25');
 assert.equal(url.searchParams.has('prop_Ethereal'),false);assert.equal(url.searchParams.has('prop_Unidentified'),false);
});
test('Positive ethereal/upgraded filters and Non-Ladder=false still work; local negative-state checking stays strict',()=>{
 const d=unique('Magefist',{'ac%':30},'utg');d.identity.ethereal=true;d.market.ladder='Non-Ladder';
 const params=new URL(marketUrl(d).url).searchParams;
 assert.equal(params.get('prop_Ethereal'),'true');assert.equal(params.get('prop_Upgraded'),'true');assert.equal(params.get('prop_Base Tier'),'Elite');assert.equal(params.get('prop_Ladder'),'false');
 assert.equal(environmentMatch(belt(),listing(1,{identity:{ethereal:true,unidentified:false}})).matches,false);
 assert.equal(environmentMatch(belt(),listing(1,{identity:{unidentified:false}})).matches,false);
});
test('Missing metadata is unverified; different version/ethereal/region is excluded',()=>{
 for(const key of ['gameVersion','region']){
  const missing=listing(1,{market:{...market,[key]:''}}),wrong=listing(2,{market:{...market,[key]:'different'}});
  const r=chooseRecentMatches(belt(),[missing,wrong],{now});assert.equal(r.listings.length,0);assert.equal(r.excluded.unverified,1);assert.equal(r.excluded.environment,1);
 }
 assert(!environmentMatch(belt(),listing(1,{identity:{ethereal:true,unidentified:false}})).matches);
 assert(!environmentMatch(belt(),listing(1,{identity:{unidentified:false}})).matches);
});
test('PC + PlayStation membership is valid; unknown platform remains unknown',()=>{
 const valid=normalizeMarketListing(raw(1,{platform:['PC','PlayStation']}));
 assert(environmentMatch(belt(),valid).matches);
 assert(!environmentMatch(belt(),normalizeMarketListing(raw(2,{platform:'unknown'}))).matches);
});
test('Normal / superior / magic / rare / crafted preserve rarity, original options and URL scope',()=>{
 for(const quality of ['normal','superior','magic','rare','crafted']){
  const d={...connectTraderie({quality,englishName:'Ring',options:[{code:'cast2',value:10},{code:'res-all',value:11}]},map,catalog),market:{...market},identity:{}};
  const p=new URL(marketUrl(d).url).searchParams;assert.equal(p.get('prop_Rarity'),quality);assert.equal(p.get('prop_520Min'),'10');
  const match=listing(1,{itemId:d.traderieItem.id,quality,values:{prop_520:10,prop_441:11}});
  const other={...match,id:'2',quality:quality==='rare'?'magic':'rare'};
  assert.deepEqual(chooseRecentMatches(d,[match,other],{now}).listings.map(l=>l.id),['1']);
 }
});
test('All 140 set records and exact base names map without Demon Head/Demonhead collisions',()=>{
 const sets=data.records.filter(r=>r.kind==='세트');assert.equal(sets.length,140);
 for(const record of sets){const d=connectTraderie({itemId:record.id,quality:'set',englishName:record.en,options:[]},map,catalog);assert(d.traderieItem,record.en);assert.equal(d.traderieItem.quality,'set');}
 const bases=['Demon Head','Demonhead'].map(englishName=>connectTraderie({quality:'normal',englishName,options:[]},map,catalog).traderieItem);
 assert(bases.every(Boolean));assert.notEqual(bases[0].id,bases[1].id);
 for(const name of ['Small Charm','Large Charm','Grand Charm'])assert(connectTraderie({quality:'magic',englishName:name,options:[]},map,catalog).traderieItem);
});
test('Unsupported items fail closed and Rainbow Facet variants retain distinct IDs',()=>{
 const unsupported=connectTraderie({itemId:'unique:402',quality:'unique',englishName:'Cold Rupture',options:[]},map,catalog);assert.equal(unsupported.traderieItem,null);assert.throws(()=>marketUrl(unsupported));
 const facets=data.records.filter(r=>r.en==='Rainbow Facet').map(r=>catalog.byRecord[r.id]);assert.equal(facets.length,8);assert.equal(new Set(facets.map(x=>x.id)).size,8);
});
test('Parameter zero is not treated as an empty parameter',()=>{
 const d=connectTraderie({quality:'rare',englishName:'Ring',options:[{code:'skilltab',param:0,value:2}]},{items:[],properties:{},parameterProperties:{'skilltab|0':{id:777}}});
 assert.equal(d.options[0].traderie.id,777);
});
test('Unmapped, unread, conflicting and out-of-bounds options cannot become comparable prices',()=>{
 for(const option of [{code:'unknown',value:10},{code:'unknown',value:''},{code:'ac%',value:98,conflict:true,traderie:{id:425}},{code:'ac%',value:200,searchRange:{min:90,max:120},traderie:{id:425}}]){
  const d={...belt(),options:[option]};assert(!listingComparison(d,listing(),'full').matches);
  assert(marketUrl(d).unapplied.length);const result=chooseRecentMatches(d,[listing()],{now});assert.equal(result.listings.length,0);assert.notEqual(result.stage,'item');
 }
});
test('Innate unread fixed stats may be omitted, but additional observed stats are never discarded',()=>{
 const d=unique('Magefist',{},'tgl'),saved=structuredClone(d);
 const extra={code:'fireskill',param:'',value:3,origin:'observed-extra'};
 const projected=searchProjection({...d,options:[...d.options,extra]},data);
 assert.equal(projected.options.at(-1).searchFixed,false);assert.deepEqual(d,saved);
 assert.equal(searchConstraints({quality:'unique',options:[{code:'allskills',value:'',fixed:true}]})[0].state,'fixed');
 assert.equal(searchConstraints({quality:'unique',options:[{code:'ac%',value:'',fixed:false}]})[0].state,'unread');
});
test('Posted/completed dates are not replaced by updated or fetch time; duplicates do not count',()=>{
 const r=chooseRecentMatches(belt(),[listing(1,{postedAt:'2026-04-01T00:00:00Z',updatedAt:'2026-09-21T05:59:00Z'}),listing(2,{postedAt:null}),listing(3,{postedAt:'2027-01-01T00:00:00Z'}),listing(4),listing(4)],{now});
 assert.deepEqual(r.listings.map(x=>x.id),['4']);assert.equal(r.excluded.old,1);assert.equal(r.excluded.undated,2);
 const completed=chooseRecentMatches(belt(),[listing(1,{completed:true}),listing(2,{completed:true,completedAt:'2026-09-21T04:00:00Z'})],{now,completed:true});assert.deepEqual(completed.listings.map(x=>x.id),['2']);
});
test('AND/OR prices retain bundles and do not fabricate currency conversions',()=>{
 const p=parsePrice({prices:[{quantity:1,name:'Jah Rune',group:1},{quantity:1,name:'Ber Rune',group:1},{quantity:2,name:'Ohm Rune',group:2}]});
 assert(p.complete);assert.equal(p.display,'(Jah Rune 1 + Ber Rune 1) OR (Ohm Rune 2)');assert.equal(p.amount,null);
});
test('Multiple-item/stock/unknown-quantity listings are excluded from single-item price samples',()=>{
 const rows=[raw(1),raw(2,{quantity:4}),raw(3,{stock:true}),raw(4,{quantity:null}),raw(5,{amount:2})].map(normalizeMarketListing);
 assert.deepEqual(rows.map(r=>r.quantity),[1,4,1,null,null]);assert.equal(priceSamples(rows).priced,1);assert.equal(rows[1].priceBasis,'unverified');
});
test('Missing item quantity means one only for a verified non-stackable rare equipment listing',()=>{
 const rare=id=>raw(id,{item:{id:'3527553014',name:'Rare Ring',rarity:'rare',category:'Ring'},quality:'rare',quantity:null,stock:null});
 const single=normalizeMarketListing(rare(1));
 assert.equal(single.sourceQuantity,null);
 assert.equal(single.quantity,1);
 assert.equal(single.quantityBasis,'implicit_single_nonstackable_rare');
 assert.equal(single.quantitySlot,'ring');
 assert.equal(single.priceBasis,'single-item');
 assert.equal(priceSamples([single]).priced,1);
 // Two requested runes are the price, not two copies of this ring.
 const twoRunes=normalizeMarketListing({...rare(2),prices:[{quantity:2,name:'Ist Rune'}]});
 assert.equal(twoRunes.quantity,1);
 assert.equal(twoRunes.priceAlternatives[0].items[0].quantity,2);
 assert.equal(priceSamples([twoRunes]).priced,1);
});
test('Rare singleton inference fails closed on stock, bundles, multiple items, nonrare and materials',()=>{
 const base=raw(11,{item:{id:'3527553014',name:'Rare Ring',rarity:'rare',category:'Ring'},quality:'rare',quantity:null,stock:null});
 const cases=[
  {...base,id:12,quantity:2},
  {...base,id:13,amount:2},
  {...base,id:14,quantity:1,amount:2},
  {...base,id:15,stock_listing:true},
  {...base,id:16,description:'Bundle of 2 rings'},
  {...base,id:17,item:{id:'3527553014',name:'Rare Ring',rarity:'rare',category:'Ring',quantity:2}},
  {...base,id:18,item:{id:'3527553014',name:'Jah Rune',rarity:'rare',category:'Rune'}},
  {...base,id:19,quality:'unique',item:{id:'3527553014',name:'Rare Ring',rarity:'unique',category:'Ring'}},
  {...base,id:20,quality:'set',item:{id:'3527553014',name:'Rare Ring',rarity:'set',category:'Ring'}},
  {...base,id:21,quality:'magic',item:{id:'3527553014',name:'Magic Ring',rarity:'magic',category:'Ring'}}
 ];
 for(const entry of cases){
  const row=normalizeMarketListing(entry);
  assert.notEqual(row.quantityBasis,'implicit_single_nonstackable_rare',String(entry.id));
  assert.equal(priceSamples([row]).priced,0,String(entry.id));
 }
});
test('Even explicitly one item is not a price sample when stock or nested quantity contradicts it',()=>{
 const base=raw(30,{item:{id:'3527553014',name:'Rare Ring',rarity:'rare',category:'Ring'},quality:'rare',quantity:1,stock:false});
 const cases=[
  {...base,id:31,stock:2},
  {...base,id:32,stock_listing:'2'},
  {...base,id:33,item:{...base.item,quantity:2}},
  {...base,id:34,description:'Bundle of two rings'},
  {...base,id:35,properties:[...base.properties,{property:'Stock Listing',number:2}]},
  {...base,id:36,item:{...base.item,stock_count:2}}
 ];
 for(const entry of cases){
  const row=normalizeMarketListing(entry);
  assert.equal(row.quantity,1,String(entry.id));
  assert.equal(row.priceBasis,'unverified',String(entry.id));
  assert.equal(priceSamples([row]).priced,0,String(entry.id));
 }
});
test('Offers and five postings by one seller do not count as five independent prices',()=>{
 const same=Array.from({length:5},(_,i)=>listing(i+1,{sellerKey:'same'}));const r=chooseRecentMatches(belt(),same,{now});assert.equal(r.samples.independent,1);assert(!r.evidenceSufficient);
 const offers=same.map(r=>({...r,priceKind:'offer'}));assert.equal(priceSamples(offers).priced,0);
 const unknown=same.map(r=>({...r,sellerKey:null}));assert.equal(priceSamples(unknown).independent,0);
 const enough=chooseRecentMatches(belt(),Array.from({length:5},(_,i)=>listing(i+1)),{now});assert(enough.evidenceSufficient);assert.equal(enough.stage,'5');
});
test('Item-only reference is opt-in and never evidence of matching prices',()=>{
 const d={...belt(),options:[{code:'unknown',value:1}]};
 assert.equal(chooseRecentMatches(d,[listing()],{now}).stage,'full');
 const r=chooseRecentMatches(d,[listing()],{now,start:'item',minimum:1});assert(r.referenceOnly);assert(!r.evidenceSufficient);assert.equal(r.listings.length,1);
});
test('Conflicting stat or identity representations are rejected, not picked arbitrarily',()=>{
 const props=[{property_id:425,property:'Enhanced Defense',number:98},{property_id:425,property:'Enhanced Defense',number:120}];
 const row=normalizeMarketListing(raw(1,{properties:props}));assert(!('prop_425' in row.values));assert(!listingComparison(belt(),row,'5').matches);
 const mixed=normalizeMarketListing(raw(1,{properties:[{property:'Ethereal',bool:true}]}));assert(mixed.validationIssues.length);assert(!environmentMatch(belt(),mixed).matches);
 const equal=normalizeMarketListing(raw(1,{properties:[{property:'Ladder',value:'Ladder'}]}));assert.deepEqual(equal.validationIssues,[]);assert(environmentMatch(belt(),equal).matches);
});
test('Socket property 402 is retained; conflicting manually selected sockets are rejected',()=>{
 const row=normalizeMarketListing(raw(1,{properties:[{property_id:402,property:'Socketed ({{value}})',number:4}]}));assert.equal(row.identity.sockets,4);
 const c=searchContract(belt());c.identity.sockets=4;c.ranges.push({property:'prop_402',min:3,max:3});assert.throws(()=>validateContract(c),/소켓/);
 c.ranges.at(-1).min=4;c.ranges.at(-1).max=4;assert.equal(filterParams(c).get('prop_402Min'),'4');
});
test('Completed listing prices remain explicitly unconfirmed settlement evidence',()=>{
 const row=normalizeMarketListing(raw(1,{completed:true,completed_at:'2026-09-21T05:00:00Z'}));assert.equal(row.priceEvidence,'listing-price-not-confirmed-settlement');assert.equal(row.priceKind,'asking');
});
test('Invalid contract, cross-origin, wrong method, unbounded pages and legacy queries do not fetch',async()=>{
 const noFetch={fetcher:()=>{throw Error('Unexpected fetch');}};
 for(const req of [request({page:99}),request({method:'POST'}),request({headers:{Origin:'https://evil.invalid'}}),new Request('https://audit.invalid/api/public/market-search?item=3527553014')])assert((await recentMarketResponse(req,noFetch)).status>=400);
 for(const change of [c=>c.market.gameVersion='',c=>c.identity.ethereal='false',c=>c.ranges=[{property:'prop_x',min:0,max:1}],c=>c.ranges=[{property:'prop_425',min:Infinity,max:120}],c=>c.ranges=[{property:'prop_425',min:100,max:90}]]){const c=searchContract(belt());change(c);assert.throws(()=>validateContract(c));}
});
test('403, malformed/oversized upstream and timeout are failures, never zero matches',async()=>{
 const response=await recentMarketResponse(request(),{fetcher:async()=>new Response('blocked',{status:403})});assert.equal(response.status,502);assert.equal((await response.json()).upstreamStatus,403);
 await assert.rejects(()=>findRecentMarket(belt(),settings,{now,fetcher:async()=>Response.json({ok:false,upstreamStatus:403},{status:502})}),/403/);
 await assert.rejects(()=>readBoundedJson(new Response('x'.repeat(100)),10),/response_too_large/);
 assert.equal((await (await recentMarketResponse(request(),{fetcher:async()=>new Response('<html/>')})).json()).error,'invalid_json');
 const timed=await recentMarketResponse(request(),{timeoutMs:5,fetcher:async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))});assert.equal((await timed.json()).error,'timeout');
});
test('Four-page cap is partial, never exhausted; no automatic widening',async()=>{
 const api=await recentMarketResponse(request({page:3}),{fetcher:async()=>Response.json({listings:[raw()],has_more:true})});const body=await api.json();assert.equal(body.exhausted,false);assert.equal(body.limitReached,true);
 let n=0;const r=await findRecentMarket(belt(),settings,{now,fetcher:async url=>{n++;return envelope(url,[listing(n)],{exhausted:false,hasMore:n<4,limitReached:n===4});}});assert.equal(n,4);assert(r.partial);assert.equal(r.stage,'5');assert(!r.evidenceSufficient);
});
test('Later-page error, repeated page, unknown pagination and discarded rows preserve selected range',async()=>{
 for(const mode of ['error','repeat','unknown','discarded']){
  let n=0;const r=await findRecentMarket(belt(),settings,{now,fetcher:async url=>{n++;if(mode==='error'&&n===2)throw Error('503');return envelope(url,[listing(1)],mode==='discarded'?{discarded:1}:mode==='unknown'?{exhausted:false,hasMore:false}:{exhausted:false,hasMore:true});}});
  assert(r.partial,mode);assert.equal(r.stage,'5',mode);assert(!r.evidenceSufficient,mode);
 }
});
test('Successful exhaustion permits variable-only widening and freezes original draft',async()=>{
 const d=belt(),before=structuredClone(d);let contract;
 const r=await findRecentMarket(d,settings,{now,fetcher:async url=>{contract=JSON.parse(new URL(url,'https://audit.invalid').searchParams.get('q'));return envelope(url,[listing(1,{values:{prop_425:108}})]);}});
 assert(!r.partial);assert.equal(r.stage,'full');assert.equal(r.listings.length,1);assert.deepEqual(contract.ranges,[{property:'prop_425',min:90,max:120}]);assert.deepEqual(d,before);
});
test('Mismatched response contract and pre-cancelled requests never return a success',async()=>{
 await assert.rejects(()=>findRecentMarket(belt(),settings,{now,fetcher:async url=>envelope(url,[],{contract:{}})}),/조건/);
 const controller=new AbortController();controller.abort();let fetched=false;await assert.rejects(()=>findRecentMarket(belt(),settings,{now,signal:controller.signal,fetcher:async()=>{fetched=true;}}),{name:'AbortError'});assert(!fetched);
});
test('Client-side network timeout is visible and later-page timeout stays partial',async()=>{
 const stalled=async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 await assert.rejects(()=>findRecentMarket(belt(),settings,{now,requestTimeoutMs:5,fetcher:stalled}),/시간이 초과/);
 let n=0;const r=await findRecentMarket(belt(),settings,{now,requestTimeoutMs:5,fetcher:(url,init)=>++n===1?envelope(url,[listing()],{exhausted:false,hasMore:true}):stalled(url,init)});
 assert(r.partial);assert.equal(r.stage,'5');assert.match(r.error,/시간이 초과/);
});
