const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../public');
const model={slot:'ring',item_type:'레어',conditions:{fcr:{gte:10,lte:10},str:{gte:15,lte:15}},profile:{},
  effects:{learned_value_tier:2},learning_meta:{source:'reviewed_value',model_version:'review-value-v1',sample_count:32,holdout_accuracy:0.84,
    affix_keys:['fcr','str'],allowed_affix_keys:['fcr','str','life','mana','fire','sockets']}};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/public/rules'||pathname==='/api/public/review-value-model'){
    res.setHeader('Content-Type','application/json');
    res.end(pathname.endsWith('review-value-model')
      ?JSON.stringify({ok:true,revision:'test-model',models:[model]})
      :JSON.stringify({ok:true,revision:'test-rules',rules:[]}));
    return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
  const errors=[];
  try{
    const manual=await browser.newPage();
    manual.on('pageerror',error=>errors.push(error.message));
    await manual.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
    await manual.goto(origin+'/archive/appraisal.html');
    await manual.locator('#tabs .tab[data-id="ring"]').click();
    await manual.locator('#in_fcr').fill('10');
    await manual.locator('#in_str').fill('15');
    await manual.locator('#runAppraise').click();
    await manual.locator('#reviewValueResult').waitFor();
    const manualNote=await manual.locator('#reviewValueResult').innerText();
    const manualScore=await manual.locator('#resultScore').innerText();

    const photo=await browser.newPage();
    photo.on('pageerror',error=>errors.push(error.message));
    await photo.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
    await photo.goto(origin+'/archive/image-appraisal.html');
    await photo.waitForFunction(()=>window.SKR_OCR_EVIDENCE&&window.SKR_APPRAISAL_UI);
    await photo.evaluate(()=>{
      const api=window.SKR_OCR_EVIDENCE;
      api.reset();api.accept(['레어 반지','반지','시전 속도 +10%','힘 +15']
        .map((text,i)=>({text,pass:i%2?'대비':'원본',conf:95,i})));
      const quality=document.getElementById('sourceQuality');
      quality.value='rare';quality.dispatchEvent(new Event('change',{bubbles:true}));
    });
    assert.equal(await photo.locator('#slot').inputValue(),'반지');
    await photo.locator('#runAppraisal').click();
    await photo.locator('#reviewValueResult').waitFor();
    const photoNote=await photo.locator('#reviewValueResult').innerText();
    assert.equal(manualNote,'검수 학습 참고: 높은 가치 · 근거 32건');
    assert.equal(photoNote,manualNote);
    assert.match(manualScore,/아이템 품질/);
    assert.deepEqual(errors,[]);
    console.log('검수 학습 브라우저: OCR·수동 동일 보조 판정 및 기존 점수 유지 통과');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
