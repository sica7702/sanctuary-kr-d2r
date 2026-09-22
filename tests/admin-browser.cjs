const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'../public'),shots=process.env.SCREENSHOT_DIR;
 if(shots)fs.mkdirSync(shots,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],posts=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const candidate={id:1373,title:'테스트 후보 · 티아라',item_type:'레어',source_type:'market_observation',source_url:'',created_at:'2026-09-21',status:'pending',needs_repair:false,review_only_required:true,quantity_unconfirmed:true,repair_reasons:[],evidence:[{source:'traderie',item_type:'레어',listing_id:'fixture-1373',source_snapshot:{item:{name:'Tiara'}},parser_quality:{complete:true,property_coverage:1},integrity:{complete:false},option_rows:[]}],proposal:{parser_quality:{complete:true,property_coverage:1}}};
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname!=='admin-test.local')return route.abort();
  if(url.pathname==='/api/admin/stats')return route.fulfill({json:{ok:true,candidates:{pending:1,repair:0},rules:{active:0}}});
  if(url.pathname==='/api/admin/candidates')return route.fulfill({json:{ok:true,results:url.searchParams.get('status')==='repair'?[{...candidate,id:2,needs_repair:true,quantity_unconfirmed:false,repair_reasons:['해석하지 못한 옵션이 있습니다.']}]:[candidate],has_more:false}});
  if(url.pathname==='/api/admin/review'){
   posts.push(req.postDataJSON());return route.fulfill({json:{ok:true,review_only:!!posts.at(-1).review_only,learning_policy:{learning_eligible:false,reason:'fixture_only'}}});
  }
  if(url.pathname.startsWith('/api/'))throw Error('Unexpected API '+url.pathname);
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/admin/'?'/admin/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
 });
 const open=async(bad=false)=>{await page.evaluate(bad=>{window.feedbackResult=undefined;chooseFeedback('reject',{proposal:{parser_quality:{complete:!bad,property_coverage:bad?.8:1}}}).then(r=>window.feedbackResult=r);},bad);};
 const dialog=()=>page.getByRole('dialog');
 const tag=name=>dialog().getByRole('button',{name,exact:true});
 try{
  await page.goto('http://admin-test.local/admin/');await page.getByText('검수 대기 · 이전 수집 자료',{exact:true}).waitFor();
  for(const status of ['approved','hold'])assert(!(await page.evaluate(status=>reviewQueueHtml({status,quantity_unconfirmed:true}),status)).includes('검수 대기'));
  await open();const buttons=dialog().locator('.review-tag'),count=await buttons.count();assert.equal(count,23);
  for(let i=0;i<count;i++){const b=buttons.nth(i);assert.equal(await b.getAttribute('aria-pressed'),'false');await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true');await b.click();assert.equal(await b.getAttribute('aria-pressed'),'false');}
  await tag('옵션 시너지 좋음').click();await tag('희소 조합').click();await page.mouse.move(0,0);await page.waitForTimeout(200);
  const colors=await tag('옵션 시너지 좋음').evaluate(el=>({background:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color,check:getComputedStyle(el.querySelector('.review-check')).color}));
  assert.equal(colors.background,'rgb(33, 79, 59)');assert.equal(colors.text,'rgb(255, 254, 250)');assert.equal(colors.check,'rgb(33, 79, 59)');
  const confirmStyle=await dialog().getByRole('button',{name:'선택 완료',exact:true}).evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage}));
  assert(confirmStyle.color.match(/\d+/g).slice(0,3).every(n=>Number(n)>=240));assert(confirmStyle.image!=='none'||confirmStyle.background!=='rgb(255, 254, 250)');
  assert((await dialog().getByRole('status').textContent()).includes('선택한 이유 2개'));
  if(shots)await page.screenshot({path:path.join(shots,'admin-reasons-desktop.png')});
  await tag('옵션 시너지 좋음').click();await dialog().getByRole('button',{name:'선택 완료',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.feedbackResult),{tags:['rare_combo'],note:''});assert.equal(posts.length,0);
  checks.push('All 23 reasons toggle independently; selected background, checkmark and count are visible; no submit during selection');
  await page.getByRole('button',{name:'검수 대기',exact:true}).focus();await open();await tag('옵션 시너지 좋음').focus();await page.keyboard.press('Space');assert.equal(await tag('옵션 시너지 좋음').getAttribute('aria-pressed'),'true');
  await dialog().getByRole('button',{name:'취소',exact:true}).focus();await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));
  await page.keyboard.press('Escape');assert.equal(await dialog().count(),0);assert.equal(await page.evaluate(()=>window.feedbackResult),null);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'검수 대기');
  checks.push('Native modal traps focus, supports keyboard Space and Escape, and restores previous focus');
  await open(true);assert.equal(await tag('데이터 불완전').getAttribute('aria-pressed'),'true');assert((await dialog().getByRole('status').textContent()).includes('1개'));await dialog().getByRole('button',{name:'취소',exact:true}).click();
  await open();assert.equal(await tag('데이터 불완전').getAttribute('aria-pressed'),'false');await dialog().getByRole('button',{name:'취소',exact:true}).click();
  checks.push('Incomplete-data default stays visible; cancel/reopen never leaks prior selections');
  page.on('dialog',async d=>{assert.equal(d.type(),'confirm');assert(d.message().includes('단품 거래 검증'));await d.accept();});
  for(const [action,label]of [['approve','승인'],['reject','폐기'],['hold','보류']]){
   await page.locator('article[data-id="1373"]').getByRole('button',{name:label,exact:true}).click();await tag('희소 조합').click();await dialog().getByLabel('추가 메모 (선택)').fill('자동 검증 메모');
   const submitted=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/admin/review');await dialog().getByRole('button',{name:'선택 완료',exact:true}).click();await submitted;
   assert.equal(posts.at(-1).action,action);assert.deepEqual(posts.at(-1).tags,['rare_combo']);assert.equal(posts.at(-1).note,'자동 검증 메모');assert.equal(posts.at(-1).review_only,action==='approve');await page.locator('article[data-id="1373"]').waitFor();
  }
  checks.push('Real admin handlers pass exact reasons/note for approve, reject and hold; quantity-only approval explicitly uses review_only');
  await page.getByRole('button',{name:'수집 보완 필요',exact:true}).click();await page.getByText('수집 보완이 필요한 이유',{exact:true}).waitFor();assert(await page.getByText('해석하지 못한 옵션이 있습니다.',{exact:true}).isVisible());
  checks.push('Repair candidates display their actual repair reason separately from quantity-only pending');
  for(const width of [390,768]){
   await page.setViewportSize({width,height:844});await open();await tag('옵션 시너지 좋음').click();await tag('소켓 프리미엄 중요').click();
   const size=await dialog().evaluate(el=>({width:el.getBoundingClientRect().width,client:el.clientWidth,scroll:el.scrollWidth,height:el.getBoundingClientRect().height}));assert(size.width<=width);assert(size.scroll<=size.client+1);assert(size.height<=844);
   await dialog().getByLabel('추가 메모 (선택)').scrollIntoViewIfNeeded();assert(await dialog().getByRole('button',{name:'선택 완료',exact:true}).isVisible());
   if(shots){await dialog().evaluate(el=>el.scrollTop=0);await page.mouse.move(0,0);await page.waitForTimeout(200);await page.screenshot({path:path.join(shots,'admin-reasons-'+width+'.png')});}
   await dialog().getByRole('button',{name:'취소',exact:true}).click();
  }
  checks.push('390px mobile and 768px tablet: no modal horizontal overflow; long content scrolls with reachable footer');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks,reasonButtons:count,fixtureReviewRequests:posts.length,productionReviewRequests:0,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
