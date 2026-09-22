// Focused OCR capture regressions. Runs against a local static server only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../public');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.statusCode=403;return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.fulfill({status:200,body:''}));
  await page.goto(origin+'/archive/image-appraisal.html');
  await page.waitForFunction(()=>window.SKR_OCR_EVIDENCE&&window.SKR_APPRAISAL_UI);

  const state=await page.evaluate(()=>{
   const api=window.SKR_OCR_EVIDENCE;
   const line=(text,pass,i,conf=95)=>({text,pass,i,conf});
   api.reset();
   api.accept([line('반지','원본',0)]);
   const autoBase={code:document.getElementById('evidenceBase').value,button:document.getElementById('runAppraisal').disabled};
   api.accept([line('화염 저항 +26%','원본',1)]);
   document.getElementById('missingRaw').value='OCR 누락 옵션';
   document.getElementById('addRaw').click();
   const fireIndex=api.getLedger().findIndex(row=>row.raw==='화염 저항 +26%');
   const value=document.querySelector('[data-line="'+fireIndex+'"][data-field="value"]');
   value.value='25';
   value.dispatchEvent(new Event('change',{bubbles:true}));
   document.querySelector('[data-line-review="'+fireIndex+'"]').click();
   document.querySelector('[data-line-ignore="0"]').click();
   const before=api.getLedger();
   const extra=[line('반지','추가',0,92),line('화염 저항 +26%','추가',1,92),line('생명력 +11','추가',2,92)];
   api.accept(extra);
   const after=api.getLedger();
   api.accept(extra);
   const repeated=api.getLedger();
   api.reset();
   api.accept([line('목걸이','새 사진',0)]);
   const next=api.getLedger();
   return {autoBase,before,after,repeated,next};
  });
  assert.equal(state.autoBase.code,'rin','base-only OCR should select ring');
  assert.equal(state.autoBase.button,false,'base-only OCR should enable appraisal');
  assert.equal(state.before.find(row=>row.raw==='화염 저항 +26%').reviewed,true);
  assert.equal(state.before.find(row=>row.raw==='반지').status,'ignored');
  assert(state.after.some(row=>row.raw==='수동 입력: OCR 누락 옵션'));
  assert.equal(state.after.find(row=>row.raw==='반지').status,'ignored');
  assert.equal(state.after.find(row=>row.raw==='화염 저항 +26%').options[0].value,'25');
  assert.equal(state.after.find(row=>row.raw==='화염 저항 +26%').reviewed,true);
  assert(state.after.some(row=>row.raw==='생명력 +11'));
  assert.equal(state.after.find(row=>row.raw==='화염 저항 +26%').readings.length,2);
  assert.equal(state.repeated.find(row=>row.raw==='화염 저항 +26%').readings.length,2,'same pass must not duplicate evidence');
  assert.deepEqual(state.next.map(row=>row.raw),['목걸이'],'new photo reset must clear previous evidence');

  await page.evaluate(()=>{document.getElementById('sourceQuality').value='rare';document.getElementById('checkSource').click();});
  const downloadPromise=page.waitForEvent('download');
  await page.evaluate(()=>document.getElementById('exportEvidence').click());
  assert.equal((await downloadPromise).suggestedFilename(),'sanctuary-ocr-evidence.json');

  const capture=await page.evaluate(()=>{
   sourceImg=document.createElement('canvas');
   sourceImg.width=3840;sourceImg.height=2160;
   const top=topBandCanvas(3.4,'color');
   const dimensions={width:top.width,height:top.height,pixels:top.width*top.height};
   top.width=top.height=1;
   const pending=[];
   const originalImage=window.Image;
   window.Image=function(){const image=document.createElement('canvas');image.width=pending.length?222:111;image.height=60;Object.defineProperty(image,'src',{set(url){pending.push({image,url});}});return image;};
   try{
    const blob=new Blob(['image'],{type:'image/png'});
    loadBlob(blob,'A');
    loadBlob(blob,'B');
    pending[1].image.onload();
    pending[0].image.onload();
    const latest={width:document.getElementById('canvas').width,status:document.getElementById('ocrStatus').textContent};
    loadBlob(blob,'C');
    document.getElementById('clear').click();
    pending[2].image.onload();
    const cleared={visible:document.getElementById('canvas').style.display,width:document.getElementById('canvas').width,source:sourceImg};
    return {dimensions,latest,cleared};
   }finally{window.Image=originalImage;}
  });
  assert(capture.dimensions.pixels<=10010000,'top-band canvas should stay near the 10M pixel budget');
  assert.equal(capture.latest.width,222,'late decode of A must not replace B');
  assert.match(capture.latest.status,/B 준비 완료/);
  assert.equal(capture.cleared.visible,'none','clear must invalidate pending decode');
  assert.equal(capture.cleared.source,null);
  assert.deepEqual(errors,[]);
  console.log('OCR 캡처/증거 보존 집중 테스트 통과');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
