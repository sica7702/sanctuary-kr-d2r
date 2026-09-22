import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {snapshotListing} from '../traderie-integrity.mjs';
import {autoReviewRun,verifyAutoReviewSource} from '../worker.js';

test('auto review checks a second source fetch against the exact immutable snapshot',async()=>{
  const listing={id:123,item:{name:'Tiara'},quantity:1,prices:[{name:'Jah',quantity:2}],properties:[{name:'Life',value:30}],ladder:true,hardcore:false,platform:'PC',game_version:'rotw'};
  const snapshot=snapshotListing(listing);
  const hash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  const candidate={evidence_json:JSON.stringify([{listing_id:'123',source_snapshot:snapshot,source_snapshot_hash:hash}])};
  const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({listings:[listing]}),{status:200});
    assert.deepEqual(await verifyAutoReviewSource(candidate),{ok:true,hash});
    globalThis.fetch=async()=>new Response(JSON.stringify({listings:[{...listing,prices:[{name:'Jah',quantity:3}]}]}),{status:200});
    assert.deepEqual(await verifyAutoReviewSource(candidate),{ok:false,reason:'source_snapshot_changed'});
    globalThis.fetch=async()=>new Response('',{status:403});
    assert.deepEqual(await verifyAutoReviewSource(candidate),{ok:false,reason:'source_recheck_unavailable'});
  }finally{globalThis.fetch=oldFetch;}
});

test('auto review scans beyond the newest 200 and leaves incomplete captures untouched',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE review_candidates (
    id INTEGER PRIMARY KEY,status TEXT,source_type TEXT,source_url TEXT,dedupe_key TEXT,
    evidence_json TEXT,proposal_json TEXT,reviewed_at TEXT,reviewer_email TEXT,
    learning_eligible INTEGER,review_reason_type TEXT)`);
  const insert=db.prepare(`INSERT INTO review_candidates
    (id,status,source_type,source_url,evidence_json,proposal_json,reviewed_at,learning_eligible,review_reason_type)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  for(let id=1;id<=250;id++){
    const evidence={source:'traderie',listing_id:String(id),integrity:{complete:false,identity_complete:false},
      source_snapshot:{id},parser_quality:{complete:true},price_structure:{complete:true}};
    insert.run(id,'pending','market_observation',`https://traderie.com/diablo2resurrected/listing/${id}`,
      JSON.stringify([evidence]),'{}',null,0,null);
  }
  const env={DB:{prepare(sql){const statement=db.prepare(sql);let args=[];return {
    bind(...values){args=values;return this;},async all(){return {results:statement.all(...args)};},
    async first(){return statement.get(...args)||null;},async run(){return statement.run(...args)}
  };}}};
  try{
    const result=await autoReviewRun(env,{apply:true});
    assert.equal(result.pending_count,250);
    assert.equal(result.scanned,250);
    assert.equal(result.reparse_needed,250);
    assert.equal(result.reparse_eligible,250);
    assert.equal(result.eligible_count,0);
    assert.deepEqual(result.applied,[]);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM review_candidates WHERE status='pending'").get().n,250);
  }finally{db.close();}
});
