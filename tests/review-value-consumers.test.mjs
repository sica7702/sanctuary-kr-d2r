import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ocrRuleContext} from '../public/archive/ocr-runtime-valuation.js';

const runtimeSource=fs.readFileSync(new URL('../public/archive/runtime-rules.js',import.meta.url),'utf8');
const model=(changes={})=>({
  slot:'ring',item_type:'레어',conditions:{fcr:{gte:10,lte:10},str:{gte:10,lte:20}},profile:{},
  effects:{learned_value_tier:2},
  learning_meta:{source:'reviewed_value',model_version:'review-value-v1',sample_count:32,holdout_accuracy:0.84,
    affix_keys:['fcr','str'],allowed_affix_keys:['fcr','str','life','mana','fire','sockets']},
  ...changes
});

async function runtime(models){
  const window={dispatchEvent(){},addEventListener(){}};
  const document={readyState:'complete',getElementById:()=>null};
  const fetch=async url=>({ok:true,json:async()=>url.includes('review-value-model')
    ?{ok:true,revision:'model-fixture',models}:{ok:true,revision:'rules-fixture',rules:[]}});
  vm.runInNewContext(runtimeSource,{window,document,fetch,CustomEvent:class{constructor(type,detail){this.type=type;this.detail=detail;}}});
  for(let i=0;i<20&&!window.SKR_RUNTIME_RULES.valueState.ready;i++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(window.SKR_RUNTIME_RULES.valueState.ready,true);
  return window.SKR_RUNTIME_RULES;
}

const ocrContext=()=>ocrRuleContext({slot:'반지',rarity:'레어',
  items:[{name:'시전 속도 증가',value:10},{name:'힘',value:15}],realm:'래더'});
const manualContext=()=>({slot:'ring',item_type:'레어',profile:{realm:'래더'},
  values:{fcr:10,str:15,life:0,mana:0,fire:0,sockets:0,reqlevel:87}});

test('photo and manual contexts receive the same reviewed value advice, not score rules',async()=>{
  const rules=await runtime([model()]);
  const photo=rules.evaluateValue(ocrContext()),manual=rules.evaluateValue(manualContext());
  assert.equal(photo.status,'learned');
  assert.equal(manual.status,'learned');
  assert.equal(photo.label,'높은 가치');
  assert.equal(manual.label,photo.label);
  assert.equal(photo.sample_count,32);
  assert.equal(manual.sample_count,32);
  assert.equal(rules.evaluate(ocrContext()).scoreDelta,0);
  assert.equal(rules.evaluate(manualContext()).scoreDelta,0);
});

test('a missing, out-of-range, additional, or unsupported option abstains',async()=>{
  const rules=await runtime([model()]);
  for(const values of [
    {fcr:10},
    {fcr:10,str:21},
    {fcr:10,str:15,life:20},
    {fcr:10,str:15,sockets:1},
    {fcr:10,str:15,energy:5}
  ])assert.equal(rules.evaluateValue({...manualContext(),values}).status,'abstain');
  assert.equal(rules.evaluateValue({...manualContext(),values:{fcr:10,str:16}}).status,'learned');
});

test('contradicting or malformed published patterns abstain',async()=>{
  const rules=await runtime([model(),model({effects:{learned_value_tier:0}})]);
  assert.equal(rules.evaluateValue(manualContext()).status,'abstain');
  const invalid=await runtime([model({learning_meta:{source:'reviewed_value',model_version:'review-value-v1',sample_count:32,holdout_accuracy:0.84,
    affix_keys:['fcr','str'],allowed_affix_keys:['fcr','str','reqlevel']}})]);
  assert.equal(invalid.evaluateValue(manualContext()).status,'abstain');
});

test('photo context maps only exact known modifiers and abstains on an unknown extra',async()=>{
  const ctx=ocrRuleContext({slot:'반지',rarity:'레어',items:[
    {name:'시전 속도 증가',value:10},{name:'힘',value:15},{name:'적에게서 얻는 금화 증가',value:30}
  ]});
  assert.equal(ctx.values.gf,30);
  const rules=await runtime([model()]);
  assert.equal(rules.evaluateValue(ctx).status,'abstain','an additional supported option cannot be ignored');
  const unknown=ocrRuleContext({slot:'반지',rarity:'레어',items:[
    {name:'시전 속도 증가',value:10},{name:'힘',value:15},{name:'미지원 새 옵션',value:1}
  ]});
  assert.equal(unknown.values.__unsupported,1);
  assert.equal(rules.evaluateValue(unknown).status,'abstain');
});
