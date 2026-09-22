import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';

test('statistical shadow API is admin-only and read-only', async t => {
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec(`
    CREATE TABLE admin_login_attempts (ip TEXT PRIMARY KEY,fail_count INTEGER,first_fail_at INTEGER,locked_until INTEGER,updated_at TEXT);
    CREATE TABLE review_candidates (
      id INTEGER PRIMARY KEY,status TEXT,source_type TEXT,item_type TEXT,confidence REAL,
      source_url TEXT,dedupe_key TEXT,reviewed_at TEXT,review_reason_type TEXT
    );
    CREATE TABLE market_observations (
      id INTEGER PRIMARY KEY,normalized_value REAL,normalized_currency TEXT,observation_type TEXT
    );
    CREATE TABLE valuation_rules (id INTEGER PRIMARY KEY,rule_key TEXT,active INTEGER);
  `);
  db.prepare('INSERT INTO valuation_rules VALUES (1,?,1)').run('untouched');
  db.prepare('INSERT INTO review_candidates VALUES (1,?,?,?,?,?,?,?,?)')
    .run('approved','market_observation','레어',0.8,'https://example.test/listing/1',null,'2026-09-01T00:00:00Z',null);
  db.prepare('INSERT INTO review_candidates VALUES (2,?,?,?,?,?,?,?,?)')
    .run('rejected','market_observation','레어',0.5,'https://example.test/listing/2',null,'2026-09-02T00:00:00Z',null);
  db.prepare('INSERT INTO market_observations VALUES (1,NULL,NULL,?)').run('completed');
  let writes=0;
  const env={ADMIN_PASSWORD:'test-password',SESSION_SECRET:'test-session-secret',DB:{
    prepare(sql){
      const statement=db.prepare(sql),args=[];
      if (/^\s*(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql)) writes++;
      return {
        bind(...values){args.splice(0,args.length,...values);return this},
        async first(){return statement.get(...args)||null},
        async all(){return {results:statement.all(...args)}},
        async run(){const result=statement.run(...args);return {meta:{changes:result.changes,last_row_id:Number(result.lastInsertRowid)}}}
      };
    }
  }};
  const endpoint='https://fixture.invalid/api/admin/statistical-shadow';
  const denied=await worker.fetch(new Request(endpoint),env);
  assert.equal(denied.status,401);
  const login=await worker.fetch(new Request('https://fixture.invalid/api/admin/login',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'test-password'})
  }),env);
  assert.equal(login.status,303);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  writes=0;
  const response=await worker.fetch(new Request(endpoint,{headers:{cookie}}),env);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.ok,true);
  assert.equal(body.report.target,'admin_approval_probability');
  assert.equal(body.report.status,'insufficient_data');
  assert.equal(body.market_evidence.normalized,0);
  assert.equal(body.market_evidence.completed_unverified,1);
  assert.equal(writes,0,'a report request must not write to D1');
  const rule=db.prepare('SELECT rule_key,active FROM valuation_rules').get();
  assert.equal(rule.rule_key,'untouched');
  assert.equal(rule.active,1);
});
