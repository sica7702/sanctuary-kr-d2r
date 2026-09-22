const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
 const root=path.resolve(__dirname,'../public');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 let previews=0,applies=0;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',dialog=>dialog.accept());
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='admin-test.local')return route.abort();
  if(url.pathname==='/api/admin/stats')return route.fulfill({json:{ok:true,candidates:{pending:0,repair:88},rules:{active:0}}});
  if(url.pathname==='/api/admin/candidates')return route.fulfill({json:{ok:true,results:[],has_more:false}});
  if(url.pathname==='/api/admin/auto-review'){
   if(route.request().method()==='POST')applies++;else previews++;
   return route.fulfill({json:{ok:true,status:'insufficient_data',pending_count:88,policy_matches:0,
    eligible_count:0,reparse_needed:88,reparse_eligible:85,source_checks:[],applied:[],
    samples:{independent:0,train:0,holdout:0},thresholds:{minLowerBound:.9},
    exclusions:{legacy_unverifiable:33},abstention_reasons:{model_not_validated:88},
    automation_enabled:true}});
  }
  if(url.pathname.startsWith('/api/'))throw Error('Unexpected API '+url.pathname);
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/admin/'?'/admin/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
 });
 try{
  await page.goto('http://admin-test.local/admin/');
  await page.getByRole('button',{name:'처리 가능 여부 확인'}).click();
  await page.getByText('전체 대기 88').waitFor();
  assert(await page.getByText('과거 학습 0건').isVisible());
  assert(await page.getByText(/기존 대기 88건은 수집 정보가 불완전/).isVisible());
  await page.getByRole('button',{name:'지금 자동 검수 실행'}).click();
  await page.getByText(/이번 실행: 자동 승인 0건/).waitFor();
  assert(previews>=1&&applies===1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',previews,applies,errors}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
