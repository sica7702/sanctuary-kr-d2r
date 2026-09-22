const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../public');
(async()=>{
  const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],posted=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='admin-test.local')return route.abort();
    if(url.pathname.startsWith('/api/')){
      if(url.pathname==='/api/admin/review'&&route.request().method()==='POST'){
        posted.push(JSON.parse(route.request().postData()));
        return route.fulfill({json:{ok:true,review_only:false,feedback_learning:{stored:true},value_learning:'queued'}});
      }
      if(url.pathname==='/api/admin/stats')return route.fulfill({json:{ok:true,candidates:{pending:0,repair:0},rules:{active:0}}});
      if(url.pathname==='/api/admin/candidates')return route.fulfill({json:{ok:true,results:[],has_more:false}});
      return route.fulfill({json:{ok:true,results:[],has_more:false}});
    }
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/admin/'?'/admin/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
    return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
  });
  try{
    await page.goto('http://admin-test.local/admin/');
    await page.evaluate(()=>{window.__reviewTest=review(42,'reject');});
    const tag=key=>page.locator(`dialog button[data-review-tag="${key}"]`);
    await tag('value_low').click();
    await tag('value_high').click();
    assert.equal(await tag('value_low').getAttribute('aria-pressed'),'false');
    assert.equal(await tag('value_high').getAttribute('aria-pressed'),'true');
    await tag('synergy_good').click();
    await tag('value_trade').click();
    assert.equal(await tag('value_high').getAttribute('aria-pressed'),'false');
    assert.equal(await tag('value_trade').getAttribute('aria-pressed'),'true');
    assert.equal(await tag('synergy_good').getAttribute('aria-pressed'),'true');
    const response=page.waitForResponse(r=>r.url().endsWith('/api/admin/review')&&r.request().method()==='POST');
    await page.locator('dialog .review-confirm').click();
    await response;
    assert.equal(posted.length,1);
    assert.deepEqual(posted[0].tags.filter(tag=>tag.startsWith('value_')),['value_trade']);
    assert(posted[0].tags.includes('synergy_good'));
    assert.equal(posted[0].action,'reject');
    assert.deepEqual(errors,[]);
    console.log('관리자 가치 등급 브라우저: 단일 선택·기타 태그 유지·POST 단일 value 태그 통과');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
