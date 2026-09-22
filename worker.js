import {parseProperties,parseProperty,parsePrice,isMeta,snapshotListing,PARSER_VERSION} from './traderie-integrity.mjs';
import {rareEquipmentSingleQuantity} from './rare-singleton.mjs';
import {recentMarketResponse} from './market-search-api.mjs';
import {liveResponse} from './live-tz.mjs';
import {candidateQueueState,REPAIR_SQL} from './admin-review-queue.mjs';
import {evaluateReviewShadow} from './statistical-shadow.mjs';
import {buildAutoReviewPolicyReport,decideAutoReview} from './auto-review-policy.mjs';
import {trainReviewedValuePatterns} from './review-value-learning.mjs';
import {publicAIValuation,trainerAPI,adminAIAPI,syncAIPage,syncCandidateForAI,neuralReviewNominations} from './ai-service.mjs';
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store"
};

const SESSION_COOKIE = "skr_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const MAX_FAILS = 5;
const FAIL_WINDOW_SECONDS = 15 * 60;
const LOCK_SECONDS = 15 * 60;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type":"text/html; charset=UTF-8",
      "Cache-Control":"no-store",
      "X-Robots-Tag":"noindex, nofollow",
      ...headers
    }
  });
}

function safeJson(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function b64urlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function b64urlDecode(str) {
  str = str.replace(/-/g,"+").replace(/_/g,"/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function textBytes(s) {
  return new TextEncoder().encode(String(s));
}

async function sha256Hex(s) {
  const out = new Uint8Array(await crypto.subtle.digest("SHA-256", textBytes(s)));
  return Array.from(out, b => b.toString(16).padStart(2,"0")).join("");
}

function constantTimeEqual(a,b) {
  const aa = textBytes(a), bb = textBytes(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i=0;i<aa.length;i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw", textBytes(secret),
    {name:"HMAC", hash:"SHA-256"},
    false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, textBytes(data)));
  return b64urlEncode(sig);
}

async function makeSession(env) {
  const now = Math.floor(Date.now()/1000);
  const payload = {
    v:1,
    iat:now,
    exp:now + SESSION_TTL_SECONDS,
    nonce:crypto.randomUUID()
  };
  const body = b64urlEncode(textBytes(JSON.stringify(payload)));
  const sig = await hmacSign(body, env.SESSION_SECRET);
  return `${body}.${sig}`;
}

async function verifySession(request, env) {
  if (!env.SESSION_SECRET) return false;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;

  const token = match[1];
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [body,sig] = parts;
  const expected = await hmacSign(body, env.SESSION_SECRET);
  if (!constantTimeEqual(sig, expected)) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    const now = Math.floor(Date.now()/1000);
    return payload?.v === 1 && Number(payload.exp) > now;
  } catch {
    return false;
  }
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function loginPage(error = "") {
  const err = error ? `<div class="err">${escapeHtml(error)}</div>` : "";
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Sanctuary KR · 관리자 로그인</title>
<style>
:root{--bg:#090b0e;--panel:#11141a;--line:#343b45;--gold:#e4c27f;--text:#eceff3;--muted:#929ba7}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#17130d 0,#090b0e 38%,#07090b 100%);color:var(--text);font-family:Pretendard,"Noto Sans KR","Malgun Gothic",system-ui,sans-serif}
.card{width:min(430px,calc(100% - 28px));padding:28px;border:1px solid var(--line);border-radius:16px;background:rgba(17,20,26,.96);box-shadow:0 24px 80px rgba(0,0,0,.45)}
h1{margin:0 0 8px;color:var(--gold);font-size:25px}
p{margin:0 0 20px;color:var(--muted);font-size:13px;line-height:1.6}
label{display:block;margin:0 0 7px;color:#c8cdd4;font-size:12px}
input{width:100%;padding:12px 13px;border:1px solid var(--line);border-radius:9px;background:#0b0e12;color:#fff;font-size:15px;outline:none}
input:focus{border-color:#8d7041}
button{width:100%;margin-top:12px;padding:12px;border:1px solid #d7b36e;border-radius:9px;background:linear-gradient(180deg,#efd79d,#cfa85b);color:#18120a;font-weight:800;cursor:pointer}
.err{margin:0 0 14px;padding:10px 12px;border:1px solid #6a3737;border-radius:8px;background:#1a0e0e;color:#efb5b5;font-size:12px}
.meta{margin-top:14px;color:#747d88;font-size:11px;text-align:center}
</style>
</head>
<body>
<form class="card" method="post" action="/api/admin/login">
  <h1>Sanctuary KR · 관리자</h1>
  <p>감정 DB 검수 및 운영 규칙 관리 전용 로그인입니다.</p>
  ${err}
  <label for="password">관리자 비밀번호</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
  <button type="submit">관리자 로그인</button>
  <div class="meta">8시간 후 자동 로그아웃 · HttpOnly Secure Session</div>
</form>
</body></html>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[c]));
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function loginState(env, ip) {
  try {
    return await env.DB.prepare(
      `SELECT fail_count,first_fail_at,locked_until FROM admin_login_attempts WHERE ip=?`
    ).bind(ip).first();
  } catch {
    return null;
  }
}

async function recordLoginFailure(env, ip) {
  const now = Math.floor(Date.now()/1000);
  const row = await loginState(env, ip);

  if (!row || !row.first_fail_at || now - Number(row.first_fail_at) > FAIL_WINDOW_SECONDS) {
    await env.DB.prepare(
      `INSERT INTO admin_login_attempts(ip,fail_count,first_fail_at,locked_until,updated_at)
       VALUES(?,1,?,0,datetime('now'))
       ON CONFLICT(ip) DO UPDATE SET
         fail_count=1,first_fail_at=excluded.first_fail_at,locked_until=0,updated_at=datetime('now')`
    ).bind(ip,now).run();
    return;
  }

  const count = Number(row.fail_count||0) + 1;
  const locked = count >= MAX_FAILS ? now + LOCK_SECONDS : Number(row.locked_until||0);

  await env.DB.prepare(
    `UPDATE admin_login_attempts
     SET fail_count=?,locked_until=?,updated_at=datetime('now')
     WHERE ip=?`
  ).bind(count,locked,ip).run();
}

async function clearLoginFailures(env, ip) {
  await env.DB.prepare(`DELETE FROM admin_login_attempts WHERE ip=?`).bind(ip).run();
}

async function verifyPassword(candidate, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const [a,b] = await Promise.all([
    sha256Hex(String(candidate||"")),
    sha256Hex(String(env.ADMIN_PASSWORD))
  ]);
  return constantTimeEqual(a,b);
}

function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const url = new URL(request.url);
  return origin === url.origin;
}

async function handleLogin(request, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return html(loginPage("관리자 Secret이 아직 설정되지 않았습니다."),503);
  }

  const ip = clientIp(request);
  const now = Math.floor(Date.now()/1000);
  const state = await loginState(env, ip);

  if (state && Number(state.locked_until||0) > now) {
    const remain = Math.ceil((Number(state.locked_until)-now)/60);
    return html(loginPage(`로그인 시도가 잠시 잠겼습니다. 약 ${remain}분 후 다시 시도하세요.`),429);
  }

  const ct = request.headers.get("Content-Type") || "";
  let password = "";

  if (ct.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    password = String(form.get("password")||"");
  } else {
    const body = await request.json().catch(()=>({}));
    password = String(body.password||"");
  }

  const ok = await verifyPassword(password, env);
  if (!ok) {
    await recordLoginFailure(env, ip);
    return html(loginPage("비밀번호가 올바르지 않습니다."),401);
  }

  await clearLoginFailures(env, ip);
  const token = await makeSession(env);

  return new Response(null,{
    status:303,
    headers:{
      "Location":"/admin/",
      "Set-Cookie":sessionCookie(token),
      "Cache-Control":"no-store"
    }
  });
}

function validProposal(p) {
  return p && typeof p === "object" &&
    typeof p.rule_key === "string" && p.rule_key.trim() &&
    typeof p.label === "string" && p.label.trim() &&
    p.conditions && typeof p.conditions === "object" &&
    p.effects && typeof p.effects === "object";
}

async function health(env) {
  let db = false, rules = null, candidates = null;
  try {
    if (env.DB) {
      const [r,c] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) n FROM valuation_rules`).first(),
        env.DB.prepare(`SELECT COUNT(*) n FROM review_candidates`).first()
      ]);
      db = true;
      rules = r?.n ?? 0;
      candidates = c?.n ?? 0;
    }
  } catch {}
  return json({
    ok:true,
    service:"Sanctuary KR D2R",
    runtime:"workers-static-assets-worker-auth",
    db,
    rules,
    candidates,
    admin_auth:"worker-session",
    time:new Date().toISOString()
  });
}

async function publicRules(env) {
  if (!env.DB) {
    return json({ok:false,error:"db_binding_missing",revision:null,rules:[]},503);
  }
  const {results=[]} = await env.DB.prepare(
    `SELECT id,rule_key,label,item_type,slot,priority,rule_json,updated_at
     FROM valuation_rules
     WHERE active=1
     ORDER BY priority DESC,id ASC`
  ).all();

  const rules = results.map(r => {
    const rule = safeJson(r.rule_json, null);
    return rule ? {...rule,_id:r.id,_updated_at:r.updated_at} : null;
  }).filter(rule=>rule && rule.effects?.market_watch_only!==true &&
    rule.learning_meta?.source!=='reviewed_value' &&
    rule.learning_meta?.source!=='operator_feedback');

  const revision = rules.length
    ? `${rules.length}:${rules.map(r=>r._updated_at||"").sort().at(-1)||""}`
    : "0";

  return json({ok:true,revision,rules},200,{
    "Cache-Control":"public, max-age=60, stale-while-revalidate=300"
  });
}

async function publicReviewedValueModel(env){
  if(!env.DB)return json({ok:false,error:'db_binding_missing',revision:'0',models:[]},503);
  const {results=[]}=await env.DB.prepare(`SELECT id,rule_json,updated_at FROM valuation_rules
    WHERE active=1 AND rule_key LIKE 'review_value:%' ORDER BY id ASC`).all();
  const models=results.map(row=>safeJson(row.rule_json,null))
    .filter(rule=>rule?.learning_meta?.source==='reviewed_value' &&
      Number.isInteger(rule?.effects?.learned_value_tier));
  const revision=models.length?`${models.length}:${results.map(row=>row.updated_at||'').sort().at(-1)||''}`:'0';
  return json({ok:true,revision,models},200,{'Cache-Control':'public, max-age=60'});
}

async function runReviewedValueLearning(env,trigger='cron'){
  // Human review labels are read afresh. Old unverified rows and automatic
  // decisions are rejected by the pure trainer; neither is a value label.
  const {results=[]}=await env.DB.prepare(`SELECT id,source_type,source_url,status,
      learning_eligible,review_reason_type,reviewer_email,reviewed_at,
      reviewer_tags_json,evidence_json,proposal_json
    FROM review_candidates
    WHERE reviewed_at IS NOT NULL AND reviewer_tags_json LIKE '%value_%'
    ORDER BY reviewed_at ASC,id ASC LIMIT 5001`).all();
  if(results.length>5000)throw new Error('review_value_training_limit_reached');
  const trained=trainReviewedValuePatterns(results);
  const models=Array.isArray(trained.patterns)?trained.patterns:[];
  const statements=[env.DB.prepare(`UPDATE valuation_rules SET active=0,updated_at=datetime('now')
    WHERE rule_key LIKE 'review_value:%' AND active=1`)];
  for(const rule of models){
    statements.push(env.DB.prepare(`INSERT INTO valuation_rules
      (rule_key,label,item_type,slot,priority,rule_json,source_candidate_id,active)
      VALUES (?,?,?,?,?,?,NULL,1)
      ON CONFLICT(rule_key) DO UPDATE SET label=excluded.label,item_type=excluded.item_type,
      slot=excluded.slot,priority=excluded.priority,rule_json=excluded.rule_json,
      source_candidate_id=NULL,active=1,updated_at=datetime('now')`)
      .bind(rule.rule_key,rule.label,rule.item_type,rule.slot,0,JSON.stringify(rule)));
  }
  await env.DB.batch(statements);
  const summary={trigger,reviewed_rows:results.length,active_models:models.length,
    diagnostics:trained.diagnostics||{}};
  await env.DB.prepare(`INSERT INTO admin_audit_log(action,target_type,detail_json,actor_email)
    VALUES('review_value_learning_run','valuation_model',?,'system-learning')`)
    .bind(JSON.stringify(summary)).run();
  return summary;
}

async function reviewedValueLearningStatus(env){
  const [count,last]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) n FROM valuation_rules WHERE active=1 AND rule_key LIKE 'review_value:%'`).first(),
    env.DB.prepare(`SELECT detail_json FROM admin_audit_log
      WHERE action='review_value_learning_run' ORDER BY id DESC LIMIT 1`).first()
  ]);
  return json({ok:true,active_models:Number(count?.n||0),last_run:safeJson(last?.detail_json,null)});
}

function candidateIsTraderie(row){return safeJson(row.evidence_json,[])[0]?.source==='traderie'||row.source_type==='market_observation'&&/^https:\/\/(?:www\.)?traderie\.com\//i.test(row.source_url||'');}
function candidateNeedsRepair(row){const ev=safeJson(row.evidence_json,[])[0];return candidateIsTraderie(row)&&(ev?.integrity?.complete!==true||ev?.integrity?.parser_version!==PARSER_VERSION);}
async function getCandidates(request,env){
 const url=new URL(request.url),status=url.searchParams.get('status')||'pending',cursor=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER;
 if(!['pending','repair','approved','hold','rejected','all'].includes(status))return json({ok:false,error:'invalid_status'},400);
 const filter=status==='repair'?"status='pending' AND "+REPAIR_SQL:status==='pending'?"status='pending' AND NOT "+REPAIR_SQL:status==='all'?'1=1':"status='"+status+"'";
 const {results=[]}=await env.DB.prepare('SELECT * FROM review_candidates WHERE '+filter+' AND id<? ORDER BY id DESC LIMIT 91').bind(cursor).all();
 const page=results.slice(0,90);return json({ok:true,has_more:results.length>90,next_cursor:page.at(-1)?.id||null,results:page.map(r=>({...r,evidence:safeJson(r.evidence_json,[]),proposal:safeJson(r.proposal_json,{}),...candidateQueueState(r)}))});
}
async function deletePendingCandidates(request,env){
 const body=await request.json().catch(()=>null);if(!body||!['preview','delete'].includes(body.mode))return json({ok:false,error:'invalid_payload'},400);
 let where="status='pending'",args=[];
 if(body.all!==true){if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>90||body.ids.some(x=>!Number.isSafeInteger(x)||x<=0))return json({ok:false,error:'선택 항목은 1~90개의 올바른 ID여야 합니다.'},400);const ids=[...new Set(body.ids)];where+=' AND id IN ('+ids.map(()=>'?').join(',')+')';args.push(...ids);}
 if(body.mode==='delete'){if(!Number.isSafeInteger(body.max_id)||body.max_id<0||!Number.isSafeInteger(body.expected_count)||body.expected_count<0)return json({ok:false,error:'삭제 미리보기를 먼저 확인하세요.'},400);where+=' AND id<=?';args.push(body.max_id);}
 const summary=await env.DB.prepare('SELECT COUNT(*) AS count,COALESCE(MAX(id),0) AS max_id FROM review_candidates WHERE '+where).bind(...args).first();
 if(body.mode==='preview')return json({ok:true,...summary});
 if(summary.count!==body.expected_count)return json({ok:false,error:'대기 목록이 변경되었습니다. 삭제 대상을 다시 확인하세요.'},409);
 if(!summary.count)return json({ok:true,deleted:0});
 const select='SELECT id FROM review_candidates WHERE '+where;
 const linked=await env.DB.prepare('SELECT COUNT(*) AS n FROM valuation_rules WHERE source_candidate_id IN ('+select+')').bind(...args).first();if(linked.n)return json({ok:false,error:'운영 규칙과 연결된 항목은 대기 삭제로 제거할 수 없습니다.'},409);
 const result=await env.DB.batch([
  env.DB.prepare('DELETE FROM parser_feedback WHERE candidate_id IN ('+select+')').bind(...args),
  env.DB.prepare('DELETE FROM operator_feedback WHERE candidate_id IN ('+select+')').bind(...args),
  env.DB.prepare("INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email) SELECT 'pending_deleted_item','candidate',id,json_object('dedupe_key',dedupe_key,'source_snapshot_hash',json_extract(evidence_json,'$[0].source_snapshot_hash')),'worker-session' FROM review_candidates WHERE "+where).bind(...args),
  env.DB.prepare('DELETE FROM review_candidates WHERE '+where+' AND NOT EXISTS (SELECT 1 FROM valuation_rules WHERE source_candidate_id=review_candidates.id)').bind(...args),
  env.DB.prepare("INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email) VALUES('pending_deleted','candidate',NULL,?,'worker-session')").bind(JSON.stringify({all:body.all===true,ids:body.ids||null,max_id:body.max_id,requested_count:summary.count}))
 ]);return json({ok:true,deleted:result[3]?.meta?.changes||0});
}
async function reparseCandidates(request,env){
 const body=await request.json().catch(()=>({})),ids=body.ids;
 if(!Array.isArray(ids)||!ids.length||ids.length>5||ids.some(x=>!Number.isSafeInteger(x)||x<=0))return json({ok:false,error:'재수집은 한 번에 1~5개 ID를 받습니다.'},400);
 const results=[];
 for(const id of [...new Set(ids)]){
  const row=await env.DB.prepare('SELECT * FROM review_candidates WHERE id=?').bind(id).first();
  if(!row||!['pending','hold'].includes(row.status)){results.push({id,ok:false,error:'검수 대기 또는 보류 항목만 재수집할 수 있습니다.'});continue;}
  const ev=safeJson(row.evidence_json,[])[0],listingId=String(ev?.listing_id||'');
  if(ev?.source!=='traderie'||!/^\d+$/.test(listingId)){results.push({id,ok:false,error:'Traderie 원본 매물 ID가 없습니다.'});continue;}
  try{
   const fetched=await traderieApiFetchListing(listingId);if(!fetched.ok)throw Error('원본 조회 실패 (HTTP '+fetched.http_status+'). 이전 기록을 유지합니다.');
   const obs=traderieApiObservation(fetched.listing,'admin-reparse');if(!obs)throw Error('동일 매물의 장비 정보를 확인할 수 없습니다.');
   const aff=normalizeAffixes(obs.affixes),signature=makeSignature(obs.item_type,obs.slot,aff);const updated=await maybeCreateMarketReviewCandidate(env,obs,aff,signature,id);
   results.push({id,ok:true,...updated,complete:obs.integrity.complete});
  }catch(e){results.push({id,ok:false,error:String(e.message||e)});}
 }
  return json({ok:true,results});
}
async function refreshPendingReviewCandidates(env,{limit=3,now=Date.now()}={}){
  const ids=[];let cursor=0;
  while(true){
    const {results:page=[]}=await env.DB.prepare(
      "SELECT id,evidence_json FROM review_candidates WHERE status='pending' AND source_type='market_observation' AND id>? ORDER BY id ASC LIMIT 200"
    ).bind(cursor).all();
    for(const row of page){
      const evidence=safeJson(row.evidence_json,[])[0];
      if(evidence?.source==='traderie'&&evidence.integrity?.complete!==true&&
         /^\d+$/.test(String(evidence.listing_id||'')))ids.push(row.id);
    }
    if(page.length<200)break;
    cursor=page.at(-1).id;
  }
  const batchSize=Math.max(0,Math.min(3,Number.isFinite(Number(limit))?Math.trunc(Number(limit)):0));
  if(!ids.length||!batchSize)return {pending_reparse:ids.length,attempted:0,complete:0,failed:0};
  const offset=(Math.floor(now/3600000)*batchSize)%ids.length;
  const selected=Array.from({length:Math.min(batchSize,ids.length)},(_,index)=>ids[(offset+index)%ids.length]);
  const request=new Request('https://internal.invalid/api/admin/candidates/reparse',{method:'POST',
    headers:{'content-type':'application/json'},body:JSON.stringify({ids:selected})});
  const response=await reparseCandidates(request,env);
  const result=await response.json(),rows=result.results||[];
  return {pending_reparse:ids.length,attempted:selected.length,
    complete:rows.filter(row=>row.ok&&row.complete===true).length,
    failed:rows.filter(row=>!row.ok).length};
}
function marketStructuredPrice(price){
 if(!price.complete)return (price.display||'가격 없음')+' · 가격 구조 확인 필요';
 return price.alternatives.map(x=>{const str=x.items.map(p=>marketKoPrice(p.quantity,p.name)).join(' + ');return x.items.length>1?'('+str+')':str;}).join(' 또는 ');
}

async function createCandidate(request, env) {
  const body = await request.json().catch(()=>null);
  if (!body) return json({ok:false,error:"invalid_json"},400);

  const proposal = body.proposal;
  if (!body.item_type || !body.title || !validProposal(proposal)) {
    return json({ok:false,error:"invalid_payload"},400);
  }

  const confidence = Math.max(0,Math.min(1,Number(body.confidence)||0));
  try {
    const r = await env.DB.prepare(
      `INSERT INTO review_candidates
       (item_type,title,source_type,source_url,evidence_json,proposal_json,confidence,dedupe_key)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(
      String(body.item_type),
      String(body.title),
      String(body.source_type||"manual"),
      body.source_url ? String(body.source_url) : null,
      JSON.stringify(Array.isArray(body.evidence)?body.evidence:[]),
      JSON.stringify(proposal),
      confidence,
      body.dedupe_key ? String(body.dedupe_key) : null
    ).run();

    await env.DB.prepare(
      `INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email)
       VALUES('candidate_created','candidate',?,?,?)`
    ).bind(r.meta.last_row_id,JSON.stringify({title:body.title}),"worker-session").run();

    return json({ok:true,id:r.meta.last_row_id},201);
  } catch(e) {
    const msg=String(e?.message||e);
    if (msg.includes("UNIQUE")) return json({ok:false,error:"duplicate_candidate"},409);
    throw e;
  }
}


const FEEDBACK_RUNTIME_KEY_MAP={
  fcr:"fcr",frw:"frw",fhr:"fhr",ias:"ias",
  str:"str",dex:"dex",life:"life",mana:"mana",allres:"allres",
  fireres:"fire",lightres:"light",coldres:"cold",poisonres:"poison",
  ar:"ar",ll:"ll",ml:"ml",mf:"mf",
  amazon_skills:"classskill",sorc_skills:"classskill",necro_skills:"classskill",
  paladin_skills:"classskill",barbarian_skills:"classskill",druid_skills:"classskill",
  assassin_skills:"classskill",warlock_skills:"classskill"
};

const FEEDBACK_CONTEXT_PRIORITY=[
  "amazon_skills","sorc_skills","necro_skills","paladin_skills","barbarian_skills",
  "druid_skills","assassin_skills","warlock_skills",
  "fcr","ias","frw","fhr","allres","str","dex","life","mana","ar","ll","ml","mf"
];

function feedbackContextFromCandidate(row){
  const proposal=safeJson(row?.proposal_json,{});
  const evidence=safeJson(row?.evidence_json,[]);
  const e=Array.isArray(evidence)?(evidence[0]||{}):{};
  const aff=(e && e.affixes && typeof e.affixes==="object") ? e.affixes : {};
  const slot=String(proposal?.slot||e?.slot||row?.item_type||"other");

  const selected={};
  for(const key of FEEDBACK_CONTEXT_PRIORITY){
    if(aff[key]===undefined || aff[key]===null) continue;
    const n=Number(aff[key]);
    if(!Number.isFinite(n)) continue;
    selected[key]=n;
    if(Object.keys(selected).length>=5) break;
  }

  return {
    slot,
    item_type:String(proposal?.item_type||e?.item_type||row?.item_type||"레어"),
    base_name:String(e?.base_name||e?.display_ko?.base_name||""),
    source_type:String(row?.source_type||""),
    source_url:String(row?.source_url||e?.source_url||""),
    affixes:selected,
    affix_keys:Object.keys(selected).sort(),
    price_amount:e?.price_amount==null?null:Number(e.price_amount),
    price_structure:e?.price_structure||null,integrity:e?.integrity||null,
    price_currency:e?.price_currency||null,
    reviewer_tags:safeJson(row?.reviewer_tags_json,[]),review_reason_type:row?.review_reason_type||null,learning_eligible:Number(row?.learning_eligible||0)===1,parser_quality:e?.parser_quality||proposal?.parser_quality||null
  };
}

function feedbackExtractSignals(note,decision,ctx){
  const t=String(note||"").trim();
  const compact=t.replace(/[，、]/g,",").replace(/[。]/g,".").replace(/\s+/g," ").trim();
  const signals=[];
  const add=(key,polarity,weight,reason,extra={})=>{
    if(signals.some(x=>x.key===key)) return;
    signals.push({key,polarity,weight,reason,...extra});
  };

  const socketMention=/(소켓|솟|홈)/i.test(compact);
  const noSocket=/(무\s*(?:소켓|솟|홈)|노\s*(?:소켓|솟|홈)|(?:소켓|솟|홈)(?:이|가|은|는)?\s*(?:없|없음|없어서|없으|안\s*붙|미존재|부족)|(?:0|제로)\s*(?:소켓|솟|홈)|(?:소켓|솟|홈).{0,12}(?:없|부족|아쉽))/i.test(compact);
  const highPrice=/(고가|고\s*가격|높은\s*가격|상위\s*가격|상위권|고점|프리미엄|가격\s*천장|비싼\s*값|비싸게|가격대가?\s*높)/i.test(compact);
  const difficult=/(어렵|힘들|낮|제한|상한|안\s*됨|안\s*나옴|못\s*받|받기\s*어렵|형성.{0,8}어렵|고가.{0,8}힘)/i.test(compact);
  const required=/(있어야|필요|필수|갖춰야|붙어야|달려야|전제|있으면.{0,8}(좋|비싸|고가)|없으면.{0,8}(힘|어렵|낮))/i.test(compact);
  const synergyGood=/(시너지.{0,15}(좋|잘|괜찮)|옵션.{0,15}(잘\s*붙|좋|괜찮|조합)|조합.{0,15}(좋|잘|괜찮)|옵들이?.{0,10}(좋|잘))/i.test(compact);
  const demandLow=/(수요.{0,12}(없|낮|적|약)|거래.{0,12}(어렵|안\s*됨|잘\s*안)|비주류|찾는\s*사람.{0,8}(없|적))/i.test(compact);
  const demandHigh=/(수요.{0,12}(높|많|강)|거래.{0,12}(잘\s*됨|활발)|주류\s*빌드|찾는\s*사람.{0,8}(많|있))/i.test(compact);
  const undervalued=/(저평가|싸게|가격이?\s*낮|더\s*받|더\s*비싸|이\s*가격이면\s*쌈)/i.test(compact);
  const overvalued=/(고평가|비싸게\s*올림|가격이?\s*높|과대|이\s*가격이면\s*비쌈)/i.test(compact);

  let requiredSockets=null;
  const sm=compact.match(/([12])\s*(?:소켓|솟|홈)/i);
  if(sm) requiredSockets=Number(sm[1]);

  if(noSocket && (highPrice || difficult))
    add("missing_socket_price_ceiling","negative",0.98,"소켓 부재가 상위 가격대 또는 가격 상한을 제한",{factor:"sockets",required_sockets:requiredSockets||1});

  if(socketMention && required && (highPrice || /프리미엄|가치|가격/i.test(compact)))
    add("socket_highend_gate","positive",0.96,"해당 옵션 문맥에서 소켓이 상위 가격대의 조건부 프리미엄",{factor:"sockets",required_sockets:requiredSockets||1});

  if(synergyGood)
    add("option_synergy_positive","positive",0.80,"현재 옵션 조합의 시너지가 긍정적으로 평가됨");

  if(synergyGood && difficult)
    add("synergy_but_price_ceiling","negative",0.90,"옵션 시너지는 좋지만 추가 프리미엄 요인 부족으로 가격 상한 존재");

  if(demandLow)
    add("low_build_demand","negative",0.86,"빌드/시장 수요 부족이 가치 제한 요소");

  if(demandHigh)
    add("high_build_demand","positive",0.84,"빌드/시장 수요가 높은 조합");

  if(undervalued)
    add("operator_undervalued","positive",0.82,"운영자가 현재 관측 가격을 저평가로 판단");

  if(overvalued)
    add("operator_overvalued","negative",0.82,"운영자가 현재 관측 가격을 고평가로 판단");


  const tagSet=new Set(Array.isArray(ctx?.reviewer_tags)?ctx.reviewer_tags:[]);
  if(tagSet.has("synergy_good"))add("option_synergy_positive","positive",0.95,"태그: 시너지 좋음");
  if(tagSet.has("highend_possible"))add("highend_possible","positive",0.92,"태그: 고가 가능");
  if(tagSet.has("build_demand_high"))add("high_build_demand","positive",0.92,"태그: 수요 높음");
  if(tagSet.has("price_undervalued"))add("operator_undervalued","positive",0.92,"태그: 저평가");
  if(tagSet.has("socket_premium"))add("socket_highend_gate","positive",0.92,"태그: 소켓 프리미엄",{factor:"sockets"});
  if(tagSet.has("rare_combo"))add("rare_combo","positive",0.90,"태그: 희소 조합");
  if(tagSet.has("build_demand_low"))add("low_build_demand","negative",0.92,"태그: 수요 낮음");
  if(tagSet.has("socket_missing"))add("missing_socket_price_ceiling","negative",0.92,"태그: 소켓 부족",{factor:"sockets"});
  if(tagSet.has("stat_missing"))add("stat_missing","negative",0.88,"태그: 스탯 부족");
  if(tagSet.has("resist_missing"))add("resist_missing","negative",0.88,"태그: 저항 부족");
  if(tagSet.has("core_affix_missing"))add("core_affix_missing","negative",0.90,"태그: 핵심 옵션 부족");
  if(tagSet.has("price_overvalued"))add("operator_overvalued","negative",0.92,"태그: 고평가");
  if(tagSet.has("synergy_weak"))add("synergy_weak","negative",0.90,"태그: 시너지 약함");

  if(t && signals.length===0){
    const keywords=[...new Set((compact.match(/[가-힣A-Za-z0-9+%]{2,}/g)||[]).slice(0,12))];
    add("unclassified_operator_insight","neutral",0.30,"원문 메모는 보존됐지만 아직 자동 규칙으로 구조화되지 않음",{keywords});
  }

  return {version:"feedback-parser-2",decision:String(decision||""),raw_note:t,signals};
}

function feedbackContextKey(ctx){
  return [
    String(ctx?.slot||"other"),
    ...(Array.isArray(ctx?.affix_keys)?ctx.affix_keys:[])
  ].join("|");
}

function feedbackPatternKey(signal,ctx){
  return `${String(ctx?.slot||"other")}|${String(signal?.key||"unknown")}|${feedbackContextKey(ctx)}`;
}

function feedbackRuleConditions(ctx,signal){
  const conditions={};
  const aff=ctx?.affixes||{};

  for(const [key,value] of Object.entries(aff)){
    const runtimeKey=FEEDBACK_RUNTIME_KEY_MAP[key];
    if(!runtimeKey) continue;
    const n=Number(value);
    if(!Number.isFinite(n)) continue;

    let threshold=n;
    if(["str","dex","life","mana","ar"].includes(runtimeKey))
      threshold=Math.max(1,Math.floor(n/5)*5);
    else if(["allres","fire","light","cold","poison"].includes(runtimeKey))
      threshold=Math.max(1,Math.floor(n/5)*5);

    conditions[runtimeKey]={gte:threshold};
  }

  if(signal?.key==="missing_socket_price_ceiling")
    conditions.sockets={lte:0};

  if(signal?.key==="socket_highend_gate")
    conditions.sockets={gte:Number(signal?.required_sockets)||1};

  return conditions;
}

function feedbackShadowRule(pattern){
  const context=safeJson(pattern?.context_json,{});
  // The runtime currently stores every class skill as one classskill number.
  // Do not auto-promote a rule that could match another class's item.
  if(Object.keys(context.affixes||{}).some(key=>/_skills$/.test(key)))return null;
  const signal={key:pattern?.signal_key,required_sockets:Number(pattern?.required_sockets)||null};
  const conditions=feedbackRuleConditions(context,signal);
  const koSlot=marketKoSlot(pattern?.slot||context?.slot);
  const count=Number(pattern?.mention_count)||0;
  const market=Number(pattern?.market_match_count)||0;

  let delta=0,note="";
  const tags=["operator-feedback","auto-learned","shadow-validated"];

  if(pattern?.signal_key==="missing_socket_price_ceiling"){
    delta=-4;
    note=`운영자 피드백 학습: ${koSlot}에서 현재 옵션 시너지 대비 소켓 부재가 고가권 진입을 제한하는 패턴 (${count}회 피드백 · 시장 유사 ${market}건)`;
    tags.push("price-ceiling","missing-socket");
  }else if(pattern?.signal_key==="socket_highend_gate"){
    delta=3;
    note=`운영자 피드백 학습: ${koSlot}에서 핵심 옵션 시너지와 소켓이 함께 있을 때 상위 가격대 프리미엄이 형성되는 패턴 (${count}회 피드백 · 시장 유사 ${market}건)`;
    tags.push("socket-premium","conditional-synergy");
  }else if(pattern?.signal_key==="option_synergy_positive"){
    delta=2;
    note=`운영자 피드백 학습: ${koSlot}의 해당 옵션 조합이 반복적으로 긍정적 시너지로 평가됨 (${count}회 피드백 · 시장 유사 ${market}건)`;
    tags.push("option-synergy");
  }else if(pattern?.signal_key==="low_build_demand"){
    delta=-3;
    note=`운영자 피드백 학습: 해당 조합은 옵션 수치 대비 실제 빌드 수요가 낮게 반복 평가됨 (${count}회 피드백 · 시장 유사 ${market}건)`;
    tags.push("low-demand");
  }else{
    return null;
  }

  return {
    rule_key:`feedback:auto:${String(pattern.pattern_key).replace(/[^a-zA-Z0-9:_|-]/g,"_").slice(0,150)}`,
    label:`자동학습 · ${koSlot} · ${pattern.signal_key}`,
    slot:pattern.slot||context.slot||null,
    item_type:pattern.item_type||context.item_type||"레어",
    priority:68,
    conditions,
    effects:{
      score_delta:delta,
      ...(delta>0?{strength_note:note}:{warning_note:note}),
      tags
    },
    learning_meta:{
      source:"operator_feedback",
      pattern_key:pattern.pattern_key,
      signal_key:pattern.signal_key,
      mention_count:count,
      market_match_count:market,
      confidence:Number(pattern.confidence)||0,
      auto_promoted:true
    }
  };
}

function feedbackAffixSimilarity(contextAffixes,obsAffixes){
  const keys=Object.keys(contextAffixes||{});
  if(!keys.length) return 0;
  let hit=0;
  for(const key of keys){
    const a=Number(contextAffixes[key]);
    const b=Number(obsAffixes?.[key]);
    if(!Number.isFinite(a)||!Number.isFinite(b)) continue;
    const floor=a===0?0:Math.max(1,Math.floor(a*0.70));
    if(b>=floor) hit++;
  }
  return hit/keys.length;
}

function marketReviewKey(sourceUrl,affixes,priceAmount){
  if(!sourceUrl||priceAmount===null||priceAmount===undefined)return null;
  const amount=Number(priceAmount);
  if(!Number.isFinite(amount))return null;
  const entries=Object.entries(affixes&&typeof affixes==='object'?affixes:{})
    .map(([key,value])=>[key,Number(value)]).sort(([a],[b])=>a.localeCompare(b));
  return `${sourceUrl}|${amount}|${JSON.stringify(entries)}`;
}

async function marketReviewIndex(env){
  const {results=[]}=await env.DB.prepare(
    `SELECT source_url,status,learning_eligible,
            CASE WHEN json_valid(evidence_json) THEN json_extract(evidence_json,'$[0].affixes') ELSE NULL END affixes_json,
            CASE WHEN json_valid(evidence_json) THEN json_extract(evidence_json,'$[0].price_amount') ELSE NULL END price_amount
     FROM review_candidates
     WHERE source_type='market_observation' AND source_url IS NOT NULL
     ORDER BY id DESC LIMIT 10000`
  ).all();
  const index=new Map();
  for(const row of results){
    const key=marketReviewKey(row.source_url,safeJson(row.affixes_json,{}),row.price_amount);
    if(key&&!index.has(key))index.set(key,row.status==='approved'&&Number(row.learning_eligible)===1);
  }
  return index;
}

function marketObservationReviewed(row,index){
  if(row.source_key!=='traderie')return true;
  const key=marketReviewKey(row.source_url,safeJson(row.affixes_json,{}),row.price_amount);
  return !!(key&&index?.get(key)===true);
}

async function feedbackMarketSupport(env,ctx,reviewIndex){
  const {results=[]}=await env.DB.prepare(
    `SELECT source_key,source_url,source_listing_id,slot,affixes_json,price_amount,observed_at
     FROM market_observations
     WHERE slot=?
       AND observed_at>=datetime('now','-180 day')
     ORDER BY id DESC LIMIT 500`
  ).bind(ctx.slot).all();

  const matchedListings=new Set();
  for(const row of results){
    if(!marketObservationReviewed(row,reviewIndex))continue;
    const aff=safeJson(row.affixes_json,{});
    if(feedbackAffixSimilarity(ctx.affixes||{},aff)>=0.70)
      matchedListings.add(`${row.source_key}|${row.source_listing_id||row.source_url||row.observed_at}`);
  }
  return matchedListings.size;
}

async function recordOperatorFeedback(env,row,decision,note){
  const clean=String(note||"").trim();
  if(!clean) return {stored:false,reason:"empty_note"};

  const ctx=feedbackContextFromCandidate(row);
  const parsed=feedbackExtractSignals(clean,decision,ctx);

  try{
    const r=await env.DB.prepare(
      `INSERT INTO operator_feedback
       (candidate_id,decision,note,slot,item_type,source_type,source_url,context_json,signals_json)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(
      Number(row.id),String(decision),clean,ctx.slot,ctx.item_type,
      String(row.source_type||""),String(row.source_url||""),
      JSON.stringify(ctx),JSON.stringify(parsed)
    ).run();
    return {stored:true,id:r.meta.last_row_id,signals:parsed.signals.length};
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE")) return {stored:false,reason:"already_recorded"};
    throw e;
  }
}

async function backfillOperatorFeedback(env){
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM review_candidates
     WHERE reviewed_at IS NOT NULL
       AND ((reviewer_note IS NOT NULL AND trim(reviewer_note)<>'')
         OR (reviewer_tags_json IS NOT NULL AND reviewer_tags_json<>'[]'))
       AND (learning_eligible=1 OR (learning_eligible IS NULL AND status='approved'))
       AND NOT EXISTS (SELECT 1 FROM operator_feedback f WHERE f.candidate_id=review_candidates.id)
     ORDER BY id ASC LIMIT 1000`
  ).all();

  let added=0;
  for(const row of results){
    if(candidateNeedsRepair(row))continue;
    const ev=safeJson(row.evidence_json,[])[0];if(ev?.source==='traderie'&&ev.price_structure?.amount==null)continue;
    const decision=row.status==="approved"?"approve":row.status==="rejected"?"reject":"hold";
    const tags=normalizeReviewTags(safeJson(row.reviewer_tags_json,[]));
    const feedbackNote=String(row.reviewer_note||'').trim()||tags.map(x=>REVIEW_FEEDBACK_TAGS[x]?.label||x).join(' / ');
    const r=await recordOperatorFeedback(env,row,decision,feedbackNote);
    if(r.stored) added++;
  }
  return added;
}


async function reparseOperatorFeedback(env){
  const {results=[]}=await env.DB.prepare(
    `SELECT f.*,r.proposal_json,r.evidence_json,r.reviewer_tags_json,r.item_type AS review_item_type
     FROM operator_feedback f
     LEFT JOIN review_candidates r ON r.id=f.candidate_id
     ORDER BY f.id DESC LIMIT 2500`
  ).all();

  let reparsed=0,classified=0,unclassified=0;
  for(const row of results){
    const ctx=feedbackContextFromCandidate({
      ...row,
      item_type:row.review_item_type||row.item_type,
      proposal_json:row.proposal_json,
      evidence_json:row.evidence_json
    });
    const parsed=feedbackExtractSignals(row.note,row.decision,ctx);
    if((parsed.signals||[]).some(x=>x.key==="unclassified_operator_insight")) unclassified++;
    else if((parsed.signals||[]).length) classified++;

    await env.DB.prepare(
      `UPDATE operator_feedback SET slot=?,item_type=?,context_json=?,signals_json=? WHERE id=?`
    ).bind(ctx.slot,ctx.item_type,JSON.stringify(ctx),JSON.stringify(parsed),Number(row.id)).run();
    reparsed++;
  }
  return {reparsed,classified,unclassified};
}

async function rebuildFeedbackPatterns(env){
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM operator_feedback
     WHERE created_at>=datetime('now','-365 day')
     ORDER BY id DESC LIMIT 2000`
  ).all();

  const groups=new Map();
  for(const row of results){
    const ctx=safeJson(row.context_json,{});
    const parsed=safeJson(row.signals_json,{});
    for(const sig of (parsed.signals||[])){
      if(sig.key==="unclassified_operator_insight") continue;
      const key=feedbackPatternKey(sig,ctx);
      if(!groups.has(key)){
        groups.set(key,{
          pattern_key:key,slot:ctx.slot||row.slot||"other",
          item_type:ctx.item_type||row.item_type||"레어",
          signal_key:sig.key,required_sockets:Number(sig.required_sockets)||null,
          context:ctx,mention_count:0,approve_count:0,reject_count:0,hold_count:0,weight_sum:0
        });
      }
      const g=groups.get(key);
      if(row.decision==="approve"){
        g.mention_count++;
        g.approve_count++;
        g.weight_sum+=Number(sig.weight)||0.5;
      }else if(row.decision==="reject")g.reject_count++;
      else g.hold_count++;
    }
  }

  const reviewIndex=await marketReviewIndex(env);
  let updated=0;
  for(const g of groups.values()){
    const marketMatch=await feedbackMarketSupport(env,g.context,reviewIndex);
    const avgWeight=g.mention_count?g.weight_sum/g.mention_count:0;
    const operatorScore=Math.min(1,g.mention_count/5);
    const marketScore=Math.min(1,marketMatch/12);
    const confidence=Math.max(0,Math.min(0.98,avgWeight*0.45+operatorScore*0.35+marketScore*0.20));
    const status=(g.mention_count>=3 && marketMatch>=6 && confidence>=0.80)?"shadow_ready":"learning";

    await env.DB.prepare(
      `INSERT INTO feedback_patterns
       (pattern_key,slot,item_type,signal_key,required_sockets,context_json,
        mention_count,approve_count,reject_count,hold_count,market_match_count,
        confidence,status,last_evaluated_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
       ON CONFLICT(pattern_key) DO UPDATE SET
        slot=excluded.slot,item_type=excluded.item_type,signal_key=excluded.signal_key,
        required_sockets=excluded.required_sockets,context_json=excluded.context_json,
        mention_count=excluded.mention_count,approve_count=excluded.approve_count,
        reject_count=excluded.reject_count,hold_count=excluded.hold_count,
        market_match_count=excluded.market_match_count,confidence=excluded.confidence,
        status=CASE WHEN feedback_patterns.status='active' THEN feedback_patterns.status ELSE excluded.status END,
        last_evaluated_at=datetime('now'),updated_at=datetime('now')`
    ).bind(
      g.pattern_key,g.slot,g.item_type,g.signal_key,g.required_sockets,JSON.stringify(g.context),
      g.mention_count,g.approve_count,g.reject_count,g.hold_count,marketMatch,confidence,status
    ).run();
    updated++;
  }
  return updated;
}

async function evaluateFeedbackShadowRules(env){
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM feedback_patterns
     WHERE status IN ('shadow_ready','active','rolled_back')
     ORDER BY confidence DESC,mention_count DESC LIMIT 300`
  ).all();

  let shadowed=0,promoted=0,rolledBack=0;
  for(const p of results){
    const rule=feedbackShadowRule(p);
    if(!rule) continue;

    const confidence=Number(p.confidence)||0;
    const mentions=Number(p.mention_count)||0;
    const market=Number(p.market_match_count)||0;
    const approvals=Number(p.approve_count)||0;
    const promotable=mentions>=3 && approvals>=3 && market>=6 && confidence>=0.80;

    if(promotable){
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO feedback_shadow_rules
           (pattern_key,rule_key,rule_json,status,confidence,validated_at,updated_at)
           VALUES (?,?,?,'promoted',?,datetime('now'),datetime('now'))
           ON CONFLICT(pattern_key) DO UPDATE SET
             rule_key=excluded.rule_key,rule_json=excluded.rule_json,status='promoted',
             confidence=excluded.confidence,validated_at=datetime('now'),updated_at=datetime('now')`
        ).bind(p.pattern_key,rule.rule_key,JSON.stringify(rule),confidence),
        env.DB.prepare(
          `INSERT INTO valuation_rules
           (rule_key,label,item_type,slot,priority,rule_json,source_candidate_id,active)
           VALUES (?,?,?,?,?,?,NULL,1)
           ON CONFLICT(rule_key) DO UPDATE SET
             label=excluded.label,item_type=excluded.item_type,slot=excluded.slot,
             priority=excluded.priority,rule_json=excluded.rule_json,active=1,
             updated_at=datetime('now')`
        ).bind(rule.rule_key,rule.label,rule.item_type,rule.slot,rule.priority,JSON.stringify(rule)),
        env.DB.prepare(
          `UPDATE feedback_patterns SET status='active',updated_at=datetime('now') WHERE pattern_key=?`
        ).bind(p.pattern_key),
        env.DB.prepare(
          `INSERT INTO admin_audit_log(action,target_type,detail_json,actor_email)
           VALUES('feedback_rule_auto_promoted','feedback_pattern',?,'system-cron')`
        ).bind(JSON.stringify({pattern_key:p.pattern_key,rule_key:rule.rule_key,mentions,market_matches:market,confidence}))
      ]);
      promoted++;
      continue;
    }

    if(p.status==="active" && (confidence<0.62 || mentions<2)){
      await env.DB.batch([
        env.DB.prepare(`UPDATE valuation_rules SET active=0,updated_at=datetime('now') WHERE rule_key=?`).bind(rule.rule_key),
        env.DB.prepare(`UPDATE feedback_patterns SET status='rolled_back',updated_at=datetime('now') WHERE pattern_key=?`).bind(p.pattern_key),
        env.DB.prepare(`UPDATE feedback_shadow_rules SET status='rolled_back',updated_at=datetime('now') WHERE pattern_key=?`).bind(p.pattern_key),
        env.DB.prepare(
          `INSERT INTO admin_audit_log(action,target_type,detail_json,actor_email)
           VALUES('feedback_rule_auto_rollback','feedback_pattern',?,'system-cron')`
        ).bind(JSON.stringify({pattern_key:p.pattern_key,rule_key:rule.rule_key,confidence}))
      ]);
      rolledBack++;
      continue;
    }

    await env.DB.prepare(
      `INSERT INTO feedback_shadow_rules
       (pattern_key,rule_key,rule_json,status,confidence,updated_at)
       VALUES (?,?,?,'shadow',?,datetime('now'))
       ON CONFLICT(pattern_key) DO UPDATE SET
         rule_key=excluded.rule_key,rule_json=excluded.rule_json,status='shadow',
         confidence=excluded.confidence,updated_at=datetime('now')`
    ).bind(p.pattern_key,rule.rule_key,JSON.stringify(rule),confidence).run();
    shadowed++;
  }
  return {shadowed,promoted,rolled_back:rolledBack};
}

async function runFeedbackLearning(env,trigger="manual"){
  const started=Date.now();
  const backfilled=await backfillOperatorFeedback(env);
  const reparsed=await reparseOperatorFeedback(env);
  const patterns=await rebuildFeedbackPatterns(env);
  const rules=await evaluateFeedbackShadowRules(env);
  const summary={
    trigger,backfilled,reparsed:reparsed.reparsed,
    classified:reparsed.classified,unclassified:reparsed.unclassified,
    patterns,shadowed:rules.shadowed,
    promoted:rules.promoted,rolled_back:rules.rolled_back,
    elapsed_ms:Date.now()-started
  };

  await env.DB.prepare(
    `INSERT INTO feedback_learning_runs(trigger,summary_json,elapsed_ms) VALUES (?,?,?)`
  ).bind(trigger,JSON.stringify(summary),summary.elapsed_ms).run();

  return summary;
}

async function feedbackLearningStatus(env){
  const [f,p,s,runs]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) n FROM operator_feedback`).first(),
    env.DB.prepare(`SELECT status,COUNT(*) n FROM feedback_patterns GROUP BY status`).all(),
    env.DB.prepare(`SELECT status,COUNT(*) n FROM feedback_shadow_rules GROUP BY status`).all(),
    env.DB.prepare(`SELECT * FROM feedback_learning_runs ORDER BY id DESC LIMIT 10`).all()
  ]);

  const patternCounts=Object.fromEntries((p.results||[]).map(x=>[x.status,Number(x.n)||0]));
  const shadowCounts=Object.fromEntries((s.results||[]).map(x=>[x.status,Number(x.n)||0]));
  const {results:top=[]}=await env.DB.prepare(
    `SELECT pattern_key,slot,signal_key,mention_count,market_match_count,confidence,status,updated_at
     FROM feedback_patterns ORDER BY confidence DESC,mention_count DESC LIMIT 20`
  ).all();

  const {results:recentFeedback=[]}=await env.DB.prepare(
    `SELECT id,candidate_id,decision,note,slot,item_type,signals_json,created_at
     FROM operator_feedback ORDER BY id DESC LIMIT 20`
  ).all();

  return json({
    ok:true,feedback_count:Number(f?.n)||0,patterns:patternCounts,shadow_rules:shadowCounts,
    top_patterns:top,
    recent_feedback:recentFeedback.map(x=>({...x,signals:safeJson(x.signals_json,{}).signals||[]})),
    recent_runs:(runs.results||[]).map(x=>({...x,summary:safeJson(x.summary_json,{})}))
  });
}


function sourceAuditAffixCompare(storedAff,reparsedAff){
  const a=storedAff&&typeof storedAff==="object"?storedAff:{};
  const b=reparsedAff&&typeof reparsedAff==="object"?reparsedAff:{};
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  const rows=keys.map(key=>{
    const av=a[key]===undefined?null:Number(a[key]);
    const bv=b[key]===undefined?null:Number(b[key]);
    const match=av!==null && bv!==null && Number.isFinite(av) && Number.isFinite(bv) && av===bv;
    return {key,stored:av,reparsed:bv,match};
  });
  const expected=Object.keys(a).length;
  const exact=rows.filter(x=>x.match && a[x.key]!==undefined).length;
  return {
    expected,
    exact,
    accuracy:expected?exact/expected:0,
    rows,
    missing_in_reparse:rows.filter(x=>a[x.key]!==undefined && b[x.key]===undefined).map(x=>x.key),
    value_mismatch:rows.filter(x=>a[x.key]!==undefined && b[x.key]!==undefined && !x.match).map(x=>x.key),
    extra_in_reparse:rows.filter(x=>a[x.key]===undefined && b[x.key]!==undefined).map(x=>x.key)
  };
}

function sourceAuditCompareObservation(stored,reparsed){
  if(!reparsed){
    return {
      status:"fail",
      score:0,
      price_match:false,
      slot_match:false,
      base_match:false,
      affixes:{expected:Object.keys(safeJson(stored.affixes_json,{})).length,exact:0,accuracy:0,rows:[]}
    };
  }

  const storedAff=safeJson(stored.affixes_json,{});
  const affixes=sourceAuditAffixCompare(storedAff,reparsed.affixes||{});
  const priceMatch=Number(stored.price_amount)===Number(reparsed.price_amount) &&
    String(stored.price_currency||"")===String(reparsed.price_currency||"");
  const slotMatch=String(stored.slot||"")===String(reparsed.slot||"");
  const baseStored=String(stored.base_name||"").replace(/\s+/g," ").trim().toLowerCase();
  const baseRe=String(reparsed.base_name||"").replace(/\s+/g," ").trim().toLowerCase();
  const baseMatch=!baseStored||!baseRe||baseStored===baseRe;

  const score=(affixes.accuracy*0.65)+(priceMatch?0.20:0)+(slotMatch?0.10:0)+(baseMatch?0.05:0);
  return {
    status:score>=0.95?"pass":score>=0.75?"partial":"fail",
    score,
    price_match:priceMatch,
    slot_match:slotMatch,
    base_match:baseMatch,
    affixes
  };
}


function playnoteObservationMatchScore(oldRow,newObs){
  let score=0;
  if(String(oldRow.slot||"")===String(newObs.slot||"")) score+=0.15;
  if(Number(oldRow.price_amount)===Number(newObs.price_amount) &&
     String(oldRow.price_currency||"")===String(newObs.price_currency||"")) score+=0.25;

  const oldBase=String(oldRow.base_name||"").replace(/\s+/g," ").trim().toLowerCase();
  const newBase=String(newObs.base_name||"").replace(/\s+/g," ").trim().toLowerCase();
  if(oldBase && newBase && oldBase===newBase) score+=0.15;

  const cmp=sourceAuditAffixCompare(safeJson(oldRow.affixes_json,{}),newObs.affixes||{});
  score+=cmp.accuracy*0.45;
  return score;
}

async function recoverPlaynoteListingIds(env,rows){
  const missing=rows.filter(x=>!x.source_listing_id);
  if(!missing.length) return {recovered:0,candidates:[]};

  let fetched;
  try{
    fetched=await publicFetch(env,{
      url:"https://www.playnote.co.kr/trade/itemmarket?index=1",
      last_etag:null,last_modified:null,last_hash:null
    });
  }catch(e){
    return {recovered:0,error:String(e?.message||e),candidates:[]};
  }

  const parsed=playnoteAdapter(fetched.html,"https://www.playnote.co.kr/trade/itemmarket?index=1");
  const live=(parsed.observations||[]).filter(x=>x.source_listing_id);
  let recovered=0;

  for(const row of missing){
    let best=null,bestScore=0;
    for(const obs of live){
      const s=playnoteObservationMatchScore(row,obs);
      if(s>bestScore){bestScore=s;best=obs;}
    }
    // Require very strong match before mutating stored source identity.
    if(best && bestScore>=0.90){
      await env.DB.prepare(
        `UPDATE market_observations
         SET source_listing_id=?,source_url=?
         WHERE id=? AND source_key='playnote'`
      ).bind(best.source_listing_id,best.source_url,row.id).run();

      row.source_listing_id=best.source_listing_id;
      row.source_url=best.source_url;
      recovered++;
    }
  }

  return {
    recovered,
    live_candidates:live.length,
    parser_meta:parsed.parse_meta||null,
    diagnostic:live.length?null:{
      reason:"no_structured_live_candidates",
      observations:(parsed.observations||[]).length,
      rejections:(parsed.rejects||[]).length
    }
  };
}

async function auditPlaynoteSources(env,limit=5){
  const {results=[]}=await env.DB.prepare(
    `SELECT id,source_key,source_url,source_listing_id,item_type,slot,base_name,
            affixes_json,price_amount,price_currency,observed_at
     FROM market_observations
     WHERE source_key='playnote'
     ORDER BY id DESC LIMIT ?`
  ).bind(Math.max(1,Math.min(10,Number(limit)||5))).all();

  const recovery=await recoverPlaynoteListingIds(env,results);
  const auditable=results.filter(x=>x.source_listing_id);
  const audits=[];
  for(const row of auditable){
    const detailUrl=playnoteDetailUrl(row.source_listing_id)||row.source_url;
    try{
      const fetched=await publicFetch(env,{
        url:detailUrl,last_etag:null,last_modified:null,last_hash:null
      });
      const cls=classifyAcquiredContent("playnote",detailUrl,fetched.html);
      const parsed=playnoteDetailAdapter(fetched.html,detailUrl);
      const obs=(parsed.observations||[])[0]||null;
      const cmp=sourceAuditCompareObservation(row,obs);

      audits.push({
        observation_id:row.id,
        listing_id:row.source_listing_id,
        stored_source_url:row.source_url,
        canonical_source_url:detailUrl,
        fetch_status:fetched.status,
        acquisition_status:cls.status,
        acquisition_reason:cls.reason,
        stored:{
          slot:row.slot,base_name:row.base_name,
          affixes:safeJson(row.affixes_json,{}),
          price_amount:row.price_amount,price_currency:row.price_currency
        },
        reparsed:obs?{
          slot:obs.slot,base_name:obs.base_name,affixes:obs.affixes,
          price_amount:obs.price_amount,price_currency:obs.price_currency
        }:null,
        comparison:cmp,
        parse_meta:parsed.parse_meta||null,
        reject:parsed.reject||null
      });
    }catch(e){
      audits.push({
        observation_id:row.id,listing_id:row.source_listing_id,
        canonical_source_url:detailUrl,
        comparison:{status:"fail",score:0},
        error:String(e?.message||e)
      });
    }
  }

  const checked=audits.length;
  const passed=audits.filter(x=>x.comparison?.status==="pass").length;
  const partial=audits.filter(x=>x.comparison?.status==="partial").length;
  const failed=audits.filter(x=>x.comparison?.status==="fail").length;
  const avg=checked?audits.reduce((s,x)=>s+Number(x.comparison?.score||0),0)/checked:0;

  return json({
    ok:true,source:"playnote",
    stored_rows:results.length,
    recovered_listing_ids:recovery.recovered||0,
    live_candidates:recovery.live_candidates||0,
    recovery_meta:recovery.parser_meta||null,
    recovery_diagnostic:recovery.diagnostic||null,
    checked,passed,partial,failed,
    average_score:avg,
    audits
  });
}

async function auditTraderieSources(env,limit=5){
  const {results=[]}=await env.DB.prepare(
    `SELECT id,source_key,source_url,source_listing_id,item_type,slot,base_name,
            affixes_json,price_amount,price_currency,observed_at
     FROM market_observations
     WHERE source_key='traderie' AND source_listing_id IS NOT NULL
     ORDER BY id DESC LIMIT ?`
  ).bind(Math.max(1,Math.min(10,Number(limit)||5))).all();

  const audits=[];
  for(const row of results){
    try{
      const fetched=await traderieApiFetchListing(row.source_listing_id);
      const obs=fetched.ok?traderieApiObservation(fetched.listing,"integrity-audit"):null;
      const cmp=sourceAuditCompareObservation(row,obs);
      audits.push({
        observation_id:row.id,
        listing_id:row.source_listing_id,
        source_url:row.source_url,
        api_http_status:fetched.http_status,
        api_listing_found:!!fetched.ok,
        stored:{
          slot:row.slot,base_name:row.base_name,
          affixes:safeJson(row.affixes_json,{}),
          price_amount:row.price_amount,price_currency:row.price_currency
        },
        reparsed:obs?{
          slot:obs.slot,base_name:obs.base_name,affixes:obs.affixes,
          price_amount:obs.price_amount,price_currency:obs.price_currency
        }:null,
        comparison:cmp,
        raw_api_mapping:fetched.listing?{
          item:fetched.listing.item||null,
          property_sample:traderieApiPropertyDebug(fetched.listing).slice(0,12),
          prices:fetched.listing.prices||null
        }:null
      });
    }catch(e){
      audits.push({
        observation_id:row.id,listing_id:row.source_listing_id,
        comparison:{status:"fail",score:0},
        error:String(e?.message||e)
      });
    }
  }

  const checked=audits.length;
  const passed=audits.filter(x=>x.comparison?.status==="pass").length;
  const partial=audits.filter(x=>x.comparison?.status==="partial").length;
  const failed=audits.filter(x=>x.comparison?.status==="fail").length;
  const avg=checked?audits.reduce((s,x)=>s+Number(x.comparison?.score||0),0)/checked:0;

  return json({
    ok:true,source:"traderie",checked,passed,partial,failed,
    average_score:avg,
    audits
  });
}

async function sourceTransportDiagnostics(env){
  const out={};

  // ChaosCube: don't evade blocking; only classify what public fetch returns.
  try{
    const url="https://www.chaoscube.co.kr/exchange/item";
    const fetched=await publicFetch(env,{url,last_etag:null,last_modified:null,last_hash:null});
    out.chaoscube={
      http_status:fetched.status,
      ...classifyAcquiredContent("chaoscube",url,fetched.html)
    };
  }catch(e){
    out.chaoscube={ok:false,error:String(e?.message||e)};
  }

  // Inven: evidence/document transport check only.
  try{
    const url="https://www.inven.co.kr/board/diablo2/5735";
    const fetched=await publicFetch(env,{url,last_etag:null,last_modified:null,last_hash:null});
    out.inven={
      http_status:fetched.status,
      ...classifyAcquiredContent("inven",url,fetched.html)
    };
  }catch(e){
    out.inven={ok:false,error:String(e?.message||e)};
  }

  return json({ok:true,diagnostics:out});
}

async function feedbackLearningRunApi(env){
  const result=await runFeedbackLearning(env,"admin");
  return json({ok:true,...result});
}


const REVIEW_FEEDBACK_TAGS={
 value_low:{label:"가치 등급 · 낮음",domain:"market"},value_trade:{label:"가치 등급 · 거래 가능",domain:"market"},
 value_high:{label:"가치 등급 · 높은 가치",domain:"market"},value_trophy:{label:"가치 등급 · 최상급 후보",domain:"market"},
 synergy_good:{label:"옵션 시너지 좋음",domain:"market"},highend_possible:{label:"고가 가능",domain:"market"},
 build_demand_high:{label:"빌드 수요 높음",domain:"market"},price_undervalued:{label:"가격 저평가",domain:"market"},
 socket_premium:{label:"소켓 프리미엄 중요",domain:"market"},rare_combo:{label:"희소 조합",domain:"market"},
 build_demand_low:{label:"빌드 수요 낮음",domain:"market"},socket_missing:{label:"소켓 부족",domain:"market"},
 stat_missing:{label:"스탯 부족",domain:"market"},resist_missing:{label:"저항 부족",domain:"market"},
 core_affix_missing:{label:"핵심 옵션 부족",domain:"market"},price_overvalued:{label:"가격 고평가",domain:"market"},
 synergy_weak:{label:"옵션 시너지 약함",domain:"market"},
 option_missing:{label:"옵션 누락",domain:"quality"},parse_error:{label:"파싱 오류",domain:"quality"},
 price_error:{label:"가격 인식 오류",domain:"quality"},wrong_slot:{label:"부위 인식 오류",domain:"quality"},
 wrong_base:{label:"베이스 인식 오류",domain:"quality"},duplicate_listing:{label:"중복/잘못된 매물",domain:"quality"},
 source_mismatch:{label:"원본과 불일치",domain:"quality"},incomplete_data:{label:"데이터 불완전",domain:"quality"},
 test_only:{label:"테스트",domain:"admin"},other:{label:"기타",domain:"admin"}
};
function normalizeReviewTags(tags){return [...new Set((Array.isArray(tags)?tags:[]).map(x=>String(x||"").trim()).filter(x=>REVIEW_FEEDBACK_TAGS[x]))]}
function reviewLearningPolicy(action,tags,proposal){
 const n=normalizeReviewTags(tags),q=n.filter(x=>REVIEW_FEEDBACK_TAGS[x].domain==="quality"),m=n.filter(x=>REVIEW_FEEDBACK_TAGS[x].domain==="market");
 const pq=proposal?.parser_quality||null;
 const incomplete=!!(pq&&(pq.complete===false||Number(pq.property_coverage||0)<0.95||(pq.critical_missing||[]).length));
 if(q.length||incomplete)return {learning_eligible:false,reason:q.length?"data_quality_feedback":"parser_incomplete",quality_tags:q,market_tags:m};
 if(action==="approve")return {learning_eligible:true,reason:"approved_market_feedback",quality_tags:[],market_tags:m};
 if(action==="reject"&&m.length)return {learning_eligible:true,reason:"explicit_market_reject_feedback",quality_tags:[],market_tags:m};
 return {learning_eligible:false,reason:"reject_without_explicit_market_reason",quality_tags:[],market_tags:m};
}
async function reviewCandidate(request, env, internal={}) {
 const actor=internal.auto===true?'auto-policy':'worker-session';
 const body=await request.json().catch(()=>null),id=Number(body?.id),action=String(body?.action||""),note=String(body?.note||""),tags=normalizeReviewTags(body?.tags||[]);
 if(!id||!["approve","reject","hold"].includes(action))return json({ok:false,error:"invalid_payload"},400);
 const row=await env.DB.prepare(`SELECT * FROM review_candidates WHERE id=?`).bind(id).first();
 if(!row)return json({ok:false,error:"not_found"},404);
 if(row.status!=="pending"&&row.status!=="hold")return json({ok:false,error:"already_reviewed",status:row.status},409);
 const proposal=body.proposal||safeJson(row.proposal_json,{}),storedEvidence=safeJson(row.evidence_json,[])[0],policy=reviewLearningPolicy(action,tags,{...proposal,parser_quality:storedEvidence?.parser_quality||proposal.parser_quality});
 if(storedEvidence?.source==='traderie'&&storedEvidence.integrity?.complete!==true){policy.learning_eligible=false;policy.reason='source_integrity_incomplete';}
 if(storedEvidence?.source==='traderie'&&storedEvidence.price_structure?.amount==null){policy.learning_eligible=false;policy.reason='structured_price_review_only';}
 if(internal.auto===true){
  // An automatic decision is never a new human label. It must not feed back into
  // future training, and it cannot rescue incomplete source data.
  if(row.source_type!=='market_observation'||action==='hold'||candidateNeedsRepair(row)||
     !/^[a-f0-9]{64}$/i.test(String(internal.sourceVerifiedHash||''))||
     !constantTimeEqual(String(internal.sourceVerifiedHash),String(storedEvidence?.source_snapshot_hash||''))||
     storedEvidence?.integrity?.complete!==true||storedEvidence?.integrity?.parser_version!==PARSER_VERSION||
     storedEvidence?.parser_quality?.complete!==true||storedEvidence?.price_structure?.complete!==true||
     (action==='approve'&&!policy.learning_eligible))return json({ok:false,error:'auto_review_source_not_eligible'},409);
  policy.learning_eligible=false;policy.reason='auto_validated_review';
 }
 if(internal.auto===true){
  // Keep the automatic write conditional on the exact pending evidence. D1 batch
  // is atomic, so a concurrent human decision/reparse cannot be overwritten.
  if(action==='approve'){
   if(proposal.effects?.market_watch_only!==true||Number(proposal.effects?.score_delta)!==0||!validProposal(proposal))
    return json({ok:false,error:'auto_review_proposal_invalid'},409);
   if(JSON.stringify(proposal.conditions)!==JSON.stringify(safeJson(row.proposal_json,{}).conditions)||
      JSON.stringify(proposal.effects?.observed_price)!==JSON.stringify(safeJson(row.proposal_json,{}).effects?.observed_price))
    return json({ok:false,error:'auto_review_proposal_changed'},409);
   const itemType=proposal.item_type||row.item_type||null,slot=proposal.slot||null;
   const priority=Number.isFinite(Number(proposal.priority))?Number(proposal.priority):100;
   const results=await env.DB.batch([
    env.DB.prepare(`INSERT INTO valuation_rules (rule_key,label,item_type,slot,priority,rule_json,source_candidate_id,active)
      SELECT ?,?,?,?,?,?,?,1 FROM review_candidates WHERE id=? AND status='pending' AND evidence_json=?
      ON CONFLICT(rule_key) DO UPDATE SET label=excluded.label,item_type=excluded.item_type,slot=excluded.slot,
        priority=excluded.priority,rule_json=excluded.rule_json,source_candidate_id=excluded.source_candidate_id,
        active=1,updated_at=datetime('now')`)
      .bind(proposal.rule_key.trim(),proposal.label.trim(),itemType,slot,priority,JSON.stringify(proposal),id,id,row.evidence_json),
    env.DB.prepare(`UPDATE review_candidates SET proposal_json=?,status='approved',reviewed_at=datetime('now'),
      reviewer_email=?,reviewer_note=?,reviewer_tags_json=?,learning_eligible=0,review_reason_type=?
      WHERE id=? AND status='pending' AND evidence_json=?`)
      .bind(JSON.stringify(proposal),actor,note,JSON.stringify(tags),policy.reason,id,row.evidence_json),
    env.DB.prepare(`INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email)
      SELECT 'candidate_approved','candidate',?,?,? FROM review_candidates
      WHERE id=? AND status='approved' AND reviewer_email=? AND evidence_json=?`)
      .bind(id,JSON.stringify({rule_key:proposal.rule_key,note,tags,policy,source_snapshot_hash:storedEvidence.source_snapshot_hash}),actor,id,actor,row.evidence_json)
   ]);
   if(!results[0]?.meta?.changes||!results[1]?.meta?.changes)return json({ok:false,error:'candidate_changed'},409);
  }else{
   const results=await env.DB.batch([
    env.DB.prepare(`UPDATE review_candidates SET status='rejected',reviewed_at=datetime('now'),
      reviewer_email=?,reviewer_note=?,reviewer_tags_json=?,learning_eligible=0,review_reason_type=?
      WHERE id=? AND status='pending' AND evidence_json=?`)
      .bind(actor,note,JSON.stringify(tags),policy.reason,id,row.evidence_json),
    env.DB.prepare(`INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email)
      SELECT 'candidate_rejected','candidate',?,?,? FROM review_candidates
      WHERE id=? AND status='rejected' AND reviewer_email=? AND evidence_json=?`)
      .bind(id,JSON.stringify({note,tags,policy,source_snapshot_hash:storedEvidence.source_snapshot_hash}),actor,id,actor,row.evidence_json)
   ]);
   if(!results[0]?.meta?.changes)return json({ok:false,error:'candidate_changed'},409);
  }
  return json({ok:true,feedback_learning:null,learning_policy:policy,tags,automatic:true});
 }
 if(action==="approve"){
  const ev=safeJson(row.evidence_json,[])[0];
  if(candidateNeedsRepair(row)){
   if(body.review_only!==true)return json({ok:false,error:'수집 보완이 필요합니다. 원본을 다시 수집하거나 검토 이력으로만 승인하세요.'},409);
   // A review decision is not proof of source completeness. Keep original evidence
   // and proposal, create no valuation rule, and exclude all learning paths.
   const reviewPolicy={learning_eligible:false,reason:'manual_review_only',quality_tags:policy.quality_tags,market_tags:policy.market_tags};
   await env.DB.batch([
    env.DB.prepare("UPDATE review_candidates SET status='approved',reviewed_at=datetime('now'),reviewer_email=?,reviewer_note=?,reviewer_tags_json=?,learning_eligible=0,review_reason_type='manual_review_only' WHERE id=? AND status IN ('pending','hold')")
     .bind(actor,note,JSON.stringify(tags),id),
    env.DB.prepare("INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email) VALUES('candidate_approved','candidate',?,?,?)")
     .bind(id,JSON.stringify({note,tags,policy:reviewPolicy,review_only:true,source_snapshot_hash:ev?.source_snapshot_hash||null}),actor)
   ]);
   return json({ok:true,review_only:true,feedback_learning:null,learning_policy:reviewPolicy,tags});
  }
  if(ev?.source==='traderie'&&(JSON.stringify(proposal.conditions)!==JSON.stringify(safeJson(row.proposal_json,{}).conditions)||JSON.stringify(proposal.effects?.observed_price)!==JSON.stringify(safeJson(row.proposal_json,{}).effects?.observed_price)))return json({ok:false,error:'원본 옵션·가격을 제안 JSON으로 변경할 수 없습니다. 원본을 다시 수집하세요.'},409);
  if(row.source_type==='market_observation'&&(proposal.effects?.market_watch_only!==true||Number(proposal.effects?.score_delta)!==0))return json({ok:false,error:'단일 시장관측은 감정 점수 규칙으로 승인할 수 없습니다.'},409);
  if(!validProposal(proposal))return json({ok:false,error:"invalid_proposal"},400);
  const itemType=proposal.item_type||row.item_type||null,slot=proposal.slot||null,priority=Number.isFinite(Number(proposal.priority))?Number(proposal.priority):100;
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO valuation_rules (rule_key,label,item_type,slot,priority,rule_json,source_candidate_id,active)
    VALUES (?,?,?,?,?,?,?,1) ON CONFLICT(rule_key) DO UPDATE SET label=excluded.label,item_type=excluded.item_type,slot=excluded.slot,priority=excluded.priority,rule_json=excluded.rule_json,source_candidate_id=excluded.source_candidate_id,active=1,updated_at=datetime('now')`)
    .bind(proposal.rule_key.trim(),proposal.label.trim(),itemType,slot,priority,JSON.stringify(proposal),id),
   env.DB.prepare(`UPDATE review_candidates SET proposal_json=?,status='approved',reviewed_at=datetime('now'),reviewer_email=?,reviewer_note=?,reviewer_tags_json=?,learning_eligible=?,review_reason_type=? WHERE id=?`)
    .bind(JSON.stringify(proposal),actor,note,JSON.stringify(tags),policy.learning_eligible?1:0,policy.reason,id),
   env.DB.prepare(`INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email) VALUES('candidate_approved','candidate',?,?,?)`)
    .bind(id,JSON.stringify({rule_key:proposal.rule_key,note,tags,policy}),actor)
  ]);
 }else{
  const status=action==="reject"?"rejected":"hold";
  await env.DB.batch([
   env.DB.prepare(`UPDATE review_candidates SET status=?,reviewed_at=datetime('now'),reviewer_email=?,reviewer_note=?,reviewer_tags_json=?,learning_eligible=?,review_reason_type=? WHERE id=?`)
    .bind(status,actor,note,JSON.stringify(tags),policy.learning_eligible?1:0,policy.reason,id),
   env.DB.prepare(`INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email) VALUES(?,?,?,?,?)`)
    .bind(`candidate_${status}`,"candidate",id,JSON.stringify({note,tags,policy}),actor)
  ]);
 }
 if(policy.quality_tags.length){
  await env.DB.prepare(`INSERT INTO parser_feedback(candidate_id,source_type,source_url,tags_json,parser_quality_json,note) VALUES(?,?,?,?,?,?)`)
   .bind(id,String(row.source_type||""),String(row.source_url||""),JSON.stringify(tags),JSON.stringify(proposal?.parser_quality||null),note||null).run();
 }
 let feedback_learning=null;
 if(policy.learning_eligible&&(note.trim()||tags.length)){
  const feedbackNote=note.trim()||tags.map(x=>REVIEW_FEEDBACK_TAGS[x]?.label||x).join(" / ");
  try{feedback_learning=await recordOperatorFeedback(env,{...row,proposal_json:JSON.stringify(proposal),reviewer_tags_json:JSON.stringify(tags),learning_eligible:1,review_reason_type:policy.reason},action,feedbackNote)}
  catch(e){feedback_learning={stored:false,error:String(e?.message||e)}}
 }
 const hasValueLabel=tags.some(tag=>tag.startsWith('value_'));
 if(!internal.auto&&internal.ctx?.waitUntil)internal.ctx.waitUntil(syncCandidateForAI(env,id).catch(error=>console.error('ai_sample_sync_failed',String(error.message))));
 if(hasValueLabel&&policy.learning_eligible&&!internal.auto&&internal.ctx?.waitUntil){
  internal.ctx.waitUntil(runReviewedValueLearning(env,'human_review').catch(error=>{
    console.log('review_value_learning_error',String(error?.message||error));
  }));
 }
 return json({ok:true,feedback_learning,learning_policy:policy,tags,
  value_learning:hasValueLabel&&policy.learning_eligible?'queued':'excluded'});
}

async function getRules(env) {
  const {results=[]}=await env.DB.prepare(
    `SELECT id,rule_key,label,item_type,slot,priority,rule_json,source_candidate_id,
            active,created_at,updated_at
     FROM valuation_rules ORDER BY active DESC,priority DESC,id DESC LIMIT 500`
  ).all();
  return json({ok:true,results:results.map(r=>({...r,rule:safeJson(r.rule_json,{})}))});
}

async function toggleRule(request, env) {
  const body=await request.json().catch(()=>null);
  const id=Number(body?.id), action=String(body?.action||"");
  if(!id || !["deactivate","activate"].includes(action))
    return json({ok:false,error:"invalid_payload"},400);

  const active=action==="activate"?1:0;
  const r=await env.DB.prepare(
    `UPDATE valuation_rules SET active=?,updated_at=datetime('now') WHERE id=?`
  ).bind(active,id).run();

  if(!r.meta.changes)return json({ok:false,error:"not_found"},404);

  await env.DB.prepare(
    `INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email)
     VALUES(?,?,?,?,?)`
  ).bind(`rule_${action}`,"rule",id,JSON.stringify({note:String(body?.note||"")}),"worker-session").run();

  return json({ok:true});
}

async function stats(env) {
  const [candidates,rules] = await Promise.all([
    env.DB.prepare(`SELECT status,COUNT(*) n FROM review_candidates GROUP BY status`).all(),
    env.DB.prepare(`SELECT active,COUNT(*) n FROM valuation_rules GROUP BY active`).all()
  ]);
  const c=Object.fromEntries((candidates.results||[]).map(x=>[x.status,x.n]));
  const r=Object.fromEntries((rules.results||[]).map(x=>[String(x.active),x.n]));
  const repair=await env.DB.prepare("SELECT COUNT(*) n FROM review_candidates WHERE status='pending' AND "+REPAIR_SQL).first();c.repair=Number(repair?.n||0);c.pending_total=c.pending||0;c.pending=Math.max(0,c.pending_total-c.repair);
  return json({ok:true,candidates:c,rules:{active:r["1"]||0,inactive:r["0"]||0}});
}

async function statisticalShadowStatus(env) {
  // Read-only experiment: review decisions are quality labels, not sale prices.
  const {results=[]}=await env.DB.prepare(
    `SELECT id,status,source_type,item_type,confidence,source_url,dedupe_key,
            reviewed_at,review_reason_type
     FROM review_candidates
     WHERE status IN ('approved','rejected') AND reviewed_at IS NOT NULL
     ORDER BY reviewed_at DESC,id DESC LIMIT 1500`
  ).all();
  const market=await env.DB.prepare(
    `SELECT COUNT(*) AS sampled,
            SUM(CASE WHEN normalized_value IS NOT NULL AND normalized_currency IS NOT NULL THEN 1 ELSE 0 END) AS normalized,
            SUM(CASE WHEN observation_type='completed' THEN 1 ELSE 0 END) AS completed
     FROM (SELECT normalized_value,normalized_currency,observation_type
           FROM market_observations ORDER BY id DESC LIMIT 1500)`
  ).first();
  return json({ok:true,report:evaluateReviewShadow(results),market_evidence:{
    sampled:Number(market?.sampled||0),normalized:Number(market?.normalized||0),
    completed_unverified:Number(market?.completed||0),verified_settlement_labels:0
  }});
}

async function verifyAutoReviewSource(row){
  const evidence=safeJson(row?.evidence_json,[])[0];
  const listingId=String(evidence?.listing_id||''),expected=String(evidence?.source_snapshot_hash||'');
  if(!/^\d+$/.test(listingId)||!/^[a-f0-9]{64}$/i.test(expected))return {ok:false,reason:'source_snapshot_missing'};
  try{
    const fetched=await traderieApiFetchListing(listingId);
    if(!fetched.ok)return {ok:false,reason:'source_recheck_unavailable'};
    const actual=await sha256Hex(JSON.stringify(snapshotListing(fetched.listing)));
    if(!constantTimeEqual(actual,expected))return {ok:false,reason:'source_snapshot_changed'};
    return {ok:true,hash:actual};
  }catch{return {ok:false,reason:'source_recheck_unavailable'};}
}

async function autoReviewRun(env,{apply=false,limit=20,now=Date.now()}={}){
  const {results:reviewed=[]}=await env.DB.prepare(
    `SELECT id,status,source_type,source_url,dedupe_key,evidence_json,proposal_json,
            reviewed_at,reviewer_email,learning_eligible,review_reason_type
     FROM review_candidates WHERE status IN ('approved','rejected') AND reviewed_at IS NOT NULL
     ORDER BY reviewed_at DESC,id DESC LIMIT 1500`
  ).all();
  const report=buildAutoReviewPolicyReport(reviewed);
  // Walk the entire queue in bounded D1 pages. A newest-only limit hid older
  // candidates whenever new observations kept arriving.
  const policyMatches=[],reasons={};let pendingCount=0,reparseNeeded=0,reparseEligible=0,cursor=0;
  while(true){
    const {results:page=[]}=await env.DB.prepare(
      "SELECT * FROM review_candidates WHERE status='pending' AND id>? ORDER BY id ASC LIMIT 200"
    ).bind(cursor).all();
    for(const row of page){
      const evidence=safeJson(row.evidence_json,[])[0];
      if(evidence?.source==='traderie'&&evidence.integrity?.complete!==true){
        reparseNeeded++;
        if(/^\d+$/.test(String(evidence.listing_id||'')))reparseEligible++;
      }
      const decision=decideAutoReview(row,report);
      pendingCount++;
      reasons[decision.reason]=(reasons[decision.reason]||0)+1;
      if(decision.action!=='abstain')policyMatches.push({id:row.id,decision});
    }
    if(page.length<200)break;
    cursor=page.at(-1).id;
  }
  const checkLimit=Math.max(0,Math.min(20,Number.isFinite(Number(limit))?Math.trunc(Number(limit)):0));
  // Rotate the bounded source-check window hourly. Failed old source fetches
  // must not permanently occupy every source-check slot.
  const windowOffset=policyMatches.length?(Math.floor(now/3600000)*checkLimit)%policyMatches.length:0;
  const toCheck=Array.from({length:Math.min(checkLimit,policyMatches.length)},(_,index)=>
    policyMatches[(windowOffset+index)%policyMatches.length]);
  const applied=[],sourceChecks=[];let eligibleCount=0;
  for(const item of toCheck){
    // The historical model can only nominate a candidate. Compare an independent
    // live source fetch with the immutable collected snapshot before any write.
    const fresh=await env.DB.prepare('SELECT * FROM review_candidates WHERE id=?').bind(item.id).first();
    const current=decideAutoReview(fresh,report);
    if(current.action!==item.decision.action||current.cohort_signature!==item.decision.cohort_signature){
      sourceChecks.push({id:item.id,ok:false,reason:'candidate_changed'});continue;
    }
    const source=await verifyAutoReviewSource(fresh);
    sourceChecks.push({id:item.id,ok:source.ok,reason:source.ok?'source_snapshot_verified':source.reason});
    if(!source.ok)continue;
    eligibleCount++;
    if(apply&&env.AUTO_REVIEW_DISABLE!=='true'){
      const note=`${current.policy_version}: ${current.reason}; 독립 검수 ${current.metrics.independent_train}+${current.metrics.independent_holdout}건, 하한 ${current.metrics.wilson_lower_bound.toFixed(3)}`;
      const request=new Request('https://internal.invalid/api/admin/review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action:current.action,note,tags:[]})});
      const response=await reviewCandidate(request,env,{auto:true,sourceVerifiedHash:source.hash});
      const result=await response.json();
      applied.push({id:item.id,action:current.action,ok:response.ok,error:response.ok?null:result.error});
    }
  }
  return {ok:true,policy_version:report.policy_version,status:report.status,
    samples:report.samples,thresholds:report.thresholds,exclusions:report.exclusions,
    scanned:pendingCount,pending_count:pendingCount,reparse_needed:reparseNeeded,
    reparse_eligible:reparseEligible,policy_matches:policyMatches.length,
    source_check_limit:checkLimit,source_check_window:toCheck.length,
    eligible:eligibleCount,eligible_count:eligibleCount,source_checks:sourceChecks,abstention_reasons:reasons,
    automation_enabled:env.AUTO_REVIEW_DISABLE!=='true',applied};
}


function canonicalAffixKey(k) {
  const map = {
    "faster cast rate":"fcr","패캐":"fcr","fcr":"fcr",
    "strength":"str","힘":"str","str":"str",
    "dexterity":"dex","민첩":"dex","dex":"dex",
    "life":"life","생명력":"life","피":"life",
    "mana":"mana","마나":"mana",
    "all resistances":"allres","allres":"allres","올레":"allres","모든저항":"allres",
    "fire resist":"fireres","파레":"fireres",
    "lightning resist":"lightres","라레":"lightres",
    "cold resist":"coldres","콜레":"coldres",
    "poison resist":"poisonres","포레":"poisonres",
    "attack rating":"ar","명중":"ar","ar":"ar",
    "mana stolen per hit":"ml","마흡":"ml",
    "life stolen per hit":"ll","라흡":"ll",
    "faster run walk":"frw","달려":"frw","frw":"frw",
    "faster hit recovery":"fhr","패힛":"fhr","fhr":"fhr",
    "increased attack speed":"ias","공속":"ias","ias":"ias"
  };
  const s=String(k||"").trim().toLowerCase();
  return map[s] || s.replace(/[^a-z0-9가-힣_]+/g,"_");
}

function normalizeAffixes(obj) {
  const out={};
  for (const [k,v] of Object.entries(obj||{})) {
    const key=canonicalAffixKey(k);
    const num=Number(v);
    out[key]=Number.isFinite(num)?num:String(v);
  }
  return out;
}

function roundedBucket(key, value) {
  if (!Number.isFinite(Number(value))) return String(value);
  const v=Number(value);
  const steps={str:3,dex:3,life:5,mana:10,allres:2,fireres:5,lightres:5,coldres:5,poisonres:5,ar:20,ll:1,ml:1,frw:5,fhr:5,ias:5,fcr:5};
  const step=steps[key]||5;
  return Math.round(v/step)*step;
}

function makeSignature(itemType, slot, affixes) {
  const norm=normalizeAffixes(affixes);
  const parts=Object.keys(norm).sort().map(k=>`${k}:${roundedBucket(k,norm[k])}`);
  return `${String(itemType||"").toLowerCase()}|${String(slot||"").toLowerCase()}|${parts.join(",")}`;
}


function marketFamilyKey(itemType, slot, affixes) {
  const norm=normalizeAffixes(affixes);
  const keys=Object.keys(norm).sort();
  return `${String(itemType||"").toLowerCase()}|${String(slot||"").toLowerCase()}|${keys.join(",")}`;
}

function similarityTolerance(key) {
  const t={
    fcr:0.5, ias:0.5, frw:5, fhr:5,
    str:3, dex:3, life:6, mana:12,
    allres:3, fireres:7, lightres:7, coldres:7, poisonres:7,
    ar:30, ll:1, ml:1
  };
  return t[key] ?? 8;
}

function affixDistance(a,b) {
  const aa=normalizeAffixes(a), bb=normalizeAffixes(b);
  const ka=Object.keys(aa).sort(), kb=Object.keys(bb).sort();
  if(ka.join("|")!==kb.join("|")) return Infinity;

  let total=0, count=0;
  for(const k of ka){
    const av=Number(aa[k]), bv=Number(bb[k]);
    if(Number.isFinite(av) && Number.isFinite(bv)){
      const tol=similarityTolerance(k);
      const d=Math.abs(av-bv)/Math.max(.0001,tol);
      if(d>1.01) return Infinity;
      total+=d; count++;
    }else if(String(aa[k])!==String(bb[k])){
      return Infinity;
    }
  }
  return count?total/count:0;
}

function clusterRepresentative(rows) {
  if(!rows.length) return {};
  const parsed=rows.map(r=>safeJson(r.affixes_json,{}));
  const keys=Object.keys(parsed[0]||{});
  const out={};
  for(const k of keys){
    const nums=parsed.map(x=>Number(x[k])).filter(Number.isFinite).sort((a,b)=>a-b);
    if(nums.length===parsed.length) out[k]=percentile(nums,.5);
    else out[k]=parsed[0][k];
  }
  return out;
}


function clusterAffixStats(rows) {
  if(!rows.length) return {};
  const parsed=rows.map(r=>safeJson(r.affixes_json,{}));
  const keys=Object.keys(parsed[0]||{});
  const out={};
  for(const k of keys){
    const nums=parsed.map(x=>Number(x[k])).filter(Number.isFinite).sort((a,b)=>a-b);
    if(nums.length===parsed.length){
      out[k]={
        min:nums[0],
        q1:percentile(nums,.25),
        median:percentile(nums,.5),
        q3:percentile(nums,.75),
        max:nums[nums.length-1]
      };
    }else{
      out[k]={value:parsed[0][k]};
    }
  }
  return out;
}

function thresholdForAffix(key, stat) {
  if(!stat) return null;
  if("value" in stat) return stat.value;

  const q1=Number(stat.q1);
  const med=Number(stat.median);
  if(!Number.isFinite(q1) || !Number.isFinite(med)) return null;

  // 고정 브레이크포인트성 옵션은 관측 중앙값을 정수화.
  const fixedBreakpoints=new Set(["fcr","ias","frw","fhr","ll","ml"]);
  if(fixedBreakpoints.has(key)) return Math.floor(med);

  // 일반 수치 옵션은 군집의 하위 25% 값을 내림하여
  // 대표값보다 지나치게 엄격한 룰이 생기는 것을 방지.
  return Math.floor(q1);
}

function buildRuleConditions(affixStats) {
  const out={};
  for(const [k,stat] of Object.entries(affixStats||{})){
    const threshold=thresholdForAffix(k,stat);
    if(threshold===null || threshold===undefined) continue;
    out[k]=typeof threshold==="number" ? {gte:threshold} : {eq:threshold};
  }
  return out;
}

function buildSimilarityGroups(obs) {
  const families=new Map();
  for(const o of obs){
    const aff=safeJson(o.affixes_json,{});
    const fk=marketFamilyKey(o.item_type,o.slot,aff);
    if(!families.has(fk)) families.set(fk,[]);
    families.get(fk).push(o);
  }

  const groups=[];
  for(const [family,rows] of families){
    const local=[];
    for(const row of rows){
      const aff=safeJson(row.affixes_json,{});
      let best=null, bestD=Infinity;
      for(const g of local){
        const rep=clusterRepresentative(g.rows);
        const d=affixDistance(aff,rep);
        if(d<bestD){ bestD=d; best=g; }
      }
      if(best && bestD!==Infinity){
        best.rows.push(row);
      }else{
        local.push({family,rows:[row]});
      }
    }

    // Merge close clusters again using median representatives.
    let changed=true;
    while(changed){
      changed=false;
      outer:
      for(let i=0;i<local.length;i++){
        for(let j=i+1;j<local.length;j++){
          const a=clusterRepresentative(local[i].rows);
          const b=clusterRepresentative(local[j].rows);
          if(affixDistance(a,b)!==Infinity){
            local[i].rows.push(...local[j].rows);
            local.splice(j,1);
            changed=true;
            break outer;
          }
        }
      }
    }

    local.sort((a,b)=>{
      const ar=JSON.stringify(clusterRepresentative(a.rows));
      const br=JSON.stringify(clusterRepresentative(b.rows));
      return ar.localeCompare(br);
    });
    local.forEach((g,i)=>groups.push({...g,index:i}));
  }
  return groups;
}

function percentile(sorted,p) {
  if(!sorted.length)return null;
  const idx=(sorted.length-1)*p;
  const lo=Math.floor(idx), hi=Math.ceil(idx);
  if(lo===hi)return sorted[lo];
  return sorted[lo]+(sorted[hi]-sorted[lo])*(idx-lo);
}

function observationWeight(obs, sourceWeight) {
  let w=Number(sourceWeight)||0.5;
  w*=Math.max(0.1,Math.min(1,Number(obs.source_confidence)||0.5));
  if(obs.verified) w*=1.15;
  if(obs.observation_type==="sold"||obs.observation_type==="completed") w*=1.35;
  else if(obs.observation_type==="asking") w*=0.75;
  return w;
}

async function marketSources(env) {
  const {results=[]}=await env.DB.prepare(
    `SELECT source_key,display_name,policy_class,automation_mode,trust_weight,terms_note,active,updated_at
     FROM market_sources ORDER BY policy_class,display_name`
  ).all();
  return json({ok:true,results});
}

async function marketObservations(request,env) {
  const u=new URL(request.url);
  const limit=Math.min(300,Math.max(1,Number(u.searchParams.get("limit"))||100));
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM market_observations ORDER BY id DESC LIMIT ?`
  ).bind(limit).all();
  return json({ok:true,results:results.map(r=>({...r,affixes:safeJson(r.affixes_json,{})}))});
}

async function addMarketObservation(request,env) {
  const body=await request.json().catch(()=>null);
  if(!body || !body.source_key || !body.item_type || !body.slot || !body.affixes)
    return json({ok:false,error:"invalid_payload"},400);

  const src=await env.DB.prepare(`SELECT * FROM market_sources WHERE source_key=? AND active=1`)
    .bind(String(body.source_key)).first();
  if(!src)return json({ok:false,error:"unknown_or_inactive_source"},400);

  if(src.automation_mode==="manual_only" && String(body.ingest_mode||"manual")!=="manual")
    return json({ok:false,error:"source_manual_only"},403);

  const aff=normalizeAffixes(body.affixes);
  const signature=makeSignature(body.item_type,body.slot,aff);
  const dedupe=body.dedupe_key || [
    body.source_key,body.source_listing_id||"",signature,
    body.price_amount??"",body.price_currency||"",body.listed_at||body.observed_at||""
  ].join("|");

  try{
    const r=await env.DB.prepare(
      `INSERT INTO market_observations
       (source_key,source_url,source_listing_id,observation_type,item_type,slot,base_name,
        affixes_json,signature,season,ladder,hardcore,region,price_amount,price_currency,
        normalized_value,normalized_currency,listed_at,sold_at,source_confidence,verified,raw_note,dedupe_key)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      String(body.source_key),body.source_url||null,body.source_listing_id||null,
      body.observation_type||"asking",String(body.item_type),String(body.slot),body.base_name||null,
      JSON.stringify(aff),signature,body.season||null,
      body.ladder===null||body.ladder===undefined?null:(body.ladder?1:0),
      body.hardcore===null||body.hardcore===undefined?null:(body.hardcore?1:0),
      body.region||null,
      body.price_amount===null||body.price_amount===undefined?null:Number(body.price_amount),
      body.price_currency||null,
      body.normalized_value===null||body.normalized_value===undefined?null:Number(body.normalized_value),
      body.normalized_currency||null,
      body.listed_at||null,body.sold_at||null,
      Math.max(0,Math.min(1,Number(body.source_confidence)||0.5)),
      body.verified?1:0,body.raw_note||null,String(dedupe)
    ).run();

    return json({ok:true,id:r.meta.last_row_id,signature},201);
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE"))
      return json({ok:false,error:"duplicate_observation"},409);
    throw e;
  }
}


async function analyzeObservationSet(env, {
  obsTable,
  clusterTable,
  candidateTable,
  testMode=false
}) {
  const {results:obs=[]}=await env.DB.prepare(
    `SELECT o.*,s.trust_weight
     FROM ${obsTable} o
     JOIN market_sources s ON s.source_key=o.source_key
     WHERE s.active=1
     ORDER BY o.observed_at DESC
     LIMIT 5000`
  ).all();

  const reviewIndex=testMode?null:await marketReviewIndex(env);
  const usable=obs.filter(o=>{if(testMode||o.source_key!=='traderie')return true;const data=safeJson(o.raw_note,null);return data?.integrity?.complete===true&&data?.parser_version===PARSER_VERSION&&marketObservationReviewed(o,reviewIndex);});
  const groups=buildSimilarityGroups(usable);

  // Rebuild only machine-generated current cluster snapshots.
  await env.DB.prepare(`DELETE FROM ${clusterTable}`).run();
  await env.DB.prepare(`DELETE FROM ${candidateTable} WHERE status='pending'`).run();

  let clusters=0,candidates=0;
  for(const group of groups){
    const rows=group.rows;
    const representative=clusterRepresentative(rows);
    const affixStats=clusterAffixStats(rows);
    const ruleConditions=buildRuleConditions(affixStats);
    const signature=`${group.family}|cluster:${group.index}|rep:${JSON.stringify(representative)}`;
    const vals=rows.filter(r=>r.normalized_value!==null&&r.normalized_value!==undefined&&Number.isFinite(Number(r.normalized_value)))
      .map(r=>Number(r.normalized_value)).sort((a,b)=>a-b);
    const sources=new Set(rows.map(r=>r.source_key));
    const sold=rows.filter(r=>r.observation_type==="sold"||r.observation_type==="completed").length;
    const asking=rows.filter(r=>r.observation_type==="asking").length;
    const q1=percentile(vals,.25),med=percentile(vals,.5),q3=percentile(vals,.75);
    const dispersion=(q1!==null&&q3!==null&&med)
      ?Math.min(2,Math.abs(q3-q1)/Math.max(.0001,Math.abs(med)))
      :null;
    const sourceDiversity=Math.min(1,sources.size/3);
    const soldRatio=rows.length?sold/rows.length:0;
    const avgWeight=rows.reduce((a,r)=>a+observationWeight(r,r.trust_weight),0)/Math.max(1,rows.length);
    const sampleScore=Math.min(1,rows.length/20);

    const confidence=Math.max(0,Math.min(1,
      sampleScore*.35 +
      sourceDiversity*.30 +
      Math.min(1,soldRatio*2)*.20 +
      Math.min(1,avgWeight)*.15
    ));

    const sample=rows[0];
    const analysis={
      mode:testMode?"test":"production",
      sample_count:rows.length,
      source_count:sources.size,
      sold_count:sold,
      asking_count:asking,
      sources:[...sources],
      median_value:med,
      q1_value:q1,
      q3_value:q3,
      dispersion,
      source_diversity:sourceDiversity,
      confidence,
      representative_affixes:representative,
      affix_stats:affixStats,
      normalized_rule_conditions:ruleConditions
    };

    await env.DB.prepare(
      `INSERT INTO ${clusterTable}
       (cluster_key,item_type,slot,signature_pattern,sample_count,source_count,sold_count,asking_count,
        median_value,q1_value,q3_value,dispersion,source_diversity,recency_score,confidence,
        analysis_json,last_observed_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
       ON CONFLICT(cluster_key) DO UPDATE SET
        sample_count=excluded.sample_count,
        source_count=excluded.source_count,
        sold_count=excluded.sold_count,
        asking_count=excluded.asking_count,
        median_value=excluded.median_value,
        q1_value=excluded.q1_value,
        q3_value=excluded.q3_value,
        dispersion=excluded.dispersion,
        source_diversity=excluded.source_diversity,
        confidence=excluded.confidence,
        analysis_json=excluded.analysis_json,
        last_observed_at=excluded.last_observed_at,
        updated_at=datetime('now')`
    ).bind(
      signature,sample.item_type,sample.slot,signature,
      rows.length,sources.size,sold,asking,
      med,q1,q3,dispersion,sourceDiversity,1,confidence,
      JSON.stringify(analysis),sample.observed_at
    ).run();
    clusters++;

    if(rows.length>=5 && sources.size>=2 && confidence>=0.45){
      const aff=representative;
      const title=`${testMode?"[TEST] ":""}시장 패턴 · ${sample.slot} · `+
        Object.entries(aff).map(([k,v])=>`${k} ${v}`).join(" / ");
      const effectScore=Math.max(2,Math.min(10,Math.round(confidence*10)));
      const ruleHash=(await sha256Hex(signature)).slice(0,20);
      const proposal={
        rule_key:`${testMode?"test_":"market_"}${ruleHash}`,
        label:title,
        slot:sample.slot,
        item_type:sample.item_type,
        priority:testMode?10:80,
        conditions:ruleConditions,
        effects:{
          score_delta:effectScore,
          strength_note:`${testMode?"테스트 · ":""}교차출처 시장 관측 ${rows.length}건 · 독립 출처 ${sources.size}개 · 확신도 ${Math.round(confidence*100)}% · 대표값과 실전 임계값 분리 적용`,
          tags:[testMode?"test-market-derived":"market-derived","needs-admin-review"]
        },
        market_meta:{cluster_key:signature,analysis}
      };

      try{
        await env.DB.prepare(
          `INSERT INTO ${candidateTable}
           (cluster_key,candidate_type,title,item_type,slot,evidence_json,proposal_json,confidence,status)
           VALUES (?,?,?,?,?,?,?,?, 'pending')`
        ).bind(
          signature,"nonstandard",title,sample.item_type,sample.slot,
          JSON.stringify(rows.slice(0,30).map(r=>({
            id:r.id,source:r.source_key,url:r.source_url,type:r.observation_type,
            value:r.normalized_value,currency:r.normalized_currency,
            verified:!!r.verified,observed_at:r.observed_at
          }))),
          JSON.stringify(proposal),confidence
        ).run();
        candidates++;
      }catch(e){
        if(!String(e?.message||e).includes("UNIQUE"))throw e;
      }
    }
  }

  return {clusters,candidates,observations:obs.length};
}

async function generateTestMarketData(env) {
  const existing=await env.DB.prepare(`SELECT COUNT(*) n FROM market_observations_test`).first();
  if(Number(existing?.n||0)>0){
    return json({ok:false,error:"test_data_exists",count:Number(existing.n)},409);
  }

  // 6개 사례, 3개 독립 소스. 동일 signature 군집이 되도록 옵션 버킷을 맞춤.
  const rows=[
    {
      source:"manual", type:"sold", val:1.25, conf:.95, verified:1,
      url:"https://example.invalid/test/manual-1",
      aff:{fcr:10,str:18,life:31,allres:10}
    },
    {
      source:"traderie", type:"asking", val:1.80, conf:.55, verified:0,
      url:"https://example.invalid/test/traderie-1",
      aff:{fcr:10,str:19,life:33,allres:10}
    },
    {
      source:"inven", type:"community_check", val:1.40, conf:.65, verified:1,
      url:"https://example.invalid/test/inven-1",
      aff:{fcr:10,str:17,life:29,allres:11}
    },
    {
      source:"traderie", type:"sold", val:1.55, conf:.80, verified:1,
      url:"https://example.invalid/test/traderie-2",
      aff:{fcr:10,str:18,life:32,allres:9}
    },
    {
      source:"manual", type:"completed", val:1.35, conf:.95, verified:1,
      url:"https://example.invalid/test/manual-2",
      aff:{fcr:10,str:20,life:30,allres:10}
    },
    {
      source:"inven", type:"asking", val:1.70, conf:.55, verified:0,
      url:"https://example.invalid/test/inven-2",
      aff:{fcr:10,str:19,life:34,allres:10}
    }
  ];

  let inserted=0;
  for(let i=0;i<rows.length;i++){
    const x=rows[i];
    const aff=normalizeAffixes(x.aff);
    const signature=makeSignature("레어","ring",aff);
    await env.DB.prepare(
      `INSERT INTO market_observations_test
       (source_key,source_url,source_listing_id,observation_type,item_type,slot,
        affixes_json,signature,price_amount,price_currency,normalized_value,normalized_currency,
        source_confidence,verified,raw_note,dedupe_key)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      x.source,x.url,`test-${i+1}`,x.type,"레어","ring",
      JSON.stringify(aff),signature,x.val,"JahEq",x.val,"JahEq",
      x.conf,x.verified,"v67 격리 테스트 데이터",`v67-test-${i+1}`
    ).run();
    inserted++;
  }
  return json({ok:true,inserted});
}

async function analyzeTestMarket(env) {
  const result=await analyzeObservationSet(env,{
    obsTable:"market_observations_test",
    clusterTable:"price_clusters_test",
    candidateTable:"pattern_candidates_test",
    testMode:true
  });
  return json({ok:true,...result});
}

async function testMarketStatus(env){
  const [o,c,p]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) n FROM market_observations_test`).first(),
    env.DB.prepare(`SELECT COUNT(*) n FROM price_clusters_test`).first(),
    env.DB.prepare(`SELECT COUNT(*) n FROM pattern_candidates_test`).first()
  ]);
  const {results:patterns=[]}=await env.DB.prepare(
    `SELECT * FROM pattern_candidates_test ORDER BY confidence DESC,id DESC LIMIT 50`
  ).all();
  return json({
    ok:true,
    observations:Number(o?.n||0),
    clusters:Number(c?.n||0),
    candidates:Number(p?.n||0),
    patterns:patterns.map(r=>({
      ...r,
      evidence:safeJson(r.evidence_json,[]),
      proposal:safeJson(r.proposal_json,{})
    }))
  });
}

async function clearTestMarketData(env){
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM pattern_candidates_test`),
    env.DB.prepare(`DELETE FROM price_clusters_test`),
    env.DB.prepare(`DELETE FROM market_observations_test`)
  ]);
  return json({ok:true});
}

async function analyzeMarket(env) {
  const result=await analyzeObservationSet(env,{
    obsTable:"market_observations",
    clusterTable:"price_clusters",
    candidateTable:"pattern_candidates",
    testMode:false
  });
  return json({ok:true,...result});
}

async function patternCandidates(request,env){
  const u=new URL(request.url);
  const status=u.searchParams.get("status")||"pending";
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM pattern_candidates WHERE status=? ORDER BY confidence DESC,id DESC LIMIT 300`
  ).bind(status).all();
  return json({ok:true,results:results.map(r=>({
    ...r,evidence:safeJson(r.evidence_json,[]),proposal:safeJson(r.proposal_json,{})
  }))});
}

async function promotePatternCandidate(request,env){
  const body=await request.json().catch(()=>null);
  const id=Number(body?.id), action=String(body?.action||"");
  if(!id || !["approve","hold","reject"].includes(action))
    return json({ok:false,error:"invalid_payload"},400);

  const row=await env.DB.prepare(`SELECT * FROM pattern_candidates WHERE id=?`).bind(id).first();
  if(!row)return json({ok:false,error:"not_found"},404);

  if(action!=="approve"){
    const status=action==="hold"?"hold":"rejected";
    await env.DB.prepare(
      `UPDATE pattern_candidates SET status=?,reviewed_at=datetime('now'),reviewer_note=? WHERE id=?`
    ).bind(status,String(body?.note||""),id).run();
    return json({ok:true,status});
  }

  const proposal=body.proposal||safeJson(row.proposal_json,{});
  if(!validProposal(proposal))return json({ok:false,error:"invalid_proposal"},400);

  // Promote through the already-existing review queue rather than directly to live rules.
  const dedupe=`pattern:${row.id}`;
  try{
    const r=await env.DB.prepare(
      `INSERT INTO review_candidates
       (item_type,title,source_type,evidence_json,proposal_json,confidence,status,dedupe_key)
       VALUES (?,?,?,?,?,?,'pending',?)`
    ).bind(
      row.item_type,row.title,"market-pattern",row.evidence_json,JSON.stringify(proposal),
      row.confidence,dedupe
    ).run();
    await env.DB.prepare(
      `UPDATE pattern_candidates SET status='promoted',reviewed_at=datetime('now'),reviewer_note=? WHERE id=?`
    ).bind(String(body?.note||""),id).run();
    return json({ok:true,status:"promoted",review_candidate_id:r.meta.last_row_id});
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE"))
      return json({ok:false,error:"already_promoted"},409);
    throw e;
  }
}

const CRAWLER_UA = "SanctuaryKR-MarketResearch/1.0 (+https://d2rarchive.co.kr/)";

const PARSER_VERSIONS = Object.freeze({
  playnote:"playnote-2026-09-11.14.4",
  chaoscube:"chaoscube-2026-09-11.14.4",
  traderie:PARSER_VERSION,
  inven:"inven-evidence-2026-09-11.14.4"
});

const PLAYNOTE_BOOTSTRAP_RARE_URLS=[
  "https://www.playnote.co.kr/trade/itemdetail?index=44102",
  "https://www.playnote.co.kr/trade/itemdetail?index=75549",
  "https://www.playnote.co.kr/trade/itemdetail?index=111325"
];

function parserVersionFor(source){ return PARSER_VERSIONS[source] || "unknown"; }

const MAX_CRAWL_BYTES = 1024 * 1024;
const ROBOTS_TTL_MS = 6 * 60 * 60 * 1000;
const ALLOWED_CRAWL_HOSTS = new Set([
  "www.playnote.co.kr","playnote.co.kr",
  "www.chaoscube.co.kr","chaoscube.co.kr",
  "diablo2.inven.co.kr","www.inven.co.kr","inven.co.kr",
  "www.traderie.com","traderie.com"
]);

function decodeEntitiesOnce(s){
  return String(s||"")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"')
    .replace(/&apos;|&#39;/gi,"'")
    .replace(/&#x([0-9a-f]+);?/gi,(_,hex)=>{
      const cp=parseInt(hex,16);
      try{return Number.isFinite(cp)?String.fromCodePoint(cp):_}catch{return _}
    })
    .replace(/&#(\d+);?/g,(_,n)=>{
      const cp=Number(n);
      try{return Number.isFinite(cp)?String.fromCodePoint(cp):_}catch{return _}
    });
}

function decodeEntities(s){
  // Some pages double-encode entities, e.g. &amp;#xC9C0;.
  let out=String(s||"");
  for(let i=0;i<3;i++){
    const next=decodeEntitiesOnce(out);
    if(next===out) break;
    out=next;
  }
  return out;
}

function extractEmbeddedDataText(html){
  const src=String(html||"");
  const chunks=[];

  // JSON / JSON-LD / Next-like state can contain useful public page data
  // even when the visible HTML is only an application shell.
  const scriptRx=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while((m=scriptRx.exec(src))){
    const attrs=String(m[1]||"");
    const body=String(m[2]||"").trim();
    if(!body || body.length>350000) continue;

    const structured=
      /type\s*=\s*["'](?:application\/ld\+json|application\/json)["']/i.test(attrs) ||
      /id\s*=\s*["']__(?:NEXT_DATA|NUXT_DATA)__["']/i.test(attrs);

    if(structured){
      chunks.push(decodeEntities(body)
        .replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))
        .replace(/\\n/g," ")
        .replace(/\\t/g," ")
        .replace(/[{}\[\]",:]+/g," "));
    }

    if(chunks.join(" ").length>50000) break;
  }
  return chunks.join(" ").replace(/\s+/g," ").trim();
}

function htmlToText(html){
  const stripped=String(html||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article)\b[^>]*>/gi,"\n")
    .replace(/<[^>]+>/g," ");

  return decodeEntities(stripped)
    .replace(/\r/g,"")
    .replace(/[ \t]+/g," ")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function acquisitionText(html){
  const visible=htmlToText(html);
  const embedded=extractEmbeddedDataText(html);
  if(!embedded) return visible;
  return `${visible}\n${embedded}`.trim();
}


function normalizedVisibleText(html){
  return acquisitionText(html).replace(/\s+/g," ").trim();
}


function classifyAcquiredContent(source,url,html){
  const text=normalizedVisibleText(html);
  const lower=text.toLowerCase();
  const result={
    ok:true,
    status:"content_ok",
    reason:null,
    text_length:text.length,
    source,
    url
  };

  if(!text || text.length<40){
    return {...result,ok:false,status:"content_unavailable",reason:"empty_or_tiny_document"};
  }

  if(source==="playnote"){
    const detail=/\/trade\/itemdetail\?/i.test(url);
    const market=/\/trade\/itemmarket/i.test(url);
    if(detail){
      const hasIdentity=/거래번호\s*:?\s*#?\s*\d+/i.test(text);
      const hasItem=/(?:^|\s)x\s+\d+개(?=\s|$)/i.test(text);
      const hasPrice=/[\d,]+P\b/i.test(text);
      if(hasIdentity && hasItem && hasPrice) return result;

      if(/이동할 서비스를 선택해 주세요|최근 검색|인기게임/i.test(text) &&
         !/판매 아이템|거래번호/i.test(text)){
        return {...result,ok:false,status:"wrong_service_shell",reason:"playnote_service_selector",
          marker_state:{hasIdentity,hasItem,hasPrice}};
      }
      return {...result,ok:false,status:"content_incomplete",reason:"playnote_detail_missing_markers",
        marker_state:{hasIdentity,hasItem,hasPrice}};
    }
    if(market){
      if(/아이템 마켓|프리미엄 아이템|일반 아이템/i.test(text) &&
         /거래 서버\s*(?:·|:)\s*악군/i.test(text)) return result;
      return {...result,ok:false,status:"content_incomplete",reason:"playnote_market_missing_cards"};
    }
  }

  if(source==="chaoscube"){
    const detail=/\/exchange\/detail\/\d+/i.test(url);
    if(detail){
      const hasCore=/물품 상세정보/i.test(text) &&
                    /Game Type/i.test(text) &&
                    /Mode/i.test(text) &&
                    /아이템 희귀도/i.test(text);
      if(hasCore) return result;
      return {...result,ok:false,status:"dynamic_content_unavailable",reason:"chaoscube_detail_shell"};
    }
    if(/\/exchange\/item/i.test(url)){
      // This is a registration/search shell, not a detail discovery endpoint.
      return {...result,ok:false,status:"non_discovery_entry",reason:"chaoscube_registration_shell"};
    }
  }

  if(source==="traderie"){
    if(/to begin the development,\s*run\s*`?npm start|to create a production bundle/i.test(lower)){
      return {...result,ok:false,status:"frontend_placeholder",reason:"traderie_dev_placeholder"};
    }
    const profile=/\/profile\/\d+\/listings/i.test(url);
    if(profile){
      if(/\b1\s*x\s+/i.test(text) && /Trading For/i.test(text)) return result;
      return {...result,ok:false,status:"dynamic_content_unavailable",reason:"traderie_profile_not_server_rendered"};
    }
    // Main Traderie landing page is not a reliable discovery surface.
    return {...result,ok:false,status:"non_discovery_entry",reason:"traderie_landing_not_discovery"};
  }

  // Inven is evidence-only: a normal public document is acceptable.
  return result;
}

async function recordAcquisitionRejection(env,source,url,classification){
  if(classification?.ok) return;
  await recordRejection(env,rejection(source,url,"acquisition",
    classification.reason||classification.status||"content_unavailable",{
      excerpt:normalizedVisibleText(classification.html||"").slice(0,1800),
      meta:{
        acquisition_status:classification.status||null,
        text_length:classification.text_length||0
      }
    }));
}

function sliceBetweenText(text,startNeedle,endNeedles,maxLen=6000){
  const s=String(text||"");
  const start=s.indexOf(startNeedle);
  if(start<0) return "";
  const from=start+startNeedle.length;
  const ends=(Array.isArray(endNeedles)?endNeedles:[endNeedles])
    .map(x=>s.indexOf(x,from)).filter(x=>x>=from);
  const end=ends.length?Math.min(...ends):Math.min(s.length,from+maxLen);
  return s.slice(from,end).trim();
}

function extractHtmlTitle(html){
  const m=String(html||"").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? htmlToText(m[1]).slice(0,300) : "";
}

async function sha256Text(s){ return sha256Hex(String(s||"")); }

function robotsRulesForStar(body){
  const lines=String(body||"").split(/\r?\n/);
  const groups=[];
  let agents=[], rules=[];
  function flush(){
    if(agents.length||rules.length) groups.push({agents:[...agents],rules:[...rules]});
    agents=[];rules=[];
  }
  for(let raw of lines){
    raw=raw.replace(/#.*$/,"").trim();
    if(!raw) continue;
    const i=raw.indexOf(":");
    if(i<0) continue;
    const k=raw.slice(0,i).trim().toLowerCase(), v=raw.slice(i+1).trim();
    if(k==="user-agent"){
      if(rules.length) flush();
      agents.push(v.toLowerCase());
    }else if((k==="allow"||k==="disallow") && agents.length){
      rules.push({type:k,path:v});
    }
  }
  flush();
  return groups.filter(g=>g.agents.includes("*")).flatMap(g=>g.rules);
}

function robotsAllows(body,path){
  const rules=robotsRulesForStar(body);
  let best=null;
  for(const r of rules){
    if(!r.path) continue;
    const p=r.path.replace(/\*/g,"");
    if(path.startsWith(p)){
      if(!best || p.length>best.path.length || (p.length===best.path.length && r.type==="allow")){
        best={...r,path:p};
      }
    }
  }
  return !best || best.type==="allow";
}

async function getRobots(env,url){
  const u=new URL(url), host=u.host.toLowerCase();
  const now=Date.now();
  const cached=await env.DB.prepare(`SELECT * FROM robots_cache WHERE host=?`).bind(host).first();
  if(cached && Number(cached.expires_at)>now){
    return {status:Number(cached.http_status||0),body:String(cached.body||"")};
  }
  let status=0, body="";
  try{
    const r=await fetchWithTimeout(`${u.protocol}//${u.host}/robots.txt`,{
      headers:{"User-Agent":CRAWLER_UA,"Accept":"text/plain,*/*;q=0.1"},
      redirect:"follow"
    });
    status=r.status;
    if(r.ok) body=(await r.text()).slice(0,200000);
  }catch{}
  await env.DB.prepare(
    `INSERT INTO robots_cache(host,body,http_status,fetched_at,expires_at)
     VALUES(?,?,?,?,?)
     ON CONFLICT(host) DO UPDATE SET
       body=excluded.body,http_status=excluded.http_status,
       fetched_at=excluded.fetched_at,expires_at=excluded.expires_at`
  ).bind(host,body,status,now,now+ROBOTS_TTL_MS).run();
  return {status,body};
}


const CRAWL_TIMEOUT_MS = 15000;
const CRAWL_LOCK_MS = 45000;
const RUN_STALE_MS = 75 * 1000;

async function acquireSeedLock(env,seedId){
  const now=Date.now(), token=crypto.randomUUID(), until=now+CRAWL_LOCK_MS;
  await env.DB.prepare(`DELETE FROM crawl_locks WHERE locked_until<?`).bind(now).run();
  try{
    await env.DB.prepare(
      `INSERT INTO crawl_locks(seed_id,locked_until,token) VALUES(?,?,?)`
    ).bind(seedId,until,token).run();
    return token;
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE")) return null;
    throw e;
  }
}
async function releaseSeedLock(env,seedId,token){
  await env.DB.prepare(`DELETE FROM crawl_locks WHERE seed_id=? AND token=?`).bind(seedId,token).run();
}

async function recoverStaleRuns(env){
  const cutoff=new Date(Date.now()-RUN_STALE_MS).toISOString().replace("T"," ").replace("Z","");
  await env.DB.prepare(
    `UPDATE crawl_runs
     SET result_status='stale_recovered',finished_at=datetime('now'),
         error_text=COALESCE(error_text,'run exceeded stale threshold')
     WHERE result_status='running' AND started_at < ?`
  ).bind(cutoff).run();
}

function fetchWithTimeout(url,options={},timeoutMs=CRAWL_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort("timeout"),timeoutMs);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

function classifyParseResult(parsed){
  const docs=(parsed.docs||[]).length, obs=(parsed.observations||[]).length;
  if(obs>0) return "observations_parsed";
  if(docs>0) return "documents_only";
  return "no_relevant_data";
}

function cleanItemName(s){
  return String(s||"").replace(/\s+/g," ").replace(/^[·•\-\s]+|[·•\-\s]+$/g,"").trim();
}

function extractNumericAffixesFromCompactText(text, mappings){
  const aff={};
  for(const [rx,key] of mappings){
    const m=String(text||"").match(rx);
    if(m){
      const n=Number(String(m[1]).replace(/,/g,""));
      if(Number.isFinite(n)) aff[key]=n;
    }
  }
  return aff;
}


const TRADERIE_API_BASE="https://traderie.com/api/diablo2resurrected/listings";
const TRADERIE_API_BOOTSTRAP_SELLERS=[
  {id:"1177157675",label:"sooni45834"},
  {id:"2637170372",label:"YakupHarman34230"}
];

const PLAYNOTE_BOOTSTRAP_SELLERS=[
  {key:"o5g1orzx7c",label:"public-seller-1"},
  {key:"g7yd8tlxo2",label:"public-seller-2"},
  {key:"vxc9blku03",label:"public-seller-3"},
  {key:"c7pkmagbe7",label:"public-seller-4"},
  {key:"vzvbkfss52",label:"public-seller-5"}
];

function traderieApiPropertyValue(p){
  if(!p || typeof p!=="object") return "";

  if(p.number!==undefined && p.number!==null) return String(p.number);
  if(p.string!==undefined && p.string!==null) return String(p.string);
  if(p.bool!==undefined && p.bool!==null) return String(p.bool);
  if(p.value!==undefined && p.value!==null) return String(p.value);
  return "";
}

function traderieApiPropertyIsMeta(p){return isMeta(p);}

function traderieApiCanonicalPropertyLine(p){return parseProperty(p).text;}

function traderieApiPropertyText(listing){
  return (Array.isArray(listing?.properties)?listing.properties:[])
    .map(traderieApiCanonicalPropertyLine)
    .filter(Boolean)
    .join("\n");
}

function traderieApiPropertyDebug(listing){
  return (Array.isArray(listing?.properties)?listing.properties:[])
    .slice(0,40)
    .map(p=>({
      id:p?.id??null,
      property_id:p?.property_id??null,
      property:p?.property??p?.name??null,
      type:p?.type??null,
      number:p?.number??null,
      string:p?.string??null,
      bool:p?.bool??null,
      skippable:!!p?.skippable,
      globalDefault:!!p?.globalDefault,
      meta:traderieApiPropertyIsMeta(p),
      canonical:traderieApiCanonicalPropertyLine(p)
    }));
}

function traderieApiPrice(listing){return parsePrice(listing);}

function traderieApiRarity(listing,aff){
  const fields=[
    listing?.rarity, listing?.quality,
    listing?.item?.rarity, listing?.item?.quality,
    listing?.variant?.rarity, listing?.variant?.quality
  ].filter(Boolean).map(x=>String(x).toLowerCase()).join(" ");

  if(/craft|crafted/.test(fields)) return "크래프트";
  if(/\brare\b/.test(fields)) return "레어";
  if(/unique|\bset\b|runeword/.test(fields)) return "비레어";

  return "미분류";
}

function traderieApiListingUrl(listing){
  const id=String(listing?.id||"").trim();
  return id ? `https://traderie.com/diablo2resurrected/listing/${id}` : "https://traderie.com/diablo2resurrected";
}


function traderieApiItemText(listing){
  const bits=[
    listing?.item?.name, listing?.name, listing?.item?.type, listing?.type,
    listing?.item?.category, listing?.category, listing?.item?.base, listing?.base,
    listing?.item?.rarity, listing?.rarity, listing?.item?.quality, listing?.quality
  ].filter(Boolean).map(String);
  return bits.join(" ");
}

function traderieApiLooksEquipment(listing){
  const s=traderieApiItemText(listing);
  return /(?:^|[^a-z])(?:ring|amulet|circlet|coronet|tiara|diadem|gloves?|gauntlets?|boots?|belt|claws?|talons?|katar|javelin|orb|wand|staff|bow|crossbow|sword|axe|mace|shield|helm|armor|armour)(?:$|[^a-z])/i.test(s);
}


function traderieAffixSetMax(out,key,value){
  const n=Number(value);
  if(!Number.isFinite(n)) return;
  if(out[key]===undefined || n>Number(out[key])) out[key]=n;
}

function traderiePropertyNumber(p){
  // Preferred structured numeric value.
  const v=p?.number ?? p?.value;
  const n=Number(v);
  if(Number.isFinite(n)) return n;

  // Traderie sometimes serializes skill-tab / skill properties only as a
  // human-readable string, e.g. "+2 to Martial Arts (Assassin Only)".
  // Extract a leading signed numeric modifier conservatively.
  const candidates=[
    String(p?.string??""),
    String(p?.property??""),
    String(p?.name??"")
  ];
  for(const s of candidates){
    const m=s.match(/(?:^|\s)([+-]?\d+(?:\.\d+)?)\s*(?:%|to\b|$)/i)
      || s.match(/([+-]?\d+(?:\.\d+)?)/);
    if(m){
      const x=Number(m[1]);
      if(Number.isFinite(x)) return x;
    }
  }
  return null;
}

function traderiePropertyRawName(p){
  return String(p?.property||p?.name||"")
    .replace(/\{\{\s*(?:value|number|string)\s*\}\}/gi,"")
    .replace(/\s+/g," ")
    .trim();
}


function traderiePropertyEffectiveNumber(p){
  const direct=traderiePropertyNumber(p);
  if(direct!==null) return direct;

  const canonical=traderieApiCanonicalPropertyLine(p);
  const raw=traderiePropertyRawName(p);
  const text=`${canonical} ${raw}`.replace(/\s+/g," ").trim();

  // Skill tabs / individual skills / standard +stat strings.
  const m=text.match(/([+-]?\d+(?:\.\d+)?)\s*(?:%|to\b)/i)
    || text.match(/^\s*([+-]?\d+(?:\.\d+)?)/);
  if(m){
    const n=Number(m[1]);
    if(Number.isFinite(n)) return n;
  }
  return null;
}

function traderieApiAffixes(listing){return parseProperties(listing).affixes;}

function traderieMeaningfulAffixCount(aff){
  const nonAffix=new Set(["ethereal"]);
  return Object.keys(aff||{}).filter(k=>!nonAffix.has(k)).length;
}


const TRADERIE_CRITICAL_PROPERTY_PATTERNS=[
  /Javelin and Spear Skills/i,/Bow and Crossbow Skills/i,/Passive and Magic Skills/i,
  /\bTraps\b/i,/Martial Arts/i,/Shadow Disciplines/i,
  /Fire Skills|Fire Spells/i,/Cold Skills|Cold Spells/i,/Lightning Skills|Lightning Spells/i
];
function traderiePropertyExpectedKey(p){return parseProperty(p).key;}

function traderiePropertyCoverage(listing,aff){return parseProperties(listing).quality;}

function traderieApiCandidateReason(listing){
  const propText=traderieApiPropertyText(listing);
  const aff=traderieApiAffixes(listing);
  const propertyCoverage=traderiePropertyCoverage(listing,aff);
  const price=traderieApiPrice(listing);
  const itemText=traderieApiItemText(listing);
  const rarity=traderieApiRarity(listing,aff);
  const slot=guessSlot(itemText,"",aff);
  return {
    item_text:itemText,
    property_count:Array.isArray(listing?.properties)?listing.properties.length:0,
    parsed_affix_count:traderieMeaningfulAffixCount(aff),
    price_count:Array.isArray(listing?.prices)?listing.prices.length:0,
    price_amount:price.amount,
    price_currency:price.currency,
    rarity,
    slot,
    looks_equipment:traderieApiLooksEquipment(listing),
    item_type_raw:listing?.item?.type??listing?.type??null,
    item_rarity_raw:listing?.item?.rarity??listing?.rarity??null,
    item_quality_raw:listing?.item?.quality??listing?.quality??null,
    canonical_property_text:propText.slice(0,1800),
    parser_quality:propertyCoverage
  };
}

function traderieApiObservation(listing,sellerId){
 if(!listing?.id||!listing?.item?.name&&!listing?.name)return null;
 const parsed=parseProperties(listing),price=parsePrice(listing),aff=parsed.affixes;
 let rarity=traderieApiRarity(listing,aff);const meta=(listing.properties||[]).find(p=>/^Rarity|^Quality$/i.test(p.property||p.name||''));const rv=String(meta?.string??meta?.value??'').trim();if(/^(unique|set|magic|normal|superior)$/i.test(rv))return null;if(/^(rare|crafted)$/i.test(rv))rarity=/crafted/i.test(rv)?'크래프트':'레어';
 if(rarity!=='레어')return null;if(!traderieApiLooksEquipment(listing))return null;
 const slot=guessSlot(traderieApiItemText(listing),'',aff),itemName=String(listing.item?.name||listing.name);
 const itemQuantity=rareEquipmentSingleQuantity(listing,slot),identityComplete=itemQuantity.single;
 const integrity={parser_version:PARSER_VERSION,complete:parsed.quality.complete&&price.complete&&identityComplete,options_complete:parsed.quality.complete,price_complete:price.complete,identity_complete:identityComplete,quantity_basis:itemQuantity.basis??null,effective_item_quantity:itemQuantity.effective_quantity??null,issues:[...price.issues,...(!identityComplete?['등급/부위/아이템 수량 확인 필요']:[])]};
 const snapshot=snapshotListing(listing),fetchedAt=new Date().toISOString();
 return {source_key:'traderie',source_url:traderieApiListingUrl(listing),source_listing_id:String(listing.id),observation_type:listing.completed===true?'completed':'asking',item_type:rarity,slot,base_name:itemName,affixes:aff,option_rows:parsed.rows,parser_quality:parsed.quality,price_structure:price,integrity,source_snapshot:snapshot,fetched_at:fetchedAt,season:listing.season??null,ladder:typeof listing.ladder==='boolean'?listing.ladder:null,hardcore:typeof listing.hardcore==='boolean'?listing.hardcore:null,region:listing.region??null,price_amount:price.amount,price_currency:price.currency,normalized_value:null,normalized_currency:null,listed_at:listing.updated_at||listing.created_at||null,source_confidence:integrity.complete?.75:.3,verified:false,raw_note:JSON.stringify({parser_version:PARSER_VERSION,integrity,fetched_at:fetchedAt,source_snapshot:snapshot,price_structure:price,option_rows:parsed.rows})};
}

async function traderieApiFetchListing(listingId){
 if(!/^\d+$/.test(String(listingId)))return {ok:false,http_status:400,listing:null};
 const u=new URL(TRADERIE_API_BASE);u.searchParams.set('selling','true');u.searchParams.set('completed','all');u.searchParams.set('active','all');u.searchParams.set('id',String(listingId));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{
  const r=await fetch(u.toString(),{headers:{accept:'application/json'},redirect:'follow',signal:controller.signal});
  if(!r.ok)return {ok:false,http_status:r.status,listing:null,listings_count:0};
  const text=await r.text();if(text.length>4000000)return {ok:false,http_status:r.status,listing:null,error:'response_too_large'};
  let data;try{data=JSON.parse(text)}catch{return {ok:false,http_status:r.status,listing:null,error:'invalid_json'};}
  const listings=Array.isArray(data?.listings)?data.listings:[],exact=listings.find(x=>String(x?.id)===String(listingId))||null;
  return {ok:!!exact,http_status:r.status,listing:exact,listings_count:listings.length};
 }finally{clearTimeout(timer);}
}

async function traderieApiFetchSeller(sellerId,page=0,includeCompleted=false){
  const u=new URL(TRADERIE_API_BASE);
  u.searchParams.set("selling","true");
  u.searchParams.set("auction","false");
  u.searchParams.set("page",String(page));
  u.searchParams.set("seller",String(sellerId));
  u.searchParams.set("completed",includeCompleted?"all":"false");
  u.searchParams.set("active","all");

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort("timeout"),4500);
  let r;
  try{
    r=await fetch(u.toString(),{
      method:"GET",
      headers:{
        "accept":"application/json",
        "content-type":"application/json; charset=utf-8",
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36"
      },
      redirect:"follow",
      signal:controller.signal
    });
  }finally{
    clearTimeout(timer);
  }

  const text=await r.text();
  let data=null;
  try{ data=JSON.parse(text); }catch{}

  return {
    ok:r.ok && !!data && Array.isArray(data.listings),
    http_status:r.status,
    content_type:r.headers.get("content-type")||"",
    url:r.url||u.toString(),
    listings:Array.isArray(data?.listings)?data.listings:[],
    raw_keys:data && typeof data==="object"?Object.keys(data).slice(0,30):[],
    preview:text.slice(0,1200)
  };
}

async function traderieApiTest(env){
  const results=[];
  for(const seller of TRADERIE_API_BOOTSTRAP_SELLERS){
    try{
      const rr=await traderieApiFetchSeller(seller.id,0);
      results.push({
        seller_id:seller.id,
        label:seller.label,
        ok:rr.ok,
        http_status:rr.http_status,
        content_type:rr.content_type,
        listing_count:rr.listings.length,
        raw_keys:rr.raw_keys,
        sample:rr.listings.slice(0,5).map(x=>({
          id:x?.id??null,
          keys:Object.keys(x||{}).slice(0,25),
          item:x?.item??null,
          property_sample:traderieApiPropertyDebug(x),
          canonical_property_text:traderieApiPropertyText(x),
          prices:x?.prices??null,
          mapping:traderieApiCandidateReason(x)
        })),
        preview:rr.ok?null:rr.preview
      });
      if(rr.ok) break;
      if([403,429].includes(rr.http_status)) break;
    }catch(e){
      results.push({seller_id:seller.id,label:seller.label,ok:false,error:String(e?.message||e)});
    }
  }

  const anyOk=results.some(x=>x.ok);
  return json({
    ok:true,
    api_access:anyOk?"AVAILABLE":"UNAVAILABLE",
    endpoint:TRADERIE_API_BASE,
    results,
    note:anyOk
      ?"Traderie listings JSON 응답 확인"
      :"Worker origin에서 JSON listings를 받지 못함. 403/429 우회는 시도하지 않음."
  });
}


function traderieSellerIdFromListing(listing){
  const values=[
    listing?.seller_id,listing?.seller?.id,listing?.user?.id,listing?.owner?.id,
    listing?.seller?.user_id,listing?.profile?.id,listing?.account?.id
  ];
  for(const v of values){
    if(v!==undefined && v!==null && /^\d{5,}$/.test(String(v))) return String(v);
  }
  return null;
}

function traderieSellerLabelFromListing(listing){
  return String(
    listing?.seller?.username||listing?.seller?.name||listing?.user?.username||
    listing?.owner?.username||listing?.profile?.username||""
  ).trim()||null;
}

function playnoteSellerKeysFromHtml(html){
  const out=[];
  const rx=/\/playlog\/itemmarket\?[^"'<>]*?\bkey=([a-zA-Z0-9_-]{6,64})/gi;
  for(const m of String(html||"").matchAll(rx)){
    if(!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

async function upsertMarketSeller(env,source,sellerKey,label=null,meta={}){
  if(!sellerKey) return;
  await env.DB.prepare(
    `INSERT INTO market_seller_pool
     (source_key,seller_key,label,metadata_json,last_seen_at,next_run_at,active,updated_at)
     VALUES (?,?,?,?,datetime('now'),datetime('now'),1,datetime('now'))
     ON CONFLICT(source_key,seller_key) DO UPDATE SET
       label=COALESCE(excluded.label,market_seller_pool.label),
       metadata_json=CASE WHEN excluded.metadata_json<>'{}' THEN excluded.metadata_json ELSE market_seller_pool.metadata_json END,
       last_seen_at=datetime('now'),active=1,updated_at=datetime('now')`
  ).bind(source,String(sellerKey),label,JSON.stringify(meta||{})).run();
}

async function ensureCoverageBootstrap(env){
  for(const s of TRADERIE_API_BOOTSTRAP_SELLERS)
    await upsertMarketSeller(env,'traderie',s.id,s.label,{bootstrap:true});
  for(const s of PLAYNOTE_BOOTSTRAP_SELLERS)
    await upsertMarketSeller(env,'playnote',s.key,s.label,{bootstrap:true});
}

async function traderieApiFetchRecent(page=0){
  const u=new URL(TRADERIE_API_BASE);
  u.searchParams.set('selling','true');
  u.searchParams.set('auction','false');
  u.searchParams.set('page',String(page));
  u.searchParams.set('completed','false');
  u.searchParams.set('active','all');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort('timeout'),4500);
  let r;
  try{
    r=await fetch(u.toString(),{method:'GET',headers:{'accept':'application/json','content-type':'application/json; charset=utf-8','user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36'},redirect:'follow',signal:controller.signal});
  }finally{clearTimeout(timer)}
  const text=await r.text();
  let data=null;try{data=JSON.parse(text)}catch{}
  return {ok:r.ok&&Array.isArray(data?.listings),http_status:r.status,listings:Array.isArray(data?.listings)?data.listings:[],preview:text.slice(0,1000)};
}

async function discoverTraderieSellers(env){
  let discovered=0, listings=0, status='ok';
  try{
    const rr=await traderieApiFetchRecent(0);
    if(!rr.ok) return {discovered:0,listings:0,status:`http_${rr.http_status}`};
    listings=rr.listings.length;
    for(const listing of rr.listings){
      const id=traderieSellerIdFromListing(listing);
      if(!id) continue;
      await upsertMarketSeller(env,'traderie',id,traderieSellerLabelFromListing(listing),{discovered_from:'recent_listing'});
      discovered++;
    }
  }catch(e){status=String(e?.message||e)}
  return {discovered,listings,status};
}

async function discoverPlaynoteSellers(env){
  let discovered=0, detailIds=0, status='ok';
  try{
    const url='https://www.playnote.co.kr/trade/itemmarket?index=1';
    const f=await publicFetch(env,{url,last_etag:null,last_modified:null,last_hash:null});
    const keys=playnoteSellerKeysFromHtml(f.html);
    const parsed=playnoteAdapter(f.html,url);
    detailIds=Number(parsed.parse_meta?.detail_ids_found)||0;
    for(const key of keys){await upsertMarketSeller(env,'playnote',key,null,{discovered_from:'market_index'});discovered++}
  }catch(e){status=String(e?.message||e)}
  return {discovered,detail_ids:detailIds,status};
}

async function getDueMarketSellers(env,source,limit){
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM market_seller_pool
     WHERE source_key=? AND active=1
       AND (paused_until IS NULL OR paused_until<=datetime('now'))
       AND (next_run_at IS NULL OR next_run_at<=datetime('now'))
     ORDER BY COALESCE(last_success_at,'1970-01-01') ASC,
              COALESCE(last_seen_at,'1970-01-01') DESC,id ASC
     LIMIT ?`
  ).bind(source,Number(limit)).all();
  return results;
}

async function markCoverageSellerResult(env,row,ok,count=0,error=null){
  const failures=ok?0:Number(row.failure_count||0)+1;
  const delayMin=ok?60:Math.min(1440,60*Math.pow(2,Math.min(failures,4)));
  await env.DB.prepare(
    `UPDATE market_seller_pool SET
      last_attempt_at=datetime('now'),
      last_success_at=CASE WHEN ?=1 THEN datetime('now') ELSE last_success_at END,
      failure_count=?,last_error=?,
      paused_until=CASE WHEN ?=1 THEN NULL ELSE datetime('now','+'||?||' minutes') END,
      next_run_at=datetime('now','+'||?||' minutes'),updated_at=datetime('now')
     WHERE id=?`
  ).bind(ok?1:0,failures,error,ok?1:0,delayMin,delayMin,row.id).run();
}

async function ingestCoverageObservation(env,obs){
  const r=await insertAutoObservation(env,obs);
  return {observations:Number(r.added||0),duplicates:Number(r.skipped||0),review_candidates:Number(r.review_candidates||0)};
}


function traderieCoverageDiagBucket(listing){
  const map=traderieApiCandidateReason(listing);

  if(map?.rarity!=="레어")
    return {bucket:"explicit_nonrare",map};

  if(Number(map?.parsed_affix_count||0)<3)
    return {bucket:"low_affix_count",map};

  if(!parsePrice(listing).complete)
    return {bucket:"no_price",map};

  if(!map?.looks_equipment && map?.rarity==="미분류")
    return {bucket:"non_equipment",map};

  const obs=traderieApiObservation(listing,String(listing?.seller_id||listing?.seller?.id||"diagnostic"));
  if(obs) return {bucket:"parsed",map,obs};

  return {bucket:"other",map};
}

function traderieCoverageDiagSample(listing,result){
  return {
    listing_id:listing?.id??null,
    seller_id:String(listing?.seller_id??listing?.seller?.id??""),
    item:{
      id:listing?.item?.id??null,
      name:listing?.item?.name??listing?.name??null,
      slug:listing?.item?.slug??null,
      type:listing?.item?.type??listing?.type??null,
      rarity:listing?.item?.rarity??listing?.rarity??null,
      quality:listing?.item?.quality??listing?.quality??null
    },
    property_count:Array.isArray(listing?.properties)?listing.properties.length:0,
    canonical_property_text:traderieApiPropertyText(listing).slice(0,1600),
    direct_affixes:traderieApiAffixes(listing),
    meaningful_affix_count:traderieMeaningfulAffixCount(traderieApiAffixes(listing)),
    property_mapping_debug:(Array.isArray(listing?.properties)?listing.properties:[]).slice(0,20).map(p=>({
      raw:traderiePropertyRawName(p),
      canonical:traderieApiCanonicalPropertyLine(p),
      number:traderiePropertyEffectiveNumber(p),
      expected_key:traderiePropertyExpectedKey(p)
    })),
    prices:listing?.prices??null,
    make_offer:listing?.make_offer??null,
    mapping:result?.map??null,
    parsed_observation:result?.obs?{
      slot:result.obs.slot,
      base_name:result.obs.base_name,
      item_type:result.obs.item_type,
      affixes:result.obs.affixes,
      price_amount:result.obs.price_amount,
      price_currency:result.obs.price_currency
    }:null
  };
}

async function traderieCoverageDiagnose(env){
  const sellers=await getDueMarketSellers(env,'traderie',8);
  const totals={
    total:0,parsed:0,explicit_nonrare:0,low_affix_count:0,
    no_price:0,non_equipment:0,other:0
  };
  const bySeller={};
  const samples={
    parsed:[],explicit_nonrare:[],low_affix_count:[],
    no_price:[],non_equipment:[],other:[]
  };
  const sellerRuns=[];

  for(const seller of sellers){
    const key=String(seller.seller_key);
    const stat={
      total:0,parsed:0,explicit_nonrare:0,low_affix_count:0,
      no_price:0,non_equipment:0,other:0
    };
    bySeller[key]=stat;

    let rr;
    try{
      rr=await traderieApiFetchSeller(key,0,false);
    }catch(e){
      sellerRuns.push({seller_key:key,ok:false,error:String(e?.message||e)});
      continue;
    }

    sellerRuns.push({
      seller_key:key,ok:rr.ok,http_status:rr.http_status,
      listings:rr.listings.length
    });

    if(!rr.ok) continue;

    for(const listing of rr.listings.slice(0,60)){
      const result=traderieCoverageDiagBucket(listing);
      const bucket=result.bucket;

      totals.total++;
      stat.total++;
      totals[bucket]=(totals[bucket]||0)+1;
      stat[bucket]=(stat[bucket]||0)+1;

      if(samples[bucket].length<8)
        samples[bucket].push(traderieCoverageDiagSample(listing,result));
    }
  }

  const pct={};
  for(const k of ["parsed","explicit_nonrare","low_affix_count","no_price","non_equipment","other"])
    pct[k]=totals.total?Math.round((totals[k]||0)/totals.total*1000)/10:0;

  return json({
    ok:true,
    sellers_checked:sellers.length,
    seller_runs:sellerRuns,
    totals,
    percentages:pct,
    by_seller:bySeller,
    samples
  });
}

async function collectTraderieCoverage(env,sellerLimit=8,budgetMs=14000){
  const started=Date.now();
  const sellers=await getDueMarketSellers(env,'traderie',sellerLimit);
  const out={source:'traderie',seller_limit:sellerLimit,sellers_processed:0,listings:0,candidates:0,observations:0,duplicates:0,review_candidates:0,errors:[]};
  for(const seller of sellers){
    if(Date.now()-started>budgetMs-1500) break;
    let sellerListings=0,ok=true,err=null;
    try{
      for(const page of [0,1]){
        if(Date.now()-started>budgetMs-1500) break;
        const rr=await traderieApiFetchSeller(seller.seller_key,page,false);
        if(!rr.ok){ok=false;err=`http_${rr.http_status}`;break}
        sellerListings+=rr.listings.length;out.listings+=rr.listings.length;
        for(const listing of rr.listings.slice(0,50)){
          const discovered=traderieSellerIdFromListing(listing);
          if(discovered) await upsertMarketSeller(env,'traderie',discovered,traderieSellerLabelFromListing(listing),{discovered_from:'seller_listing'});
          const obs=traderieApiObservation(listing,seller.seller_key);
          if(!obs) continue;
          out.candidates++;
          const x=await ingestCoverageObservation(env,obs);
          out.observations+=x.observations;out.duplicates+=x.duplicates;out.review_candidates+=x.review_candidates;
        }
        if(!rr.listings.length) break;
      }
    }catch(e){ok=false;err=String(e?.message||e)}
    await markCoverageSellerResult(env,seller,ok,sellerListings,err);
    if(!ok) out.errors.push({seller_key:seller.seller_key,error:err});
    out.sellers_processed++;
  }
  out.elapsed_ms=Date.now()-started;
  return out;
}

async function collectPlaynoteCoverage(env,sellerLimit=3,budgetMs=14000){
  const started=Date.now();
  const sellers=await getDueMarketSellers(env,'playnote',sellerLimit);
  const out={source:'playnote',seller_limit:sellerLimit,sellers_processed:0,listings:0,candidates:0,observations:0,duplicates:0,review_candidates:0,errors:[]};
  for(const seller of sellers){
    if(Date.now()-started>budgetMs-1500) break;
    let count=0,ok=true,err=null;
    try{
      const url=`https://www.playnote.co.kr/playlog/itemmarket?key=${encodeURIComponent(seller.seller_key)}`;
      const f=await publicFetch(env,{url,last_etag:null,last_modified:null,last_hash:null});
      const keys=playnoteSellerKeysFromHtml(f.html);
      for(const k of keys) await upsertMarketSeller(env,'playnote',k,null,{discovered_from:'seller_page'});
      const parsed=playnoteAdapter(f.html,url);
      count=(parsed.observations||[]).length;
      out.listings+=Number(parsed.parse_meta?.text_cards_found||0);
      for(const obs of (parsed.observations||[])){
        out.candidates++;
        const x=await ingestCoverageObservation(env,obs);
        out.observations+=x.observations;out.duplicates+=x.duplicates;out.review_candidates+=x.review_candidates;
      }
    }catch(e){ok=false;err=String(e?.message||e)}
    await markCoverageSellerResult(env,seller,ok,count,err);
    if(!ok) out.errors.push({seller_key:seller.seller_key,error:err});
    out.sellers_processed++;
  }
  out.elapsed_ms=Date.now()-started;
  return out;
}

async function marketCoverageStep(env,trigger='cron'){
  const started=Date.now();
  await ensureCoverageBootstrap(env);
  const discovery={traderie:await discoverTraderieSellers(env),playnote:await discoverPlaynoteSellers(env)};
  const traderie=await collectTraderieCoverage(env,8,14000);
  const playnote=await collectPlaynoteCoverage(env,3,14000);
  const summary={trigger,discovery,traderie,playnote,elapsed_ms:Date.now()-started};
  await env.DB.prepare(`INSERT INTO market_coverage_runs(trigger,summary_json,elapsed_ms) VALUES(?,?,?)`).bind(trigger,JSON.stringify(summary),summary.elapsed_ms).run();
  return summary;
}

async function marketCoverageStatus(env){
  await ensureCoverageBootstrap(env);
  const {results:pool=[]}=await env.DB.prepare(`SELECT source_key,COUNT(*) total,SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) active,SUM(CASE WHEN next_run_at<=datetime('now') THEN 1 ELSE 0 END) due FROM market_seller_pool GROUP BY source_key`).all();
  const {results:runs=[]}=await env.DB.prepare(`SELECT * FROM market_coverage_runs ORDER BY id DESC LIMIT 10`).all();
  return json({ok:true,pool,recent_runs:runs.map(x=>({...x,summary:safeJson(x.summary_json,{})}))});
}

async function marketCoverageRunApi(env){
  const summary=await marketCoverageStep(env,'admin');
  return json({ok:true,...summary});
}

async function traderieApiCollect(env){
  await ensureCoverageBootstrap(env);
  const c=await collectTraderieCoverage(env,8,9000);
  return json({
    ok:true,
    status:c.observations>0?'observations_parsed':c.listings>0?'json_no_rare_candidates':'api_unavailable',
    elapsed_ms:c.elapsed_ms,
    fetched_listings:c.listings,
    parsed_candidates:c.candidates,
    observations:c.observations,
    review_candidates:c.review_candidates,
    duplicates:c.duplicates,
    reason_counts:{coverage_mode:true,sellers_processed:c.sellers_processed},
    diagnostics:c.errors||[]
  });
}

function traderieEnglishAffixes(block){
  return extractNumericAffixesFromCompactText(block,[
    [/\+?(\d+)%\s+Faster Cast Rate/i,"fcr"],
    [/\+?(\d+)%\s+Faster Run\/Walk/i,"frw"],
    [/\+?(\d+)%\s+Faster Hit Recovery/i,"fhr"],
    [/\+?(\d+)%\s+Increased Attack Speed/i,"ias"],
    [/\+(\d+)\s+to Strength/i,"str"],
    [/\+(\d+)\s+to Dexterity/i,"dex"],
    [/\+(\d+)\s+to Life/i,"life"],
    [/\+(\d+)\s+to Mana/i,"mana"],
    [/\+(\d+)\s+to All Resistances/i,"allres"],
    [/Fire Resist\s*\+?(\d+)%/i,"fireres"],
    [/Lightning Resist\s*\+?(\d+)%/i,"lightres"],
    [/Cold Resist\s*\+?(\d+)%/i,"coldres"],
    [/Poison Resist\s*\+?(\d+)%/i,"poisonres"],
    [/\+(\d+)\s+to Attack Rating/i,"ar"],
    [/(\d+)%\s+Life stolen per hit/i,"ll"],
    [/(\d+)%\s+Mana stolen per hit/i,"ml"],
    [/\+(\d+)\s+to Amazon Skill Levels/i,"amazon_skills"],
    [/\+(\d+)\s+to Sorceress Skill Levels/i,"sorc_skills"],
    [/\+(\d+)\s+to Necromancer Skill Levels/i,"necro_skills"],
    [/\+(\d+)\s+to Paladin Skill Levels/i,"paladin_skills"],
    [/\+(\d+)\s+to Barbarian Skill Levels/i,"barbarian_skills"],
    [/\+(\d+)\s+to Druid Skill Levels/i,"druid_skills"],
    [/\+(\d+)\s+to Assassin Skill Levels/i,"assassin_skills"],
    [/\+(\d+)\s+to Warlock Skill Levels/i,"warlock_skills"]
  ]);
}

function playnoteCompactAffixes(block){
  const maps=[
    [/시전 속도%\s*\+?\s*(\d+)/i,"fcr"],
    [/공격 속도%\s*\+?\s*(\d+)/i,"ias"],
    [/힘\+\s*(\d+)/i,"str"],
    [/민첩\+\s*(\d+)/i,"dex"],
    [/생명력\+\s*(\d+)/i,"life"],
    [/마나\+\s*(\d+)/i,"mana"],
    [/모든 저항\+\s*(\d+)/i,"allres"],
    [/화염 저항%\s*\+?\s*(\d+)/i,"fireres"],
    [/번개 저항%\s*\+?\s*(\d+)/i,"lightres"],
    [/냉기 저항%\s*\+?\s*(\d+)/i,"coldres"],
    [/독 저항%\s*\+?\s*(\d+)/i,"poisonres"],
    [/명중률\+?\s*(\d+)/i,"ar"],
    [/적중당 생명력 훔침%\s*(\d+)/i,"ll"],
    [/적중당 마나 훔침%\s*(\d+)/i,"ml"],
    [/타격 회복 속도%\s*(\d+)/i,"fhr"],
    [/달리기.*?걷기 속도%\s*(\d+)/i,"frw"],
    [/악마술사 기술 레벨\+\s*(\d+)/i,"warlock_skills"],
    [/원소술사 기술 레벨\+\s*(\d+)/i,"sorc_skills"],
    [/강령술사 기술 레벨\+\s*(\d+)/i,"necro_skills"],
    [/아마존 기술 레벨\+\s*(\d+)/i,"amazon_skills"],
    [/암살자 기술 레벨\+\s*(\d+)/i,"assassin_skills"],
    [/성기사 기술 레벨\+\s*(\d+)/i,"paladin_skills"],
    [/야만용사 기술 레벨\+\s*(\d+)/i,"barbarian_skills"],
    [/드루이드 기술 레벨\+\s*(\d+)/i,"druid_skills"]
  ];
  return extractNumericAffixesFromCompactText(block,maps);
}

function isGenericRareCandidate(itemName,category,block,aff){
  const n=cleanItemName(itemName);
  const slot=guessSlot(n,category,aff);
  if(!["ring","amulet","circlet","gloves","boots","belt","claw","jav","bow","crossbow","orb","wand"].includes(slot))
    return false;
  // Named uniques/runewords are generally category-labelled as such; generic slot names are stronger rare signals.
  const generic=/^(반지|링|목걸이|아뮬|써클릿|코로니트|티아라|다이어뎀|장갑|부츠|신발|벨트)$/i.test(n);
  const optionCount=Object.keys(aff||{}).length;
  return generic ? optionCount>=2 : optionCount>=3 && /장신구|직업 전용|무기|방어구/i.test(category||"");
}

function normalizeSourceUrl(base,href){
  try{return new URL(href,base).toString()}catch{return null}
}

function discoverChaosDetails(html,baseUrl){
  const urls=new Set();
  const rx=/href=["']([^"']*\/exchange\/detail\/\d+[^"']*)["']/gi;
  let m;
  while((m=rx.exec(String(html||"")))){
    const u=normalizeSourceUrl(baseUrl,m[1]);
    if(u) urls.add(u.split("#")[0]);
    if(urls.size>=30) break;
  }
  return [...urls];
}

async function storeDiscoveredUrls(env,source,parentSeedId,urls,urlType="detail"){
  let added=0;
  for(const url of urls){
    try{
      await env.DB.prepare(
        `INSERT INTO crawl_discovered_urls(source_key,parent_seed_id,url,url_type)
         VALUES(?,?,?,?)`
      ).bind(source,parentSeedId,url,urlType).run();
      added++;
    }catch(e){
      if(!String(e?.message||e).includes("UNIQUE")) throw e;
    }
  }
  return added;
}

async function crawlDiscoveredChaosDetails(env,seed,limit=5){
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM crawl_discovered_urls
     WHERE source_key='chaoscube' AND active=1
     ORDER BY COALESCE(last_crawled_at,0) ASC,id DESC LIMIT ?`
  ).bind(limit).all();

  let docs=0,observations=0,duplicates=0,errors=0;
  for(const d of results){
    try{
      const faux={...seed,url:d.url,last_etag:null,last_modified:null,last_hash:null};
      const fetched=await publicFetch(env,faux);
      const parsed=chaoscubeDetailAdapter(fetched.html,d.url);
      for(const doc of parsed.docs||[]){
        const rr=await insertCrawlDocument(env,"chaoscube",doc); docs+=rr.added;duplicates+=rr.duplicate;
      }
      for(const o of parsed.observations||[]){
        const rr=await insertAutoObservation(env,o); observations+=rr.added;duplicates+=rr.skipped;
      }
      await env.DB.prepare(
        `UPDATE crawl_discovered_urls SET last_crawled_at=?,crawl_count=crawl_count+1 WHERE id=?`
      ).bind(Date.now(),d.id).run();
    }catch(e){ errors++; }
  }
  return {docs,observations,duplicates,errors,details_checked:results.length};
}

async function publicFetch(env, seed){
  const u=new URL(seed.url);
  if(u.protocol!=="https:" || !ALLOWED_CRAWL_HOSTS.has(u.host.toLowerCase()))
    throw new Error("host_not_allowed");

  const robots=await getRobots(env,seed.url);
  if(robots.status>=200 && robots.status<300 && !robotsAllows(robots.body,u.pathname))
    throw new Error("robots_disallow");

  const headers={
    "User-Agent":CRAWLER_UA,
    "Accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    "Accept-Language":"ko-KR,ko;q=0.9,en;q=0.5"
  };
  if(seed.last_etag) headers["If-None-Match"]=seed.last_etag;
  if(seed.last_modified) headers["If-Modified-Since"]=seed.last_modified;

  const r=await fetchWithTimeout(seed.url,{headers,redirect:"follow"});
  if(r.status===304) return {status:304,html:"",etag:seed.last_etag,lastModified:seed.last_modified};

  if([401,403,429].includes(r.status)) {
    const err=new Error(`http_${r.status}`);
    err.httpStatus=r.status; throw err;
  }
  if(!r.ok){
    const err=new Error(`http_${r.status}`);
    err.httpStatus=r.status; throw err;
  }

  const ct=r.headers.get("content-type")||"";
  if(!ct.includes("text/html") && !ct.includes("application/xhtml")){
    throw new Error("non_html_response");
  }

  const html=(await r.text()).slice(0,MAX_CRAWL_BYTES);
  return {
    status:r.status,html,
    etag:r.headers.get("etag"),
    lastModified:r.headers.get("last-modified"),
    finalUrl:r.url||seed.url,
    contentType:ct,
    contentLength:html.length
  };
}

const KO_AFFIX_MAP = [
  [/시전 속도|시전속도|패캐|faster cast rate/i,"fcr"],
  [/공격 속도|공격속도|공속|increased attack speed/i,"ias"],
  [/힘/i,"str"],[/민첩/i,"dex"],[/생명력|라이프/i,"life"],[/마나/i,"mana"],
  [/모든 저항|올레/i,"allres"],[/화염 저항|파이어 저항|파레/i,"fireres"],
  [/번개 저항|라이트닝 저항|라레/i,"lightres"],[/냉기 저항|콜드 저항|콜레/i,"coldres"],
  [/독 저항|포이즌 저항|포레/i,"poisonres"],[/명중률|명중|공격등급/i,"ar"],
  [/생명력 훔침|생명력 흡수|라흡/i,"ll"],[/마나 훔침|마나 흡수|마흡/i,"ml"],
  [/달리기.*걷기|이동 속도|달려/i,"frw"],[/타격 회복 속도|패힛/i,"fhr"]
];

function mapKoAffix(label){
  for(const [re,key] of KO_AFFIX_MAP) if(re.test(label)) return key;
  return canonicalAffixKey(label);
}

function parseSimpleOptionLines(block){
  const aff={};
  const lines=String(block||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
  for(let i=0;i<lines.length-1;i++){
    const label=lines[i];
    const nxt=lines[i+1];
    const vm=nxt.match(/^\+?\s*(-?\d+(?:\.\d+)?)\s*%?$/);
    if(!vm) continue;
    if(label.length>90) continue;
    const key=mapKoAffix(label);
    if(key && key.length<80) aff[key]=Number(vm[1]);
  }
  return aff;
}


function parsePlaynoteOptionBlock(block){
  const aff={...parseKoreanOptionPairs(block),...playnoteCompactAffixes(block)};
  const patterns=[
    [/시전 속도%?\s*\+?\s*([+-]?\d+)/i,"fcr"],
    [/공격 속도%?\s*\+?\s*([+-]?\d+)/i,"ias"],
    [/타격 회복 속도%?\s*\+?\s*([+-]?\d+)/i,"fhr"],
    [/달리기.*?걷기 속도%?\s*\+?\s*([+-]?\d+)/i,"frw"],
    [/힘\+?\s*\+?\s*([+-]?\d+)/i,"str"],
    [/민첩\+?\s*\+?\s*([+-]?\d+)/i,"dex"],
    [/생명력\+?\s*\+?\s*([+-]?\d+)/i,"life"],
    [/마나\+?\s*\+?\s*([+-]?\d+)/i,"mana"],
    [/모든 능력치\+?\s*\+?\s*([+-]?\d+)/i,"allstats"],
    [/모든 저항\+?\s*\+?\s*([+-]?\d+)/i,"allres"],
    [/화염 저항%?\s*\+?\s*([+-]?\d+)/i,"fireres"],
    [/번개 저항%?\s*\+?\s*([+-]?\d+)/i,"lightres"],
    [/냉기 저항%?\s*\+?\s*([+-]?\d+)/i,"coldres"],
    [/독 저항%?\s*\+?\s*([+-]?\d+)/i,"poisonres"],
    [/적중당 생명력 훔침%?\s*\+?\s*([+-]?\d+)/i,"ll"],
    [/적중당 마나 훔침%?\s*\+?\s*([+-]?\d+)/i,"ml"],
    [/명중률\+?\s*\+?\s*([+-]?\d+)/i,"ar"],
    [/마법 아이템 발견 확률%?\s*\+?\s*([+-]?\d+)/i,"mf"],
    [/혼돈 기술\(악마술사\)\+?\s*\+?\s*([+-]?\d+)/i,"warlock_chaos"],
    [/기괴 기술\(악마술사\)\+?\s*\+?\s*([+-]?\d+)/i,"warlock_grotesque"],
    [/악마 기술\(악마술사\)\+?\s*\+?\s*([+-]?\d+)/i,"warlock_demon"],
    [/강령술사 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"necro_skills"],
    [/암살자 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"assassin_skills"],
    [/원소술사 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"sorc_skills"],
    [/아마존 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"amazon_skills"],
    [/성기사 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"paladin_skills"],
    [/야만용사 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"barbarian_skills"],
    [/드루이드 기술 레벨\+?\s*\+?\s*([+-]?\d+)/i,"druid_skills"]
  ];
  for(const [rx,key] of patterns){
    const m=String(block||"").match(rx);
    if(m){
      const n=Number(m[1]);
      if(Number.isFinite(n)) aff[key]=n;
    }
  }
  return aff;
}

function playnoteRareLikelihood(category,itemName,aff){
  if(/유니크 아이템|세트 아이템|룬워드|룬\/보석|재료\/소모품|부적\/주얼|매직 아이템|크래프트 아이템/i.test(category||""))
    return {accept:false,reason:"explicit_nonrare",confidence:0};

  const slot=guessSlot(itemName,category,aff);
  const count=Object.keys(aff||{}).length;
  const supported=["ring","amulet","circlet","gloves","boots","belt","claw","jav","bow","crossbow","orb","wand"].includes(slot);
  const name=cleanItemName(itemName).replace(/^(?:레어|매직|크래프트)\s+/i,"");
  const genericBase=/^(?:반지|링|목걸이|아뮬|써클릿|서클릿|코로니트|코로넷|티아라|다이어뎀)$/i.test(name) ||
    /(?:장갑|글러브|건틀릿|브레이서|부츠|그리브|벨트|새시|코일|클러|탤런|카타르|자벨린|재벌린|활|보우|석궁|크로스보우|오브|원드|완드)$/i.test(name) ||
    /(?:ring|amulet|circlet|coronet|tiara|diadem|gloves?|gauntlets?|boots?|greaves?|belt|sash|claws?|talons?|katar|javelin|orb|wand|bow|crossbow)$/i.test(name);

  if(supported && genericBase && count>=3 && count<=6)
    return {accept:true,slot,reason:"three_plus_affixes",confidence:count>=5?.68:.60};

  return {accept:false,slot,reason:count<3?"too_few_affixes":count>6?"too_many_affixes":!genericBase?"named_or_unknown_item":"unsupported_slot",confidence:0};
}

function detectChaosSelectedRarity(text){
  const s=String(text||"");
  const start=s.indexOf("아이템 희귀도");
  if(start<0) return {rarity:null,tokens:[],method:"missing_section"};

  const endCandidates=[
    s.indexOf("판매가 수정 이력",start+1),
    s.indexOf("오프라인 로그인",start+1)
  ].filter(x=>x>start);
  const end=endCandidates.length?Math.min(...endCandidates):Math.min(s.length,start+5000);
  const block=s.slice(start,end);

  const labels=["일반","매직","레어","세트","유니크","룬워드","크레프트","크래프트","기타"];
  const tokens=[];
  for(const label of labels){
    const normalized=label==="크래프트"?"크레프트":label;
    const safe=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const rx=new RegExp(safe,"g");
    for(const m of block.matchAll(rx)) tokens.push({value:normalized,index:m.index});
  }
  tokens.sort((a,b)=>a.index-b.index);

  const counts={};
  for(const t of tokens) counts[t.value]=(counts[t.value]||0)+1;
  const dup=Object.entries(counts).filter(([,n])=>n>=2);
  if(dup.length===1)
    return {rarity:dup[0][0],tokens:tokens.map(x=>x.value),method:"duplicated_selected_label"};

  const lastEtc=[...tokens].reverse().find(x=>x.value==="기타");
  if(lastEtc){
    const after=tokens.find(x=>x.index>lastEtc.index);
    if(after) return {rarity:after.value,tokens:tokens.map(x=>x.value),method:"after_selector_list"};
  }

  if(tokens.length>9)
    return {rarity:tokens[tokens.length-1].value,tokens:tokens.map(x=>x.value),method:"last_token"};

  return {rarity:null,tokens:tokens.map(x=>x.value),method:"ambiguous"};
}

function traderieListingBlocks(text){
  const s=String(text||"");
  const out=[];
  let pos=0;
  while(true){
    const start=s.indexOf("1 x ",pos);
    if(start<0)break;
    const trading=s.indexOf("Trading For",start);
    if(trading<0)break;
    const intervening=s.indexOf("1 x ",start+4);
    if(intervening>=0 && intervening<trading){pos=intervening;continue;}
    const next=s.indexOf("1 x ",trading+11);
    const end=next>=0?next:Math.min(s.length,trading+1800);
    out.push({before:s.slice(start,trading),after:s.slice(trading+11,end)});
    pos=end;
  }
  return out;
}


function playnoteDetailUrl(listingId){
  const id=String(listingId||"").replace(/\D/g,"");
  return id?`https://www.playnote.co.kr/trade/itemdetail?index=${id}`:null;
}

function playnoteAdapter(html,url){
  const raw=String(html||"");
  const fullText=acquisitionText(raw);
  const docs=[{url,title:extractHtmlTitle(raw)||"Playnote D2R Item Market",text:fullText.slice(0,22000),status:"raw"}];
  const observations=[],rejects=[];

  const startRx=/(?:디아블로2\s+레저렉션\s+)?(유니크 아이템|세트 아이템|룬워드|룬\/보석|부적\/주얼|재료\/소모품|직업 전용|장신구|무기|방어구|레어 아이템|매직 아이템|크래프트 아이템)\s+거래 서버\s*(?:·|:)\s*악군\s+(래더|스탠)\s+([\s\S]{1,260}?)\s+x\s+(\d+)개(?:\s+개당)?\s+([\d,]+)P/i;

  // Extract detail IDs independently from card markup.
  // Playnote's clickable title/link and option body are separate DOM regions.
  const detailIds=[];
  const idRx=/\/trade\/itemdetail\?[^"'<>]*?\bindex=(\d+)/gi;
  for(const m of raw.matchAll(idRx)){
    if(!detailIds.includes(m[1])) detailIds.push(m[1]);
  }

  const parseCard=(cardText,listingId)=>{
    const m=cardText.match(startRx);
    if(!m) return false;

    const category=m[1],ladderWord=m[2],qty=Number(m[4]);
    const price=Number(m[5].replace(/,/g,""));
    const itemName=cleanItemName(String(m[3]||"").split("#")[0]);

    // Prefer a visible #ID inside the same text card when available.
    const visibleIdMatch=cardText.match(/#\s*(\d{5,})\b/);
    if(visibleIdMatch) listingId=visibleIdMatch[1];

    const marker=cardText.indexOf(`${itemName} 옵션`);
    const optionBlock=marker>=0?cardText.slice(marker+`${itemName} 옵션`.length):cardText;
    const aff=parsePlaynoteOptionBlock(optionBlock);
    const rare=playnoteRareLikelihood(category,itemName,aff);
    const sourceUrl=listingId?playnoteDetailUrl(listingId):url;

    if(!rare.accept){
      if(rare.reason!=="explicit_nonrare"){
        rejects.push(rejection("playnote",sourceUrl,"listing",rare.reason,{
          item_name:itemName,category,affix_count:Object.keys(aff).length,
          excerpt:cardText.slice(0,1800),meta:{listingId,parsed_affixes:aff,qty}
        }));
      }
      return true;
    }

    observations.push({
      source_key:"playnote",
      source_url:sourceUrl,
      source_listing_id:listingId||null,
      observation_type:"asking",
      item_type:"레어",
      slot:rare.slot,base_name:itemName,affixes:aff,
      season:null,ladder:ladderWord==="래더",hardcore:null,region:"Asia",
      price_amount:price,price_currency:"P",normalized_value:null,normalized_currency:null,
      listed_at:null,
      source_confidence:listingId?Math.min(.92,(rare.confidence||.68)+.08):(rare.confidence||.68),
      verified:false,
      raw_note:`Playnote full-text + detail-id alignment ${parserVersionFor("playnote")} · ${category} · ${Object.keys(aff).length} affixes`
    });
    return true;
  };

  // Parse cards from the complete page text — this was the path already proven
  // to extract Playnote price/options correctly.
  const matches=[...fullText.matchAll(new RegExp(startRx.source,"gi"))];
  let parsedCards=0;
  for(let i=0;i<matches.length;i++){
    const start=matches[i].index;
    const end=i+1<matches.length?matches[i+1].index:Math.min(fullText.length,start+6500);
    const card=fullText.slice(start,end);

    // If no #ID survives text flattening, align to detail link order.
    const visibleId=card.match(/#\s*(\d{5,})\b/)?.[1]||null;
    const alignedId=visibleId || detailIds[i] || null;
    if(parseCard(card,alignedId)) parsedCards++;
  }

  docs[0].status=observations.length?"structured":parsedCards?"unstructured":"raw";
  return {
    docs,observations,rejects,
    parse_meta:{
      detail_ids_found:detailIds.length,
      first_detail_ids:detailIds.slice(0,10),
      text_cards_found:matches.length,
      parsed_cards:parsedCards,
      observations:observations.length,
      with_listing_id:observations.filter(x=>x.source_listing_id).length,
      rejections:rejects.length
    }
  };
}

function traderieAdapter(html,url){
  const text=htmlToText(html);
  const docs=[{
    url,title:extractHtmlTitle(html)||"Traderie D2R Marketplace",
    text:text.slice(0,16000),status:"raw"
  }];
  const observations=[];

  // Listings appear as "1 x <item> ... • rare<affixes> Trading For ... High Rune Value: N"
  const parts=text.split(/\bTrading For\b/i);
  for(let i=0;i<parts.length-1;i++){
    const before=parts[i].slice(-1400);
    const after=parts[i+1].slice(0,700);
    if(!/[•\s]rare\b/i.test(before)) continue;

    const headMatches=[...before.matchAll(/\b1\s*x\s+(.{1,1000})/gi)];
    if(!headMatches.length) continue;
    const raw=headMatches[headMatches.length-1][1];

    // Trim seller/meta spill by relying on rarity token and common mode delimiters.
    const rarityPos=raw.toLowerCase().lastIndexOf("rare");
    if(rarityPos<0) continue;
    const head=raw.slice(0,rarityPos+4);
    const mods=raw.slice(rarityPos+4) + " " + after;

    let itemPart=head
      .replace(/\breign of the warlock\b/ig," ")
      .replace(/\bclassic \(base game\)\b/ig," ")
      .replace(/[•]/g," ")
      .replace(/\b(?:PC|Xbox|PlayStation|softcore|hardcore|Ladder|Non Ladder|rare)\b/ig," ")
      .replace(/\s+/g," ").trim();
    const itemName=cleanItemName(itemPart.split("+")[0].trim());

    const aff=traderieEnglishAffixes(mods);
    if(Object.keys(aff).length<2) continue;

    const hrvMatch=after.match(/High Rune Value:\s*([0-9.]+)/i);
    const hrv=hrvMatch?Number(hrvMatch[1]):null;
    const ladder=/\bLadder\b/i.test(head) && !/\bNon Ladder\b/i.test(head);
    const hardcore=/\bhardcore\b/i.test(head);

    observations.push({
      source_key:"traderie",
      source_url:url,
      source_listing_id:null,
      observation_type:"asking",
      item_type:"레어",
      slot:guessSlot(itemName,"",aff),
      base_name:itemName,
      affixes:aff,
      season:null,
      ladder,
      hardcore,
      region:null,
      price_amount:hrv,
      price_currency:hrv!==null?"HRV":null,
      normalized_value:hrv,
      normalized_currency:hrv!==null?"HRV":null,
      source_confidence:hrv!==null?.62:.48,
      verified:false,
      raw_note:"Traderie public rare listing; HRV parsed when exposed"
    });
  }
  docs[0].status=observations.length?"structured":"unstructured";
  return {docs,observations};
}

function chaoscubeDetailAdapter(html,url){
  const text=htmlToText(html);
  const docs=[{url,title:extractHtmlTitle(html)||"ChaosCube Detail",text:text.slice(0,16000),status:"raw"}];
  const observations=[];

  const id=(url.match(/\/exchange\/detail\/(\d+)/)||[])[1]||null;
  const rarityMatch=text.match(/아이템 희귀도[\s\S]{0,220}\b(레어|크레프트|매직|유니크|세트|룬워드)\b/i);
  const rarity=rarityMatch?rarityMatch[1]:null;
  if(!rarity || !/레어|크레프트/i.test(rarity)){
    docs[0].status="unstructured";
    return {docs,observations};
  }

  const gt=(text.match(/Game Type\s*(래더|스탠다드)/i)||[])[1]||"";
  const mode=(text.match(/Mode\s*(소프트코어|하드코어)/i)||[])[1]||"";
  const itemLine=(text.match(/Mode\s*(?:소프트코어|하드코어)\s+([^\n]{2,180}?)(?:\s+♥|\s+아이템 정보)/i)||[])[1]||"";
  const itemName=cleanItemName(itemLine.split("·")[0]);

  const infoStart=text.indexOf("요구 레벨");
  const priceStart=text.indexOf("판매가 수정 이력");
  const optionBlock=infoStart>=0?text.slice(infoStart,priceStart>infoStart?priceStart:infoStart+2500):text.slice(0,2500);
  const aff=playnoteCompactAffixes(optionBlock);

  if(Object.keys(aff).length<2){
    docs[0].status="unstructured";
    return {docs,observations};
  }

  const prices=[...text.matchAll(/(?:최초 등록|판매가 수정)\s*·\s*[\d\-:\s]+\s+([\d,]+)/g)]
    .map(m=>Number(m[1].replace(/,/g,""))).filter(Number.isFinite);
  const latestPrice=prices.length?prices[prices.length-1]:null;
  const ended=/판매종료[\s\S]{0,80}종료/i.test(text);

  observations.push({
    source_key:"chaoscube",
    source_url:url,
    source_listing_id:id,
    observation_type:ended?"completed":"asking",
    item_type:rarity==="크레프트"?"크래프트":"레어",
    slot:guessSlot(itemName,"",aff),
    base_name:itemName,
    affixes:aff,
    season:null,
    ladder:gt==="래더",
    hardcore:mode==="하드코어",
    region:"Asia",
    price_amount:latestPrice,
    price_currency:latestPrice!==null?"CP":null,
    normalized_value:null,
    normalized_currency:null,
    source_confidence:ended?.72:.55,
    verified:ended,
    raw_note:`ChaosCube detail · ${rarity} · ${ended?"ended":"active"}`
  });
  docs[0].status="structured";
  return {docs,observations};
}

function chaoscubeAdapter(html,url){
  const text=htmlToText(html);
  const detailUrls=discoverChaosDetails(html,url);
  const relevant=/레어|매직|크래프트|패캐|링|써클릿|거래/i.test(text);
  const docs=relevant?[{
    url,title:extractHtmlTitle(html)||"ChaosCube D2R Exchange",
    text:text.slice(0,16000),
    status:detailUrls.length?"structured":"unstructured"
  }]:[];
  return {docs,observations:[],discovered_urls:detailUrls};
}

function invenAdapter(html,url){
  const text=htmlToText(html);
  const docs=[{url,title:extractHtmlTitle(html)||"Traderie D2R",text:text.slice(0,12000),status:"raw"}];
  const observations=[];
  // Conservative: only obvious rare blocks with at least 2 numeric +affixes.
  const chunks=text.split(/\bTrading For\b/i);
  for(const c of chunks){
    if(!/\brare\b/i.test(c) || !/\bLadder\b/i.test(c)) continue;
    const item=(c.match(/\b1\s*x\s*([^\n]{1,100}?)(?:\s+reign of the warlock|\s+•)/i)||[])[1];
    if(!item) continue;
    const aff={};
    const en=[
      [/(\d+)%?\s+Faster Cast Rate/i,"fcr"],
      [/\+(\d+)\s+to Strength/i,"str"],
      [/\+(\d+)\s+to Life/i,"life"],
      [/\+(\d+)\s+to All Resistances/i,"allres"],
      [/(\d+)%\s+Faster Run\/Walk/i,"frw"],
      [/(\d+)%\s+Faster Hit Recovery/i,"fhr"]
    ];
    for(const [rx,k] of en){ const mm=c.match(rx); if(mm) aff[k]=Number(mm[1]); }
    if(Object.keys(aff).length<2) continue;
    observations.push({
      source_key:"traderie",source_url:url,source_listing_id:null,
      observation_type:"asking",item_type:"레어",slot:guessSlot(item,"",aff),
      base_name:item,affixes:aff,season:null,ladder:true,
      hardcore:/hardcore/i.test(c),region:null,
      price_amount:null,price_currency:null,normalized_value:null,normalized_currency:null,
      source_confidence:.42,verified:false,raw_note:"Traderie public HTML conservative parse"
    });
  }
  docs[0].status=observations.length?"structured":"unstructured";
  return {docs,observations};
}


function guessSlot(itemName,category,aff){
  const s=(String(itemName||"")+" "+String(category||"")).toLowerCase();
  const en=x=>new RegExp(`(?:^|[^a-z])(?:${x})(?:$|[^a-z])`,`i`).test(s);
  if(en("ring")||/(?:^|\s)(?:반지|링)(?:$|\s)/.test(s)) return "ring";
  if(en("amulet")||/목걸이|아뮬/.test(s)) return "amulet";
  if(en("circlet|coronet|tiara|diadem")||/써클|서클|코로니트|코로넷|티아라|다이어뎀/.test(s)) return "circlet";
  if(en("gloves?|gauntlets?")||/장갑|글러브|건틀릿/.test(s)) return "gloves";
  if(en("boots?|greaves?")||/부츠|신발|그리브/.test(s)) return "boots";
  if(en("belt|sash")||/벨트|새시|코일/.test(s)) return "belt";
  if(en("claws?|talons?|katar")||/클러|탤런|카타르/.test(s)) return "claw";
  if(en("javelin")||/재벌|자벨/.test(s)) return "jav";
  if(en("crossbow")||/석궁|크로스보우/.test(s)) return "crossbow";
  if(en("bow")||/(?:^|\s)활(?:$|\s)|보우/.test(s)) return "bow";
  if(en("orb")||/오브/.test(s)) return "orb";
  if(en("wand")||/완드|원드/.test(s)) return "wand";
  return "other";
}


function discoverPlaynoteDetails(html,baseUrl){
  const src=String(html||"");
  const candidates=[];
  const rx=/href=["']([^"']*\/trade\/itemdetail\?index=(\d+)[^"']*)["']/gi;
  let m;
  while((m=rx.exec(src))){
    const u=normalizeSourceUrl(baseUrl,m[1]);
    if(!u) continue;

    const around=decodeEntities(
      src.slice(Math.max(0,m.index-2200),Math.min(src.length,m.index+4200))
    ).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

    let score=0;
    if(/유니크 아이템|세트 아이템|룬워드|룬\/보석|부적\/주얼|재료\/소모품/i.test(around)) score-=500;
    if(/장신구/i.test(around)) score+=180;
    if(/직업 전용/i.test(around)) score+=120;
    if(/방어구|무기/i.test(around)) score+=80;
    if(/반지|목걸이|아뮬|서클릿|써클릿|코로니트|티아라|다이어뎀/i.test(around)) score+=180;
    if(/장갑|글러브|부츠|벨트/i.test(around)) score+=140;
    if(/클러|탤런|카타르|자벨린|재벌린|오브|원드|스태프|활|보우|크로스보우/i.test(around)) score+=100;

    const optionSignals=(around.match(
      /시전 속도|공격 속도|힘\+|민첩\+|생명력\+|마나\+|모든 저항|화염 저항|번개 저항|냉기 저항|독 저항|적중당 생명력|적중당 마나|마법 아이템 발견|명중률/g
    )||[]).length;
    score+=Math.min(100,optionSignals*15);

    candidates.push({url:u.split("#")[0],external_id:m[2],score});
  }

  const best=new Map();
  for(const c of candidates){
    const prev=best.get(c.url);
    if(!prev || c.score>prev.score) best.set(c.url,c);
  }

  const sorted=[...best.values()]
    .filter(c=>c.score>0)
    .sort((a,b)=>b.score-a.score || Number(b.external_id)-Number(a.external_id));

  if(!sorted.length){
    return [...best.values()]
      .sort((a,b)=>Number(b.external_id)-Number(a.external_id))
      .slice(0,5).map(x=>x.url);
  }
  return sorted.slice(0,40).map(x=>x.url);
}

function parseKoreanOptionPairs(text){
  const lines=String(text||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const aff={};
  const exactMap=[
    [/^시전 속도%?\+?$/i,"fcr"],[/^공격 속도%?\+?$/i,"ias"],
    [/^힘\+?$/i,"str"],[/^민첩\+?$/i,"dex"],[/^생명력\+?$/i,"life"],[/^마나\+?$/i,"mana"],
    [/^모든 저항\+?$/i,"allres"],[/^화염 저항%?\+?$/i,"fireres"],[/^번개 저항%?\+?$/i,"lightres"],
    [/^냉기 저항%?\+?$/i,"coldres"],[/^독 저항%?\+?$/i,"poisonres"],[/^명중률\+?$/i,"ar"],
    [/^타격 회복 속도%?\+?$/i,"fhr"],[/^달리기.*걷기 속도%?\+?$/i,"frw"],
    [/^적중당 생명력 훔침%?$/i,"ll"],[/^적중당 마나 훔침%?$/i,"ml"],
    [/^마법 아이템 발견 확률%?$/i,"mf"]
  ];
  for(let i=0;i<lines.length-1;i++){
    const label=lines[i].replace(/\s+/g," ");
    const val=lines[i+1].match(/^([+-]?\d+(?:\.\d+)?)$/);
    if(!val) continue;
    for(const [rx,key] of exactMap){
      if(rx.test(label)){ aff[key]=Number(val[1]); break; }
    }
  }
  return aff;
}


function excerptAround(text,needle,max=1400){
  const s=String(text||"");
  let i=needle?s.indexOf(needle):-1;
  if(i<0)i=0;
  const start=Math.max(0,i-250);
  return s.slice(start,start+max);
}

function rejection(source,url,stage,reason,extra={}){
  return {
    source_key:source,
    source_url:url,
    parser_version:parserVersionFor(source),
    stage,
    reason,
    item_name:extra.item_name||null,
    category:extra.category||null,
    affix_count:Number(extra.affix_count||0),
    excerpt:String(extra.excerpt||"").slice(0,1800),
    meta:extra.meta||{}
  };
}

async function recordRejection(env,r){
  if(!r)return;
  await env.DB.prepare(
    `INSERT INTO parser_rejections
     (source_key,source_url,parser_version,stage,reason,item_name,category,affix_count,excerpt,meta_json)
     VALUES(?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    r.source_key,r.source_url,r.parser_version,r.stage,r.reason,
    r.item_name,r.category,r.affix_count,r.excerpt,JSON.stringify(r.meta||{})
  ).run();
}

function allowedSeedUrl(source,url){
  let u; try{u=new URL(url)}catch{return false}
  if(u.protocol!=="https:")return false;
  const h=u.hostname.toLowerCase().replace(/^www\./,"");
  const allowed={
    playnote:["playnote.co.kr"],
    chaoscube:["chaoscube.co.kr"],
    traderie:["traderie.com"],
    inven:["inven.co.kr"]
  };
  return (allowed[source]||[]).includes(h);
}

function playnoteDetailAdapter(html,url){
  const rawText=acquisitionText(html);
  const text=normalizedVisibleText(html);
  const docs=[{url,title:extractHtmlTitle(html)||"Playnote Item Detail",text:rawText.slice(0,16000),status:"raw"}];
  const observations=[];

  const listingId=(text.match(/거래번호\s*:?\s*#?\s*(\d+)/i)||url.match(/[?&]index=(\d+)/i)||[])[1]||null;
  const registered=(text.match(/등록일\s*:?\s*(\d{4}-\d{2}-\d{2})\s*\(?(\d{2}:\d{2})\)?/i)||[]);
  const mode=(text.match(/(?:^|\s)악군\s+(래더|스탠)(?=\s|$)/i)||[])[1]||null;
  const categoryMatch=text.match(/(?:^|\s)(유니크 아이템|세트 아이템|룬워드|룬\/보석|부적\/주얼|재료\/소모품|직업 전용|장신구|무기|방어구|레어 아이템|매직 아이템|크래프트 아이템)(?=\s|$)/i);
  const category=categoryMatch?categoryMatch[1]:"";

  let itemName="",qty=null,price=null;

  // Current Playnote detail layout:
  // "... 악군 래더 <category> <item name> x 1개 25,000P ..."
  const currentShape=text.match(
    /악군\s+(?:래더|스탠)\s+(?:유니크 아이템|세트 아이템|룬워드|룬\/보석|부적\/주얼|재료\/소모품|직업 전용|장신구|무기|방어구|레어 아이템|매직 아이템|크래프트 아이템)\s+(.{1,260}?)\s+x\s+(\d+)개(?:\s+개당)?\s+([\d,]+)P\b/i
  );
  if(currentShape){
    itemName=cleanItemName(currentShape[1]);
    qty=Number(currentShape[2]);
    price=Number(currentShape[3].replace(/,/g,""));
  }

  if(!itemName && categoryMatch){
    const tail=text.slice(categoryMatch.index+categoryMatch[0].length);
    const ip=tail.match(/^\s*(.{1,260}?)\s+x\s+(\d+)개(?:\s+개당)?\s+([\d,]+)P\b/i);
    if(ip){
      itemName=cleanItemName(ip[1]);
      qty=Number(ip[2]);
      price=Number(ip[3].replace(/,/g,""));
    }
  }

  if(!listingId || !itemName){
    // Some ordinary base-item posts omit the market category in visible text.
    // Recover name/qty/price only to classify and discard them cleanly.
    const loose=text.match(/악군\s+(?:래더|스탠)\s+(.{1,180}?)\s+x\s+(\d+)개(?:\s+개당)?\s+([\d,]+)P(?=\s|$)/i);
    if(loose){
      const looseName=cleanItemName(loose[1]);
      const looksBase=/모너크|세이크리드 타아지|세이크리드 론다쉬|볼텍스 쉴드|메이지 플레이트|아콘 플레이트|와이어 플리스|페이즈 블레이드|버서커 액스|그레이트 폴액스|쓰레셔|크립틱 액스/i.test(looseName);
      if(looksBase){
        docs[0].status="ignored";
        return {docs,observations,reject:rejection("playnote",url,"detail","explicit_nonrare_base",{
          item_name:looseName,category:"base_item",
          excerpt:text.slice(0,1500),
          meta:{listingId,qty:Number(loose[2]),price:Number(loose[3].replace(/,/g,""))}
        }),parse_meta:{listingId,itemName:looseName,category:"base_item",explicit_nonrare:true}};
      }
    }

    docs[0].status="unstructured";
    return {docs,observations,reject:rejection("playnote",url,"detail","missing_identity",{
      item_name:itemName,category,excerpt:text.slice(0,1800),
      meta:{listingId,qty,price,has_category:!!category}
    }),parse_meta:{listingId:!!listingId,itemName:!!itemName,category:category||null}};
  }

  if(/유니크 아이템|세트 아이템|룬워드|룬\/보석|재료\/소모품|부적\/주얼/i.test(category)){
    docs[0].status="ignored";
    return {docs,observations,reject:rejection("playnote",url,"detail","explicit_nonrare",{
      item_name:itemName,category,excerpt:text.slice(0,1600)
    }),parse_meta:{listingId,itemName,category,explicit_nonrare:true}};
  }

  let optionBlock="";
  const priceMatch=text.match(new RegExp(String(price||"").replace(/\B(?=(\d{3})+(?!\d))/g,",")+"P"));
  if(priceMatch){
    optionBlock=text.slice(priceMatch.index+priceMatch[0].length);
    const seller=optionBlock.search(/판매자 정보|거래 신청|신고/i);
    if(seller>=0) optionBlock=optionBlock.slice(0,seller);
    optionBlock=optionBlock.slice(0,4500);
  }else{
    optionBlock=sliceBetweenText(text,itemName,["판매자 정보","거래 신청","신고"],4500);
  }

  const aff=parsePlaynoteOptionBlock(optionBlock);
  const explicitRare=/레어 아이템/i.test(category);
  const candidate=playnoteRareLikelihood(category,itemName,aff);

  if(!(explicitRare||candidate.accept)){
    docs[0].status="unstructured";
    return {docs,observations,reject:rejection("playnote",url,"detail",
      Object.keys(aff).length<3?"insufficient_affixes":"unsupported_slot",{
        item_name:itemName,category,affix_count:Object.keys(aff).length,
        excerpt:optionBlock.slice(0,1800),meta:{parsed_affixes:aff}
      }),parse_meta:{listingId,itemName,category,affixes:Object.keys(aff).length}};
  }

  const slot=guessSlot(itemName,category,aff);
  if(slot==="other"){
    docs[0].status="unstructured";
    return {docs,observations,reject:rejection("playnote",url,"detail","unknown_slot",{
      item_name:itemName,category,affix_count:Object.keys(aff).length,
      excerpt:optionBlock.slice(0,1800),meta:{parsed_affixes:aff}
    }),parse_meta:{listingId,itemName,category,affixes:Object.keys(aff).length}};
  }

  observations.push({
    source_key:"playnote",source_url:url,source_listing_id:listingId,
    observation_type:"asking",
    item_type:"레어",
    slot,base_name:itemName,affixes:aff,season:null,
    ladder:mode==="래더"?true:mode==="스탠"?false:null,
    hardcore:null,region:"Asia",
    price_amount:price,price_currency:price!==null?"P":null,
    normalized_value:null,normalized_currency:null,
    listed_at:registered[1]?`${registered[1]} ${registered[2]||"00:00"}:00`:null,
    source_confidence:explicitRare?.80:.60,
    verified:!!explicitRare,
    raw_note:`Playnote compact detail parser ${parserVersionFor("playnote")}`
  });
  docs[0].status="structured";
  return {docs,observations,reject:null,parse_meta:{listingId,itemName,category,affixes:Object.keys(aff).length,price}};
}

function chaosAffixes(text){
  const aff={...parseKoreanOptionPairs(text),...playnoteCompactAffixes(text)};
  const patterns=[
    [/시전 속도\s*\+?(\d+)%/i,"fcr"],[/공격 속도\s*\+?(\d+)%/i,"ias"],
    [/모든 능력치\s*\+?(\d+)/i,"allstats"],[/힘\s*\+?(\d+)/i,"str"],[/민첩\s*\+?(\d+)/i,"dex"],
    [/생명력\s*\+?(\d+)/i,"life"],[/마나\s*\+?(\d+)/i,"mana"],
    [/모든 저항\s*\+?(\d+)/i,"allres"],[/화염 저항\s*\+?(\d+)%/i,"fireres"],
    [/번개 저항\s*\+?(\d+)%/i,"lightres"],[/냉기 저항\s*\+?(\d+)%/i,"coldres"],
    [/독 저항\s*\+?(\d+)%/i,"poisonres"],[/적중당 마나\s*(\d+)%\s*훔침/i,"ml"],
    [/적중당 생명력\s*(\d+)%\s*훔침/i,"ll"],
    [/([0-9]+)%\s*마법 아이템 발견 확률/i,"mf"],
    [/마법 아이템 발견 확률\s*(\d+)%/i,"mf"],
    [/([0-9]+)%\s*타격 회복 속도/i,"fhr"]
  ];
  for(const [rx,key] of patterns){ const m=String(text||"").match(rx); if(m) aff[key]=Number(m[1]); }
  return aff;
}

function chaoscubeDetailAdapterV703(html,url){
  const rawText=acquisitionText(html);
  const text=normalizedVisibleText(html);
  const docs=[{url,title:extractHtmlTitle(html)||"ChaosCube Detail",text:rawText.slice(0,16000),status:"raw"}];
  const observations=[];

  const id=(text.match(/물품 상세정보\s*·?\s*(\d+)/i)||url.match(/\/exchange\/detail\/(\d+)/)||[])[1]||null;
  const gameType=(text.match(/Game Type\s*(래더|스탠다드)/i)||[])[1]||null;
  const mode=(text.match(/Mode\s*(소프트코어|하드코어)/i)||[])[1]||null;

  const rarityMatch=text.match(
    /아이템 희귀도\s*일반\s+매직\s+레어\s+세트\s+유니크\s+룬워드\s+크레프트\s+기타\s+(일반|매직|레어|세트|유니크|룬워드|크레프트|크래프트|기타)\b/i
  );
  let rarity=rarityMatch?rarityMatch[1].replace("크래프트","크레프트"):null;
  if(!rarity){
    const detected=detectChaosSelectedRarity(text);
    rarity=detected.rarity;
  }

  if(!rarity){
    docs[0].status="unstructured";
    return {docs,observations,reject:rejection("chaoscube",url,"detail","rarity_not_found",{
      excerpt:sliceBetweenText(text,"아이템 희귀도",["판매가 수정 이력"],2200),
      meta:{id,gameType,mode}
    }),parse_meta:{id,rarity:null}};
  }

  if(!/레어|크레프트/i.test(rarity)){
    docs[0].status="ignored";
    return {docs,observations,reject:rejection("chaoscube",url,"detail","explicit_nonrare",{
      category:rarity,excerpt:sliceBetweenText(text,"아이템 희귀도",["판매가 수정 이력"],1800)
    }),parse_meta:{id,rarity,explicit_nonrare:true}};
  }

  const nameMatch=text.match(/Mode\s*(?:소프트코어|하드코어)\s+(.{1,220}?)\s+(?:♥\s*)?찜하기/i);
  let itemName=cleanItemName(nameMatch?nameMatch[1]:"");
  const partBlock=sliceBetweenText(text,"아이템 부위",["아이템 희귀도"],600);
  const part=cleanItemName(partBlock);

  const optionStart=rarityMatch?rarityMatch.index+rarityMatch[0].length:text.indexOf("아이템 희귀도")+"아이템 희귀도".length;
  const historyStart=text.indexOf("판매가 수정 이력",optionStart);
  const optionBlock=text.slice(optionStart,historyStart>optionStart?historyStart:Math.min(text.length,optionStart+4500));
  const aff=chaosAffixes(optionBlock);

  if(Object.keys(aff).length<2){
    docs[0].status="unstructured";
    return {docs,observations,reject:rejection("chaoscube",url,"detail","insufficient_affixes",{
      item_name:itemName,category:rarity,affix_count:Object.keys(aff).length,
      excerpt:optionBlock.slice(0,1800),meta:{part,parsed_affixes:aff}
    }),parse_meta:{id,rarity,itemName,part,affixes:Object.keys(aff).length}};
  }

  let slot=guessSlot(itemName,part,aff);
  if(slot==="other") slot=guessSlot(part,part,aff);
  if(slot==="other"){
    docs[0].status="unstructured";
    return {docs,observations,reject:rejection("chaoscube",url,"detail","unknown_slot",{
      item_name:itemName,category:rarity,affix_count:Object.keys(aff).length,
      excerpt:optionBlock.slice(0,1800),meta:{part,parsed_affixes:aff}
    }),parse_meta:{id,rarity,itemName,part,affixes:Object.keys(aff).length}};
  }

  const history=historyStart>=0?text.slice(historyStart,Math.min(text.length,historyStart+3500)):"";
  const prices=[...history.matchAll(/(?:최초 등록|판매가 수정)\s*·?\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+([\d,]+)/gi)]
    .map(x=>Number(x[1].replace(/,/g,""))).filter(Number.isFinite);
  const latestPrice=prices.length?prices[prices.length-1]:null;
  const ended=/판매종료\s+\d{4}-\d{2}-\d{2}[\s\S]{0,80}?종료/i.test(text);

  observations.push({
    source_key:"chaoscube",source_url:url,source_listing_id:id,
    observation_type:ended?"completed":"asking",
    item_type:rarity==="크레프트"?"크래프트":"레어",
    slot,base_name:itemName||part,affixes:aff,season:null,
    ladder:gameType==="래더",hardcore:mode==="하드코어",region:"Asia",
    price_amount:latestPrice,price_currency:latestPrice!==null?"CP":null,
    normalized_value:null,normalized_currency:null,
    source_confidence:ended?.84:.70,verified:ended,
    raw_note:`ChaosCube compact detail parser ${parserVersionFor("chaoscube")}`
  });
  docs[0].status="structured";
  return {docs,observations,reject:null,parse_meta:{id,rarity,itemName,part,affixes:Object.keys(aff).length,latestPrice,ended}};
}

function discoverTraderieProfiles(html,baseUrl){
  const urls=new Set();
  const rx=/href=["']([^"']*\/diablo2resurrected\/profile\/\d+\/listings[^"']*)["']/gi;
  let m;
  while((m=rx.exec(String(html||"")))){
    const u=normalizeSourceUrl(baseUrl,m[1]); if(u) urls.add(u.split("?")[0]);
    if(urls.size>=25) break;
  }
  return [...urls];
}

function traderieProfileAdapter(html,url){
  const text=acquisitionText(html);
  const docs=[{url,title:extractHtmlTitle(html)||"Traderie Profile Listings",text:text.slice(0,26000),status:"raw"}];
  const observations=[];
  const blocks=traderieListingBlocks(text);
  let rareBlocks=0,affixQualified=0,slotQualified=0;

  for(const b of blocks){
    const before=b.before,after=b.after;
    const rarityMatch=before.match(/(?:^|[•\s])(rare|crafted)(?=[+\s•]|$)/i);
    if(!rarityMatch)continue;
    rareBlocks++;

    const rarity=rarityMatch[1].toLowerCase()==="crafted"?"크래프트":"레어";
    const head=before.slice(0,rarityMatch.index);
    const mods=before.slice(rarityMatch.index+rarityMatch[0].length)+" "+after;
    const aff=traderieEnglishAffixes(mods);
    if(Object.keys(aff).length<2)continue;
    affixQualified++;

    let itemName=head.replace(/^1\s*x\s+/i," ")
      .replace(/\breign of the warlock\b/ig," ")
      .replace(/\bclassic \(base game\)\b/ig," ")
      .replace(/\b(?:PC|Xbox|PlayStation|softcore|hardcore|Ladder|Non Ladder|normal|exceptional|elite|Penta)\b/ig," ")
      .replace(/[•]/g," ").replace(/\s+/g," ").trim();
    itemName=cleanItemName(itemName.split(/\+\d/)[0]);

    const slot=guessSlot(itemName,"",aff);
    if(slot==="other")continue;
    slotQualified++;

    const hrvRaw=(after.match(/High Rune Value:\s*([0-9.]+(?:\s+or\s+[0-9.]+)*)/i)||[])[1]||"";
    const hrvVals=hrvRaw.split(/\s+or\s+/i).map(Number).filter(n=>Number.isFinite(n)&&n>0);
    const hrv=hrvVals.length?percentile(hrvVals.sort((a,b)=>a-b),.5):null;
    const askTerms=(after.match(/([\s\S]*?)(?:High Rune Value:|$)/i)||[])[1]||"";

    observations.push({
      source_key:"traderie",source_url:url,source_listing_id:null,
      observation_type:"asking",item_type:rarity,slot,base_name:itemName,affixes:aff,
      season:null,ladder:/\bLadder\b/i.test(before)&&!/\bNon Ladder\b/i.test(before),
      hardcore:/\bhardcore\b/i.test(before),region:null,
      price_amount:hrv,price_currency:hrv!==null?"HRV":null,
      normalized_value:hrv,normalized_currency:hrv!==null?"HRV":null,
      source_confidence:hrv!==null?.70:.58,verified:false,
      raw_note:`Traderie profile parser ${parserVersionFor("traderie")} · requested ${askTerms.replace(/\s+/g," ").slice(0,240)}`
    });
  }

  docs[0].status=observations.length?"structured":"unstructured";
  let reject=null;
  if(!observations.length){
    const reason=blocks.length===0?"no_listing_blocks":rareBlocks===0?"no_rare_blocks":affixQualified===0?"insufficient_affixes":"unknown_slot";
    reject=rejection("traderie",url,"profile",reason,{
      excerpt:text.slice(0,1800),meta:{listingBlocks:blocks.length,rareBlocks,affixQualified,slotQualified}
    });
  }
  return {docs,observations,reject,parse_meta:{listingBlocks:blocks.length,rareBlocks,affixQualified,slotQualified,observations:observations.length}};
}

function parserSelfTest(){
  const tests=[];

  // Regression: Playnote can return Korean text as hexadecimal numeric entities.
  const entitySample="&#xC9C0;&#xAE08; PLUS &#44032;&#44201;";
  tests.push({
    name:"html_entity_hex_decode",
    pass:decodeEntities(entitySample).includes("지금") && decodeEntities(entitySample).includes("가격")
  });

  const pn=`판매 아이템
거래번호 :#225377
등록일 :2026-09-10 (22:43)
악군 래더
장신구
레어 반지 x 1개
20,000P
시전 속도%
10
힘+
18
생명력+
30
모든 저항+
10
판매자 정보`;
  const p=playnoteDetailAdapter(pn,"https://www.playnote.co.kr/trade/itemdetail?index=225377");
  tests.push({
    name:"playnote_detail_current_shape",
    pass:p.observations.length===1 &&
      p.observations[0].slot==="ring" &&
      p.observations[0].affixes.fcr===10 &&
      p.observations[0].affixes.str===18
  });

  const cc=`물품 상세정보 · 1156072
Game 악마술사의 군림(DLC)
Platform PC
Game Type 스탠다드
Mode 소프트코어
돌의 심장 Stone Heart
찜하기
아이템 부위 목걸이 돌의 심장
아이템 희귀도 일반 매직 레어 세트 유니크 룬워드 크레프트 기타 레어
강령술사 기술 레벨 +2
시전 속도 +10%
적중당 마나 7% 훔침
화염 저항 +18%
냉기 저항 +18%
번개 저항 +18%
독 저항 +36%
마법 아이템 발견 확률 11% 증가
판매가 수정 이력
최초 등록 · 2026-06-18 00:59:19 80,000
판매가 수정 · 2026-06-20 06:20:21 20,000`;
  const c=chaoscubeDetailAdapterV703(cc,"https://www.chaoscube.co.kr/exchange/detail/1156072");
  tests.push({
    name:"chaoscube_detail_current_shape",
    pass:c.observations.length===1 &&
      c.observations[0].item_type==="레어" &&
      c.observations[0].affixes.fcr===10 &&
      c.observations[0].affixes.ml===7 &&
      c.observations[0].price_amount===20000
  });

  const traderiePlaceholder=`Traderie.com | Trade Diablo II: Resurrected Items
To begin the development, run npm start or pnpm start.
To create a production bundle, use npm run build.`;
  const tc=classifyAcquiredContent(
    "traderie",
    "https://traderie.com/diablo2resurrected/profile/2637170372/listings",
    traderiePlaceholder
  );
  tests.push({
    name:"traderie_placeholder_detection",
    pass:tc.ok===false && tc.reason==="traderie_dev_placeholder"
  });

  const chaosShell=`<html><head><title>카오스큐브</title></head><body><div id="app"></div></body></html>`;
  const ccShell=classifyAcquiredContent(
    "chaoscube",
    "https://www.chaoscube.co.kr/exchange/detail/1156072",
    chaosShell
  );
  tests.push({
    name:"chaoscube_shell_detection",
    pass:ccShell.ok===false
  });


  const playnoteLive=`판매 아이템 거래번호 : #195543 등록일 : 2026-09-06 (16:11)
악군 래더 유니크 아이템 독사마술사의 가죽 서펀트스킨 아머 x 1개 25,000P
독사마술사의 가죽 서펀트스킨 아머 옵션 모든 저항+ 35 마법 피해 감소+ 10 방어력+ 1034 홈 있음(소켓) 1 판매자 정보`;
  const pacq=classifyAcquiredContent(
    "playnote",
    "https://www.playnote.co.kr/trade/itemdetail?index=195543",
    playnoteLive
  );
  tests.push({
    name:"playnote_korean_boundary_acquisition",
    pass:pacq.ok===true
  });

  const pnNonRare=playnoteDetailAdapter(
    playnoteLive,
    "https://www.playnote.co.kr/trade/itemdetail?index=195543"
  );
  tests.push({
    name:"playnote_korean_category_parse",
    pass:pnNonRare.observations.length===0 &&
      pnNonRare.reject?.reason==="explicit_nonrare" &&
      pnNonRare.reject?.category==="유니크 아이템"
  });

  const pnRare=`판매 아이템 거래번호 : #225377 등록일 : 2026-09-10 (22:43)
악군 래더 장신구 레어 반지 x 1개 20,000P
레어 반지 옵션 시전 속도% +10 힘+ +18 생명력+ +30 모든 저항+ +10 판매자 정보`;
  const pnRareAcq=classifyAcquiredContent(
    "playnote",
    "https://www.playnote.co.kr/trade/itemdetail?index=225377",
    pnRare
  );
  const pnRareParsed=playnoteDetailAdapter(
    pnRare,
    "https://www.playnote.co.kr/trade/itemdetail?index=225377"
  );
  tests.push({
    name:"playnote_rare_detail_end_to_end",
    pass:pnRareAcq.ok===true &&
      pnRareParsed.observations.length===1 &&
      pnRareParsed.observations[0].slot==="ring" &&
      pnRareParsed.observations[0].affixes.fcr===10 &&
      pnRareParsed.observations[0].affixes.str===18
  });


  const pnMarket=`플레이디아 디아블로2 레저렉션 아이템마켓
장신구 거래 서버 · 악군 스탠 반지 x 1개 500P #듀얼링 #47011
반지 옵션
적중당 마나 훔침%
+2
적중당 생명력 훔침%
+3
힘+
+2
생명력+
+17
번개 저항%
+30
#47011 2026-09-10 00:42
유니크 아이템 거래 서버 · 악군 래더 할리퀸 관모 샤코 x 1개 2,400P
할리퀸 관모 샤코 옵션 총 방어력 122`;
  const pm=playnoteAdapter(pnMarket,"https://www.playnote.co.kr/trade/itemmarket?index=1");
  tests.push({
    name:"playnote_market_rare_candidate",
    pass:pm.observations.length===1 &&
      pm.observations[0].slot==="ring" &&
      pm.observations[0].price_amount===500 &&
      pm.observations[0].affixes.ml===2 &&
      pm.observations[0].affixes.ll===3 &&
      pm.observations[0].affixes.life===17
  });


  const traderieApiFixture={
    id:987654321,
    item:{name:"Rare Ring",rarity:"rare"},
    updated_at:"2026-09-11T00:00:00Z",
    completed:false,
    active:true,
    prices:[{group:0,quantity:1,name:"Ist Rune"}],
    properties:[
      {property:"10% Faster Cast Rate",type:"number",number:10},
      {property:"+18 to Strength",type:"number",number:18},
      {property:"+31 to Life",type:"number",number:31},
      {property:"All Resistances +10",type:"number",number:10}
    ]
  };
  const tao=traderieApiObservation(traderieApiFixture,"1177157675");
  tests.push({
    name:"traderie_api_json_adapter",
    pass:!!tao &&
      tao.item_type==="레어" &&
      tao.price_amount===1 &&
      tao.price_currency==="Ist Rune" &&
      Object.keys(tao.affixes||{}).length>=3
  });

  return {ok:tests.every(x=>x.pass),tests};
}

function adapterFor(source){
  return ({
    playnote:(html,url)=>{
      const base=playnoteAdapter(html,url);
      return {...base,discovered_urls:discoverPlaynoteDetails(html,url),discovered_type:"detail"};
    },
    traderie:(html,url)=>{
      if(/\/profile\/\d+\/listings/i.test(url)) return traderieProfileAdapter(html,url);
      const base=traderieAdapter(html,url);
      return {...base,discovered_urls:discoverTraderieProfiles(html,url),discovered_type:"profile"};
    },
    inven:invenAdapter,
    chaoscube:(html,url)=>{
      if(/\/exchange\/detail\/\d+/i.test(url)) return chaoscubeDetailAdapterV703(html,url);
      return chaoscubeAdapter(html,url);
    }
  })[source] || null;
}


async function queueDiscoveredUrls(env,source,parentSeedId,urls,urlType){
  let added=0;
  for(const url of urls||[]){
    let externalId=null;
    if(source==="playnote") externalId=(url.match(/[?&]index=(\d+)/)||[])[1]||null;
    if(source==="chaoscube") externalId=(url.match(/\/exchange\/detail\/(\d+)/)||[])[1]||null;
    if(source==="traderie") externalId=(url.match(/\/profile\/(\d+)\/listings/)||[])[1]||null;
    try{
      await env.DB.prepare(
        `INSERT INTO crawl_detail_queue(source_key,parent_seed_id,url,external_id,state)
         VALUES(?,?,?,?,'pending')`
      ).bind(source,parentSeedId,url,externalId).run();
      added++;
    }catch(e){ if(!String(e?.message||e).includes("UNIQUE")) throw e; }
  }
  return added;
}

async function processDetailQueue(env,seed,limit=8){
  const pv=parserVersionFor(seed.source_key);
  const {results=[]}=await env.DB.prepare(
    `SELECT * FROM crawl_detail_queue
     WHERE source_key=? AND state IN ('pending','error')
       AND (last_attempt_at IS NULL OR last_attempt_at<?)
     ORDER BY CASE state WHEN 'pending' THEN 0 ELSE 1 END,id DESC
     LIMIT ?`
  ).bind(seed.source_key,Date.now()-15*60*1000,limit).all();

  let docs=0,observations=0,duplicates=0,errors=0;
  for(const q of results){
    try{
      const faux={...seed,url:q.url,last_etag:null,last_modified:null,last_hash:null};
      const fetched=await publicFetch(env,faux);
      let parsed;
      if(seed.source_key==="playnote") parsed=playnoteDetailAdapter(fetched.html,q.url);
      else if(seed.source_key==="chaoscube") parsed=chaoscubeDetailAdapterV703(fetched.html,q.url);
      else if(seed.source_key==="traderie") parsed=traderieProfileAdapter(fetched.html,q.url);
      else parsed={docs:[],observations:[]};

      for(const d of parsed.docs||[]){
        const rr=await insertCrawlDocument(env,seed.source_key,{...d,parser_version:pv});
        docs+=rr.added;duplicates+=rr.duplicate;
      }
      for(const o of parsed.observations||[]){
        const rr=await insertAutoObservation(env,o); observations+=rr.added;duplicates+=rr.skipped;
      }
      if(parsed.reject) await recordRejection(env,parsed.reject);
    for(const rr of (parsed.rejects||[]).slice(0,25)) await recordRejection(env,rr);
      await env.DB.prepare(
        `UPDATE crawl_detail_queue SET state='done',attempt_count=attempt_count+1,last_attempt_at=?,
         last_status=?,last_error=?,updated_at=datetime('now') WHERE id=?`
      ).bind(Date.now(),fetched.status,parsed.reject?parsed.reject.reason:null,q.id).run();
    }catch(e){
      errors++;
      await env.DB.prepare(
        `UPDATE crawl_detail_queue SET state='error',attempt_count=attempt_count+1,last_attempt_at=?,
         last_status=?,last_error=?,updated_at=datetime('now') WHERE id=?`
      ).bind(Date.now(),Number(e?.httpStatus)||null,String(e?.message||e).slice(0,500),q.id).run();
    }
  }
  return {checked:results.length,docs,observations,duplicates,errors};
}




async function ensurePlaynoteBootstrapRareQueue(env){
  const parent=await env.DB.prepare(
    `SELECT id FROM crawl_seeds
     WHERE source_key='playnote' AND enabled=1
     ORDER BY CASE WHEN url LIKE '%itemmarket%' THEN 0 ELSE 1 END,id ASC LIMIT 1`
  ).first();

  if(!parent?.id) return {queued:0};

  let queued=0;
  for(const url of PLAYNOTE_BOOTSTRAP_RARE_URLS){
    const existing=await env.DB.prepare(
      `SELECT id,state FROM crawl_detail_queue
       WHERE source_key='playnote' AND url=? LIMIT 1`
    ).bind(url).first();

    if(existing){
      if(["error","ignored"].includes(existing.state)){
        await env.DB.prepare(
          `UPDATE crawl_detail_queue
           SET state='pending',attempt_count=0,last_attempt_at=NULL,last_status=NULL,last_error=NULL,
               updated_at=datetime('now')
           WHERE id=?`
        ).bind(existing.id).run();
      }
      continue;
    }

    await env.DB.prepare(
      `INSERT INTO crawl_detail_queue
       (parent_seed_id,source_key,url,state,attempt_count,discovered_at,updated_at)
       VALUES(?, 'playnote', ?, 'pending', 0, datetime('now'), datetime('now'))`
    ).bind(parent.id,url).run();
    queued++;
  }
  return {queued};
}

async function processOneDetailJob(env,sourceFilter=null){
  const cutoff=Date.now()-15*60*1000;
  let sql=`SELECT q.*,s.note seed_note
           FROM crawl_detail_queue q
           LEFT JOIN crawl_seeds s ON s.id=q.parent_seed_id
           WHERE q.state IN ('pending','error')
             AND (q.last_attempt_at IS NULL OR q.last_attempt_at<?)`;
  const args=[cutoff];
  if(sourceFilter){ sql+=` AND q.source_key=?`; args.push(sourceFilter); }
  sql+=` ORDER BY
    CASE q.source_key WHEN 'playnote' THEN 0 WHEN 'traderie' THEN 1 WHEN 'chaoscube' THEN 2 ELSE 3 END,
    CASE q.state WHEN 'pending' THEN 0 ELSE 1 END,
    q.id ASC LIMIT 1`;
  const q=await env.DB.prepare(sql).bind(...args).first();
  if(!q) return {ok:true,status:"queue_empty"};

  const pseudoSeed={
    id:Number(q.parent_seed_id||0),source_key:q.source_key,url:q.url,
    note:q.seed_note||"detail queue",enabled:1,last_etag:null,last_modified:null,last_hash:null,
    consecutive_failures:0,min_interval_minutes:0,paused_until:0
  };

  try{
    const fetched=await publicFetch(env,pseudoSeed);
    const acquisition=classifyAcquiredContent(q.source_key,fetched.finalUrl||q.url,fetched.html);

    if(!acquisition.ok){
      const reason=acquisition.reason||acquisition.status||"content_unavailable";
      await recordRejection(env,rejection(q.source_key,q.url,"acquisition",reason,{
        excerpt:normalizedVisibleText(fetched.html).slice(0,1800),
        meta:{
          status:acquisition.status,
          text_length:acquisition.text_length,
          http_status:fetched.status,
          final_url:fetched.finalUrl||q.url,
          attempt_count:Number(q.attempt_count||0)+1,
          marker_state:acquisition.marker_state||null
        }
      }));

      const attempts=Number(q.attempt_count||0)+1;
      // Do not hammer dynamic shells: after 3 acquisition failures quarantine this URL.
      // Before that, schedule the next retry roughly 6h later.
      const nextState=attempts>=3?"ignored":"error";
      const nextAttempt=attempts>=3?Date.now():Date.now()+6*60*60*1000;

      await env.DB.prepare(
        `UPDATE crawl_detail_queue SET state=?,attempt_count=attempt_count+1,last_attempt_at=?,
         last_status=?,last_error=?,updated_at=datetime('now') WHERE id=?`
      ).bind(nextState,nextAttempt,fetched.status,reason,q.id).run();

      await updateParserHealth(env,q.source_key,acquisition.status||"content_unavailable",0,reason);

      return {
        ok:true,job_ok:false,status:acquisition.status||"content_unavailable",
        source_key:q.source_key,url:q.url,error:reason,acquisition,
        quarantined:nextState==="ignored"
      };
    }

    let parsed;
    if(q.source_key==="playnote") parsed=playnoteDetailAdapter(fetched.html,q.url);
    else if(q.source_key==="chaoscube") parsed=chaoscubeDetailAdapterV703(fetched.html,q.url);
    else if(q.source_key==="traderie") parsed=traderieProfileAdapter(fetched.html,q.url);
    else parsed={docs:[],observations:[],reject:rejection(q.source_key,q.url,"detail","unsupported_source")};

    let docs=0,observations=0,duplicates=0,reviewCandidates=0;
    for(const d of parsed.docs||[]){
      const rr=await insertCrawlDocument(env,q.source_key,{...d,parser_version:parserVersionFor(q.source_key)});
      docs+=rr.added;duplicates+=rr.duplicate;
    }
    for(const o of parsed.observations||[]){
      const rr=await insertAutoObservation(env,o);
      observations+=rr.added;duplicates+=rr.skipped;
      reviewCandidates+=Number(rr.review_candidates||0);
    }
    if(parsed.reject) await recordRejection(env,parsed.reject);
    for(const rr of (parsed.rejects||[]).slice(0,10)) await recordRejection(env,rr);

    const queueState=parsed.reject?.reason==="dynamic_content_unavailable"?"error":"done";
    await env.DB.prepare(
      `UPDATE crawl_detail_queue SET state=?,attempt_count=attempt_count+1,last_attempt_at=?,
       last_status=?,last_error=?,updated_at=datetime('now') WHERE id=?`
    ).bind(queueState,Date.now(),fetched.status,parsed.reject?parsed.reject.reason:null,q.id).run();

    await updateParserHealth(env,q.source_key,
      observations>0?"observations_parsed":parsed.reject?.reason||"documents_only",
      observations,parsed.reject?.reason||null);

    return {ok:true,job_ok:true,status:observations>0?"observations_parsed":parsed.reject?.reason||"documents_only",
      source_key:q.source_key,url:q.url,documents:docs,observations,duplicates,review_candidates:reviewCandidates,parse_meta:parsed.parse_meta||null};
  }catch(e){
    const status=Number(e?.httpStatus)||null;
    await env.DB.prepare(
      `UPDATE crawl_detail_queue SET state='error',attempt_count=attempt_count+1,last_attempt_at=?,
       last_status=?,last_error=?,updated_at=datetime('now') WHERE id=?`
    ).bind(Date.now(),status,String(e?.message||e).slice(0,500),q.id).run();
    return {ok:true,job_ok:false,status:"error",source_key:q.source_key,url:q.url,error:String(e?.message||e),http_status:status};
  }
}

async function runScheduledUnit(env){
  const pending=await env.DB.prepare(
    `SELECT COUNT(*) n FROM crawl_detail_queue
     WHERE state IN ('pending','error') AND (last_attempt_at IS NULL OR last_attempt_at<?)`
  ).bind(Date.now()-15*60*1000).first();

  if(Number(pending?.n||0)>0) return processOneDetailJob(env);

  const seed=await env.DB.prepare(
    `SELECT * FROM crawl_seeds
     WHERE enabled=1
       AND (paused_until IS NULL OR paused_until<=?)
       AND (last_attempt_at IS NULL OR last_attempt_at + min_interval_minutes*60000 <= ?)
     ORDER BY COALESCE(last_attempt_at,0) ASC,id ASC LIMIT 1`
  ).bind(Date.now(),Date.now()).first();

  if(!seed) return {ok:true,status:"nothing_due"};
  return runOneSeed(env,seed,"scheduled",false);
}

async function updateSeedHealth(env,seed,result,obsCount=0,error=null){
  const empty=Number(obsCount||0)===0?1:0;
  let mode="entry";
  if(/\/exchange\/detail\/\d+/i.test(seed.url)) mode="detail";
  else if(/\/profile\/\d+\/listings/i.test(seed.url)) mode="profile";
  else if(/itemmarket/i.test(seed.url)) mode="market";

  await env.DB.prepare(
    `INSERT INTO seed_health(seed_id,source_key,mode,last_ok_at,last_result,
      consecutive_empty_runs,parser_version,note,updated_at)
     VALUES(?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(seed_id) DO UPDATE SET
       source_key=excluded.source_key,
       mode=excluded.mode,
       last_ok_at=CASE WHEN ? IS NULL THEN datetime('now') ELSE seed_health.last_ok_at END,
       last_result=excluded.last_result,
       consecutive_empty_runs=CASE WHEN ?=1 THEN seed_health.consecutive_empty_runs+1 ELSE 0 END,
       parser_version=excluded.parser_version,
       note=excluded.note,
       updated_at=datetime('now')`
  ).bind(
    seed.id,seed.source_key,mode,error?null:new Date().toISOString(),
    result,empty,parserVersionFor(seed.source_key),seed.note||null,
    error,empty
  ).run();
}

async function updateParserHealth(env,source,parseStatus,obsCount,error=null){
  const pv=parserVersionFor(source);
  const zero=Number(obsCount||0)===0?1:0;
  await env.DB.prepare(
    `INSERT INTO parser_health(source_key,parser_version,last_parse_status,
      consecutive_zero_observation_runs,last_error,updated_at)
     VALUES(?,?,?,?,?,datetime('now'))
     ON CONFLICT(source_key) DO UPDATE SET
       parser_version=excluded.parser_version,
       last_parse_status=excluded.last_parse_status,
       consecutive_zero_observation_runs=CASE
         WHEN ?=1 THEN parser_health.consecutive_zero_observation_runs+1 ELSE 0 END,
       last_error=excluded.last_error,updated_at=datetime('now')`
  ).bind(source,pv,parseStatus,zero,error,zero).run();
}

async function insertCrawlDocument(env,source,doc){
  const hash=await sha256Text(`${doc.url}\n${doc.title||""}\n${doc.text||""}`);
  try{
    await env.DB.prepare(
      `INSERT INTO crawl_documents(source_key,source_url,content_hash,title,text_excerpt,parser_status,parser_version)
       VALUES(?,?,?,?,?,?,?)`
    ).bind(source,doc.url,hash,doc.title||null,String(doc.text||"").slice(0,16000),doc.status||"raw",
      doc.parser_version||parserVersionFor(source)).run();
    return {added:1,duplicate:0};
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE")) return {added:0,duplicate:1};
    throw e;
  }
}



const MARKET_KO_AFFIX_LABELS={
  fcr:"시전 속도",
  frw:"달리기/걷기 속도",
  fhr:"타격 회복 속도",
  ias:"공격 속도",
  str:"힘",
  dex:"민첩",
  vit:"활력",
  energy:"마력",
  life:"생명력",
  mana:"마나",
  allres:"모든 저항",
  fireres:"화염 저항",
  lightres:"번개 저항",
  coldres:"냉기 저항",
  poisonres:"독 저항",
  ar:"명중률",
  ll:"적중당 생명력 훔침",
  ml:"적중당 마나 훔침",
  mf:"마법 아이템 발견 확률",
  gf:"괴물에게서 얻는 금화 증가",
  ed:"증가된 피해",
  edef:"방어력 증가",
  defense:"방어력",
  min_damage:"최소 피해",
  max_damage:"최대 피해",
  replenish_life:"생명력 회복",
  dr_flat:"피해 감소",
  dr_pct:"물리 피해 감소",
  mdr:"마법 피해 감소",
  cb:"강타 확률",
  ds:"치명적 공격",
  ow:"상처 악화",
  sockets:"소켓",
  amazon_skills:"모든 아마존 기술 레벨",
  sorc_skills:"모든 원소술사 기술 레벨",
  necro_skills:"모든 강령술사 기술 레벨",
  paladin_skills:"모든 성기사 기술 레벨",
  barbarian_skills:"모든 야만용사 기술 레벨",
  druid_skills:"모든 드루이드 기술 레벨",
  assassin_skills:"모든 암살자 기술 레벨",
  warlock_skills:"모든 악마술사 기술 레벨"
};

const MARKET_KO_SLOT_LABELS={
  ring:"반지",
  amulet:"목걸이",
  circlet:"써클릿류",
  gloves:"장갑",
  boots:"부츠",
  belt:"벨트",
  claw:"클러",
  jav:"자벨린",
  bow:"활",
  crossbow:"석궁",
  orb:"오브",
  wand:"완드",
  equipment:"장비",
  other:"기타"
};

const MARKET_KO_BASE_LABELS={
  "Tiara":"티아라",
  "Diadem":"다이어뎀",
  "Circlet":"써클릿",
  "Coronet":"코로니트",
  "Ring":"반지",
  "Amulet":"목걸이",
  "Gloves":"장갑",
  "Boots":"부츠",
  "Belt":"벨트"
};

const MARKET_KO_CURRENCY_LABELS={
  "El Rune":"엘 룬","Eld Rune":"엘드 룬","Tir Rune":"티르 룬","Nef Rune":"네프 룬",
  "Eth Rune":"에드 룬","Ith Rune":"아이드 룬","Tal Rune":"탈 룬","Ral Rune":"랄 룬",
  "Ort Rune":"오르트 룬","Thul Rune":"주울 룬","Amn Rune":"앰 룬","Sol Rune":"솔 룬",
  "Shael Rune":"샤엘 룬","Dol Rune":"돌 룬","Hel Rune":"헬 룬","Io Rune":"포 룬",
  "Lum Rune":"룸 룬","Ko Rune":"코 룬","Fal Rune":"팔 룬","Lem Rune":"렘 룬",
  "Pul Rune":"풀 룬","Um Rune":"우움 룬","Mal Rune":"말 룬","Ist Rune":"이스트 룬",
  "Gul Rune":"굴 룬","Vex Rune":"벡스 룬","Ohm Rune":"오움 룬","Lo Rune":"로 룬",
  "Sur Rune":"수르 룬","Ber Rune":"베르 룬","Jah Rune":"자 룬","Cham Rune":"참 룬",
  "Zod Rune":"조드 룬",
  "Forum Gold":"포럼 골드",
  "fg":"fg"
};

function marketKoSlot(slot){
  return MARKET_KO_SLOT_LABELS[String(slot||"")] || String(slot||"기타");
}

function marketKoBase(base){
  return MARKET_KO_BASE_LABELS[String(base||"")] || String(base||"");
}

function marketKoCurrency(currency){
  const s=String(currency||"").trim();
  return MARKET_KO_CURRENCY_LABELS[s] || s;
}

function marketKoAffixValue(key,value){
  const n=Number(value);
  if(!Number.isFinite(n)) return String(value);

  if(["fcr","frw","fhr","ias","fireres","lightres","coldres","poisonres","ll","ml","mf"].includes(key))
    return `${n}%`;

  if(["str","dex","life","mana","allres","ar",
      "amazon_skills","sorc_skills","necro_skills","paladin_skills",
      "barbarian_skills","druid_skills","assassin_skills","warlock_skills"].includes(key))
    return `+${n}`;

  return String(n);
}

function marketKoAffixRows(aff){
  return Object.entries(aff||{}).map(([key,value])=>({
    key,
    label:MARKET_KO_AFFIX_LABELS[key]||key,
    value:Number(value),
    display:`${MARKET_KO_AFFIX_LABELS[key]||key} ${marketKoAffixValue(key,value)}`
  }));
}

function marketKoPrice(amount,currency){
  const n=Number(amount);
  const qty=Number.isFinite(n)?n.toLocaleString("ko-KR"):String(amount??"");
  const cur=marketKoCurrency(currency);
  if(!cur) return qty;

  // Rune prices are naturally read as "이스트 룬 1개".
  if(/룬$/.test(cur)) return `${cur} ${qty}개`;
  return `${qty} ${cur}`;
}

function marketKoSummary(obs,aff){
  const rows=obs.option_rows?obs.option_rows.filter(x=>x.status!=="metadata"&&x.status!=="not_present").map(x=>({key:x.key,label:x.label||x.name,value:x.value,display:x.display||("[해석 필요] "+x.text)})):marketKoAffixRows(aff);
  const base=marketKoBase(obs.base_name);
  const slot=marketKoSlot(obs.slot);
  const item=base && base!==slot ? `${base} (${slot})` : (base||slot);
  return {
    source:obs.source_key,
    item,
    slot,
    base_name:base,
    item_type:obs.item_type,
    price:obs.price_structure?marketStructuredPrice(obs.price_structure):marketKoPrice(obs.price_amount,obs.price_currency),
    affixes:rows,
    affix_text:rows.map(x=>x.display).join(" / ")
  };
}

async function maybeCreateMarketReviewCandidate(env,obs,aff,signature,replaceId=null){
  if(!["playnote","traderie"].includes(obs.source_key)) return {added:0,skipped:1};
  if(String(obs.item_type||"")!=="레어") return {added:0,skipped:1,reason:"nonrare_rejected"};

  const affCount=Object.keys(aff||{}).length;
  const price=obs.price_amount==null?null:Number(obs.price_amount);
  const parserQuality=obs?.parser_quality||null;
  const parserIncomplete=!!((obs.source_key==='traderie'&&obs.integrity?.complete!==true) || (parserQuality && (parserQuality.complete===false || Number(parserQuality.property_coverage||0)<0.95 || (parserQuality.critical_missing||[]).length)));
  if(!obs.source_snapshot && (affCount<3 || !Number.isFinite(price) || price<=0)) return {added:0,skipped:1};

  const listingKey=String(obs.source_listing_id||obs.source_url||signature);
  const hash=(await sha256Hex(`${obs.source_key}|${listingKey}|${signature}`)).slice(0,20);

  const conditions={};
  for(const [k,v] of Object.entries(aff||{})){
    const n=Number(v);
    if(Number.isFinite(n)) conditions[k]={gte:n};
  }

  const ko=marketKoSummary(obs,aff);
  const affLabel=Object.entries(aff||{}).slice(0,8)
    .map(([k,v])=>`${k} ${v}`).join(" / ");
  const priceLabel=`${price?.toLocaleString("en-US")} ${obs.price_currency||""}`.trim();

  // Human-facing title is Korean; raw machine keys remain in evidence/proposal.
  const title=`[시장관측] ${obs.source_key} · ${ko.item} · ${ko.price} · ${ko.affix_text}`;

  const sourceSnapshotHash=obs.source_snapshot?await sha256Hex(JSON.stringify(obs.source_snapshot)):null;
  const evidence=[{
    source:obs.source_key,
    url:obs.source_url||null,
    listing_id:obs.source_listing_id||null,
    observation_type:obs.observation_type||"asking",
    item_type:obs.item_type,
    slot:obs.slot,
    base_name:obs.base_name||null,
    affixes:aff,
    affixes_ko:ko.affixes,
    parser_quality:parserQuality,
    integrity:obs.integrity||null,
    option_rows:obs.option_rows||null,
    price_structure:obs.price_structure||null,
    source_snapshot:obs.source_snapshot||null,
    source_snapshot_hash:sourceSnapshotHash,
    fetched_at:obs.fetched_at||null,
    learning_eligible:!parserIncomplete,
    display_ko:{
      item:ko.item,
      slot:ko.slot,
      base_name:ko.base_name,
      price:ko.price,
      affix_text:ko.affix_text
    },
    price_amount:price,
    price_currency:obs.price_currency||null,
    listed_at:obs.listed_at||null,
    verified:!!obs.verified,
    note:parserIncomplete?"파싱 불완전 가능성 있음. 시장가치 학습에서 제외.":"자동 시장관측 1건. 교차출처 검증 전 운영 규칙으로 승인하지 말 것."
  }];

  const proposal={
    rule_key:`market_watch_${hash}`,
    label:title,
    parser_quality:parserQuality,
    learning_eligible:!parserIncomplete,
    display_ko:{
      item:ko.item,
      slot:ko.slot,
      base_name:ko.base_name,
      price:ko.price,
      affixes:ko.affixes,
      affix_text:ko.affix_text
    },
    slot:obs.slot,
    item_type:obs.item_type,
    priority:5,
    conditions,
    effects:{
      score_delta:0,
      market_watch_only:true,
      observed_price:{amount:price,currency:obs.price_currency||null,structure:obs.price_structure||null},
      strength_note:`단일출처 자동 시장관측. ${ko.item} · ${ko.price} · ${ko.affix_text}. 교차검증 전 점수 반영 금지.`,
      tags:["market-observation","single-source","needs-crosscheck"]
    },
    market_meta:{
      source:obs.source_key,
      signature,
      listing_id:obs.source_listing_id||null,
      observed_price:price,
      currency:obs.price_currency||null
    }
  };

  if(replaceId){
   const old=await env.DB.prepare('SELECT * FROM review_candidates WHERE id=?').bind(replaceId).first();
   if(!old||!['pending','hold'].includes(old.status))throw Error('이미 검수한 항목은 덮어쓸 수 없습니다.');
   const oldEvidence=safeJson(old.evidence_json,[]);const unchanged=JSON.stringify(oldEvidence[0]?.source_snapshot)===JSON.stringify(obs.source_snapshot);
   const batchResult=await env.DB.batch([
    env.DB.prepare("INSERT INTO admin_audit_log(action,target_type,target_id,detail_json,actor_email) VALUES('candidate_reparsed','candidate',?,?,'worker-session')").bind(replaceId,JSON.stringify({before:old,source_changed:!unchanged})),
    env.DB.prepare("UPDATE review_candidates SET title=?,evidence_json=?,proposal_json=?,learning_eligible=0 WHERE id=? AND status IN ('pending','hold')").bind(title,JSON.stringify(evidence),JSON.stringify(proposal),replaceId)
   ]);if(!batchResult[1]?.meta?.changes)throw Error('재수집 중 검수 상태가 변경되어 이전 결정을 유지했습니다.');return {added:0,updated:1,source_changed:!unchanged};
  }
  const confidence=Math.max(.25,Math.min(.68,Number(obs.source_confidence)||.45));
  const dedupe=`market_review|${obs.source_key}|${listingKey}|${signature}`;

  const deleted=await env.DB.prepare("SELECT id FROM admin_audit_log WHERE action='pending_deleted_item' AND json_extract(detail_json,'$.dedupe_key')=? AND COALESCE(json_extract(detail_json,'$.source_snapshot_hash'),'')=? LIMIT 1").bind(dedupe,sourceSnapshotHash||'').first();
  if(deleted)return {added:0,skipped:1,reason:'deleted_unchanged_snapshot'};
  try{
    await env.DB.prepare(
      `INSERT INTO review_candidates
       (item_type,title,source_type,source_url,evidence_json,proposal_json,confidence,dedupe_key)
       VALUES(?,?,?,?,?,?,?,?)`
    ).bind(
      String(obs.item_type||"레어후보"),title,"market_observation",
      obs.source_url||null,JSON.stringify(evidence),JSON.stringify(proposal),
      confidence,dedupe
    ).run();
    return {added:1,skipped:0};
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE")) return {added:0,skipped:1};
    throw e;
  }
}

async function insertAutoObservation(env,obs){
  if(String(obs?.item_type||"")!=="레어") return {added:0,skipped:1,reason:"nonrare_rejected"};
  const aff=normalizeAffixes(obs.affixes||{});
  if(!obs.slot || obs.slot==="other" || (!obs.source_snapshot&&Object.keys(aff).length<2)) return {added:0,skipped:1};
  const signature=makeSignature(obs.item_type,obs.slot,aff);
  if(obs.source_key==='traderie'&&(obs.integrity?.complete!==true||obs.price_structure?.alternatives?.length!==1||obs.price_structure?.alternatives?.[0]?.items?.length!==1)){
   const review=await maybeCreateMarketReviewCandidate(env,obs,aff,signature);return {added:0,skipped:0,review_candidates:review.added||0,review_only:true};
  }
  const dedupe=[
    "auto",obs.source_key,obs.source_listing_id||obs.source_url||"",
    signature,obs.price_amount??"",obs.listed_at||""
  ].join("|");
  try{
    await env.DB.prepare(
      `INSERT INTO market_observations
       (source_key,source_url,source_listing_id,observation_type,item_type,slot,base_name,
        affixes_json,signature,season,ladder,hardcore,region,price_amount,price_currency,
        normalized_value,normalized_currency,listed_at,sold_at,source_confidence,verified,raw_note,dedupe_key)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      obs.source_key,obs.source_url||null,obs.source_listing_id||null,obs.observation_type||"asking",
      obs.item_type||"레어",obs.slot,obs.base_name||null,JSON.stringify(aff),signature,
      obs.season||null,
      obs.ladder===null||obs.ladder===undefined?null:(obs.ladder?1:0),
      obs.hardcore===null||obs.hardcore===undefined?null:(obs.hardcore?1:0),
      obs.region||null,
      obs.price_amount===null||obs.price_amount===undefined?null:Number(obs.price_amount),
      obs.price_currency||null,
      obs.normalized_value===null||obs.normalized_value===undefined?null:Number(obs.normalized_value),
      obs.normalized_currency||null,
      obs.listed_at||null,obs.sold_at||null,
      Math.max(.1,Math.min(1,Number(obs.source_confidence)||.4)),
      obs.verified?1:0,obs.raw_note||"auto public observation",dedupe
    ).run();
    const review=await maybeCreateMarketReviewCandidate(env,obs,aff,signature);
    return {added:1,skipped:0,review_candidates:review.added||0};
  }catch(e){
    if(String(e?.message||e).includes("UNIQUE")) return {added:0,skipped:1};
    throw e;
  }
}

async function markSeedFailure(env,seed,status,error){
  const fails=Number(seed.consecutive_failures||0)+1;
  const now=Date.now();
  let pause=0;
  if(status===429) pause=now+Math.min(24*3600e3,Math.pow(2,Math.min(fails,6))*15*60e3);
  else if(status===401||status===403) pause=now+24*3600e3;
  else if(fails>=3) pause=now+Math.min(6*3600e3,fails*30*60e3);
  await env.DB.prepare(
    `UPDATE crawl_seeds SET last_attempt_at=?,last_status=?,consecutive_failures=?,
     paused_until=?,updated_at=datetime('now') WHERE id=?`
  ).bind(now,status||null,fails,pause,seed.id).run();
}

async function runOneSeed(env,seed,triggerType="manual",forceReparse=false){
  const adapter=adapterFor(seed.source_key);
  if(!adapter) return {ok:false,error:"adapter_not_available",seed_id:seed.id};

  await recoverStaleRuns(env);
  const lockToken=await acquireSeedLock(env,seed.id);
  if(!lockToken) return {ok:false,error:"already_running",seed_id:seed.id};

  const now=Date.now();
  const currentParserVersion=parserVersionFor(seed.source_key);
  const parserChanged=String(seed.last_parser_version||"")!==currentParserVersion;
  if((parserChanged||forceReparse) && ["playnote","chaoscube","traderie"].includes(seed.source_key)){
    await env.DB.prepare(
      `UPDATE crawl_detail_queue
       SET state='pending',last_error=NULL,last_attempt_at=NULL,last_status=NULL,updated_at=datetime('now')
       WHERE id IN (
         SELECT id FROM crawl_detail_queue
         WHERE source_key=? AND state IN ('done','error','ignored')
         ORDER BY id DESC LIMIT 100
       )`
    ).bind(seed.source_key).run();
  }
  if(!seed.enabled){ await releaseSeedLock(env,seed.id,lockToken); return {ok:false,error:"seed_disabled",seed_id:seed.id}; }
  if(Number(seed.paused_until||0)>now){ await releaseSeedLock(env,seed.id,lockToken); return {ok:false,error:"seed_paused",seed_id:seed.id}; }
  if(seed.last_attempt_at && now-Number(seed.last_attempt_at)<Number(seed.min_interval_minutes||60)*60000 && triggerType==="scheduled"){
    await releaseSeedLock(env,seed.id,lockToken);
    return {ok:false,error:"not_due",seed_id:seed.id};
  }

  const run=await env.DB.prepare(
    `INSERT INTO crawl_runs(seed_id,source_key,url,trigger_type,result_status,parser_version)
     VALUES(?,?,?,?,'running',?)`
  ).bind(seed.id,seed.source_key,seed.url,triggerType,currentParserVersion).run();
  const runId=run.meta.last_row_id;

  try{
    const fetched=await publicFetch(env,seed);
    if(fetched.status===304){
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE crawl_seeds SET last_attempt_at=?,last_success_at=?,last_status=304,
           consecutive_failures=0,paused_until=0,updated_at=datetime('now') WHERE id=?`
        ).bind(now,now,seed.id),
        env.DB.prepare(
          `UPDATE crawl_runs SET finished_at=datetime('now'),http_status=304,result_status='not_modified'
           WHERE id=?`
        ).bind(runId)
      ]);
      await releaseSeedLock(env,seed.id,lockToken);
      return {ok:true,status:"not_modified",seed_id:seed.id};
    }

    const acquisition=classifyAcquiredContent(seed.source_key,fetched.finalUrl||seed.url,fetched.html);
    if(!acquisition.ok){
      const reason=acquisition.reason||acquisition.status||"content_unavailable";
      await recordRejection(env,rejection(seed.source_key,seed.url,"acquisition",reason,{
        excerpt:normalizedVisibleText(fetched.html).slice(0,1800),
        meta:{
          status:acquisition.status,
          text_length:acquisition.text_length,
          http_status:fetched.status,
          final_url:fetched.finalUrl||seed.url,
          marker_state:acquisition.marker_state||null
        }
      }));

      await env.DB.prepare(
        `UPDATE crawl_runs SET finished_at=datetime('now'),http_status=?,
         result_status=?,detail_json=? WHERE id=?`
      ).bind(
        fetched.status,
        acquisition.status||"content_unavailable",
        JSON.stringify({acquisition,parser_version:currentParserVersion}),
        runId
      ).run();

      await markSeedFailure(env,seed,fetched.status||null,reason);
      await updateParserHealth(env,seed.source_key,acquisition.status||"content_unavailable",0,reason);
      await updateSeedHealth(env,seed,acquisition.status||"content_unavailable",0,reason);
      await releaseSeedLock(env,seed.id,lockToken);

      return {
        ok:false,
        status:acquisition.status||"content_unavailable",
        error:reason,
        seed_id:seed.id,
        acquisition
      };
    }

    const pageHash=await sha256Text(fetched.html);
    if(seed.last_hash && seed.last_hash===pageHash && !parserChanged && !forceReparse){
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE crawl_seeds SET last_attempt_at=?,last_success_at=?,last_status=?,
           last_etag=?,last_modified=?,consecutive_failures=0,paused_until=0,updated_at=datetime('now')
           WHERE id=?`
        ).bind(now,now,fetched.status,fetched.etag||null,fetched.lastModified||null,seed.id),
        env.DB.prepare(
          `UPDATE crawl_runs SET finished_at=datetime('now'),http_status=?,result_status='same_hash'
           WHERE id=?`
        ).bind(fetched.status,runId)
      ]);
      await releaseSeedLock(env,seed.id,lockToken);
      return {ok:true,status:"same_hash",seed_id:seed.id};
    }

    const parsed=adapter(fetched.html,seed.url);
    let docs=0,added=0,dupes=0,queued=0,detailStats=null,reviewCandidates=0;
    if(parsed.reject) await recordRejection(env,parsed.reject);
    if(seed.source_key==="playnote" &&
       (!parsed.discovered_urls || parsed.discovered_urls.length===0) &&
       !/\/itemdetail\?/i.test(seed.url)){
      await recordRejection(env,rejection(seed.source_key,seed.url,"discovery","no_detail_links",{
        excerpt:acquisitionText(fetched.html).slice(0,1800),
        meta:{parser_version:currentParserVersion}
      }));
    }
    if(parsed.discovered_urls?.length){
      queued=await queueDiscoveredUrls(env,seed.source_key,seed.id,parsed.discovered_urls,parsed.discovered_type||"detail");
    }
    for(const d of parsed.docs||[]){
      const r=await insertCrawlDocument(env,seed.source_key,d);
      docs+=r.added;dupes+=r.duplicate;
    }
    for(const o of parsed.observations||[]){
      const r=await insertAutoObservation(env,o);
      added+=r.added;dupes+=r.skipped;
      reviewCandidates+=Number(r.review_candidates||0);
    }

    const parseStatus=classifyParseResult(parsed);

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE crawl_seeds SET last_attempt_at=?,last_success_at=?,last_status=?,
         last_etag=?,last_modified=?,last_hash=?,last_parser_version=?,consecutive_failures=0,paused_until=0,
         updated_at=datetime('now') WHERE id=?`
      ).bind(now,now,fetched.status,fetched.etag||null,fetched.lastModified||null,pageHash,currentParserVersion,seed.id),
      env.DB.prepare(
        `UPDATE crawl_runs SET finished_at=datetime('now'),http_status=?,result_status=?,
         documents_found=?,observations_added=?,duplicates_skipped=?,detail_json=?
         WHERE id=?`
      ).bind(fetched.status,parseStatus,docs,added,dupes,JSON.stringify({
        adapter:seed.source_key,
        parsed_documents:(parsed.docs||[]).length,
        parsed_observations:(parsed.observations||[]).length,
        review_candidates_created:reviewCandidates,
        parse_meta:parsed.parse_meta||null,
        discovered_urls:queued,
        detail_stats:detailStats
      }),runId)
    ]);
    await updateParserHealth(env,seed.source_key,parseStatus,added,null);
    await updateSeedHealth(env,seed,parseStatus,added,null);
    if(seed.source_key==="playnote" && /\/trade\/itemmarket/i.test(seed.url)){
      const boot=await ensurePlaynoteBootstrapRareQueue(env);
      queued+=Number(boot.queued||0);
    }

    await releaseSeedLock(env,seed.id,lockToken);
    return {ok:true,status:parseStatus,seed_id:seed.id,documents:docs,observations:added,review_candidates:reviewCandidates,duplicates:dupes,queued,detail_stats:detailStats};
  }catch(e){
    const status=Number(e?.httpStatus)||0;
    await markSeedFailure(env,seed,status,String(e?.message||e));
    await env.DB.prepare(
      `UPDATE crawl_runs SET finished_at=datetime('now'),http_status=?,result_status='error',
       error_text=? WHERE id=?`
    ).bind(status||null,String(e?.message||e).slice(0,1000),runId).run();
    await updateParserHealth(env,seed.source_key,"error",0,String(e?.message||e));
    await updateSeedHealth(env,seed,"error",0,String(e?.message||e));
    await releaseSeedLock(env,seed.id,lockToken);
    return {ok:false,error:String(e?.message||e),http_status:status,seed_id:seed.id};
  }
}

async function runDueCrawls(env,triggerType="scheduled",specificId=null,forceReparse=false){
  let seed=null;
  if(specificId){
    seed=await env.DB.prepare(`SELECT * FROM crawl_seeds WHERE id=?`).bind(Number(specificId)).first();
  }else{
    seed=await env.DB.prepare(
      `SELECT * FROM crawl_seeds WHERE enabled=1 ORDER BY COALESCE(last_attempt_at,0) ASC,id ASC LIMIT 1`
    ).first();
  }
  if(!seed) return [];
  return [await runOneSeed(env,seed,triggerType,forceReparse)];
}

async function crawlStatus(env){
  await recoverStaleRuns(env);
  const [s,r,d,m,disc]=await Promise.all([
    env.DB.prepare(`SELECT * FROM crawl_seeds ORDER BY source_key,id`).all(),
    env.DB.prepare(`SELECT * FROM crawl_runs ORDER BY id DESC LIMIT 80`).all(),
    env.DB.prepare(
      `SELECT source_key,parser_status,COUNT(*) n FROM crawl_documents GROUP BY source_key,parser_status`
    ).all(),
    env.DB.prepare(
      `SELECT source_key,
        COUNT(*) total,
        SUM(CASE WHEN result_status='observations_parsed' THEN 1 ELSE 0 END) parsed_runs,
        SUM(CASE WHEN observations_added>0 THEN observations_added ELSE 0 END) observations,
        SUM(CASE WHEN result_status IN ('error','stale_recovered') THEN 1 ELSE 0 END) failures
       FROM crawl_runs GROUP BY source_key`
    ).all(),
    env.DB.prepare(
      `SELECT source_key,COUNT(*) n FROM crawl_discovered_urls WHERE active=1 GROUP BY source_key`
    ).all()
  ]);
  return json({
    ok:true,seeds:s.results||[],runs:r.results||[],documents:d.results||[],
    metrics:m.results||[],discovered:disc.results||[],
    parser_health:(await env.DB.prepare(`SELECT * FROM parser_health ORDER BY source_key`).all()).results||[],
    detail_queue:(await env.DB.prepare(`SELECT source_key,state,COUNT(*) n FROM crawl_detail_queue GROUP BY source_key,state`).all()).results||[],
    rejection_stats:(await env.DB.prepare(
      `SELECT source_key,reason,COUNT(*) n FROM parser_rejections
       WHERE created_at>=datetime('now','-7 day')
       GROUP BY source_key,reason ORDER BY source_key,n DESC`
    ).all()).results||[],
    recent_rejections:(await env.DB.prepare(
      `SELECT id,source_key,source_url,parser_version,stage,reason,item_name,category,affix_count,excerpt,meta_json,created_at
       FROM parser_rejections ORDER BY id DESC LIMIT 30`
    ).all()).results||[],
    seed_health:(await env.DB.prepare(
      `SELECT sh.*,cs.url,cs.enabled,cs.min_interval_minutes
       FROM seed_health sh JOIN crawl_seeds cs ON cs.id=sh.seed_id
       ORDER BY sh.source_key,sh.seed_id`
    ).all()).results||[]
  });
}

async function crawlRunApi(request,env){
  const body=await request.json().catch(()=>({}));
  const results=await runDueCrawls(env,"manual",body.seed_id||null,!!body.force_reparse);
  return json({ok:true,results});
}


async function crawlSelfTest(env){
  const result=parserSelfTest();
  for(const source of ["playnote","chaoscube","traderie"]){
    const relevant=result.tests.filter(t=>t.name.startsWith(source));
    const passed=relevant.length?relevant.every(t=>t.pass):true;
    await env.DB.prepare(
      `INSERT INTO parser_health(source_key,parser_version,last_test_at,selftest_passed,last_parse_status,updated_at)
       VALUES(?,?,datetime('now'),?,'selftest',datetime('now'))
       ON CONFLICT(source_key) DO UPDATE SET parser_version=excluded.parser_version,
       last_test_at=datetime('now'),selftest_passed=excluded.selftest_passed,
       last_parse_status='selftest',updated_at=datetime('now')`
    ).bind(source,parserVersionFor(source),passed?1:0).run();
  }

  // Inven is intentionally evidence-only. It has no structured rare-item parser self-test.
  await env.DB.prepare(
    `INSERT INTO parser_health(source_key,parser_version,last_test_at,selftest_passed,last_parse_status,last_error,updated_at)
     VALUES('inven',?,datetime('now'),1,'evidence_only',NULL,datetime('now'))
     ON CONFLICT(source_key) DO UPDATE SET
       parser_version=excluded.parser_version,
       last_test_at=datetime('now'),
       selftest_passed=1,
       last_parse_status='evidence_only',
       last_error=NULL,
       updated_at=datetime('now')`
  ).bind(parserVersionFor("inven")).run();

  result.tests.push({name:"inven_evidence_only",pass:true,mode:"evidence_only"});
  return json(result,result.ok?200:500);
}



async function crawlDiagnosticsClear(env){
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM parser_rejections`),
    env.DB.prepare(`DELETE FROM crawl_runs`),
    env.DB.prepare(`DELETE FROM seed_health`),
    env.DB.prepare(`UPDATE parser_health SET last_error=NULL,consecutive_zero_observation_runs=0,updated_at=datetime('now')`)
  ]);
  return json({ok:true});
}

async function crawlSeedAdd(request,env){
  const body=await request.json().catch(()=>({}));
  const source=String(body.source_key||"").trim().toLowerCase();
  const url=String(body.url||"").trim();
  if(!["playnote","chaoscube","traderie","inven"].includes(source) || !allowedSeedUrl(source,url))
    return json({ok:false,error:"invalid_seed_url"},400);

  try{
    await env.DB.prepare(
      `INSERT INTO crawl_seeds(source_key,url,enabled,min_interval_minutes,note)
       VALUES(?,?,1,60,?)
       ON CONFLICT(url) DO UPDATE SET enabled=1,source_key=excluded.source_key,updated_at=datetime('now')`
    ).bind(source,url,`Admin-added seed for ${source}`).run();
    return json({ok:true});
  }catch(e){
    return json({ok:false,error:String(e?.message||e)},500);
  }
}

async function crawlSeedToggle(request,env){
  const body=await request.json().catch(()=>({}));
  const id=Number(body.id);
  if(!id || !["enable","disable","reset_backoff"].includes(body.action))
    return json({ok:false,error:"invalid_payload"},400);
  if(body.action==="reset_backoff"){
    await env.DB.prepare(
      `UPDATE crawl_seeds SET paused_until=0,consecutive_failures=0,updated_at=datetime('now') WHERE id=?`
    ).bind(id).run();
  }else{
    await env.DB.prepare(
      `UPDATE crawl_seeds SET enabled=?,updated_at=datetime('now') WHERE id=?`
    ).bind(body.action==="enable"?1:0,id).run();
  }
  return json({ok:true});
}



export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/api/health" && request.method === "GET") return health(env);
      if (path === "/api/public/rules" && request.method === "GET") return publicRules(env);
      if (path === "/api/public/review-value-model" && request.method === "GET") return json({ok:true,models:[],revision:'private-server-inference'});
      if (path === "/api/public/valuation") return publicAIValuation(request,env);
      if (path.startsWith('/api/trainer/')) return trainerAPI(request,env);
      if (path === "/api/public/terror-zone") return liveResponse(request);
      if (path === "/api/public/market-search") return recentMarketResponse(request);

      if ((path === "/admin/login" || path === "/admin/login/") && request.method === "GET") {
        if (await verifySession(request,env)) {
          return new Response(null,{status:302,headers:{Location:"/admin/","Cache-Control":"no-store"}});
        }
        return html(loginPage());
      }

      if (path === "/api/admin/login" && request.method === "POST") {
        if (!originAllowed(request)) return json({ok:false,error:"invalid_origin"},403);
        return handleLogin(request,env);
      }

      if (path === "/api/admin/logout" && request.method === "POST") {
        if (!originAllowed(request)) return json({ok:false,error:"invalid_origin"},403);
        return new Response(null,{
          status:303,
          headers:{
            Location:"/admin/login",
            "Set-Cookie":clearSessionCookie(),
            "Cache-Control":"no-store"
          }
        });
      }

      if (path === "/admin" || path === "/admin/" || path === "/admin/index.html") {
        if (!(await verifySession(request,env))) {
          return new Response(null,{status:302,headers:{Location:"/admin/login","Cache-Control":"no-store"}});
        }
        return env.ASSETS.fetch(new Request(new URL("/admin/index.html",request.url),request));
      }

      if (path.startsWith("/api/admin/")) {
        if (!(await verifySession(request,env))) return json({ok:false,error:"unauthorized"},401);
        if (!originAllowed(request) && request.method !== "GET") return json({ok:false,error:"invalid_origin"},403);
        if (!env.DB) return json({ok:false,error:"db_binding_missing"},503);
        if(path==='/api/admin/ai'||path.startsWith('/api/admin/ai/'))return adminAIAPI(request,env);

        if (path === "/api/admin/candidates/delete-pending" && request.method === "POST") return deletePendingCandidates(request,env);
        if (path === "/api/admin/candidates/reparse" && request.method === "POST") return reparseCandidates(request,env);
        if (path === "/api/admin/candidates" && request.method === "GET")
          return getCandidates(request,env);
        if (path === "/api/admin/candidates" && request.method === "POST")
          return createCandidate(request,env);
        if (path === "/api/admin/review" && request.method === "POST")
          return reviewCandidate(request,env,{ctx});
        if (path === "/api/admin/review-value-learning" && request.method === "GET")
          return reviewedValueLearningStatus(env);
        if (path === "/api/admin/review-value-learning" && request.method === "POST")
          return json({ok:true,...await runReviewedValueLearning(env,'admin')});
        if (path === "/api/admin/rules" && request.method === "GET")
          return getRules(env);
        if (path === "/api/admin/rules" && request.method === "POST")
          return toggleRule(request,env);
        if (path === "/api/admin/stats" && request.method === "GET")
          return stats(env);
        if (path === "/api/admin/statistical-shadow" && request.method === "GET")
          return statisticalShadowStatus(env);
        if (path === "/api/admin/auto-review" && request.method === "GET")
          return json(await autoReviewRun(env));
        if (path === "/api/admin/auto-review" && request.method === "POST") {
          const body=await request.json().catch(()=>null);
          if(body?.mode!=='apply'||body?.confirm!==true)return json({ok:false,error:'explicit_confirmation_required'},400);
          return json(await autoReviewRun(env,{apply:true,limit:20}));
        }
        if (path === "/api/admin/learning/status" && request.method === "GET")
          return feedbackLearningStatus(env);
        if (path === "/api/admin/learning/run" && request.method === "POST")
          return feedbackLearningRunApi(env);
        if (path === "/api/admin/source-audit/playnote" && request.method === "POST")
          return auditPlaynoteSources(env,5);
        if (path === "/api/admin/source-audit/traderie" && request.method === "POST")
          return auditTraderieSources(env,5);
        if (path === "/api/admin/source-audit/transports" && request.method === "POST")
          return sourceTransportDiagnostics(env);
        if (path === "/api/admin/coverage/status" && request.method === "GET")
          return marketCoverageStatus(env);
        if (path === "/api/admin/traderie/diagnose" && request.method === "POST")
          return traderieCoverageDiagnose(env);
        if (path === "/api/admin/coverage/run" && request.method === "POST")
          return marketCoverageRunApi(env);
        if (path === "/api/admin/market/sources" && request.method === "GET")
          return marketSources(env);
        if (path === "/api/admin/market/observations" && request.method === "GET")
          return marketObservations(request,env);
        if (path === "/api/admin/market/observations" && request.method === "POST")
          return addMarketObservation(request,env);
        if (path === "/api/admin/market/analyze" && request.method === "POST")
          return analyzeMarket(env);
        if (path === "/api/admin/market/patterns" && request.method === "GET")
          return patternCandidates(request,env);
        if (path === "/api/admin/market/patterns/review" && request.method === "POST")
          return promotePatternCandidate(request,env);

        if (path === "/api/admin/market/test/generate" && request.method === "POST")
          return generateTestMarketData(env);
        if (path === "/api/admin/market/test/analyze" && request.method === "POST")
          return analyzeTestMarket(env);
        if (path === "/api/admin/market/test/status" && request.method === "GET")
          return testMarketStatus(env);
        if (path === "/api/admin/market/test/clear" && request.method === "POST")
          return clearTestMarketData(env);

        if (path === "/api/admin/crawl/status" && request.method === "GET")
          return crawlStatus(env);
        if (path === "/api/admin/crawl/run" && request.method === "POST")
          return crawlRunApi(request,env);
        if (path === "/api/admin/crawl/detail/step" && request.method === "POST")
          return json(await processOneDetailJob(env));
        if (path === "/api/admin/crawl/bootstrap/playnote" && request.method === "POST")
          return json({ok:true,...await ensurePlaynoteBootstrapRareQueue(env)});
        if (path === "/api/admin/crawl/seed" && request.method === "POST")
          return crawlSeedToggle(request,env);
        if (path === "/api/admin/crawl/selftest" && request.method === "POST")
          return crawlSelfTest(env);
        if (path === "/api/admin/traderie/api/test" && request.method === "POST")
          return traderieApiTest(env);
        if (path === "/api/admin/traderie/api/collect" && request.method === "POST")
          return traderieApiCollect(env);
        if (path === "/api/admin/crawl/diagnostics/clear" && request.method === "POST")
          return crawlDiagnosticsClear(env);
        if (path === "/api/admin/crawl/seed/add" && request.method === "POST")
          return crawlSeedAdd(request,env);

        return json({ok:false,error:"not_found"},404);
      }

      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({ok:false,error:"internal_error",detail:String(e?.message||e)},500);
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async()=>{
      if(env.AUTO_REVIEW_DISABLE!=='true'){
        try{ console.log("scheduled_review_reparse",JSON.stringify(await refreshPendingReviewCandidates(env))); }
        catch(e){ console.log("scheduled_review_reparse_error",String(e?.message||e)); }

        try{ await autoReviewRun(env,{apply:true,limit:20}); }
        catch(e){ console.log("scheduled_auto_review_error",String(e?.message||e)); }
      }

      try{ await marketCoverageStep(env,"cron"); }
      catch(e){ console.log("scheduled_market_coverage_error",String(e?.message||e)); }

      try{ await runScheduledUnit(env); }
      catch(e){ console.log("scheduled_crawl_error",String(e?.message||e)); }

      try{
        await analyzeObservationSet(env,{
          obsTable:"market_observations",
          clusterTable:"price_clusters",
          candidateTable:"pattern_candidates",
          testMode:false
        });
      }catch(e){
        console.log("scheduled_market_analysis_error",String(e?.message||e));
      }

      try{ await runFeedbackLearning(env,"cron"); }
      catch(e){ console.log("scheduled_feedback_learning_error",String(e?.message||e)); }

      try{ await runReviewedValueLearning(env,'cron'); }
      catch(e){ console.log('scheduled_review_value_learning_error',String(e?.message||e)); }

      try{ await syncAIPage(env); }
      catch(e){ console.error('scheduled_ai_sync_error',String(e?.message||e)); }
      if(env.AUTO_REVIEW_DISABLE!=='true')try{
        const nominations=await neuralReviewNominations(env);
        for(const item of nominations){
          const fresh=await env.DB.prepare("SELECT * FROM review_candidates WHERE id=? AND status='pending'").bind(item.id).first();
          if(!fresh||fresh.evidence_json!==item.evidence_json)continue;
          const source=await verifyAutoReviewSource(fresh);if(!source.ok)continue;
          const req=new Request('https://internal.invalid/api/admin/review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action:item.action,tags:[],note:'PC 미세조정 모델 '+item.model_id+' · 원본 재확인 후 자동 검수'})});
          await reviewCandidate(req,env,{auto:true,sourceVerifiedHash:source.hash});
        }
      }catch(e){console.error('scheduled_neural_review_error',String(e?.message||e))}

    })());
  }
};

export {traderieApiObservation,traderieApiFetchListing,maybeCreateMarketReviewCandidate,reviewCandidate,verifyAutoReviewSource,autoReviewRun,refreshPendingReviewCandidates,deletePendingCandidates,getCandidates,insertAutoObservation,marketStructuredPrice,candidateNeedsRepair,reparseCandidates,reviewLearningPolicy,playnoteAdapter,playnoteDetailAdapter,guessSlot,playnoteRareLikelihood,classifyAcquiredContent,marketReviewIndex,marketObservationReviewed,feedbackMarketSupport,analyzeObservationSet,feedbackShadowRule,reparseOperatorFeedback,rebuildFeedbackPatterns,evaluateFeedbackShadowRules,publicReviewedValueModel,runReviewedValueLearning,reviewedValueLearningStatus};

export {parserSelfTest};
