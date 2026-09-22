import fs from 'node:fs';
import assert from 'node:assert/strict';
import {checkArtifact,probabilities} from '../ai-contract.mjs';
const [artifactPath,reportPath]=process.argv.slice(2);
const artifact=checkArtifact(JSON.parse(fs.readFileSync(artifactPath,'utf8'))),report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const softmax=a=>{const m=Math.max(...a),e=a.map(x=>Math.exp(x-m)),total=e.reduce((s,v)=>s+v,0);return e.map(x=>x/total)};
let maxError=0;
for(const row of report.parity){const actual=probabilities(artifact,row.features);for(const [task,a,b] of [['value',0,4],['review',4,6]]){const expected=softmax(row.logits.slice(a,b));for(let i=0;i<expected.length;i++)maxError=Math.max(maxError,Math.abs(actual[task][i]-expected[i]))}}
assert(maxError<1e-5);assert(report.pretrained_weight_delta>0);assert(report.teacher_steps>0);
console.log(JSON.stringify({fine_tuning_verified:true,fixture_only:report.fixture_only,max_probability_error:maxError,seconds:report.seconds,device:report.device}));
