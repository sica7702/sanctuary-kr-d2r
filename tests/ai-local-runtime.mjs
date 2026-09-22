import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://127.0.0.1:8796';
const url=new URL(origin);assert(['127.0.0.1','localhost'].includes(url.hostname),'local test only');
async function post(path,body={},authorized=true){return fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+'c'.repeat(64)}:{})},body:JSON.stringify(body)})}
assert.equal((await post('/api/trainer/jobs',{},false)).status,401);
assert.equal((await post('/api/admin/ai/token',{},false)).status,401);
const sync=await (await post('/api/trainer/sync')).json();assert.equal(sync.complete,true);
const jobs=await (await post('/api/trainer/jobs')).json();assert.equal(jobs.status,'waiting_data');
const prediction=await (await post('/api/public/valuation',{context:{slot:'ring',item_type:'레어',values:{fcr:10}}},false)).json();assert.equal(prediction.status,'abstain');
assert.deepEqual((await (await fetch(origin+'/api/public/review-value-model')).json()).models,[]);
assert.equal((await fetch(origin+'/archive/ai-valuation.js?v=136')).status,200);
console.log('PASS: actual local workerd + D1 migration, scoped authorization, synchronization, no-data job, public fallback, static asset');
