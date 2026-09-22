import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('statistical admin tab has a panel, loader and valid inline script', () => {
  const html=fs.readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
  assert.match(html,/<button data-tab="statistical">통계 검증<\/button>/);
  assert.match(html,/<section id="statisticalPanel" class="panel hidden">/);
  assert.match(html,/id="statisticalStatus"/);
  assert.match(html,/else if\(tab==='statistical'\)\{loadReviewValueLearning\(\);loadStatisticalShadow\(\);window\.loadNeuralLearning\?\.\(\);\}/);
  assert.match(html,/id="neuralLearningPanel"/);
  assert.match(html,/id="reviewValueStatus"/);
  assert.match(html,/\/api\/admin\/statistical-shadow/);
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline,'inline admin script is present');
  assert.doesNotThrow(()=>new vm.Script(inline));
});
