import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../',import.meta.url);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('unchanged criteria, engines, builds and assets match the v129 release',()=>{
 const protection=JSON.parse(fs.readFileSync(new URL('PROTECTED-FILES.json',root)));
 assert.equal(protection.baseline,'v129');
 assert(protection.files.length>250);
 const scopedChanges=new Set([
  'package.json','worker.js','public/admin/index.html','public/archive/appraisal.html','public/archive/image-appraisal.html',
  'public/archive/navigation.css','public/archive/ocr-appraisal.js','public/archive/professional.js',
  'public/archive/runtime-rules.js','public/archive/js/pages/appraisal-01.js',
  'tests/admin-review.test.mjs','tests/protection.test.mjs','DEPLOY.cmd','배포안내.md',
  'admin-review-queue.mjs','market-search-api.mjs','public/archive/market-contract.js',
  'tests/market.test.mjs','traderie-integrity.mjs','tests/admin-browser.cjs'
 ]);
 const actualScoped=new Set(protection.files.filter(file=>file.mode==='scoped-change').map(file=>file.path));
 for(const changed of actualScoped)assert(scopedChanges.has(changed),changed);
 for(const changed of scopedChanges)assert(actualScoped.has(changed),changed);
 for(const file of protection.files){
  if(file.mode==='scoped-change')continue;
  assert.equal(file.mode,'byte-identical',file.path);
  assert.equal(sha(fs.readFileSync(new URL(file.path,root))),file.sha256,file.path);
 }
 for(const protectedPath of ['public/archive/unified-data.json','public/archive/rare-appraisal-engine-v40.js','public/archive/traderie-map.json']){
  assert(!actualScoped.has(protectedPath),protectedPath);
 }
});

test('No automatic listing code returns; updated OCR entry loads the approved-rule adapter',()=>{
 for(const file of ['listing-assistant.js','listing-assistant.css','listing-bookmarklet.js','listing-packet.js','listing-handoff.js','listing-link.js','listing-extension.js','traderie-extension-guide.html','downloads/sanctuary-traderie-extension.zip','downloads/sanctuary-traderie-extension-v030.zip'])assert(!fs.existsSync(new URL('public/archive/'+file,root)),file);
 const html=fs.readFileSync(new URL('public/archive/image-appraisal.html',root),'utf8');
 for(const script of ['ocr-appraisal.js?v=136','ai-valuation.js?v=136','ocr-evidence.js?v=129','image-appraisal-01.js?v=129','runtime-rules.js?v=135','publisher.js?v=122'])assert(html.includes(script),script);
 const bridge=fs.readFileSync(new URL('public/archive/trade-bridge.js',root),'utf8');
 assert(!/listing-(assistant|bookmarklet|packet)|data-trade="listing"/.test(bridge));
});
