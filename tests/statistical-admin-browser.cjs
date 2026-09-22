const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
 const root=path.resolve(__dirname,'../public');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 let statisticalRequests=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='admin-test.local')return route.abort();
  if(url.pathname==='/api/admin/stats')return route.fulfill({json:{ok:true,candidates:{pending:0,repair:0},rules:{active:0}}});
  if(url.pathname==='/api/admin/candidates')return route.fulfill({json:{ok:true,results:[],has_more:false}});
  if(url.pathname==='/api/admin/statistical-shadow'){
   statisticalRequests++;
   return route.fulfill({json:{ok:true,report:{status:'insufficient_data',target:'admin_approval_probability',samples:{inputRows:4,independentGroups:2,train:1,holdout:1},metrics:{sampleGatePassed:false,brier:null,baselineBrier:null}},market_evidence:{sampled:2,normalized:0,completed_unverified:1,verified_settlement_labels:0}}});
  }
  if(url.pathname==='/api/admin/ai')return route.fulfill({json:{ok:true,enabled:true,trainer_configured:false,active:null,counts:[],jobs:[]}});
  if(url.pathname==='/api/admin/review-value-learning')return route.fulfill({json:{ok:true,models:[],stats:{}}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,results:[]}});
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/admin/'?'/admin/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
 });
 try{
  await page.goto('http://admin-test.local/admin/');
  await page.getByRole('button',{name:'통계 검증',exact:true}).click();
  await page.locator('#neuralLearningPanel').waitFor();
  assert(await page.getByText('현재 기존 감정 사용 · 활성 신경망 모델 없음',{exact:true}).isVisible());
  await page.getByText('이전 방식의 통계·패턴 참고 자료',{exact:true}).click();
  await page.getByText('학습·검증 표본 부족',{exact:true}).waitFor();
  assert(await page.getByText('가격 AI 준비 상태',{exact:true}).isVisible());
  assert(await page.getByText('검증된 체결가 0').isVisible());
  await page.getByRole('button',{name:'통계 다시 계산',exact:true}).click();
  assert(statisticalRequests>=2);
  await page.setViewportSize({width:390,height:844});
  const widths=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(widths.document<=widths.viewport+1,`horizontal overflow: ${JSON.stringify(widths)}`);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',statisticalRequests,mobileWidth:widths.viewport,errors}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
