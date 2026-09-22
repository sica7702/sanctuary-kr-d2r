const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../public');
 const contract=await import(pathToFileURL(path.resolve(__dirname,'../ai-contract.mjs')));
 const {artifactFixture}=await import(pathToFileURL(path.resolve(__dirname,'ai-fixtures.mjs')));
 const {publicAIValuation}=await import(pathToFileURL(path.resolve(__dirname,'../ai-service.mjs')));
 const model=artifactFixture(),support=model.support[0];
 model.support=['unknown','ladder','standard'].map(realm=>({...support,family:'ring|레어|unknown|'+realm}));
 const metrics={tasks:{value:{passed:true,families:model.support.map(s=>s.family)},review:{passed:false}}};
 const calls=[];let mode='normal';
 const env={DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){
  if(sql.includes('ai_settings'))return {value:args[0]==='enabled'?'true':'fixture-model'};
  if(sql.includes('ai_models'))return {artifact_json:JSON.stringify(model),metrics_json:JSON.stringify(metrics),created_at:new Date().toISOString().slice(0,19).replace('T',' ')};
  return null;
 }}}}};
 const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/api/public/valuation'){
   let text='';for await(const chunk of req)text+=chunk;
   const context=JSON.parse(text).context;calls.push(contract.canonicalContext(context));
   if(mode==='delayed')await new Promise(resolve=>setTimeout(resolve,600));
   if(mode==='offline'){res.writeHead(503,{'Content-Type':'application/json'});return res.end('{}')}
   const response=await publicAIValuation(new Request('http://'+req.headers.host+pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:text}),env);
   res.writeHead(response.status,{'Content-Type':'application/json'});return res.end(await response.text());
  }
  if(pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,rules:[],models:[],revision:'fixture'}))}
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end()}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end()}).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 try{
  const manual=await browser.newPage();manual.on('pageerror',e=>errors.push(e.message));
  await manual.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.fulfill({status:200,body:''}));
  await manual.goto(origin+'/archive/appraisal.html');
  await manual.locator('#tabs [data-id="ring"]').click();
  for(const [id,value] of [['fcr','10'],['str','18'],['life','20']])await manual.locator('#in_'+id).fill(value);
  await manual.locator('#runAppraise').click();
  await manual.locator('#aiValueResult').waitFor({timeout:8000}).catch(async error=>{console.error(JSON.stringify({calls,errors,warnings:await manual.locator('#resultWarn').innerText(),context:await manual.evaluate(()=>runtimeRuleContext())}));throw error});
  assert.match(await manual.locator('#resultGrade').innerText(),/거래 가능.*학습 기반/);
  const score=await manual.locator('#resultScore').innerText();assert.match(score,/아이템 품질/);
  const photo=await browser.newPage();photo.on('pageerror',e=>errors.push(e.message));
  await photo.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.fulfill({status:200,body:''}));
  await photo.goto(origin+'/archive/image-appraisal.html');await photo.waitForFunction(()=>window.SKR_APPRAISAL_UI&&window.SKR_OCR_EVIDENCE);
  await photo.evaluate(()=>{const api=window.SKR_OCR_EVIDENCE;api.reset();api.accept(['반지','시전 속도 +10%','힘 +18','생명력 +20'].map((text,i)=>({text,pass:'원본',conf:95,i})));const q=document.getElementById('sourceQuality');q.value='rare';q.dispatchEvent(new Event('change',{bubbles:true}));});
  await photo.locator('#runAppraisal').click();await photo.locator('#aiValueResult').waitFor({timeout:8000}).catch(async error=>{console.error(JSON.stringify({calls,errors,result:await photo.evaluate(()=>({result:window.SKR_APPRAISAL_UI.getResult(),slot:document.getElementById('slot').value,ledger:window.SKR_OCR_EVIDENCE.getLedger()}))}));throw error});
  assert.match(await photo.locator('.assessment-heading h2').innerText(),/거래 가능.*학습 기반/);
  assert.deepEqual(calls.at(-1).values,{fcr:10,life:20,str:18});
  await photo.evaluate(()=>window.SKR_OCR_EVIDENCE.accept([{text:'확인되지 않은 옵션 +3',pass:'원본',conf:95,i:4}]));
  await photo.locator('#runAppraisal').click();await photo.waitForTimeout(200);
  assert.equal(await photo.locator('#aiValueResult').count(),0,'unknown OCR option must prevent a learned grade');
  mode='delayed';await manual.locator('#runAppraise').click();await manual.locator('#in_str').fill('1');
  await manual.waitForTimeout(900);assert.equal(await manual.locator('#aiValueResult').count(),0,'stale prediction must not overwrite changed input');
  mode='offline';await manual.locator('#runAppraise').click();await manual.waitForTimeout(400);assert.equal(await manual.locator('#aiValueResult').count(),0);assert(await manual.locator('#resultGrade').innerText());
  assert.deepEqual(errors,[]);
  console.log('PASS: real public inference handler -> manual + photo primary value; original scores; stale response and offline fallbacks');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
