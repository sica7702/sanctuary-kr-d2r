const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end()}).pipe(res);
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
 try{
  await page.goto(origin+'/archive/appraisal.html');
  await page.locator('#manualOptionSearch').waitFor();
  const links=await page.locator('.primary-navigation a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  assert.deepEqual(links,['unified.html?view=loot','image-appraisal.html','appraisal.html','unified.html?view=detail','unified.html?view=farm','unified.html?view=gear','unified.html?view=collection']);
  assert.equal(await page.locator('.primary-navigation a.manual-appraisal-link[aria-current="page"]').count(),1);

  const categories=await page.locator('#tabs .tab').evaluateAll(nodes=>nodes.map(node=>node.dataset.id));
  assert.equal(categories.length,16);
  for(const id of categories){
   await page.locator('#tabs .tab[data-id="'+id+'"]').click();
   assert.equal(await page.locator('#in_itemtype option').first().textContent(),'레어',id);
   assert((await page.locator('#in_itemtype option').allTextContents()).includes('매직'),id);
   const duplicateIds=await page.locator('#inputGrid').evaluate(grid=>{const ids=[...grid.querySelectorAll('[id]')].map(node=>node.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)});
   assert.deepEqual(duplicateIds,[],id+' duplicate fields');
   const unlabelled=await page.locator('#inputGrid').evaluate(grid=>[...grid.querySelectorAll('input,select')].filter(node=>!grid.querySelector('label[for="'+node.id+'"]')).map(node=>node.id));
   assert.deepEqual(unlabelled,[],id+' labels');
  }
  await page.locator('#tabs .tab[data-id="gloves"]').click();assert.equal(await page.locator('#in_maxstam').count(),1);
  await page.locator('#tabs .tab[data-id="polearm"]').click();assert.equal(await page.locator('#in_sockets').count(),1);
  await page.locator('#tabs .tab[data-id="claw"]').click();assert.equal(await page.locator('#in_main_name').count(),1);assert.equal(await page.locator('#in_support_name').count(),1);

  await page.locator('#tabs .tab[data-id="ring"]').click();
  await page.locator('#in_fcr').fill('10');
  await page.locator('#q').fill('폴암');
  assert.equal(await page.locator('#in_fcr').inputValue(),'10','part search must not reset current option values');
  assert.equal(await page.locator('#title').innerText(),'레어 반지','part search must not silently switch active part');
  await page.locator('#q').fill('');
  await page.locator('#manualOptionSearch').fill('화염 저항');
  assert(await page.locator('#in_fire').isVisible());
  assert(await page.locator('#in_fcr').isVisible(),'filled option stays visible while searching');
  assert(!(await page.locator('#in_maxdmg').isVisible()));
  await page.locator('#manualOptionSearch').fill('패캐');
  assert.equal(await page.locator('#in_fcr').inputValue(),'10');
  await page.getByRole('button',{name:'전체 옵션 보기'}).click();
  assert(await page.locator('#in_maxdmg').isVisible());

  await page.locator('#tabs .tab[data-id="circlet"]').click();
  await page.locator('#in_itemtype').selectOption('매직');
  await page.locator('#in_skilltab').fill('3');
  await page.locator('#in_maxdmg').fill('12');
  await page.locator('#runAppraise').click();
  const warnings=await page.locator('#resultWarn').innerText();
  assert(!warnings.includes('+3 스킬탭은 매직 전용'));
  assert(!warnings.includes('레어 써클릿 최대피해'));
  assert.match(await page.locator('#resultStrength').innerText(),/물리\/PvP형/);
  await page.locator('#in_itemtype').selectOption('레어');
  await page.locator('#in_skilltab').fill('3');
  await page.locator('#runAppraise').click();
  assert.match(await page.locator('#resultWarn').innerText(),/\+3 스킬탭은 매직 전용/);

  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.locator('.primary-navigation').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'manual-nav-desktop.png')});await page.locator('.appraise-box').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'manual-form-desktop.png')});}

  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('.primary-navigation a.manual-appraisal-link').isVisible());
  assert(await page.locator('#manualOptionSearch').isVisible());
  assert(await page.locator('#manualOptionSearch').evaluate(node=>node.getBoundingClientRect().width>260));
  if(process.env.SCREENSHOT_DIR)await page.locator('.appraise-box').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'manual-form-mobile.png')});
  await page.goto(origin+'/archive/image-appraisal.html');
  assert.equal(await page.locator('.primary-navigation a.manual-appraisal-link').count(),1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',categories:categories.length,checks:['7-link navigation','all 16 slots and labels','missing option fields','non-destructive part search','searchable option fields','magic/rare warning separation','mobile visibility','photo page navigation']},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
