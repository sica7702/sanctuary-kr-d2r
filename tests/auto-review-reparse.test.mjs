import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {refreshPendingReviewCandidates} from '../worker.js';

test('hourly reparse upgrades a bounded set of old pending captures from the live source',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE review_candidates (id INTEGER PRIMARY KEY,status TEXT,source_type TEXT,source_url TEXT,title TEXT,evidence_json TEXT,proposal_json TEXT,learning_eligible INTEGER)');
  db.exec('CREATE TABLE admin_audit_log (action TEXT,target_type TEXT,target_id INTEGER,detail_json TEXT,actor_email TEXT)');
  const insert=db.prepare('INSERT INTO review_candidates (id,status,source_type,source_url,title,evidence_json,proposal_json,learning_eligible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for(let id=1;id<=4;id++)insert.run(id,'pending','market_observation',
    'https://traderie.com/diablo2resurrected/listing/'+id,'old',
    JSON.stringify([{source:'traderie',listing_id:String(id),integrity:{complete:false}}]),'{}',0);
  const env={DB:{
    prepare(sql){
      const statement=db.prepare(sql);let args=[];
      return {bind(...values){args=values;return this},
        async all(){return {results:statement.all(...args)}},
        async first(){return statement.get(...args)||null},
        async run(){const result=statement.run(...args);return {meta:{changes:result.changes}}}};
    },
    async batch(statements){
      const results=[];
      for(const statement of statements)results.push(await statement.run());
      return results;
    }
  }};
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async url=>{
    const id=Number(new URL(String(url)).searchParams.get('id'));
    const listing={id,item:{name:'Rare Ring',rarity:'rare'},platform:'PC',game_version:'rotw',ladder:true,hardcore:false,
      prices:[{group:0,name:'Jah Rune',quantity:2}],
      properties:[{property:'10% Faster Cast Rate',type:'number',number:10}]};
    return new Response(JSON.stringify({listings:[listing]}),{status:200});
  };
  try{
    const first=await refreshPendingReviewCandidates(env,{limit:3,now:0});
    assert.equal(first.attempted,3);
    assert.equal(first.complete,3);
    assert.equal(first.failed,0);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM review_candidates WHERE json_extract(evidence_json,'$[0].integrity.complete')=1").get().n,3);
    const second=await refreshPendingReviewCandidates(env,{limit:3,now:3600000});
    assert.equal(second.attempted,1);
    assert.equal(second.complete,1);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM review_candidates WHERE status='pending'").get().n,4);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM review_candidates WHERE json_extract(evidence_json,'$[0].integrity.complete')=1").get().n,4);
  }finally{globalThis.fetch=oldFetch;db.close()}
});
