import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import vm from 'node:vm';
import worker, {
  marketReviewIndex,
  marketObservationReviewed,
  feedbackMarketSupport,
  analyzeObservationSet,
  feedbackShadowRule,
  reparseOperatorFeedback,
  rebuildFeedbackPatterns,
  evaluateFeedbackShadowRules
} from '../worker.js';
import {PARSER_VERSION} from '../traderie-integrity.mjs';

function fixture() {
  const db=new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE review_candidates (
      id INTEGER PRIMARY KEY,source_type TEXT,source_url TEXT,status TEXT,
      learning_eligible INTEGER,evidence_json TEXT,proposal_json TEXT,
      item_type TEXT,reviewer_tags_json TEXT
    );
    CREATE TABLE market_sources (source_key TEXT PRIMARY KEY,active INTEGER,trust_weight REAL);
    CREATE TABLE market_observations (
      id INTEGER PRIMARY KEY,source_key TEXT,source_url TEXT,source_listing_id TEXT,
      slot TEXT,item_type TEXT,affixes_json TEXT,price_amount REAL,
      normalized_value REAL,normalized_currency TEXT,raw_note TEXT,
      observed_at TEXT,observation_type TEXT,source_confidence REAL,verified INTEGER
    );
    CREATE TABLE price_clusters (
      cluster_key TEXT PRIMARY KEY,item_type TEXT,slot TEXT,signature_pattern TEXT,
      sample_count INTEGER,source_count INTEGER,sold_count INTEGER,asking_count INTEGER,
      median_value REAL,q1_value REAL,q3_value REAL,dispersion REAL,
      source_diversity REAL,recency_score REAL,confidence REAL,analysis_json TEXT,
      last_observed_at TEXT,updated_at TEXT
    );
    CREATE TABLE pattern_candidates (id INTEGER PRIMARY KEY,status TEXT);
    CREATE TABLE valuation_rules (
      id INTEGER PRIMARY KEY,rule_key TEXT,label TEXT,item_type TEXT,slot TEXT,
      priority INTEGER,rule_json TEXT,updated_at TEXT,active INTEGER,
      source_candidate_id INTEGER
    );
    CREATE TABLE operator_feedback (
      id INTEGER PRIMARY KEY,candidate_id INTEGER,decision TEXT,note TEXT,
      source_type TEXT,source_url TEXT,slot TEXT,item_type TEXT,
      context_json TEXT,signals_json TEXT,created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE feedback_patterns (
      pattern_key TEXT PRIMARY KEY,slot TEXT,item_type TEXT,signal_key TEXT,
      required_sockets INTEGER,context_json TEXT,mention_count INTEGER,
      approve_count INTEGER,reject_count INTEGER,hold_count INTEGER,
      market_match_count INTEGER,confidence REAL,status TEXT,
      last_evaluated_at TEXT,updated_at TEXT
    );
    CREATE TABLE feedback_shadow_rules (
      pattern_key TEXT PRIMARY KEY,rule_key TEXT,rule_json TEXT,status TEXT,
      confidence REAL,validated_at TEXT,updated_at TEXT
    );
    CREATE TABLE admin_audit_log (
      id INTEGER PRIMARY KEY,action TEXT,target_type TEXT,target_id INTEGER,
      detail_json TEXT,actor_email TEXT
    );
  `);
  db.prepare('INSERT INTO market_sources VALUES (?,?,?)').run('traderie',1,0.7);
  db.prepare('INSERT INTO market_sources VALUES (?,?,?)').run('playnote',1,0.7);
  const env={DB:{
    prepare(sql) {
      const stmt=db.prepare(sql);
      let args=[];
      return {
        bind(...values){args=values;return this;},
        async all(){return {results:stmt.all(...args)};},
        async first(){return stmt.get(...args)||null;},
        async run(){const r=stmt.run(...args);return {meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}};}
      };
    }
  }};
  return {db,env};
}

const url='https://traderie.com/diablo2resurrected/listing/fixture-1';
const affixes={fcr:10,life:40};
function addReview(db,{sourceUrl=url,price=1,aff=affixes,status='pending',eligible=0}={}) {
  const evidence=JSON.stringify([{affixes:aff,price_amount:price}]);
  return Number(db.prepare('INSERT INTO review_candidates(source_type,source_url,status,learning_eligible,evidence_json) VALUES (?,?,?,?,?)')
    .run('market_observation',sourceUrl,status,eligible,evidence).lastInsertRowid);
}
function addObservation(db,{source='traderie',sourceUrl=url,listingId='fixture-1',price=1,aff=affixes,normalized=null}={}) {
  const note=JSON.stringify({integrity:{complete:true},parser_version:PARSER_VERSION});
  return Number(db.prepare(`INSERT INTO market_observations
    (source_key,source_url,source_listing_id,slot,item_type,affixes_json,price_amount,
     normalized_value,normalized_currency,raw_note,observed_at,observation_type,source_confidence,verified)
    VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),'asking',0.8,0)`)
    .run(source,sourceUrl,listingId,'ring','레어',JSON.stringify(aff),price,normalized,'Ist Rune',note).lastInsertRowid);
}

test('Traderie market evidence is usable only after a learning-eligible approval',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  const obsId=addObservation(db);
  const id=addReview(db);
  const obs=()=>db.prepare('SELECT * FROM market_observations WHERE id=?').get(obsId);
  assert.equal(marketObservationReviewed(obs(),await marketReviewIndex(env)),false,'pending');
  db.prepare('UPDATE review_candidates SET status=?,learning_eligible=? WHERE id=?').run('approved',0,id);
  assert.equal(marketObservationReviewed(obs(),await marketReviewIndex(env)),false,'review-only approval');
  db.prepare('UPDATE review_candidates SET status=?,learning_eligible=? WHERE id=?').run('rejected',1,id);
  assert.equal(marketObservationReviewed(obs(),await marketReviewIndex(env)),false,'rejection');
  db.prepare('UPDATE review_candidates SET status=?,learning_eligible=? WHERE id=?').run('approved',1,id);
  assert.equal(marketObservationReviewed(obs(),await marketReviewIndex(env)),true,'verified approval');
});

test('approval is scoped to the exact URL, price and option snapshot',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  addReview(db,{status:'approved',eligible:1});
  const good=addObservation(db);
  const differentPrice=addObservation(db,{listingId:'fixture-2',price:2});
  const differentOptions=addObservation(db,{listingId:'fixture-3',aff:{fcr:10,life:39}});
  const differentUrl=addObservation(db,{listingId:'fixture-4',sourceUrl:url+'/edited'});
  const index=await marketReviewIndex(env);
  const row=id=>db.prepare('SELECT * FROM market_observations WHERE id=?').get(id);
  assert.equal(marketObservationReviewed(row(good),index),true);
  for(const id of [differentPrice,differentOptions,differentUrl])
    assert.equal(marketObservationReviewed(row(id),index),false,`changed snapshot ${id}`);
});

test('repeated snapshots of one listing count as one independent market match',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  addReview(db,{status:'approved',eligible:1});
  for(let n=0;n<6;n++)addObservation(db);
  const index=await marketReviewIndex(env);
  assert.equal(await feedbackMarketSupport(env,{slot:'ring',affixes},index),1);
  addReview(db,{sourceUrl:url+'/other',status:'approved',eligible:1});
  addObservation(db,{sourceUrl:url+'/other',listingId:'fixture-2'});
  assert.equal(await feedbackMarketSupport(env,{slot:'ring',affixes},await marketReviewIndex(env)),2);
});

test('market clusters exclude unapproved Traderie observations and null normalized prices',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  addObservation(db,{normalized:null});
  let result=await analyzeObservationSet(env,{obsTable:'market_observations',clusterTable:'price_clusters',candidateTable:'pattern_candidates'});
  assert.equal(result.clusters,0,'unapproved observation must not build a cluster');
  addReview(db,{status:'approved',eligible:1});
  addObservation(db,{source:'playnote',sourceUrl:'https://example.test/fixture',listingId:'playnote-1',normalized:100});
  result=await analyzeObservationSet(env,{obsTable:'market_observations',clusterTable:'price_clusters',candidateTable:'pattern_candidates'});
  assert.equal(result.clusters,1);
  const cluster=db.prepare('SELECT sample_count,median_value,q1_value,q3_value FROM price_clusters').get();
  assert.equal(cluster.sample_count,2);
  assert.equal(cluster.median_value,100,'null must not become zero');
  assert.equal(cluster.q1_value,100);
  assert.equal(cluster.q3_value,100);
});

test('public rules omit market-watch evidence while retaining actionable rules',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  const insert=db.prepare('INSERT INTO valuation_rules(rule_key,label,item_type,slot,priority,rule_json,updated_at,active) VALUES (?,?,?,?,?,?,datetime(\'now\'),1)');
  const market={rule_key:'market_watch_fixture',label:'observation only',item_type:'레어',slot:'ring',effects:{market_watch_only:true,score_delta:0}};
  const active={rule_key:'approved_fixture',label:'reviewed rule',item_type:'레어',slot:'ring',effects:{score_delta:3}};
  for(const rule of [market,active])insert.run(rule.rule_key,rule.label,rule.item_type,rule.slot,100,JSON.stringify(rule));
  const response=await worker.fetch(new Request('https://fixture.invalid/api/public/rules'),env);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.deepEqual(body.rules.map(rule=>rule.rule_key),['approved_fixture']);
});

test('runtime numeric conditions fail closed when an option is absent',()=>{
  const source=fs.readFileSync(new URL('../public/archive/runtime-rules.js',import.meta.url),'utf8');
  const sandbox={window:{},document:{readyState:'loading',addEventListener(){}}};
  vm.runInNewContext(source,sandbox);
  const runtime=sandbox.window.SKR_RUNTIME_RULES;
  runtime.state.rules=[{rule_key:'needs_fcr',slot:'ring',item_type:'레어',conditions:{fcr:{gte:10}},effects:{score_delta:5}}];
  const context={slot:'ring',item_type:'레어',values:{},profile:{}};
  assert.equal(runtime.evaluate(context).scoreDelta,0);
  assert.equal(runtime.evaluate({...context,values:{fcr:10}}).scoreDelta,5);
});

test('auto-learning does not collapse class-specific skill requirements',()=>{
  const pattern={pattern_key:'class-skill',slot:'amulet',item_type:'레어',signal_key:'option_synergy_positive',mention_count:3,market_match_count:6,confidence:0.9,context_json:JSON.stringify({slot:'amulet',item_type:'레어',affixes:{sorc_skills:2,fcr:10}})};
  assert.equal(feedbackShadowRule(pattern),null);
});

test('reparsing preserves a tag-only operator signal',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  const candidateId=addReview(db,{status:'approved',eligible:1});
  db.prepare('UPDATE review_candidates SET proposal_json=?,item_type=?,reviewer_tags_json=? WHERE id=?')
    .run(JSON.stringify({slot:'ring',item_type:'레어'}),'레어',JSON.stringify(['synergy_good']),candidateId);
  db.prepare(`INSERT INTO operator_feedback
    (candidate_id,decision,note,source_type,source_url,slot,item_type,context_json,signals_json)
    VALUES (?,'approve','','market_observation',?,'ring','레어','{}','{"signals":[]}')`)
    .run(candidateId,url);
  const result=await reparseOperatorFeedback(env);
  assert.equal(result.reparsed,1);
  const feedback=db.prepare('SELECT context_json,signals_json FROM operator_feedback').get();
  assert.deepEqual(JSON.parse(feedback.context_json).reviewer_tags,['synergy_good']);
  assert(JSON.parse(feedback.signals_json).signals.some(x=>x.key==='option_synergy_positive'));
});

test('three rejections cannot auto-promote a rule even with twelve reviewed market matches',async t=>{
  const {db,env}=fixture();t.after(()=>db.close());
  for(let n=0;n<12;n++){
    const sourceUrl=`${url}/independent-${n}`;
    addReview(db,{sourceUrl,status:'approved',eligible:1});
    addObservation(db,{sourceUrl,listingId:`independent-${n}`});
  }
  const context={slot:'ring',item_type:'레어',affixes,affix_keys:Object.keys(affixes).sort()};
  const signals={signals:[{key:'option_synergy_positive',weight:0.95}]};
  const insert=db.prepare(`INSERT INTO operator_feedback
    (candidate_id,decision,note,source_type,source_url,slot,item_type,context_json,signals_json)
    VALUES (NULL,'reject','시너지 좋음','market_observation',?,'ring','레어',?,?)`);
  for(let n=0;n<3;n++)insert.run(`${url}/rejected-${n}`,JSON.stringify(context),JSON.stringify(signals));
  assert.equal(await rebuildFeedbackPatterns(env),1);
  const pattern=db.prepare('SELECT mention_count,approve_count,reject_count,market_match_count,status FROM feedback_patterns').get();
  assert.equal(pattern.mention_count,0);
  assert.equal(pattern.approve_count,0);
  assert.equal(pattern.reject_count,3);
  assert.equal(pattern.market_match_count,12);
  assert.equal(pattern.status,'learning');
  const result=await evaluateFeedbackShadowRules(env);
  assert.equal(result.promoted,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM valuation_rules').get().n,0);
});
