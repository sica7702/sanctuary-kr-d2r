import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {archiveLink,resultLinks,reportLocation,reportText,DISCORD} from '../public/assets/ui-v119/journey-model.js';
test('result navigation preserves exact unique/set identity, not an ambiguous text search',()=>{
 for(const quality of ['unique','set']){
  const links=resultLinks({quality,record:{id:'set:Tal Rasha & test'}});
  const url=new URL(links[0].url,'https://example.org');
  assert.equal(url.searchParams.get('id'),'set:Tal Rasha & test');
  assert.equal(url.searchParams.get('view'),'detail');assert(!url.searchParams.has('q'));
 }
});
test('rare/magic criteria keep quality and slot without inventing a unique identity',()=>{
 for(const quality of ['rare','magic']){
  const links=resultLinks({quality,slot:'반지',base:{id:'base:rin',name:'반지'}});
  const url=new URL(links[0].url,'https://example.org');
  assert.equal(url.searchParams.get('loot'),quality);assert.equal(url.searchParams.get('q'),'반지');
  assert(!links.some(x=>x.url.includes('id=')));
 }
});
test('normal/superior criteria use the base name; missing base remains an unfiltered list',()=>{
 for(const quality of ['normal','superior'])assert.match(resultLinks({quality,base:{name:'볼텍스 실드'}})[0].url,/loot=base/);
 assert(!resultLinks({quality:'normal'})[0].url.includes('undefined'));
});
test('craft has no fabricated criteria tab and build link opens the actual builds pane',()=>{
 const links=resultLinks({quality:'crafted'});assert.equal(links.length,1);
 assert.equal(links[0].url,'/archive/integrated-tools.html?pane=builds');
});
test('report URL excludes free text, arbitrary tokens, and fragments',()=>{
 assert.equal(reportLocation('https://example.org/archive/unified.html?view=detail&id=unique%3A1&q=private&token=secret#private'),'https://example.org/archive/unified.html?view=detail&id=unique%3A1');
});
test('report copy is explicitly not automatic submission',()=>{
 const text=reportText({title:'감정',url:'https://example.org/archive/image-appraisal.html',kind:'기타 의견',steps:'선택',expected:'결과',actual:'빈 화면'});
 assert.match(text,/v126/);assert.match(text,/자동 접수되지 않습니다/);assert.match(text,/선택/);
});
test('feedback destination matches the existing public Discord invite',()=>{
 const home=fs.readFileSync(new URL('../public/assets/js/pages/home-01.js',import.meta.url),'utf8');assert(home.includes(DISCORD));
});
test('UI helper contains no network submissions, storage writes, evaluator calls or auto-search',()=>{
 const js=fs.readFileSync(new URL('../public/assets/ui-v119/journey.js',import.meta.url),'utf8');
 assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\.evaluate\(|\.appraise\(|\.refresh\(|\.click\(/.test(js));
 assert.equal(archiveLink('unified.html',{view:'loot',q:''}),'/archive/unified.html?view=loot');
});
