import {searchConstraints,stageOrder,searchStageLabels} from './market-search.js?v=129';
import {filterParams,validateContract,remoteStateNotes,MARKET_SCHEMA} from './market-contract.js?v=123';
const strict=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export function connectTraderie(draft,map,catalog){
 const quality=['unique','set'].includes(draft.quality)?draft.quality:'base';
 const pool=catalog?.items||map.items||[];
 const direct=catalog?.byRecord?.[draft.itemId];
 const matches=pool.filter(i=>strict(i.name)===strict(draft.englishName)&&i.quality===quality);
 const distinct=[...new Map(matches.map(i=>[String(i.id),i])).values()];
 const item=direct&&direct.quality===quality?direct:distinct.length===1?distinct[0]:null;
 const options=draft.options.map(o=>({...o,traderie:map.parameterProperties?.[o.code+'|'+(o.param??'')]||map.properties[o.code]||null}));
 return {...draft,options,traderieItem:item,mappingSource:catalog?.source||map.source,mappingStatus:item?'linked':'unsupported'};
}
export function searchContract(draft,stage='5'){
 const rows=searchConstraints(draft,stage);
 const ranges=rows.filter(r=>r.min!=null&&r.max!=null).map(r=>({property:r.property,min:r.min,max:r.max}));
 return validateContract({schema:MARKET_SCHEMA,itemId:draft.traderieItem?.id,quality:draft.quality,market:draft.market,identity:draft.identity||{},ranges});
}
export function marketUrl(draft,{stage='5',recent=false}={}){
 if(!draft.traderieItem)throw Error('이 품목의 트레더리 상품 연결을 확인하지 못했습니다. 다른 상품으로 대신 검색하지 않습니다.');
 const contract=searchContract(draft,stage),constraints=searchConstraints(draft,stage),params=filterParams(contract);
 const unapplied=constraints.filter(r=>['unread','unmapped','out-of-range','conflict','compound'].includes(r.state));
 return {url:'https://traderie.com/diablo2resurrected/product/'+encodeURIComponent(draft.traderieItem.slug)+(recent?'/recent':'')+'?'+params.toString().replace(/\+/g,'%20'),
  contract,constraints,stage,unsupported:unapplied.map(r=>r.name),unapplied,remoteStateNotes:remoteStateNotes(contract),liveVerified:false,
  manualFilters:['열린 화면에서 필터 적용 상태','등록일/완료일','가격의 수량 기준']};
}
export function marketSearchPlan(draft,{start='5',recent=false}={}){
 return stageOrder(start).map(stage=>({...marketUrl(draft,{stage,recent}),label:searchStageLabels[stage]}));
}
