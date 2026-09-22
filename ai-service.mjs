import {sampleFromCandidate,splitDataset} from './ai-dataset.mjs';
import {AI_SCHEMA,FEATURE_NAMES,TIERS,digest,checkArtifact,infer,canonicalContext,family} from './ai-contract.mjs';
import {validateModel,PROMOTION_POLICY} from './ai-validation.mjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const get=async(env,key,fallback='')=>(await env.DB.prepare('SELECT value FROM ai_settings WHERE key=?').bind(key).first())?.value??fallback;
const put=(env,key,value)=>env.DB.prepare('INSERT INTO ai_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,String(value));
const audit=(env,action,detail)=>env.DB.prepare('INSERT INTO ai_audit(action,detail_json) VALUES(?,?)').bind(action,JSON.stringify(detail));
export async function boundedJson(request,max=1200000) {
  if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('json_required');
  const reader=request.body?.getReader();if(!reader)throw new Error('body_required');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('body_too_large')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function safeTokenEqual(provided,expected) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(expected),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(expected));
  return crypto.subtle.verify('HMAC',key,sig,new TextEncoder().encode(provided));
}
export async function trainerAuthorized(request,env) {
  const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return false;
  const expected=await get(env,'trainer_token_hash');
  return !!expected&&await safeTokenEqual(await digest(token),expected);
}
export async function syncCandidateForAI(env,id) {
  const row=await env.DB.prepare('SELECT * FROM review_candidates WHERE id=?').bind(id).first();
  if(!row)return;
  const sample=await sampleFromCandidate(row);
  await sampleStatement(env,sample,await digest(sample)).run();
}
function sampleStatement(env,sample,hash) {
  return env.DB.prepare(`INSERT INTO ai_samples(candidate_id,listing_key,fingerprint,sample_hash,sample_json,eligible,reason) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(candidate_id) DO UPDATE SET listing_key=excluded.listing_key,fingerprint=excluded.fingerprint,sample_hash=excluded.sample_hash,
    sample_json=excluded.sample_json,eligible=excluded.eligible,reason=excluded.reason,updated_at=datetime('now') WHERE ai_samples.sample_hash<>excluded.sample_hash`)
    .bind(sample.candidate_id,sample.listing_key,sample.fingerprint||'',hash,JSON.stringify(sample),+sample.eligible,sample.reason||null);
}
export async function syncAIPage(env) {
  const cursor=Number(await get(env,'sync_cursor','0'));
  const revision=await get(env,'review_revision','0');
  if(cursor===0)await put(env,'sync_started_revision',revision).run();
  const {results=[]}=await env.DB.prepare('SELECT * FROM review_candidates WHERE id>? ORDER BY id LIMIT 30').bind(cursor).all();
  const statements=[];
  for(const row of results){const sample=await sampleFromCandidate(row);statements.push(sampleStatement(env,sample,await digest(sample)))}
  const next=results.length===30?Number(results.at(-1).id):0;
  statements.push(put(env,'sync_cursor',next));
  if(next===0)statements.push(env.DB.prepare("UPDATE ai_settings SET value=(SELECT value FROM ai_settings WHERE key='sync_started_revision') WHERE key='synced_revision' AND (SELECT value FROM ai_settings WHERE key='review_revision')=(SELECT value FROM ai_settings WHERE key='sync_started_revision')"));
  await env.DB.batch(statements);
  return {read:results.length,next,complete:next===0};
}
async function activeModel(env) {
  if(await get(env,'enabled')!=='true')return null;
  const id=await get(env,'active_model');if(!id)return null;
  const row=await env.DB.prepare('SELECT * FROM ai_models WHERE id=? AND passed=1').bind(id).first();
  return row?{id,artifact:JSON.parse(row.artifact_json),metrics:JSON.parse(row.metrics_json),created_at:row.created_at}:null;
}
export async function publicAIValuation(request,env) {
  if(request.method!=='POST')return reply({status:'abstain'},405);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({status:'abstain'},403);
  try {
    const body=await boundedJson(request,16000),active=await activeModel(env);
    if(!active||!active.metrics.tasks.value.passed)return reply({status:'abstain',reason:'no_validated_model'});
    if(Date.now()-Date.parse(active.created_at.replace(' ','T')+'Z')>90*86400000)return reply({status:'abstain',reason:'model_expired'});
    const normalized=canonicalContext(body.context);
    if(!normalized||!active.metrics.tasks.value.families?.includes(family(normalized)))return reply({status:'abstain',reason:'unvalidated_item_family'});
    const p=infer(active.artifact,body.context);
    // Never expose weights, training examples, support ranges or evaluation metrics.
    return reply(p.status==='predicted'?{status:'applied',value_tier:p.label,label:TIERS[p.label],reason:'검수 데이터로 학습·검증한 가치 분류입니다. 확정 거래 가격은 아닙니다.'}:{status:'abstain',reason:p.reason});
  }catch(error){console.error(JSON.stringify({event:'ai_valuation_unavailable',error:String(error.message).slice(0,120)}));return reply({status:'abstain',reason:'model_unavailable'})}
}
export async function neuralReviewDecision(env,row) {
  const active=await activeModel(env);if(!active?.metrics.tasks.review.passed)return null;
  if(Date.now()-Date.parse(active.created_at.replace(' ','T')+'Z')>90*86400000)return null;
  const sample=await sampleFromCandidate(row);if(!sample.eligible||!active.metrics.tasks.review.families?.includes(sample.family))return null;
  const p=infer(active.artifact,sample.context,'review');
  return p.status==='predicted'?{action:p.label?'approve':'reject',confidence:p.confidence,model_id:active.id}:null;
}
export async function neuralReviewNominations(env) {
  const active=await activeModel(env);if(!active?.metrics.tasks.review.passed)return [];
  if(Date.now()-Date.parse(active.created_at.replace(' ','T')+'Z')>90*86400000)return [];
  const cursor=Number(await get(env,'review_cursor','0'));
  const {results=[]}=await env.DB.prepare("SELECT * FROM review_candidates WHERE status='pending' AND id>? ORDER BY id LIMIT 30").bind(cursor).all();
  const nominations=[];
  for(const row of results){
    const sample=await sampleFromCandidate(row);if(!sample.eligible||!active.metrics.tasks.review.families?.includes(sample.family))continue;
    const p=infer(active.artifact,sample.context,'review');
    if(p.status==='predicted')nominations.push({id:row.id,action:p.label?'approve':'reject',model_id:active.id,evidence_json:row.evidence_json});
    if(nominations.length===3)break;
  }
  await put(env,'review_cursor',nominations.length===3?nominations.at(-1).id:results.length===30?results.at(-1).id:0).run();
  return nominations;
}
async function createJob(env) {
  if(await get(env,'enabled')!=='true')return reply({status:'paused'});
  const revision=await get(env,'review_revision','0');
  if(await get(env,'synced_revision','-1')!==revision)return reply({status:'waiting_sync',reason:'reviews_changed_sync_required'});
  const now=Date.now();
  await env.DB.prepare("UPDATE ai_jobs SET status='expired',error='lease_expired' WHERE status='running' AND lease_until<?").bind(now).run();
  if(await env.DB.prepare("SELECT id FROM ai_jobs WHERE status='running' LIMIT 1").first())return reply({status:'busy'});
  // Bounded rolling window: larger archives keep learning, raw history is retained.
  const {results=[]}=await env.DB.prepare("SELECT a.sample_json FROM ai_samples a JOIN review_candidates r ON r.id=a.candidate_id WHERE a.eligible=1 ORDER BY COALESCE(json_extract(a.sample_json,'$.reviewed_at'),json_extract(a.sample_json,'$.observed_at')) DESC,a.candidate_id DESC LIMIT 2000").all();
  const previous=JSON.parse(await get(env,'fold_assignments','{}'));
  const {dataset,hash,assignments}=await splitDataset(results.map(r=>JSON.parse(r.sample_json)),previous);
  if(dataset.train.length<8)return reply({status:'waiting_data',reason:'need_eight_independent_training_items',training:dataset.train.length});
  const existing=await env.DB.prepare("SELECT status FROM ai_jobs WHERE dataset_hash=? AND status IN ('completed','rejected') LIMIT 1").bind(hash).first();
  if(existing)return reply({status:'unchanged'});
  const id=crypto.randomUUID(),lease=crypto.randomUUID(),leaseHash=await digest(lease),rows=[];
  for(const fold of ['train','calibration','test'])for(const sample of dataset[fold])rows.push({fold,sample});
  const meta={schema:AI_SCHEMA,features:FEATURE_NAMES,review_revision:revision,active_at_start:await get(env,'active_model'),sample_count:rows.length,selection:'latest_2000_eligible_then_independent_groups'};
  const statements=[env.DB.prepare("INSERT INTO ai_jobs(id,dataset_hash,status,lease_hash,lease_until,dataset_json) VALUES(?,?,'running',?,?,?)").bind(id,hash,leaseHash,now+15*60000,JSON.stringify(meta)),put(env,'fold_assignments',JSON.stringify(assignments))];
  for(let i=0;i<rows.length;i+=100)statements.push(env.DB.prepare(`INSERT INTO ai_job_samples(job_id,position,fold,sample_json)
    SELECT ?,?+CAST(key AS INTEGER),json_extract(value,'$.fold'),json_extract(value,'$.sample') FROM json_each(?)`).bind(id,i,JSON.stringify(rows.slice(i,i+100))));
  statements.push(audit(env,'job_started',{id,hash,counts:Object.fromEntries(['train','calibration','test'].map(f=>[f,dataset[f].length]))}));
  try{await env.DB.batch(statements)}catch(error){if(String(error).includes('UNIQUE'))return reply({status:'busy'});throw error}
  return reply({status:'ready',job_id:id,lease,dataset_hash:hash,schema:AI_SCHEMA,features:FEATURE_NAMES});
}
async function jobLease(env,body) {
  if(!/^[a-f0-9-]{36}$/.test(body?.job_id||'')||typeof body.lease!=='string')throw new Error('invalid_lease');
  const row=await env.DB.prepare("SELECT * FROM ai_jobs WHERE id=? AND status='running' AND lease_until>?").bind(body.job_id,Date.now()).first();
  if(!row||!await safeTokenEqual(await digest(body.lease),row.lease_hash))throw new Error('invalid_lease');
  return row;
}
async function finishJob(env,body) {
  const job=await jobLease(env,body),artifact=checkArtifact(body.artifact);
  if(artifact.fixture_only)throw new Error('fixture_model_cannot_be_deployed');
  if(body.dataset_hash!==job.dataset_hash)throw new Error('dataset_hash_mismatch');
  const meta=JSON.parse(job.dataset_json);
  if(meta.review_revision!==await get(env,'review_revision','0')) {
    await env.DB.prepare("UPDATE ai_jobs SET status='cancelled',error='reviews_changed_during_training',updated_at=datetime('now') WHERE id=? AND status='running'").bind(job.id).run();
    return reply({status:'cancelled',active:false,reason:'reviews_changed_during_training'});
  }
  const {results=[]}=await env.DB.prepare('SELECT fold,sample_json FROM ai_job_samples WHERE job_id=? ORDER BY position').bind(job.id).all();
  const dataset={train:[],calibration:[],test:[]};for(const r of results)dataset[r.fold].push(JSON.parse(r.sample_json));
  const active=await activeModel(env),metrics=validateModel(artifact,dataset,{champion:active?.artifact||null});
  // Do not replace a working value head with a review-only model, or vice versa.
  const lostTasks=['value','review'].filter(task=>active?.metrics.tasks[task]?.passed&&!metrics.tasks[task].passed);
  if(lostTasks.length){metrics.passed=false;metrics.promotion_reasons=lostTasks.map(task=>'validated_head_lost:'+task)}
  const id=await digest(artifact),now=Date.now();
  const statements=[env.DB.prepare(`INSERT OR IGNORE INTO ai_models(id,job_id,artifact_json,metrics_json,passed)
    SELECT ?,?,?,?,? FROM ai_jobs WHERE id=? AND status='running' AND lease_hash=? AND lease_until>?
    AND (SELECT value FROM ai_settings WHERE key='review_revision')=?`).bind(id,job.id,JSON.stringify(artifact),JSON.stringify(metrics),+metrics.passed,job.id,job.lease_hash,now,meta.review_revision)];
  if(metrics.passed)statements.push(env.DB.prepare(`UPDATE ai_settings SET value=? WHERE key='active_model' AND value=?
    AND (SELECT value FROM ai_settings WHERE key='enabled')='true'
    AND (SELECT value FROM ai_settings WHERE key='review_revision')=?
    AND EXISTS(SELECT 1 FROM ai_jobs WHERE id=? AND status='running' AND lease_hash=? AND lease_until>?)`).bind(id,meta.active_at_start,meta.review_revision,job.id,job.lease_hash,now));
  statements.push(env.DB.prepare("UPDATE ai_jobs SET status=?,result_json=?,updated_at=datetime('now') WHERE id=? AND status='running' AND lease_hash=? AND lease_until>?").bind(metrics.passed?'completed':'rejected',JSON.stringify({model_id:id,metrics}),job.id,job.lease_hash,now));
  statements.push(audit(env,'model_evaluated',{job_id:job.id,model_id:id,metrics}));await env.DB.batch(statements);
  const stale=meta.review_revision!==await get(env,'review_revision','0');
  if(stale)await env.DB.prepare("UPDATE ai_jobs SET status='cancelled',error='reviews_changed_during_training' WHERE id=?").bind(job.id).run();
  return reply({status:stale?'cancelled':metrics.passed?'validated':'rejected',active:!stale&&await get(env,'active_model')===id,model_id:id,metrics});
}
export async function trainerAPI(request,env) {
  try {
    if(!await trainerAuthorized(request,env))return reply({error:'unauthorized'},401);
    if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
    const action=new URL(request.url).pathname.split('/').at(-1);
    if(action==='sync')return reply(await syncAIPage(env));
    if(action==='jobs')return await createJob(env);
    const body=await boundedJson(request),job=await jobLease(env,body);
    if(action==='data') {
      const after=Number.isInteger(body.after)?body.after:-1;
      const {results=[]}=await env.DB.prepare("SELECT position,fold,sample_json FROM ai_job_samples WHERE job_id=? AND fold<>'test' AND position>? ORDER BY position LIMIT 60").bind(job.id,after).all();
      return reply({rows:results.map(r=>({position:r.position,fold:r.fold,...JSON.parse(r.sample_json)})),next:results.length===60?results.at(-1).position:null});
    }
    if(action==='heartbeat') {await env.DB.prepare("UPDATE ai_jobs SET lease_until=?,updated_at=datetime('now') WHERE id=? AND status='running' AND lease_hash=?").bind(Date.now()+15*60000,job.id,job.lease_hash).run();return reply({ok:true})}
    if(action==='result')return await finishJob(env,body);
    if(action==='failed') {await env.DB.prepare("UPDATE ai_jobs SET status='failed',error=?,updated_at=datetime('now') WHERE id=? AND lease_hash=?").bind(String(body.error||'training_failed').slice(0,300),job.id,job.lease_hash).run();return reply({ok:true})}
    return reply({error:'not_found'},404);
  }catch(error){console.error(JSON.stringify({event:'trainer_api_error',error:String(error.message).slice(0,160)}));return reply({error:String(error.message).slice(0,160)},400)}
}
export async function adminAIAPI(request,env) {
  try {
    const action=new URL(request.url).pathname.split('/').at(-1);
    if(request.method==='GET'&&action==='ai') {
      const {results:counts=[]}=await env.DB.prepare('SELECT eligible,reason,COUNT(*) n FROM ai_samples GROUP BY eligible,reason').all();
      const {results:jobs=[]}=await env.DB.prepare('SELECT id,status,created_at,updated_at,result_json,error FROM ai_jobs ORDER BY created_at DESC LIMIT 8').all();
      const active=await activeModel(env);
      return reply({ok:true,enabled:await get(env,'enabled')==='true',trainer_configured:!!await get(env,'trainer_token_hash'),active:active?{id:active.id,metrics:active.metrics,created_at:active.created_at}:null,counts,jobs:jobs.map(j=>({...j,result:JSON.parse(j.result_json||'null'),result_json:undefined})),policy:PROMOTION_POLICY});
    }
    if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
    const body=await boundedJson(request,4000);
    if(action==='token') {
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
      await env.DB.batch([put(env,'trainer_token_hash',await digest(token)),audit(env,'trainer_token_rotated',{})]);return reply({ok:true,token});
    }
    if(action==='settings'&&typeof body.enabled==='boolean') {await env.DB.batch([put(env,'enabled',String(body.enabled)),audit(env,'enabled_changed',{enabled:body.enabled})]);return reply({ok:true})}
    if(action==='rollback') {
      const id=String(body.model_id||'');if(id&&!/^[a-f0-9]{64}$/.test(id))throw new Error('invalid_model_id');
      if(id&&!await env.DB.prepare('SELECT id FROM ai_models WHERE id=? AND passed=1').bind(id).first())throw new Error('validated_model_not_found');
      await env.DB.batch([put(env,'active_model',id),env.DB.prepare("UPDATE ai_jobs SET status='cancelled',error='admin_rollback' WHERE status='running'"),audit(env,'model_rollback',{model_id:id})]);return reply({ok:true});
    }
    if(action==='sync')return reply(await syncAIPage(env));
    return reply({error:'not_found'},404);
  }catch(error){return reply({error:String(error.message).slice(0,160)},400)}
}
