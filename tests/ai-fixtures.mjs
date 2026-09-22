import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {AI_SCHEMA,FEATURE_NAMES,SCALES,canonicalContext,vector,canonicalText,family} from '../ai-contract.mjs';
export function artifactFixture(){
 const weights=[Array(FEATURE_NAMES.length).fill(0)];weights[0][FEATURE_NAMES.indexOf('str:roll')]=1;
 return {schema:AI_SCHEMA,kind:'minilm-distilled-mlp',features:FEATURE_NAMES,
  teacher:{revision:'a'.repeat(40),fine_tuned:true,steps:1,weight_delta:.1},
  layers:[{weights,bias:[0]},{weights:[[-20],[20],[0],[0],[-20],[20]],bias:[6,-6,-20,-20,6,-6]}],
  thresholds:{value:.7,review:.95},support:[{family:'ring|레어|unknown|unknown',reqlevels:[0],keys:['fcr','str','life'],ranges:{fcr:[10,10],str:[1,30],life:[1,100]}}]};
}
export function sampleFixture(id,{str=id%2?2:28,life=id,value=str<10?0:1,review=value,realm='unknown'}={}){
 const context=canonicalContext({slot:'ring',item_type:'레어',profile:{realm},values:{fcr:10,str,life}});
 return {candidate_id:id,eligible:true,listing_key:'fixture:'+id,fingerprint:'fixture-fingerprint-'+id,source_hash:'a'.repeat(64),context,features:vector(context),text:canonicalText(context),family:family(context),labels:{value,review},provenance:{value:value===null?'unlabeled':'human',review:review===null?'unlabeled':'human'},reviewed_at:Date.now()-id*1000,observed_at:Date.now()-id*1000};
}
export function dataFixture(){return {schema:AI_SCHEMA,features:FEATURE_NAMES,train:Array.from({length:64},(_,i)=>sampleFixture(i+1)),calibration:Array.from({length:24},(_,i)=>sampleFixture(i+65)),test:[]}}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]&&process.argv[2]){
 const dataset=dataFixture();
 fs.writeFileSync(process.argv[2],JSON.stringify(dataset));
}
