import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.mjs';
import {runewordCandidates,parseContextEffect} from '../public/archive/option-intake.js';
import {evidenceLedger,reconcileOptions,matchAffixes,solveMagic} from '../public/archive/unified-core.js';

const option=(raw,pass='원본',conf=92)=>({text:raw,pass,conf});
test('룬워드 깨우침은 이름 또는 정확한 풀·랄·솔 순서에서만 찾는다',()=>{
 assert.deepEqual(runewordCandidates([option('깨우침')],data.records).map(r=>r.id),['runeword:33']);
 assert.deepEqual(runewordCandidates([option('풀 랄 솔')],data.records).map(r=>r.id),['runeword:33']);
 assert.deepEqual(runewordCandidates([option('Pul Ral Sol')],data.records).map(r=>r.id),['runeword:33']);
 assert.deepEqual(runewordCandidates([option('풀 솔 랄')],data.records).map(r=>r.id),[]);
});
test('발동 기술 레벨은 충전 횟수나 기술 보너스로 분류하지 않는다',()=>{
 for(const [text,code,param] of [
  ['타격 시 5% 확률로 15 레벨 화염구 시전','hit-skill','Fire Ball'],
  ['피격 시 5% 확률로 15 레벨 불길 시전','gethit-skill','Blaze']
 ]){
  const o=parseContextEffect(text,data);assert.equal(o.code,code);assert.equal(o.param,param);
  assert.equal(o.value,15);assert.equal(o.procChance,5);
 }
 assert.equal(parseContextEffect('타격 시 5% 확률로 레벨 화염구 시전',data),null);
 assert.equal(parseContextEffect('레벨 15 화염구 충전 (3/20)',data),undefined);
 const affix=parseContextEffect('타격 시 5% 확률로 1 레벨 화염탄 시전',data);
 assert.equal(affix.code,'hit-skill');assert.equal(affix.param,'36');assert.equal(affix.rangeUnverified,true);
});
test('룬 박힌 방어구의 방어력 증가와 정수 피해 감소를 구분한다',()=>{
 assert.deepEqual([parseContextEffect('방어력 +30% 증가',data),parseContextEffect('피해 감소 7',data)].map(x=>[x.code,x.value]),[['ac%',30],['red-dmg',7]]);
 assert.equal(parseContextEffect('방어력: 336',data),undefined);
 assert.equal(parseContextEffect('피해 3~7 감소',data),undefined);
});
test('여러 OCR 경로의 같은 옵션은 한 행; 값이 다르면 보류한다',()=>{
 const lines=[option('방어력 +30% 증가'),option('방어력 +6% 증가','글자색'),option('피해 감소 7'),option('피해 감소 1','대비'),option('방어력 +30% 증가','이진화')];
 const ledger=evidenceLedger(lines,text=>parseContextEffect(text,data));
 assert.equal(ledger.length,4);
 const rows=reconcileOptions(ledger);
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(x=>[x.code,x.value,x.conflict,x.alternatives]),[['ac%','',true,['30','6']],['red-dmg','',true,['7','1']]]);
 assert.equal(ledger[0].readings.length,2);
 ledger[1].status='ignored';ledger[3].status='ignored';
 assert.deepEqual(reconcileOptions(ledger).map(x=>[x.code,x.value,x.conflict]),[['ac%',30,false],['red-dmg',7,false]]);
});
test('미해석 수동 옵션 두 종류는 하나로 합쳐지지 않는다',()=>{
 const ledger=[{id:'a',status:'interpreted',options:[{name:'직접 옵션 A',value:1}]},{id:'b',status:'interpreted',options:[{name:'직접 옵션 B',value:2}]}];
 assert.equal(reconcileOptions(ledger).length,2);
});
test('레어·매직의 시전 속도 코드 변형은 별도 옵션으로 중복되지 않는다',()=>{
 const ledger=[
  {id:'a',status:'interpreted',options:[{name:'시전 속도 증가',code:'cast1',param:'',value:10}]},
  {id:'b',status:'interpreted',options:[{name:'시전 속도 증가',code:'cast3',param:'',value:10}]},
  {id:'c',status:'interpreted',options:[{name:'마나',code:'mana',param:'',value:80}]}
 ];
 assert.deepEqual(reconcileOptions(ledger).map(o=>[o.code,o.value,o.conflict]),[['cast1',10,false],['mana',80,false]]);
 ledger[1].options[0].value=20;
 assert.deepEqual(reconcileOptions(ledger)[0].alternatives,['10','20']);
});
test('DB의 0/빈 매개변수 별칭 21종은 같은 화면 옵션 한 개로 통합한다',()=>{
 const aliases=data.catalog.filter(c=>c.param==='0'&&data.catalog.some(other=>other.code===c.code&&other.param===''));
 assert.equal(aliases.length,21);
 for(const left of aliases){
  const right=data.catalog.find(c=>c.code===left.code&&c.param==='');
  const ledger=[
   {id:'original',status:'interpreted',options:[{name:left.label,code:left.code,param:left.param,value:26,catalogId:left.id}]},
   {id:'contrast',status:'interpreted',options:[{name:right.label,code:right.code,param:right.param,value:26,catalogId:right.id}]}
  ];
  const rows=reconcileOptions(ledger);
  assert.equal(rows.length,1,left.label);
  assert.equal(rows[0].value,26,left.label);
  assert.equal(rows[0].conflict,false,left.label);
 }
});
test('뜻이 다른 매개변수는 수치가 같아도 한 번만 보이고 자동 확정하지 않는다',()=>{
 const ledger=[
  {id:'a',status:'interpreted',options:[{name:'소켓',code:'sock',param:'3',value:3}]},
  {id:'b',status:'interpreted',options:[{name:'소켓',code:'sock',param:'4',value:3}]}
 ];
 const rows=reconcileOptions(ledger);
 assert.equal(rows.length,1);assert.equal(rows[0].value,'');assert.equal(rows[0].identityConflict,true);
});
test('동일 OCR 원문은 낮은 점수의 첫 판독 때문에 높은 점수의 후속 판독을 잃지 않는다',()=>{
 const lines=[option('화염 저항 +26%', '원본',30),option('화염 저항 +26%', '글자색',95)];
 const detect=(text,reading)=>reading.conf<40?null:{name:'화염 저항',code:'res-fire',param:'',value:26};
 const ledger=evidenceLedger(lines,detect);
 assert.equal(ledger.length,1);
 assert.equal(ledger[0].readings.length,2);
 assert.equal(ledger[0].status,'interpreted');
 assert.equal(reconcileOptions(ledger)[0].value,26);
});
test('정규화된 동일 화염 저항은 원본 매개변수가 0이어도 같은 접사 후보를 찾는다',()=>{
 const base=data.bases.find(b=>b.code==='rin');
 const find=param=>matchAffixes(data,base,'rare',null,[{name:'화염 저항',code:'res-fire',param,value:26}])[0].candidates.map(a=>a.name).sort();
 assert(find('').length>0);
 assert.deepEqual(find('0'),find(''));
 const pool=[{kind:'prefix',group:'resist',mods:[{code:'res-fire',param:'',min:20,max:30}]}];
 assert.equal(solveMagic([{code:'res-fire',param:'0',value:26}],pool).solutions.length,1);
});
