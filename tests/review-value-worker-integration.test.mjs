import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker,{reviewCandidate,runReviewedValueLearning,publicReviewedValueModel} from '../worker.js';
import {PARSER_VERSION} from '../traderie-integrity.mjs';

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE review_candidates (
   id INTEGER PRIMARY KEY,source_type TEXT,source_url TEXT,status TEXT,
   learning_eligible INTEGER,review_reason_type TEXT,reviewer_email TEXT,reviewer_note TEXT,
   reviewed_at TEXT,reviewer_tags_json TEXT,evidence_json TEXT,proposal_json TEXT);
  CREATE TABLE valuation_rules (
   id INTEGER PRIMARY KEY,rule_key TEXT UNIQUE,label TEXT,item_type TEXT,slot TEXT,
   priority INTEGER,rule_json TEXT,source_candidate_id INTEGER,active INTEGER,
   created_at TEXT DEFAULT (datetime('now')),updated_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE admin_audit_log (
   id INTEGER PRIMARY KEY,action TEXT,target_type TEXT,target_id INTEGER,
   detail_json TEXT,actor_email TEXT);
 `);
 const env={DB:{
  prepare(sql){const statement=db.prepare(sql);let args=[];return {
   bind(...values){args=values;return this},
   async all(){return {results:statement.all(...args)}},
   async first(){return statement.get(...args)||null},
   async run(){const result=statement.run(...args);return {meta:{changes:result.changes,last_row_id:Number(result.lastInsertRowid)}}}
  }},
  async batch(statements){const output=[];for(const statement of statements)output.push(await statement.run());return output}
 }};
 return {db,env};
}

function insertReview(db,id,{tag='value_high',actor='worker-session',complete=true,status='approved',value=10}={}){
 const evidence={source:'traderie',listing_id:String(id),slot:'ring',item_type:'레어',
  source_snapshot:{id:String(id)},source_snapshot_hash:'a'.repeat(64),
  integrity:{complete},parser_quality:{complete:true,property_coverage:1},
  price_structure:{complete:true,amount:1,currency:'Ist Rune'},
  affixes:{fcr:10,life:value}};
 db.prepare(`INSERT INTO review_candidates
  (id,source_type,source_url,status,learning_eligible,review_reason_type,
   reviewer_email,reviewed_at,reviewer_tags_json,evidence_json,proposal_json)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
   id,'market_observation',`https://traderie.com/diablo2resurrected/listing/${id}`,
   status,1,'approved_market_feedback',actor,`2026-09-${String(id).padStart(2,'0')} 12:00:00`,
   JSON.stringify([tag]),JSON.stringify([evidence]),JSON.stringify({slot:'ring',item_type:'레어'})
  );
}

test('human value reviews publish a separate validated model, not a scoring rule',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());
 for(let id=1;id<=8;id++)insertReview(db,id,{value:[10,12,14,16,18,15,13,17][id-1]});
 insertReview(db,9,{actor:'auto-policy',value:16,tag:'value_low'});
 insertReview(db,10,{complete:false,value:16,tag:'value_low'});
 const result=await runReviewedValueLearning(env,'test');
 assert.equal(result.active_models,1);
 assert.equal(result.diagnostics.independent,8);
 const publicResponse=await publicReviewedValueModel(env);
 const publicBody=await publicResponse.json();
 assert.equal(publicBody.models.length,1);
 assert.equal(publicBody.models[0].effects.learned_value_tier,2);
 assert.equal(publicBody.models[0].learning_meta.source,'reviewed_value');
 const ruleBody=await (await worker.fetch(new Request('https://fixture.test/api/public/rules'),env)).json();
 assert.equal(ruleBody.rules.length,0,'value labels must not become arbitrary score deltas');
});

test('failed later holdout deactivates a previously active model',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());
 for(let id=1;id<=8;id++)insertReview(db,id,{value:[10,12,14,16,18,15,13,17][id-1]});
 assert.equal((await runReviewedValueLearning(env,'test')).active_models,1);
 db.prepare('UPDATE review_candidates SET reviewer_tags_json=? WHERE id IN (7,8)')
  .run(JSON.stringify(['value_low']));
 assert.equal((await runReviewedValueLearning(env,'test')).active_models,0);
 assert.equal((await (await publicReviewedValueModel(env)).json()).models.length,0);
});

test('actual human review stores an explicit value label for the shared trainer',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());
 insertReview(db,1,{tag:'synergy_good'});
 const evidence=JSON.parse(db.prepare('SELECT evidence_json FROM review_candidates WHERE id=1').get().evidence_json);
 evidence[0].integrity.parser_version=PARSER_VERSION;
 const proposal={rule_key:'market_watch_fixture',label:'원본 가격 관측',slot:'ring',item_type:'레어',
  conditions:{fcr:{gte:10}},effects:{market_watch_only:true,score_delta:0,
   observed_price:{amount:1,currency:'Ist Rune'}}};
 db.prepare('UPDATE review_candidates SET status=?,learning_eligible=0,evidence_json=?,proposal_json=? WHERE id=1')
  .run('pending',JSON.stringify(evidence),JSON.stringify(proposal));
 const request=new Request('https://fixture.test/api/admin/review',{method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({id:1,action:'approve',tags:['value_high']})});
 const response=await reviewCandidate(request,env);
 assert.equal(response.status,200);
 const reviewed=db.prepare('SELECT status,learning_eligible,reviewer_tags_json FROM review_candidates WHERE id=1').get();
 assert.equal(reviewed.status,'approved');
 assert.equal(reviewed.learning_eligible,1);
 assert.deepEqual(JSON.parse(reviewed.reviewer_tags_json),['value_high']);
 assert.equal((await runReviewedValueLearning(env,'test')).diagnostics.accepted,1);
});
