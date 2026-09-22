import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {PARSER_VERSION} from '../traderie-integrity.mjs';
import {reviewCandidate} from '../worker.js';

const hash='a'.repeat(64);
function fixture(race=false){
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE review_candidates (id INTEGER PRIMARY KEY,status TEXT,source_type TEXT,source_url TEXT,
    evidence_json TEXT,proposal_json TEXT,item_type TEXT,reviewed_at TEXT,reviewer_email TEXT,reviewer_note TEXT,
    reviewer_tags_json TEXT,learning_eligible INTEGER,review_reason_type TEXT);
    CREATE TABLE valuation_rules (rule_key TEXT UNIQUE,label TEXT,item_type TEXT,slot TEXT,priority INTEGER,
    rule_json TEXT,source_candidate_id INTEGER,active INTEGER,updated_at TEXT);
    CREATE TABLE admin_audit_log (action TEXT,target_type TEXT,target_id INTEGER,detail_json TEXT,actor_email TEXT);`);
  const evidence={source:'traderie',listing_id:'42',item_type:'레어',slot:'ring',base_name:'Ring',
    source_snapshot_hash:hash,source_snapshot:{id:42,quantity:1},
    integrity:{parser_version:PARSER_VERSION,complete:true,options_complete:true,price_complete:true,identity_complete:true,issues:[]},
    parser_quality:{complete:true,property_coverage:1,critical_missing:[]},price_structure:{complete:true,amount:1,currency:'Jah'}};
  const proposal={rule_key:'market_watch_42',label:'Market watch',item_type:'레어',slot:'ring',priority:5,
    parser_quality:evidence.parser_quality,conditions:{life:{gte:30}},
    effects:{score_delta:0,market_watch_only:true,observed_price:{amount:1,currency:'Jah'}}};
  db.prepare(`INSERT INTO review_candidates (id,status,source_type,source_url,evidence_json,proposal_json,item_type)
    VALUES (42,'pending','market_observation','https://traderie.com/diablo2resurrected/listing/42',?,?,?)`)
    .run(JSON.stringify([evidence]),JSON.stringify(proposal),'레어');
  let injected=false;
  const env={DB:{prepare(sql){const statement=db.prepare(sql);let args=[];return {
    bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},
    async run(){const result=statement.run(...args);return {meta:{changes:result.changes}};}
  };},async batch(statements){
    if(race&&!injected){db.prepare("UPDATE review_candidates SET status='rejected' WHERE id=42").run();injected=true;}
    const results=[];for(const statement of statements)results.push(await statement.run());return results;
  }}};
  return {db,env};
}
const request=()=>new Request('https://internal.invalid/api/admin/review',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({id:42,action:'approve',note:'validated cohort'})});

test('atomic automatic approval writes only a market-watch rule and auto audit',async()=>{
  const {db,env}=fixture();
  try{
    const response=await reviewCandidate(request(),env,{auto:true,sourceVerifiedHash:hash});
    assert.equal(response.status,200);
    assert.equal(db.prepare("SELECT status FROM review_candidates WHERE id=42").get().status,'approved');
    assert.equal(db.prepare('SELECT learning_eligible FROM review_candidates WHERE id=42').get().learning_eligible,0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM valuation_rules').get().n,1);
    assert.equal(db.prepare('SELECT actor_email FROM admin_audit_log').get().actor_email,'auto-policy');
  }finally{db.close();}
});

test('a concurrent human disposition blocks automatic rule and audit writes',async()=>{
  const {db,env}=fixture(true);
  try{
    const response=await reviewCandidate(request(),env,{auto:true,sourceVerifiedHash:hash});
    assert.equal(response.status,409);
    assert.equal(db.prepare("SELECT status FROM review_candidates WHERE id=42").get().status,'rejected');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM valuation_rules').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM admin_audit_log').get().n,0);
  }finally{db.close();}
});
