// Local browser checks only. No production writes or real feedback is sent.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),baseline=path.resolve(__dirname,'../../sanctuary-kr-d2r-ui-v125/public'),checks=[],errors=[],outbound=[];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),old=url.pathname.startsWith('/baseline/');
 const home=old?baseline:root,p=old?url.pathname.slice('/baseline'.length):url.pathname;
 const f=path.resolve(home,'.'+decodeURIComponent(p==='/'?'/index.html':p));
 if(!f.startsWith(home+path.sep)){res.statusCode=403;return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');
 fs.createReadStream(f).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{
   const req=route.request(),url=req.url();
   if(!url.startsWith(origin)){outbound.push({url,method:req.method()});return route.fulfill({status:200,body:''});}
   if(url.includes('/api/'))return route.fulfill({status:503,json:{ok:false}});
   return route.continue();
  });
  const shots=process.env.SCREENSHOT_DIR;
  if(shots)fs.mkdirSync(shots,{recursive:true});
  const shot=async(name,locator)=>{if(shots)await (locator||page).screenshot({path:path.join(shots,name+'.png')});};
  const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  async function ready(url){await page.goto(origin+url);await page.locator('.skr-support').waitFor();}
  async function workspaceStyle(prefix){
   await page.goto(origin+prefix+'/archive/image-appraisal.html');await page.waitForFunction(()=>window.SKR_APPRAISAL_UI&&document.documentElement.dataset.finishReady);
   return page.evaluate(()=>['body','.lab','.studio-photo','.studio-options'].map(selector=>{
    const n=document.querySelector(selector),s=getComputedStyle(n);
    return {selector,width:Math.round(n.getBoundingClientRect().width),background:s.backgroundColor,font:s.fontFamily,fontSize:s.fontSize,grid:s.gridTemplateColumns};
   }));
  }
  assert.deepEqual(await workspaceStyle(''),await workspaceStyle('/baseline'));
  checks.push('v125/v126 appraisal workspace widths, grid, fonts and backgrounds match');
  await ready('/index.html');
  const start=page.locator('.hero .cta-row a');assert.equal(await start.count(),4);
  assert.deepEqual(await start.allTextContents(),['사진으로 감정하기','득환 기준 찾기','사냥터 찾기','빌드 찾기']);
  await shot('home-desktop',page.locator('.hero .intro'));
  await start.last().click();await page.locator('#pane-builds').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelectorAll('a.build-card').length===50);
  checks.push('home: four task links; build entry opens the actual 50-build pane');
  const files=fs.readdirSync(path.join(root,'archive')).filter(n=>n.endsWith('.html')&&fs.readFileSync(path.join(root,'archive',n),'utf8').includes('/assets/ui-v119/site.js'));
  for(const file of files){await ready('/archive/'+file);assert.equal(await page.locator('.skr-support').count(),1,file);}
  checks.push('shared help entry appears once across '+files.length+' archive pages without changing original tools');
  await ready('/archive/unified.html?view=detail&q=private&token=secret');
  await page.locator('.skr-support button').click();await page.locator('.skr-report').waitFor({state:'visible'});
  await page.locator('#skr-report-steps').fill('탈목을 검색하고 선택했습니다.');
  await page.locator('#skr-report-expected').fill('드랍 장소');await page.locator('#skr-report-actual').fill('테스트용 제보 내용');
  assert(!(await page.locator('#skr-report-preview').inputValue()).includes('secret'));assert(!(await page.locator('#skr-report-preview').inputValue()).includes('private'));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}));
  await page.getByRole('button',{name:'1. 제보 내용 복사',exact:true}).click();assert.match(await page.locator('#skr-report-status').innerText(),/아직 접수된 것은 아닙니다/);
  assert.match(await page.evaluate(()=>window.__copied),/테스트용 제보 내용/);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
  await page.getByRole('button',{name:'1. 제보 내용 복사',exact:true}).click();assert.match(await page.locator('#skr-report-status').innerText(),/자동 복사가 제한/);
  assert(await page.locator('.skr-report-preview').evaluate(n=>n.open));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'skr-report-preview');
  await shot('feedback-desktop',page.locator('.skr-report'));
  await page.keyboard.press('Escape');assert(!(await page.locator('.skr-report').isVisible()));assert.match(await page.evaluate(()=>document.activeElement.textContent),/오류·의견 제보/);
  checks.push('feedback: native dialog, Esc/focus return, preview, clipboard success/denied fallback, safe URL and no submission claim');
  const data=JSON.parse(fs.readFileSync(path.join(root,'archive/unified-data.json'))),tal=data.records.find(r=>r.en==="Tal Rasha's Adjudication");assert(tal);
  const backup={schema:1,items:[{id:'fixture-1',itemId:tal.id,quantity:2,location:'창고',note:'보존 확인',createdAt:'2026-09-22'}],goals:[tal.id]};
  await page.evaluate(value=>localStorage.setItem('skr.collection.v1',JSON.stringify(value)),backup);
  await ready('/archive/unified.html?view=collection');await page.locator('.skr-backup-help').waitFor();
  assert.match(await page.locator('.skr-backup-help').innerText(),/자동 백업은 아닙니다/);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('skr.collection.v1'))),backup);
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export]').click();const download=await downloadPromise;
  const exported=JSON.parse(fs.readFileSync(await download.path()));assert.deepEqual(exported,backup);
  await page.locator('#importSave').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  assert.equal(await page.locator('[data-save=quantity]').count(),1);assert.equal(await page.locator('[data-save=quantity]').inputValue(),'2');
  const beforeInvalid=await page.evaluate(()=>localStorage.getItem('skr.collection.v1'));
  await page.locator('#importSave').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
  assert.equal(await page.evaluate(()=>localStorage.getItem('skr.collection.v1')),beforeInvalid);
  await shot('backup-desktop',page.locator('#content'));
  checks.push('existing collection: notes/quantity unchanged; exported JSON exact; duplicate merge and invalid import preserve stored data');
  await ready('/archive/unified.html?view=detail&id='+encodeURIComponent(tal.id));await page.locator('.skr-next-hint').waitFor();
  for(const action of ['farm','gear','store','goal'])assert.equal(await page.locator('#content [data-action='+action+']').count(),1);
  await page.locator('#content [data-action=gear]').click();await page.locator('#targetSlot').waitFor();assert.equal(await page.locator('#targetSlot').inputValue(),'amulet');
  checks.push('existing item actions remain single original controls and equipment comparison retains selected item');
  await ready('/archive/image-appraisal.html');await page.waitForFunction(()=>window.SKR_APPRAISAL_UI&&window.SKR_OCR_EVIDENCE);
  async function prepare(lines,quality){
   await page.evaluate(lines=>{SKR_OCR_EVIDENCE.reset();SKR_OCR_EVIDENCE.accept(lines.map(text=>({text,confidence:99})));},lines);
   if(quality)await page.locator('#sourceQuality').selectOption(quality);
   await page.evaluate(()=>SKR_OCR_EVIDENCE.complete());await page.locator('.skr-result-next').waitFor();
  }
  await prepare(['탈 라샤의 선고','목걸이','요구 레벨: 67','원소술사 기술 +2','번개 피해 3 - 32 추가','생명력 +50','마나 +42','번개 저항 +33%'],'set');
  const ledger=await page.evaluate(()=>JSON.stringify(SKR_OCR_EVIDENCE.getLedger())),result=await page.evaluate(()=>JSON.stringify(SKR_APPRAISAL_UI.getResult()));
  const itemLink=page.locator('.skr-result-next a').first();assert.equal(new URL(await itemLink.getAttribute('href'),origin).searchParams.get('id'),tal.id);assert.equal(await itemLink.getAttribute('target'),'_blank');
  await page.locator('[data-skr-market]').click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.market),'platform');
  assert.equal(await page.locator('[data-market=platform]').inputValue(),'');assert.equal(await page.locator('#tradeReviewed').isChecked(),false);
  assert.equal(await page.evaluate(()=>JSON.stringify(SKR_OCR_EVIDENCE.getLedger())),ledger);assert.equal(await page.evaluate(()=>JSON.stringify(SKR_APPRAISAL_UI.getResult())),result);
  await shot('result-desktop',page.locator('#assessmentResult'));
  await page.locator('.skr-inline-report').click();await page.locator('#skr-report-actual').fill('사진 값 확인 필요');
  assert(!(await page.locator('#skr-report-preview').inputValue()).includes('번개 저항'));await page.keyboard.press('Escape');
  checks.push('result actions: exact set identity, new-tab guide, focus-only market jump, no automatic search/review or OCR/result mutation');
  await page.locator('[data-assessment-option]').first().fill('21');await page.locator('[data-assessment-option]').first().press('Tab');await page.locator('.skr-result-next').waitFor({state:'detached'});
  await prepare(['악랄한 손아귀','반지','요구 레벨: 51','시전 속도 +10%','최소 피해 +9','명중률 +30','마력 +7','모든 저항 +11','적 처치 시 마나 +1'],'rare');
  const rare=new URL(await page.locator('.skr-result-next a').first().getAttribute('href'),origin);assert.equal(rare.searchParams.get('loot'),'rare');assert.equal(rare.searchParams.get('q'),'반지');
  checks.push('source changes remove old next actions; rare result links to its quality/slot criteria without inventing exact-item statistics');
  for(const width of [390,768]){
   await page.setViewportSize({width,height:844});await noOverflow();await shot('result-'+width,page.locator('.skr-result-next'));
   await page.locator('.skr-inline-report').click();await noOverflow();assert(await page.locator('.skr-report').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
   assert(await page.locator('#skr-report-steps').evaluate(n=>n.clientWidth>n.closest('form').clientWidth-8));
   assert.equal(await page.locator('.skr-report').evaluate(n=>getComputedStyle(n).borderTopWidth),'1px');
   for(let tab=0;tab<13;tab++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('.skr-report')));}
   await shot('feedback-'+width,page.locator('.skr-report'));await page.keyboard.press('Escape');
   await ready('/archive/unified.html?view=collection');await page.locator('.skr-backup-help').waitFor();await noOverflow();await shot('backup-'+width,page.locator('#content'));
   await ready('/index.html');await noOverflow();await shot('home-'+width,page.locator('.hero .intro'));
   if(width===390)await ready('/archive/image-appraisal.html');
   if(width===390)await prepare(['마수','라이트 건틀릿','방어력 +30% 증가','시전 속도 +20%'],'unique');
  }
  checks.push('390/768px layouts: no page/dialog overflow; readable help and original forms');
  assert.deepEqual(errors,[]);assert(!outbound.some(r=>r.method!=='GET'));
  console.log(JSON.stringify({result:'PASS',checks,productionWrites:0,feedbackAutomaticallySent:0,existingEnginesModified:false},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
