import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const archive=new URL('../public/archive/',import.meta.url);
const read=n=>fs.readFileSync(new URL(n,archive),'utf8');
const builds=JSON.parse(read('build-guides.json')).builds,skills=JSON.parse(read('build-skills.json'));
const sandbox={};vm.createContext(sandbox);
for(const file of ['build-engine.js','build-progression.js'])vm.runInContext(read(file),sandbox);
const {SKRBuildProgress:P,SKRBuildEngine:engine}=sandbox;
const view=id=>P.prepare(builds.find(b=>b.id===id));
test('all 50 builds / 8 classes have four distinct complete stages, unique equipment slots, sources and mercenaries',()=>{
 assert.equal(builds.length,50);assert.equal(new Set(builds.map(b=>b.class)).size,8);assert.equal(Object.keys(P.profiles).length,50);
 const snapshot=JSON.stringify(builds);
 for(const b of builds){
  const v=P.prepare(b);assert.equal(v.stages.length,4);assert.equal(new Set(v.stages.map(s=>s.id)).size,4);
  assert(v.sourceUrl.startsWith('https://www.icy-veins.com/d2/'));assert.equal(v.reviewedAt,'2026-09-21');assert(v.profile.gate.length>20);
  for(const s of v.stages){
   assert.equal(s.gear.length,10,b.id+'/'+s.id);assert.equal(new Set(s.gear.map(g=>g.slot)).size,10);
   assert(s.goals.length>=3);assert(s.plan.priority.length);
   for(const g of s.gear)assert(g.name&&g.role,b.id+'/'+s.id+'/'+g.slot);
   for(const k of ['act','aura','weapon','helm','armor','purpose'])assert(s.merc[k],b.id+'/'+s.id+'/'+k);
  }
  assert.notEqual(JSON.stringify(v.stages[0].gear),JSON.stringify(v.stages[3].gear));
 }
 assert.equal(JSON.stringify(builds),snapshot,'editorial projection never mutates original build DB');
});
test('1200 allocation scenarios preserve level limits, prerequisites, point budgets and per-skill caps',()=>{
 let scenarios=0;
 for(const b of builds)for(const stage of P.prepare(b).stages)for(const level of [1,18,30,65,90,99]){
  const catalog=skills.filter(s=>s.class===b.class),byId=new Map(catalog.map(s=>[s.id,s])),a=engine.allocate(catalog,stage.plan,level,12);
  assert.equal(a.budget,level-1+12);assert(a.spent<=a.budget);assert(a.left>=0);
  for(const[id,rank]of Object.entries(a.points)){
   const s=byId.get(id);assert(s,id);assert(rank<=20);assert(rank<=level-s.unlock+1);
   for(const prereq of s.requires)assert(a.points[prereq]>0,id+' needs '+prereq);
  }
  scenarios++;
 }assert.equal(scenarios,1200);
});
test('gated builds keep an explicit viable bridge path before buying their defining gear',()=>{
 for(const id of ['mosaic-assassin','tesladin','nova-sorceress','lightning-spearzon','bear-sorceress']){
  const v=view(id);assert(v.stages[1].isLeveling,id);assert(v.stages[1].route!==v.build.name,id);
  const stage=v.stages[2];assert(!stage.isLeveling);assert(stage.gear.some(g=>/모자이크|꿈|무한/.test(g.name)));
 }
 const m=view('mosaic-assassin').stages[2];assert.equal(m.gear.filter(g=>g.name==='모자이크').length,2);
});
test('equipment and mercenary critical combinations are explicit and do not silently conflict',()=>{
 for(const id of ['nova-sorceress','lightning-spearzon'])for(const stage of view(id).stages.slice(2)){
  assert.match(stage.gear.find(g=>g.slot==='offhand').name,/양손/);
  assert.equal(stage.merc.weapon,'통찰');
 }
 for(const id of ['echoing-warlock','cleave-warlock','fire-warlock','blood-boil-warlock'])for(const s of view(id).stages.slice(2)){
  assert.match(s.gear.find(g=>g.slot==='offhand').name,/마법서|아르스/);
 }
 for(const id of ['berserk-horker','corpse-explosion','summon-necromancer','poison-necromancer'])for(const s of view(id).stages.slice(1))assert.notEqual(s.merc.aura,'신성한 빙결');
 for(const id of ['kicksin','smiter','avenger'])for(const s of view(id).stages.slice(2))assert.notEqual(s.merc.weapon,'사신의 종소리');
 assert.equal(view('nova-sorceress').stages[3].merc.helm,'치료');assert.equal(view('nova-sorceress').stages[3].merc.armor,'명예의 굴레');
});
test('patch-specific guide corrections are confined to editorial layer',()=>{
 assert.equal(view('abyss-warlock').build.priority.find(([id])=>id==='Enhanced Entropy')[1],1);
 const cold=view('holy-freeze-zealot');assert(cold.stages[1].plan.priority.some(([id])=>id==='Holy Freeze'));
 assert(cold.stages[3].plan.priority.some(([id])=>id==='Fanaticism'));
 assert.equal(cold.stages[3].merc.aura,'위세');
 assert.match(cold.stages[1].aura,/직접 켭니다/);
 assert(!cold.stages[0].aura);
 assert.match(cold.stages[1].rotation[0],/신성한 빙결/);
 assert.match(view('tesladin').stages[0].upgrade[0],/주운 무기/);
 assert.match(view('nova-sorceress').stages[1].focus,/눈보라/);
 assert(read('build-publishing.js').includes('모두 직접 실측한 결과'));
 assert(read('build-publishing.js').includes('전용 최신 실측 자료가 충분하지 않아'));
 assert(!read('build-progression.js').includes('localStorage'));
});
