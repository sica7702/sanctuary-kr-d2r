import test from 'node:test';
import assert from 'node:assert/strict';
import {belt,listing,now,data,map,catalog} from './fixtures.mjs';
import {chooseRecentMatches,listingComparison,searchConstraints} from '../public/archive/market-search.js';
import {tradeDraft} from '../public/archive/trade-draft.js';
import {connectTraderie} from '../public/archive/traderie-connect.js';

test('미해석 OCR 원문은 검색을 유지하되 충분한 동일 옵션 가격 근거를 보류한다',()=>{
 const listings=Array.from({length:5},(_,i)=>listing(i+1));
 const confirmed=belt(),partial={...confirmed,unresolvedLines:['해석되지 않은 아이템 원문']};
 const fullResult=chooseRecentMatches(confirmed,listings,{now,start:'exact'});
 const partialResult=chooseRecentMatches(partial,listings,{now,start:'exact'});
 assert.equal(fullResult.evidenceSufficient,true);
 assert.equal(fullResult.partialOptions,false);
 assert.equal(listingComparison(partial,listings[0],'exact').matches,true);
 assert.equal(partialResult.listings.length,5);
 assert.equal(partialResult.partialOptions,true);
 assert.equal(partialResult.evidenceSufficient,false);
});

test('옵션 종류 충돌은 거래 초안에서도 미인식이 아닌 충돌로 표시한다',()=>{
 const ledger=[
  {id:'a',status:'interpreted',raw:'소켓 3',options:[{name:'소켓',code:'sock',param:'3',value:3}]},
  {id:'b',status:'interpreted',raw:'소켓 4',options:[{name:'소켓',code:'sock',param:'4',value:3}]}
 ];
 const draft=connectTraderie(tradeDraft({result:{},data,ledger,quality:'rare',baseCode:'rin'}),map,catalog);
 assert.equal(draft.options[0].identityConflict,true);
 assert.equal(draft.options[0].value,'');
 assert.equal(searchConstraints(draft,'exact')[0].state,'conflict');
});
