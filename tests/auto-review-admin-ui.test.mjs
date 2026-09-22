import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('auto-review admin summary distinguishes policy matches, verified sources and applied actions',()=>{
  const html=fs.readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
  assert.match(html,/id="autoReviewApply"/);
  const start=html.indexOf('const AUTO_REVIEW_REASONS=');
  const end=html.indexOf('async function stats()',start);
  assert(start>=0&&end>start);
  const status={innerHTML:''};
  const report={pending_count:88,policy_matches:2,reparse_needed:86,reparse_eligible:85,eligible_count:1,
    samples:{independent:50,train:25,holdout:25},thresholds:{minLowerBound:.9},
    status:'validated_global_sample',policy_version:'auto-review-v2',automation_enabled:true,
    abstention_reasons:{source_integrity_incomplete:86},
    exclusions:{legacy_unverifiable:33},
    source_checks:[{id:1,ok:true},{id:2,ok:false,reason:'source_snapshot_changed'}],
    applied:[{id:1,ok:true,action:'approve'}]};
  const context={$:()=>status,esc:value=>String(value),report};
  vm.createContext(context);
  vm.runInContext(html.slice(start,end)+'\nrenderAutoReviewStatus(report,"preview");',context);
  assert.match(status.innerHTML,/전체 대기 88/);
  assert.match(status.innerHTML,/통계 기준 통과 2/);
  assert.match(status.innerHTML,/이번 원본 확인 통과 1/);
  assert.match(status.innerHTML,/기존 대기 86건은 수집 정보가 불완전/);
  assert.match(status.innerHTML,/원본 ID가 확인된 85건/);
  assert.match(status.innerHTML,/이전 수집본 검증 불가 33/);
  assert.match(status.innerHTML,/미리보기입니다/);
  vm.runInContext('renderAutoReviewStatus(report,"apply");',context);
  assert.match(status.innerHTML,/자동 승인 1건/);
  assert.match(status.innerHTML,/자동 폐기 0건/);
});
