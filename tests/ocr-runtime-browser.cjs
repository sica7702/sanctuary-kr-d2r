// Browser regression: public valuation rules reach photo appraisal without
// changing OCR capture, the established appraisal grade, or market lookups.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../public');
const approval={
 rule_key:'feedback:auto:ring:fcr-test',label:'검수 완료 패캐링',
 slot:'ring',item_type:'레어',conditions:{fcr:{gte:10}},profile:{},
 effects:{score_delta:4,tags:['operator-feedback']}
};
const marketWatch={
 rule_key:'market_watch_test',label:'단일 매물 관측',
 slot:'ring',item_type:'레어',conditions:{fcr:{gte:10}},profile:{},
 effects:{score_delta:25,market_watch_only:true,tags:['market-observation']}
};
let apiStatus=200,apiRules=[approval,marketWatch],holdApi=true;
const held=[];
function sendRules(res){
 res.statusCode=apiStatus;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.end(apiStatus===200?JSON.stringify({ok:true,revision:'browser-fixture',rules:apiRules}):JSON.stringify({ok:false,error:'offline'}));
}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/public/rules'){
  if(holdApi){held.push(res);return;}
  sendRules(res);return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
});

async function prepare(page,origin,errors){
 page.on('pageerror',error=>errors.push(error.stack||error.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
 await page.goto(origin+'/archive/image-appraisal.html');
 await page.waitForFunction(()=>window.SKR_OCR_EVIDENCE&&window.SKR_APPRAISAL_UI&&document.getElementById('sourceQuality'));
 await page.evaluate(()=>{
  const api=window.SKR_OCR_EVIDENCE;
  api.reset();
  api.accept(['레어 반지','반지','시전 속도 +10%','힘 +15','화염 저항 +28%']
   .map((text,i)=>({text,pass:i%2?'대비':'원본',conf:95,i})));
  const quality=document.getElementById('sourceQuality');
  quality.value='rare';quality.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal(await page.locator('#slot').inputValue(),'반지');
 await page.locator('#runAppraisal').click();
 return page.evaluate(()=>window.SKR_APPRAISAL_UI.getResult());
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const errors=[];
 try{
  const pending=await browser.newPage();
  const before=await prepare(pending,origin,errors);
  assert.equal(before.runtime.scoreDelta,0);
  assert.match(await pending.locator('#runtimeRuleResult').innerText(),/연결 확인 중/);
  holdApi=false;while(held.length)sendRules(held.shift());
  await pending.waitForFunction(()=>window.SKR_APPRAISAL_UI.getResult()?.runtime?.matched?.length===1);
  const after=await pending.evaluate(()=>window.SKR_APPRAISAL_UI.getResult());
  assert.equal(after.score,before.score,'original appraisal score must remain intact');
  assert.equal(after.grade,before.grade,'original appraisal grade must remain intact');
  assert.equal(after.runtime.scoreDelta,4);
  assert.equal(after.adjustedScore,Math.min(99,before.score+4));
  assert.deepEqual(after.runtime.matched.map(rule=>rule.rule_key),[approval.rule_key]);
  assert.match(await pending.locator('#runtimeRuleResult').innerText(),/활성 운영 규칙 1건 적용/);
  await pending.close();

  apiRules=[marketWatch];
  const market=await browser.newPage();
  const marketResult=await prepare(market,origin,errors);
  await market.waitForFunction(()=>window.SKR_RUNTIME_RULES?.state?.ready);
  const marketFinal=await market.evaluate(()=>window.SKR_APPRAISAL_UI.getResult());
  assert.equal(marketFinal.runtime.scoreDelta,0);
  assert.equal(marketFinal.adjustedScore,marketFinal.score);
  assert.match(await market.locator('#runtimeRuleResult').innerText(),/일치하는 활성 점수 규칙 없음/);
  await market.close();

  apiStatus=503;
  const offline=await browser.newPage();
  const offlineResult=await prepare(offline,origin,errors);
  await offline.waitForFunction(()=>window.SKR_RUNTIME_RULES?.state?.ready);
  const offlineFinal=await offline.evaluate(()=>window.SKR_APPRAISAL_UI.getResult());
  assert.equal(offlineFinal.runtime.scoreDelta,0);
  assert.equal(offlineFinal.score,offlineResult.score);
  assert.match(await offline.locator('#runtimeRuleResult').innerText(),/운영 DB 미연결/);
  await offline.close();

  assert.deepEqual(errors,[],'browser should not throw');
  console.log('OCR 운영 규칙 브라우저: 비동기 승인 보정, 시장관측 제외, 오프라인 기본 평가 통과');
 }finally{
  await browser.close();
  server.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
