import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';
import {trainerAPI,adminAIAPI,publicAIValuation,neuralReviewNominations,boundedJson} from '../ai-service.mjs';
import {digest} from '../ai-contract.mjs';
import {artifactFixture,sampleFixture} from './ai-fixtures.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE review_candidates(id INTEGER PRIMARY KEY,status TEXT,evidence_json TEXT);');
 db.exec(fs.readFileSync(new URL('../migrations/0136_neural_learning.sql',import.meta.url),'utf8'));
 const env={DB:{prepare(sql){const stmt=db.prepare(sql);let args=[];return {bind(...a){args=a;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){const r=stmt.run(...args);return {meta:{changes:r.changes}}}}},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out}catch(error){db.exec('ROLLBACK');throw error}}}};
 return {db,env};
}
const token='b'.repeat(64);
const req=(path,body={},auth=token)=>new Request('https://fixture.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'Authorization':'Bearer '+auth}:{})},body:JSON.stringify(body)});
async function seed(db){
 db.prepare('INSERT INTO ai_settings VALUES(?,?)').run('trainer_token_hash',await digest(token));
 for(let i=1;i<=400;i++){
  const sample=sampleFixture(i,{life:(i%100)+1});
  db.prepare("INSERT INTO review_candidates(id,status) VALUES(?,'approved')").run(i);
  db.prepare('INSERT INTO ai_samples(candidate_id,listing_key,fingerprint,sample_hash,sample_json,eligible) VALUES(?,?,?,?,?,1)').run(i,sample.listing_key,sample.fingerprint,await digest(sample),JSON.stringify(sample));
 }
 db.prepare("UPDATE ai_settings SET value=(SELECT value FROM ai_settings WHERE key='review_revision') WHERE key='synced_revision'").run();
}
test('private data requires scoped token; admin controls require session; public fallback survives missing migration',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());await seed(db);
 assert.equal((await trainerAPI(req('/api/trainer/jobs',{},''),env)).status,401);
 assert.equal((await worker.fetch(req('/api/admin/ai/token'),env)).status,401);
 assert.equal((await publicAIValuation(req('/api/public/valuation',{context:sampleFixture(1).context}),env)).status,200);
 const body=await (await publicAIValuation(req('/api/public/valuation',{context:sampleFixture(1).context}),env)).json();assert.equal(body.status,'abstain');
 assert.equal((await worker.fetch(new Request('https://fixture.test/api/public/review-value-model'),env)).status,200);
});
test('job lease isolates holdout; real server recomputation promotes and rollback restores fallback',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());await seed(db);
 const job=await (await trainerAPI(req('/api/trainer/jobs'),env)).json();assert.equal(job.status,'ready');
 const key={job_id:job.job_id,lease:job.lease};
 assert.equal((await (await trainerAPI(req('/api/trainer/jobs'),env)).json()).status,'busy');
 const data=await (await trainerAPI(req('/api/trainer/data',key),env)).json();assert(data.rows.length>0);assert(data.rows.every(r=>r.fold!=='test'));
 assert.equal((await trainerAPI(req('/api/trainer/data',{...key,lease:'wrong'}),env)).status,400);
 const artifact=artifactFixture();
 assert.equal((await trainerAPI(req('/api/trainer/result',{...key,dataset_hash:job.dataset_hash,artifact:{...artifact,fixture_only:true}}),env)).status,400);
 const result=await (await trainerAPI(req('/api/trainer/result',{...key,dataset_hash:job.dataset_hash,artifact}),env)).json();
 assert.equal(result.status,'validated',JSON.stringify(result));assert.equal(result.active,true);
 const prediction=await (await publicAIValuation(req('/api/public/valuation',{context:sampleFixture(2).context}),env)).json();assert.equal(prediction.status,'applied');assert.equal(prediction.value_tier,1);
 assert(!JSON.stringify(prediction).includes('weights'));assert(!JSON.stringify(prediction).includes('wilson'));
 assert.equal((await trainerAPI(req('/api/trainer/result',{...key,dataset_hash:job.dataset_hash,artifact}),env)).status,400,'finished lease cannot be reused');
 await adminAIAPI(req('/api/admin/ai/rollback',{model_id:''}),env);
 assert.equal((await (await publicAIValuation(req('/api/public/valuation',{context:sampleFixture(2).context}),env)).json()).status,'abstain');
});
test('body limits, token rotation and pause are enforced',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());await seed(db);
 await assert.rejects(()=>boundedJson(req('/unused',{a:'x'.repeat(100)}),20),/too_large/);
 await adminAIAPI(req('/api/admin/ai/settings',{enabled:false}),env);
 assert.equal((await (await trainerAPI(req('/api/trainer/jobs'),env)).json()).status,'paused');
 const next=await (await adminAIAPI(req('/api/admin/ai/token'),env)).json();assert.match(next.token,/^[a-f0-9]{64}$/);
 assert.equal((await trainerAPI(req('/api/trainer/jobs'),env)).status,401);
 assert.equal((await trainerAPI(req('/api/trainer/jobs',{},next.token),env)).status,200);
});
test('changed reviews cancel stale training and invalidate an affected active model',async t=>{
 const {db,env}=fixture();t.after(()=>db.close());await seed(db);
 const job=await (await trainerAPI(req('/api/trainer/jobs'),env)).json();assert.equal(job.status,'ready');
 db.prepare("UPDATE review_candidates SET status='rejected' WHERE id=2").run();
 const result=await (await trainerAPI(req('/api/trainer/result',{job_id:job.job_id,lease:job.lease,dataset_hash:job.dataset_hash,artifact:artifactFixture()}),env)).json();
 assert.equal(result.status,'cancelled');assert.equal(result.active,false);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM ai_models').get().n,0);
 assert.equal((await (await trainerAPI(req('/api/trainer/jobs'),env)).json()).status,'waiting_sync');
 db.prepare("UPDATE ai_settings SET value='previous-model' WHERE key='active_model'").run();
 db.prepare('DELETE FROM review_candidates WHERE id=1').run();
 assert.equal(db.prepare("SELECT value FROM ai_settings WHERE key='active_model'").get().value,'');
});
