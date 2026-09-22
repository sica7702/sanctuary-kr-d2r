import test from 'node:test';
import assert from 'node:assert/strict';
import {ocrRuleContext,evaluateOcrRules,adjustedOcrScore,ocrGrade} from '../public/archive/ocr-runtime-valuation.js';

const state=rules=>({ready:true,online:true,revision:'review-1',rules});
const rule=(changes={})=>({
 rule_key:'feedback:auto:ring:fcr',label:'검수 승인 패캐링',item_type:'레어',slot:'ring',
 conditions:{fcr:{gte:10}},profile:{},effects:{score_delta:3},...changes
});
const context=(changes={})=>ocrRuleContext({
 slot:'반지',rarity:'레어',items:[{name:'시전 속도 증가',value:10}],
 realm:'래더',socketState:'auto',reqlevel:'',...changes
});

test('approved rule adjusts only matching photo appraisal',()=>{
 const applied=evaluateOcrRules(state([rule()]),context());
 assert.equal(applied.scoreDelta,3);
 assert.equal(applied.matched.length,1);
 assert.equal(adjustedOcrScore(62,applied.scoreDelta),65);
 assert.equal(ocrGrade(65),'A');
 assert.equal(evaluateOcrRules(state([rule()]),context({rarity:'매직'})).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule()]),context({slot:'목걸이'})).scoreDelta,0);
});

test('rare, magic, crafted and base item types do not share valuation rules',()=>{
 const magicRule=rule({rule_key:'review:magic:ring',item_type:'매직',effects:{score_delta:2}});
 const craftRule=rule({rule_key:'review:craft:ring',item_type:'크래프트',effects:{score_delta:4}});
 assert.equal(evaluateOcrRules(state([magicRule,craftRule]),context({rarity:'레어'})).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([magicRule,craftRule]),context({rarity:'매직'})).scoreDelta,2);
 assert.equal(evaluateOcrRules(state([magicRule,craftRule]),context({rarity:'크래프트'})).scoreDelta,4);
 assert.equal(evaluateOcrRules(state([magicRule,craftRule]),context({rarity:'일반'})).scoreDelta,0);
});

test('missing or conflicting OCR values cannot satisfy numeric conditions',()=>{
 assert.equal(evaluateOcrRules(state([rule()]),context({items:[]})).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule()]),context({items:[{name:'시전 속도 증가',value:10},{name:'시전 속도 증가',value:20}]})).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule()]),context({items:[{name:'시전 속도 증가',value:10,conflict:true}]})).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule({conditions:{sockets:{lte:0}}})]),context()).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule({conditions:{sockets:{lte:0}}})]),context({socketState:'0'})).scoreDelta,3);
});

test('single-listing market observations never affect a photo score',()=>{
 for(const market of [
  rule({rule_key:'market_watch_abc',effects:{score_delta:20}}),
  rule({effects:{score_delta:20,market_watch_only:true}}),
  rule({effects:{score_delta:20,tags:['market-observation']}})
 ])assert.equal(evaluateOcrRules(state([market]),context()).scoreDelta,0);
});

test('all resistance is not counted twice as an elemental premium',()=>{
 const ctx=context({items:[{name:'모든 저항',value:11},{name:'화염 저항',value:30}]});
 assert.equal(ctx.values.allres,11);
 assert.equal(ctx.values.fire,19);
 const inferred=context({items:[{name:'화염 저항',value:30}],resistInference:{allres:10,extras:{'화염 저항':20}}});
 assert.equal(inferred.values.allres,10);
 assert.equal(inferred.values.fire,20);
});

test('unknown profile, offline API, and malformed numeric criteria fail closed',()=>{
 const profileRule=rule({profile:{build:{eq:'캐스터'}}});
 const malformedRule=rule({conditions:{fcr:{gte:'broken'}}});
 assert.equal(evaluateOcrRules(state([profileRule]),context()).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([malformedRule]),context()).scoreDelta,0);
 assert.equal(evaluateOcrRules({ready:true,online:false,rules:[rule()]},context()).scoreDelta,0);
 assert.equal(adjustedOcrScore(99,30),100);
 assert.equal(adjustedOcrScore(100,0),100);
});

test('class-skill rules require an exact approved class identity',()=>{
 const skillContext=context({slot:'목걸이',items:[{name:'원소술사 기술 레벨',value:2}]});
 const vague=rule({slot:'amulet',conditions:{classskill:{gte:2}}});
 assert.equal(evaluateOcrRules(state([vague]),skillContext).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule({...vague,profile:{char:{eq:'아마존'}}})]),skillContext).scoreDelta,0);
 assert.equal(evaluateOcrRules(state([rule({...vague,profile:{char:{eq:'소서리스'}}})]),skillContext).scoreDelta,3);
});
