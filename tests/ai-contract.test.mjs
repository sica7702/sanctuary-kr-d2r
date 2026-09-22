import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalContext,vector,digest,checkArtifact,infer,FEATURE_NAMES} from '../ai-contract.mjs';
import {sampleFromCandidate,independentSamples,splitDataset} from '../ai-dataset.mjs';
import {validateModel} from '../ai-validation.mjs';
import {artifactFixture,sampleFixture} from './ai-fixtures.mjs';

test('canonical source, manual and OCR features match; aliases cannot duplicate',()=>{
 const source={slot:'ring',item_type:'rare',values:{fcr:10,str:20,fireres:30},profile:{realm:'ladder'}};
 const photo={slot:'반지',item_type:'레어',values:{fcr:10,str:20,fire:30},profile:{realm:'래더'}};
 assert.deepEqual(vector(source),vector(photo));assert.equal(vector(photo).length,FEATURE_NAMES.length);
 assert.equal(canonicalContext({...source,values:{fire:30,fireres:30}}),null);
 assert.equal(canonicalContext({...source,values:{fcr:10,unknown_skill:3}}),null);
 assert.equal(canonicalContext({...source,uncertain:true}),null);
 assert.deepEqual(vector({...source,values:{...source.values,proc_trigger:'없음/선택'}}),vector(source));
 assert.equal(canonicalContext({...source,values:{...source.values,proc_trigger:'타격 시'}}),null);
 assert.equal(canonicalContext({...source,values:{classskill:2}}),null);
 for(const type of ['unique','set','base'])assert.equal(canonicalContext({...source,item_type:type}),null);
});
test('model schema, dimensions and finite weights are enforced',()=>{
 const model=artifactFixture();checkArtifact(model);
 assert.equal(infer(model,sampleFixture(1).context).label,0);
 assert.equal(infer(model,sampleFixture(2).context).label,1);
 const wrong=structuredClone(model);wrong.features.reverse();assert.throws(()=>checkArtifact(wrong),/schema/);
 const bad=structuredClone(model);bad.layers[0].weights[0][0]=Infinity;assert.throws(()=>checkArtifact(bad),/weights/);
 assert.equal(infer(model,{...sampleFixture(1).context,values:{fcr:10,str:300}}).status,'abstain');
 assert.equal(infer(model,{...sampleFixture(1).context,reqlevel:30}).status,'abstain','unseen required level cannot activate untrained features');
});
async function rowFixture(overrides={}){
 const snapshot={id:'123',properties:[{property:'Faster Cast Rate',number:10},{property:'Strength',number:20}]};
 return {id:1,source_type:'market_observation',status:'approved',reviewer_email:'worker-session',learning_eligible:1,reviewed_at:'2026-09-22 01:00:00',reviewer_tags_json:'["value_high"]',proposal_json:'{}',evidence_json:JSON.stringify([{source:'traderie',listing_id:'123',slot:'ring',item_type:'레어',source_snapshot:snapshot,source_snapshot_hash:await digest(snapshot),integrity:{complete:true},parser_quality:{complete:true}}]),...overrides};
}
test('source hashes, human gold, absent quantity and auto labels stay distinct',async()=>{
 const row=await rowFixture(),sample=await sampleFromCandidate(row);assert.equal(sample.eligible,true);assert.equal(sample.labels.value,2);
 assert.equal((await sampleFromCandidate({...row,reviewer_email:'auto-policy'})).labels.value,null);
 assert.equal((await sampleFromCandidate({...row,reviewer_tags_json:'[]'})).labels.value,null);
 assert.equal((await sampleFromCandidate({...row,reviewer_tags_json:'["price_overvalued"]',status:'rejected'})).labels.review,null);
 assert.equal((await sampleFromCandidate({...row,reviewer_tags_json:'["parse_error"]'})).eligible,false);
 assert.equal((await sampleFromCandidate({...row,evidence_json:row.evidence_json.replace('"number":20','"number":30')})).reason,'snapshot_mismatch');
});
test('repeated listings/identical items do not cross folds, conflicts are quarantined',async()=>{
 const a=sampleFixture(1),b={...sampleFixture(2),listing_key:a.listing_key,labels:a.labels};
 assert.equal(independentSamples([a,b]).length,1);
 assert.equal(independentSamples([a,{...b,labels:{value:3,review:1}}]).length,0);
 const first=await splitDataset([a]);const second=await splitDataset([a,b],first.assignments);
 assert.equal(Object.values(second.dataset).filter(Array.isArray).flat().filter(s=>s?.candidate_id).length,1);
 const conflicting=await splitDataset([a,b],{['l:'+a.listing_key]:'train',['f:'+b.fingerprint]:'test'});
 assert.equal(conflicting.dataset.train.length+conflicting.dataset.test.length+conflicting.dataset.calibration.length,0);
});
test('actual deployable student is scored on human holdout; no counts shortcut',()=>{
 const model=artifactFixture(),train=Array.from({length:20},(_,i)=>sampleFixture(i+1)),testRows=Array.from({length:60},(_,i)=>sampleFixture(i+21));
 const pass=validateModel(model,{train,test:testRows});assert.equal(pass.tasks.value.passed,true);assert.equal(pass.tasks.review.passed,true);
 assert.equal(validateModel(model,{train,test:testRows.slice(0,5)}).passed,false);
 const bad=testRows.map(s=>({...s,labels:{value:1-s.labels.value,review:1-s.labels.review}}));assert.equal(validateModel(model,{train,test:bad}).passed,false);
 const weak=testRows.map(s=>({...s,provenance:{value:'weak',review:'auto'}}));assert.equal(validateModel(model,{train,test:weak}).passed,false);
});
