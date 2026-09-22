import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {candidateQueueState,REPAIR_SQL} from '../admin-review-queue.mjs';
import {PARSER_VERSION} from '../traderie-integrity.mjs';
import {getCandidates,reviewCandidate,candidateNeedsRepair} from '../worker.js';

function row(id=1,mutate=()=>{}) {
  const e={source:'traderie',item_type:'레어',slot:'circlet',base_name:'Tiara',listing_id:String(id),source_snapshot:{item:{name:'Tiara'}},
    integrity:{parser_version:PARSER_VERSION,complete:false,options_complete:true,price_complete:true,identity_complete:false,issues:['등급/부위/아이템 수량 확인 필요']},
    parser_quality:{complete:true,property_coverage:1},price_structure:{complete:true,amount:1,currency:'Ist Rune'}};
  mutate(e);
  return {id,status:'pending',source_type:'market_observation',source_url:'https://traderie.com/diablo2resurrected/listing/'+id,evidence_json:JSON.stringify([e]),proposal_json:JSON.stringify({rule_key:'test',label:'fixture',conditions:{fcr:{gte:20}},effects:{score_delta:0},parser_quality:e.parser_quality})};
}
function database(rows) {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE review_candidates (id INTEGER PRIMARY KEY,status TEXT,source_type TEXT,source_url TEXT,evidence_json TEXT,proposal_json TEXT)');
  const insert=db.prepare('INSERT INTO review_candidates VALUES(?,?,?,?,?,?)');
  for(const r of rows)insert.run(r.id,r.status,r.source_type,r.source_url,r.evidence_json,r.proposal_json);
  return {db,env:{DB:{prepare(sql){const s=db.prepare(sql);let args=[];return {bind(...v){args=v;return this;},async all(){return {results:s.all(...args)};},async first(){return s.get(...args)||null;}};}}}};
}

test('Quantity-only missing: enters pending without changing evidence or relaxing learning guard',()=>{
  const r=row(),before=structuredClone(r),q=candidateQueueState(r);
  assert.deepEqual(q,{needs_repair:false,review_only_required:true,quantity_unconfirmed:true,repair_reasons:[]});
  assert(candidateNeedsRepair(r));assert.deepEqual(r,before);
  assert.equal(JSON.parse(r.evidence_json)[0].source_snapshot.quantity,undefined);
  assert.equal(candidateQueueState(row(2,e=>e.source_snapshot.quantity=null)).needs_repair,false);
});

test('Actual parser, price, identity and stale-format issues remain repair, not normal review',()=>{
  const changes=[e=>e.integrity.options_complete=false,e=>e.integrity.price_complete=false,e=>e.integrity.parser_version='old',e=>e.slot='other',e=>e.slot='',e=>e.slot=null,e=>e.item_type='매직',e=>e.source_snapshot=null,e=>e.integrity.issues.push('가격 오류'),e=>e.parser_quality.complete=false,e=>e.price_structure.complete=false,e=>delete e.integrity];
  for(const mutate of changes){const q=candidateQueueState(row(1,mutate));assert(q.needs_repair);assert(q.review_only_required);assert(q.repair_reasons.length);}
  for(const quantity of [0,-1,1,2,'',false,'unknown'])assert(candidateQueueState(row(1,e=>e.source_snapshot.quantity=quantity)).needs_repair);
});

test('SQL and JavaScript classify missing, malformed and strict-boolean fields identically',()=>{
  const cases=[row(1),row(2,e=>e.source_snapshot.quantity=null),row(3,e=>{e.source_snapshot.quantity=1;e.integrity.complete=true;e.integrity.identity_complete=true;e.integrity.issues=[];}),row(4,e=>e.integrity.parser_version='old'),{...row(5),evidence_json:'broken'}, {...row(6),source_type:'manual',source_url:'',evidence_json:'[]'}];
  const changes=[e=>e.integrity.options_complete=false,e=>e.integrity.price_complete=false,e=>e.integrity.complete=1,e=>e.integrity.complete='true',e=>e.integrity.options_complete=1,e=>e.integrity.identity_complete=0,e=>e.integrity.issues={},e=>e.slot='other',e=>e.slot='',e=>e.slot=3,e=>delete e.source_snapshot,e=>e.source_snapshot=[],e=>e.source_snapshot.quantity=0,e=>e.source_snapshot.quantity='',e=>e.price_structure.complete=false,e=>e.parser_quality.complete=false,e=>e.source='playnote',e=>e.integrity=null];
  changes.forEach((change,index)=>cases.push(row(index+7,change)));
  const {db}=database(cases);
  try{const actual=db.prepare('SELECT id,'+REPAIR_SQL+' AS repair FROM review_candidates').all();for(const r of actual)assert.equal(r.repair,candidateQueueState(cases.find(x=>x.id===r.id)).needs_repair?1:0,'candidate '+r.id);}finally{db.close();}
});

test('Existing records: SQL list, counts, pagination and approved/hold tabs agree without migration',async()=>{
  const rows=Array.from({length:181},(_,i)=>row(i+1));
  rows.push(row(200,e=>e.integrity.options_complete=false),{...row(201),status:'approved'},{...row(202),status:'hold'});
  const {db,env}=database(rows);
  try{
    const seen=[];let cursor='';
    for(let n=0;n<3;n++){
      const r=await getCandidates(new Request('https://fixture.invalid/api/admin/candidates?status=pending'+cursor),env),j=await r.json();
      seen.push(...j.results.map(x=>x.id));assert.equal(j.has_more,n<2);assert(j.results.every(x=>!x.needs_repair&&x.review_only_required&&x.quantity_unconfirmed));cursor='&before='+j.next_cursor;
    }
    assert.equal(seen.length,181);assert.equal(new Set(seen).size,181);
    const repair=await (await getCandidates(new Request('https://fixture.invalid/api/admin/candidates?status=repair'),env)).json();assert.deepEqual(repair.results.map(x=>x.id),[200]);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM review_candidates WHERE status='pending' AND "+REPAIR_SQL).get().n,1);
    for(const status of ['approved','hold']){const r=await (await getCandidates(new Request('https://fixture.invalid/api/admin/candidates?status='+status),env)).json();assert.equal(r.results.length,1);assert.equal(r.results[0].status,status);}
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM review_candidates').get().n,184);
  }finally{db.close();}
});

function reviewFixture(candidate){
  const writes=[];
  const env={DB:{prepare(sql){let args=[];return {sql,get args(){return args;},bind(...v){args=v;return this;},async first(){return candidate;},async run(){writes.push({sql,args});return {meta:{changes:1}};}};},async batch(statements){writes.push(...statements.map(s=>({sql:s.sql,args:s.args})));return statements.map(()=>({meta:{changes:1}}));}}};
  return {writes,env};
}
const reviewRequest=body=>new Request('https://fixture.invalid/api/admin/review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('Pending quantity-only approval records review history, never publishes a rule or trains prices',async()=>{
  const candidate=row(),before=structuredClone(candidate),{env,writes}=reviewFixture(candidate);
  const refused=await reviewCandidate(reviewRequest({id:1,action:'approve',tags:['synergy_good']}),env);assert.equal(refused.status,409);assert.equal(writes.length,0);
  const r=await reviewCandidate(reviewRequest({id:1,action:'approve',review_only:true,tags:['synergy_good'],note:'확인 메모'}),env),j=await r.json();
  assert.equal(r.status,200);assert(j.review_only);assert.equal(j.learning_policy.learning_eligible,false);assert.deepEqual(j.tags,['synergy_good']);
  assert.equal(writes.length,2);assert(writes[0].sql.includes('learning_eligible=0'));assert.deepEqual(writes[0].args,['worker-session','확인 메모','["synergy_good"]',1]);
  assert(!writes.some(x=>/valuation_rules|operator_feedback|UPDATE.*evidence_json/.test(x.sql)));assert.deepEqual(candidate,before);
});

test('Reject and hold preserve selected reasons and note without learning unverified quantity',async()=>{
  for(const action of ['reject','hold']){const {env,writes}=reviewFixture(row());const r=await reviewCandidate(reviewRequest({id:1,action,tags:['synergy_weak'],note:'선택 전달 확인'}),env),j=await r.json();assert.equal(r.status,200);assert.equal(j.learning_policy.learning_eligible,false);assert.deepEqual(writes[0].args.slice(0,5),[action==='reject'?'rejected':'hold','worker-session','선택 전달 확인','["synergy_weak"]',0]);assert(!writes.some(x=>/valuation_rules|operator_feedback/.test(x.sql)));}
});

test('Single-source market observations cannot be promoted to scoring rules by edited proposals',async()=>{
  const candidate=row(9,e=>{e.integrity.complete=true;e.integrity.identity_complete=true;e.integrity.issues=[];e.source_snapshot.quantity=1;e.affixes={fcr:20};e.price_amount=1;});
  const original=JSON.parse(candidate.proposal_json);
  original.slot='circlet';original.item_type='레어';original.effects={score_delta:0,market_watch_only:true,observed_price:{amount:1}};
  candidate.proposal_json=JSON.stringify(original);
  const {env,writes}=reviewFixture(candidate);
  for(const effects of [{...original.effects,score_delta:5},{...original.effects,market_watch_only:false}]){
    const proposal={...original,effects};
    const response=await reviewCandidate(reviewRequest({id:9,action:'approve',proposal}),env);
    assert.equal(response.status,409);assert.equal(writes.length,0);
  }
  const response=await reviewCandidate(reviewRequest({id:9,action:'approve'}),env);
  assert.equal(response.status,200);
  assert(writes.some(x=>/INSERT INTO valuation_rules/.test(x.sql)));
});

test('Automatic review refuses incomplete capture and never turns its own action into training feedback',async()=>{
  const incomplete=reviewFixture(row(10));
  const refused=await reviewCandidate(reviewRequest({id:10,action:'reject'}),incomplete.env,{auto:true});
  assert.equal(refused.status,409);assert.equal(incomplete.writes.length,0);

  const complete=row(11,e=>{e.integrity.complete=true;e.integrity.identity_complete=true;e.integrity.issues=[];e.source_snapshot.quantity=1;e.source_snapshot_hash='a'.repeat(64);e.affixes={fcr:20};e.price_amount=1;});
  const proposal=JSON.parse(complete.proposal_json);
  proposal.slot='circlet';proposal.item_type='레어';proposal.effects={score_delta:0,market_watch_only:true,observed_price:{amount:1}};
  complete.proposal_json=JSON.stringify(proposal);
  const {env,writes}=reviewFixture(complete);
  const noVerification=await reviewCandidate(reviewRequest({id:11,action:'approve'}),env,{auto:true});
  assert.equal(noVerification.status,409);assert.equal(writes.length,0);
  const response=await reviewCandidate(reviewRequest({id:11,action:'approve',note:'auto-review-v1 validated'}),env,{auto:true,sourceVerifiedHash:'a'.repeat(64)});
  const result=await response.json();
  assert.equal(response.status,200);assert.equal(result.learning_policy.learning_eligible,false);
  assert.equal(result.learning_policy.reason,'auto_validated_review');
  assert(writes.some(x=>/INSERT INTO valuation_rules/.test(x.sql)));
  assert(writes.some(x=>/UPDATE review_candidates/.test(x.sql)&&x.args.includes('auto-policy')));
  assert(!writes.some(x=>/operator_feedback|parser_feedback/.test(x.sql)));
});
