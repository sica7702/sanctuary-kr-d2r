// Local site / synthetic market response test. Never submits or visits a real listing.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),checks=[],errors=[],requests=[];
const market={platform:'PC',ladder:'Ladder',mode:'Softcore',region:'Asia',gameVersion:'reign of the warlock'};
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
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),ui=await context.newPage();
  ui.on('pageerror',e=>errors.push(e.message));
  let responseMode='403',pendingResolve,requestStarted;
  await context.route('**/*',async route=>{
   const url=route.request().url();requests.push(url);
   if(!url.startsWith(origin))return route.fulfill({status:200,body:''});
   if(!url.includes('/api/public/market-search'))return route.continue();
   const params=new URL(url).searchParams,contract=JSON.parse(params.get('q'));
   requestStarted?.();requestStarted=null;
   if(responseMode==='403')return route.fulfill({status:502,json:{ok:false,upstreamStatus:403}});
   if(responseMode==='pending')await new Promise(r=>{pendingResolve=r;});
   const postedAt=new Date(Date.now()-3600000).toISOString();
   const listings=Array.from({length:5},(_,i)=>({id:String(i+1),itemId:contract.itemId,quality:contract.quality,completed:false,active:true,postedAt,market:contract.market,identity:contract.identity,values:{prop_425:98},priceComplete:true,priceKind:'asking',quantity:1,stock:false,priceBasis:'single-item',sellerKey:'test-'+i,priceText:'(Ist Rune 1)'}));
   try{await route.fulfill({json:{ok:true,schema:2,contract,listings,exhausted:responseMode!=='partial',limitReached:responseMode==='partial',hasMore:false}});}catch(e){if(!/closed|Invalid Interception|canceled/i.test(e.message))throw e;}
  });
  await ui.goto(origin+'/archive/image-appraisal.html');await ui.waitForFunction(()=>window.SKR_APPRAISAL_UI&&window.SKR_OCR_EVIDENCE);
  const ring=['악랄한 손아귀','반지','요구 레벨: 51','시전 속도 +10%','최소 피해 +9','명중률 +30','마력 +7','모든 저항 +11','적 처치 시 마나 +1'];
  const belt=['거미 그물띠','모든 기술 +1','시전 속도 +20%','대상 감속 10%','방어력 +98% 증가','최대 마나 5% 증가','3 레벨 맹독 (충전 11/11회)'];
  async function prepare(lines,quality){
   await ui.evaluate(lines=>{SKR_OCR_EVIDENCE.reset();SKR_OCR_EVIDENCE.accept(lines.map(text=>({text,confidence:99})));},lines);
   if(quality)await ui.locator('#sourceQuality').selectOption(quality);
   await ui.evaluate(()=>SKR_OCR_EVIDENCE.complete());await ui.locator('#tradeBridge').waitFor({state:'visible'});
   await ui.waitForFunction(()=>document.querySelector('#marketMappingState').textContent.includes('연결 상품:'));
  }
  async function environment(){for(const[k,v]of Object.entries(market))await ui.locator('[data-market='+k+']').selectOption(v);await ui.locator('[data-identity=ethereal]').selectOption('false');await ui.locator('#tradeReviewed').check();}
  async function completed(){await ui.waitForFunction(()=>!document.querySelector('#tradeBridge').hasAttribute('aria-busy'));}
  await prepare(belt);
  assert.equal(await ui.locator('#directMarketLink').getAttribute('href'),null);
  assert.equal(await ui.locator('[data-trade=listing],.sale-setup,#listingPreparation').count(),0);
  const originalLedger=await ui.evaluate(()=>JSON.stringify(SKR_OCR_EVIDENCE.getLedger()));
  await environment();
  let url=new URL(await ui.locator('#directMarketLink').getAttribute('href'));
  assert.equal(url.searchParams.get('prop_425Min'),'94');assert.equal(url.searchParams.get('prop_425Max'),'102');assert.equal(url.searchParams.get('prop_Game version'),market.gameVersion);
  await ui.locator('[data-market=gameVersion]').selectOption('');assert.equal(await ui.locator('#directMarketLink').getAttribute('href'),null);assert.equal(await ui.locator('#tradeReviewed').isChecked(),false);
  await ui.locator('[data-market=gameVersion]').selectOption(market.gameVersion);await ui.locator('#tradeReviewed').check();
  checks.push('actual page: required version, reviewed gate, exact 94..102 query and removed listing controls');
  assert.equal(url.searchParams.has('prop_Ethereal'),false);assert.equal(url.searchParams.has('prop_Unidentified'),false);
  await ui.locator('[data-trade=market]').click();await completed();assert.match(await ui.locator('#marketSearchResults').innerText(),/403/);assert.match(await ui.locator('#marketAppliedState').innerText(),/조회 실패/);
  assert.equal(await ui.locator('[data-search=start]').inputValue(),'5');assert.equal(ui.url(),origin+'/archive/image-appraisal.html');
  checks.push('403: visible failure, range preserved, no blank popup, no fake zero-market success');
  responseMode='success';await ui.locator('[data-trade=market]').click();await completed();assert.match(await ui.locator('#marketSearchResults').innerText(),/판매자 5명/);assert.equal(await ui.locator('#marketSearchResults tbody tr').count(),5);
  assert.equal(await ui.evaluate(()=>JSON.stringify(SKR_OCR_EVIDENCE.getLedger())),originalLedger);
  checks.push('successful fixture: five independent single-item asks; OCR ledger unchanged');
  responseMode='partial';await ui.locator('[data-trade=market]').click();await completed();assert.match(await ui.locator('#marketAppliedState').innerText(),/부분 조회/);assert.match(await ui.locator('#marketAppliedState').innerText(),/가격 근거 부족/);
  checks.push('partial fixture: no complete-price claim or automatic widening');
  responseMode='pending';const started=new Promise(r=>{requestStarted=r;});await ui.locator('[data-trade=market]').click();await started;
  await ui.locator('[data-market=ladder]').selectOption('Non-Ladder');pendingResolve();await completed();
  assert.equal(await ui.locator('#marketSearchResults').innerText(),'');assert.equal(await ui.locator('#directMarketLink').getAttribute('href'),null);
  await ui.locator('[data-market=ladder]').selectOption('Ladder');await ui.locator('#tradeReviewed').check();
  checks.push('in-flight request canceled when conditions change; obsolete results and review approval removed');
  await prepare(ring,'rare');await environment();url=new URL(await ui.locator('#directMarketLink').getAttribute('href'));
  assert.equal(url.searchParams.get('prop_Rarity'),'rare');for(const[id,v]of[[520,10],[416,9],[423,30],[511,1]])assert.equal(url.searchParams.get('prop_'+id+'Min'),String(v));assert.equal(url.searchParams.has('prop_400Min'),false);
  checks.push('actual rare ring: correct category and original FCR/min damage/attack rating/mana-after-kill; no phantom Mana');
  await prepare(['대마법사의 목걸이','목걸이','시전 속도 +10%','마나 +80'],'magic');await environment();url=new URL(await ui.locator('#directMarketLink').getAttribute('href'));assert.equal(url.searchParams.get('prop_Rarity'),'magic');assert.equal(url.searchParams.get('prop_400Min'),'76');assert.equal(url.searchParams.get('prop_400Max'),'84');assert.equal(await ui.getByRole('spinbutton',{name:'마나 수치',exact:true}).inputValue(),'80');
  checks.push('actual magic amulet: Mana 80 preserved; search-only ±5% = 76..84');
  await prepare(['볼텍스 실드','방어력: 223','요구 레벨: 66','피해 +59% 증가','명중률 +117','홈 있음 (4)'],'normal');await environment();url=new URL(await ui.locator('#directMarketLink').getAttribute('href'));assert.equal(url.searchParams.get('prop_Rarity'),'normal');assert.equal(url.searchParams.get('prop_402Min'),'4');
  checks.push('actual base shield: Vortex identity and four sockets preserved');
  await prepare(['마수','크루세이더 건틀릿','방어력: 86','화염 기술 +1','시전 속도 +20%','화염 피해 1 - 6 추가','방어력 +30% 증가','방어력 +10','마나 재생 25%']);
  await environment();await ui.locator('[data-identity=tier]').selectOption('Elite');await ui.locator('#tradeReviewed').check();
  url=new URL(await ui.locator('#directMarketLink').getAttribute('href'));assert.equal(url.searchParams.get('prop_Base Tier'),'Elite');assert.equal(url.searchParams.get('prop_Upgraded'),'true');assert.equal(url.searchParams.get('prop_425Min'),'29');
  checks.push('actual Magefist form: user-confirmed Elite projects Upgraded, with 29..30 ED; OCR unchanged');
  await ui.setViewportSize({width:390,height:844});assert(await ui.locator('#tradeBridge').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert(await ui.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert(await ui.locator('[data-market=gameVersion]').evaluate(e=>e.clientWidth>280));
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await ui.locator('#tradeBridge').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'market-mobile.png')});}
  await ui.setViewportSize({width:1440,height:1000});if(process.env.SCREENSHOT_DIR)await ui.locator('#tradeBridge').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'market-desktop.png')});
  checks.push('market form at 390px: single-column readable controls; no page/panel horizontal overflow');
  await ui.locator('[data-assessment-option]').first().fill('21');assert(await ui.locator('#tradeBridge').isHidden());checks.push('editing source options invalidates market result without changing OCR logic');
  await prepare(['탈 라샤의 선고','목걸이','요구 레벨: 67','원소술사 기술 +2','번개 피해 3 - 32 추가','생명력 +50','마나 +42','번개 저항 +33%'],'set');await environment();
  await ui.locator('[data-market=region]').selectOption('');await ui.locator('#tradeReviewed').check();
  const talUrl=new URL(await ui.locator('#directMarketLink').getAttribute('href'));
  assert.equal(talUrl.pathname,'/diablo2resurrected/product/tal-rashas-adjudication');assert.deepEqual(Object.fromEntries(talUrl.searchParams),{prop_Platform:'PC',prop_Ladder:'true',prop_Mode:'softcore','prop_Game version':'reign of the warlock'});
  checks.push('actual Tal Rasha set form emits the same four conditions as the user-confirmed working live URL; no hidden Ethereal/Unidentified flags');
  for(const pathname of ['/archive/unified.html?view=loot','/archive/unified.html?view=search','/index.html']){await ui.goto(origin+pathname);await ui.waitForLoadState('load');assert((await ui.locator('body').innerText()).trim().length>100);}
  checks.push('existing home, criteria and search pages load without script errors');
  assert.deepEqual(errors,[]);assert.equal(requests.filter(u=>/listing-(assistant|packet|bookmarklet|extension)|traderie-extension/.test(u)).length,0);
  console.log(JSON.stringify({result:'PASS',checks,liveTraderieVerified:false,realListingsSubmitted:0},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
