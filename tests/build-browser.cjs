const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),builds=JSON.parse(fs.readFileSync(path.join(root,'archive/build-guides.json'))).builds;
const checks=[],errors=[];
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');
 fs.createReadStream(f).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
  async function ready(id,stage='starter'){await page.goto(origin+'/archive/build-guide.html?id='+id+'&stage='+stage);await page.locator('#sources').waitFor();}
  for(const b of builds){
   await ready(b.id);
   for(const stage of ['starter','growth','core','endgame']){
    await page.locator('[data-stage='+stage+']').click();
    assert.equal(await page.locator('[data-stage='+stage+']').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.equipment-card').count(),10);
    assert.equal(await page.locator('.merc-gear article').count(),3);
    assert.equal(await page.locator('#equipment').getByRole('heading',{name:'무엇부터 맞추면 될까요?'}).count(),1);
    assert.equal(new URL(page.url()).searchParams.get('stage'),stage);
    assert(!(await page.locator('#guide').innerText()).includes('undefined'));
   }
  }
  checks.push('50 builds × 4 stage interactions render equipment, mercenary, skill examples and stable URL without errors');
  await ready('nova-sorceress','core');
  assert.match(await page.locator('#gear-offhand').innerText(),/양손/);
  await page.locator('#gear-weapon > summary').focus();await page.keyboard.press('Enter');
  assert(await page.locator('#gear-weapon').evaluate(e=>e.open));assert(await page.locator('#gear-weapon .equipment-body').isVisible());
  await page.locator('.stage-comparison summary').click();assert.equal(await page.locator('.stage-comparison tbody tr').count(),10);
  await page.locator('#charLevel').fill('55');await page.locator('#charLevel').press('Tab');assert.equal(await page.locator('#charLevel').inputValue(),'55');
  await page.locator('#questPoints').selectOption('4');assert.match(await page.locator('.points').innerText(),/58/);
  checks.push('native keyboard disclosure, 4-column comparison, level and quest allocation controls work');
  const shots=process.env.SCREENSHOT_DIR;
  if(shots){fs.mkdirSync(shots,{recursive:true});await ready('lightning-spearzon','core');await page.locator('#equipment').screenshot({path:path.join(shots,'equipment-desktop.png')});await page.locator('.build-journey').screenshot({path:path.join(shots,'roadmap-desktop.png')});await page.locator('#mercenary').screenshot({path:path.join(shots,'merc-desktop.png')});}
  await page.goto(origin+'/archive/integrated-tools.html?pane=builds');await page.locator('#buildPath').waitFor();assert.equal(await page.locator('a.build-card').count(),50);
  assert.equal(await page.locator('#pane-builds .build-tools label').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','filter labels must not inherit dark control backgrounds');
  await page.locator('#buildClass').selectOption({label:'아마존'});assert.equal(await page.locator('a.build-card').count(),6);
  await page.locator('#buildQ').fill('무한');assert((await page.locator('a.build-card').count())>=1);
  await page.locator('#buildReset').click();await page.locator('#buildPath').selectOption('transition');assert((await page.locator('a.build-card').count())<50);
  await page.locator('#buildQ').fill('없는빌드테스트');assert(await page.locator('.build-empty').isVisible());await page.locator('#clearBuildSearch').click();assert.equal(await page.locator('a.build-card').count(),50);
  if(shots)await page.locator('#pane-builds').screenshot({path:path.join(shots,'directory-desktop.png')});
  checks.push('directory: all 50, class, alias/equipment search, transition filter, zero-result reset');
  await page.goto(origin+'/archive/integrated-tools.html?pane=merc');await page.locator('[data-merc-guide="0"]').waitFor();
  for(let i=0;i<4;i++){await page.locator('[data-merc-guide="'+i+'"]').click();assert.equal(await page.locator('.merc-stage-card').count(),3);}
  checks.push('all four mercenary types render starter/build-up/end alternatives');
  for(const width of [390,768]){
   await page.setViewportSize({width,height:844});await ready('nova-sorceress','endgame');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'guide width '+width);
   await page.locator('.stage-comparison summary').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'comparison width '+width);
   if(shots&&width===390){await page.locator('.build-journey').screenshot({path:path.join(shots,'roadmap-mobile.png')});await page.locator('#equipment').screenshot({path:path.join(shots,'equipment-mobile.png')});}
   await page.goto(origin+'/archive/integrated-tools.html?pane=builds');await page.locator('#buildPath').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'directory width '+width);
   await page.goto(origin+'/archive/integrated-tools.html?pane=merc');await page.locator('.merc-stage-card').first().waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'merc width '+width);
  }
  checks.push('390px mobile and 768px tablet: guide, comparison, directory and mercenary no page overflow');
  await page.goto(origin+'/archive/build-guide.html?id=invalid');await page.getByText('존재하지 않는 빌드입니다.',{exact:false}).waitFor();
  await page.route('**/build-guides.json',r=>r.fulfill({status:503,body:''}));await page.goto(origin+'/archive/build-guide.html?id=javazon');await page.getByRole('alert').waitFor();
  checks.push('invalid build and failed data fetch show actionable errors');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks,liveInGameTested:false},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
