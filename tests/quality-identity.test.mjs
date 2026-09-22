import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './fixtures.mjs';
import {identityLines,uniqueCandidates,initQuality,enableRunewordQuality} from '../public/archive/quality-unique.js';

const line=(text,i,pass='원본')=>({text,i,pass});

test('option text containing a unique name cannot identify a rare item',()=>{
 const lines=[line('레어 투구',0),line('개별 기술 · 소용돌이',1)];
 assert.deepEqual(uniqueCandidates(lines,data.records).map(r=>r.id),[]);
 assert.deepEqual(uniqueCandidates([line('레어 투구',0),line('소용돌이',5)],data.records).map(r=>r.id),[]);
 assert.deepEqual(identityLines(lines).map(l=>l.text),['레어 투구']);
});

test('real item names and OCR name retries remain eligible',()=>{
 assert.deepEqual(uniqueCandidates([line('소용돌이 · 유 원드',0)],data.records).map(r=>r.name),['소용돌이']);
 assert.deepEqual(uniqueCandidates([line('마수',0,'명칭 한 줄 보완')],data.records).map(r=>r.name),['마수']);
 assert.deepEqual(uniqueCandidates([line('마수',7,'상단 명칭')],data.records).map(r=>r.name),['마수']);
 assert.deepEqual(uniqueCandidates([line('무지개 자락',0),line('화염 기술 피해 +5%',6),line('사망 시 발동',7)],data.records).map(r=>r.id),['unique:395']);
});

test('quality detection keeps set and runeword names, title color, and manual runeword choice',()=>{
 const elements={},handlers={};
 const q={value:'unknown',parentElement:{after(el){elements[el.id]=el;}},addEventListener(type,fn){(handlers[type]??=[]).push(fn);},insertAdjacentHTML(){}};
 const documentMock={getElementById(id){return id==='sourceQuality'?q:elements[id];},createElement(){return {id:'',textContent:'',value:'',hidden:false,innerHTML:'',setAttribute(){},insertAdjacentHTML(){}};},addEventListener(){}};
 const priorDocument=globalThis.document,priorWindow=globalThis.window;
 globalThis.document=documentMock;globalThis.window={};
 try{
  const api={getData:()=>data};
  initQuality(api);enableRunewordQuality(api);
  window.SKR_QUALITY.detect([line('레어 투구',0),line('개별 기술 · 소용돌이',1)],'rare');
  assert.equal(q.value,'rare');
  window.SKR_QUALITY.newImage();
  window.SKR_QUALITY.detect([line('배경 글자',0),line('표시 글자',1),line('반지',2),line('마수',5),line('마수',7,'상단 명칭')]);
  assert.equal(q.value,'unique');assert.equal(elements.uniqueIdentity.value,data.records.find(r=>r.name==='마수').id);
  window.SKR_QUALITY.newImage();
  const set=data.records.find(r=>r.kind==='세트');
  window.SKR_QUALITY.detect([line(set.name,0)]);
  assert.equal(q.value,'set');assert.equal(elements.uniqueIdentity.value,set.id);
  window.SKR_QUALITY.newImage();
  window.SKR_QUALITY.detect([line('깨우침',0),line('풀 랄 솔',1)]);
  assert.equal(q.value,'runeword');assert.equal(elements.uniqueIdentity.value,'runeword:33');
  window.SKR_QUALITY.newImage();
  window.SKR_QUALITY.detect([line('풀 랄 솔',1)]);
  assert.equal(q.value,'runeword');assert.equal(elements.uniqueIdentity.value,'runeword:33');
  window.SKR_QUALITY.newImage();
  q.value='runeword';for(const handler of handlers.change)handler();
  window.SKR_QUALITY.detect([line('마수',0)],'rare');
  assert.equal(q.value,'runeword');
  assert.match(elements.qualityStatus.textContent,/직접 선택한/);
 }finally{
  if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;
  if(priorWindow===undefined)delete globalThis.window;else globalThis.window=priorWindow;
 }
});
