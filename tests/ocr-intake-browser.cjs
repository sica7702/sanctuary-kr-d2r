// OCR-to-appraisal integration fixtures; no upload, external API, or production writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),errors=[];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
  await page.goto(origin+'/archive/image-appraisal.html');
  await page.waitForFunction(()=>window.SKR_OCR_EVIDENCE&&window.SKR_APPRAISAL_UI&&document.getElementById('sourceQuality'));
  const feed=async(raw,quality)=>page.evaluate(({raw,quality})=>{
   window.SKR_OCR_EVIDENCE.reset();
   window.SKR_OCR_EVIDENCE.accept(raw.map((text,i)=>({text,pass:i%2?'대비':'원본',conf:95,i})));
   if(quality){document.getElementById('sourceQuality').value=quality;document.getElementById('sourceQuality').dispatchEvent(new Event('change',{bubbles:true}));}
   return {quality:document.getElementById('sourceQuality').value,identity:document.getElementById('uniqueIdentity').value,options:[...document.querySelectorAll('[data-assessment-option]')].map(n=>({value:n.value,label:n.parentElement.innerText})),ledger:window.SKR_OCR_EVIDENCE.getLedger()};
  },{raw,quality});
  let state=await feed(['깨우침','풀 랄 솔','메이지 플레이트','타격 시 5% 확률로 15 레벨 화염구 시전','피격 시 5% 확률로 15 레벨 불길 시전','방어력 +30% 증가','방어력 +6% 증가','피해 감소 7','피해 감소 1']);
  assert.equal(state.quality,'runeword');assert.equal(state.identity,'runeword:33');
  assert.equal(state.options.filter(x=>x.label.includes('방어력 증가')).length,1);
  assert.equal(state.options.filter(x=>x.label.includes('피해 감소')).length,1);
  assert.equal(state.options.filter(x=>x.label.includes('타격 시 발동')).length,1);
  assert(!state.options.some(x=>x.label.includes('충전 기술')));
  assert(state.options.filter(x=>x.label.includes('판독값')).every(x=>x.value===''));
  assert(state.ledger.some(x=>x.raw.includes('방어력 +6%')));
  const acIndex=state.options.findIndex(x=>x.label.includes('방어력 증가'));
  await page.locator('[data-assessment-option="'+acIndex+'"]').fill('30');
  await page.locator('[data-assessment-option="'+acIndex+'"]').dispatchEvent('change');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-assessment-option]')].some(n=>n.parentElement.innerText.includes('방어력 증가')&&n.value==='30'&&!n.parentElement.innerText.includes('판독값')));
  state=await page.evaluate(()=>({options:[...document.querySelectorAll('[data-assessment-option]')].map(n=>({value:n.value,label:n.parentElement.innerText})),ledger:window.SKR_OCR_EVIDENCE.getLedger()}));
  assert.equal(state.options.filter(x=>x.label.includes('방어력 증가')).length,1);
  assert.equal(state.options.find(x=>x.label.includes('방어력 증가')).value,'30');
  assert.equal(state.ledger.filter(x=>x.options.some(o=>o.code==='ac%')).every(x=>String(x.options.find(o=>o.code==='ac%').value)==='30'),true);
  await page.locator('#runAppraisal').click();
  assert.match(await page.locator('#assessmentResult').innerText(),/깨우침 · 룬워드 옵션 확인/);
  assert.match(await page.locator('#assessmentResult').innerText(),/발동 5% · 기술 레벨 15/);
  assert.match(await page.locator('#assessmentResult').innerText(),/방어력 증가 \(%\)/);
  assert.match(await page.locator('#assessmentResult').innerText(),/피해 감소/);

  const cases=[
   {quality:'rare',raw:['레어 반지','반지','시전 속도 +10%','힘 +15','화염 저항 +28%']},
   {quality:'magic',raw:['매직 목걸이','목걸이','시전 속도 +10%','마나 +80']},
   {quality:'unique',raw:['마수','Magefist','방어력 +30% 증가','시전 속도 +20%']},
   {quality:'set',raw:['탈 라샤의 선고','Tal Rasha\'s Adjudication','모든 저항 +33']},
   {quality:'normal',raw:['볼텍스 방패','소켓 (4)','방어력: 182']},
   {quality:'crafted',raw:['크래프트 목걸이','목걸이','시전 속도 +10%','마나 +25']}
  ];
  for(const fixture of cases){
   const s=await feed(fixture.raw,fixture.quality);
   assert.equal(s.quality,fixture.quality,fixture.quality);
   const codes=s.ledger.flatMap(x=>x.options.map(o=>o.code)).filter(Boolean);
   assert.equal(new Set(codes).size,codes.length,fixture.quality+' duplicated option codes');
   assert(!s.options.some(o=>o.label.includes('판독값')),fixture.quality+' false conflict');
   await page.locator('#runAppraisal').click();
   assert(!(await page.locator('#assessmentResult').innerText()).includes('undefined'),fixture.quality+' undefined result');
  }
  const ring=await feed(['레어 반지','반지','시전 속도 +10%','명중률 +64','적중당 생명력 11% 훔침','힘 +3','생명력 +11','화염 저항 +26%','Fire Resist +26%'],'rare');
  assert.equal(ring.options.length,6,JSON.stringify(ring.options));
  assert.equal(ring.options.filter(o=>o.label.includes('화염 저항')).length,1,JSON.stringify(ring.ledger.filter(x=>x.raw.includes('저항')||x.raw.includes('Resist'))));
  assert.equal(ring.options.find(o=>o.label.includes('화염 저항')).value,'26');
  assert.deepEqual([...new Set(ring.ledger.flatMap(x=>x.options.filter(o=>o.code==='res-fire').map(o=>String(o.param??''))))].sort(),['','0']);
  if(errors.length)console.error(errors.join('\n'));
  assert.deepEqual(errors,[]);
  console.log('OCR→감정 브라우저: 룬워드/레어/매직/유니크/세트/일반/크래프트 및 충돌 정정 통과');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
