import {infer,family} from './ai-contract.mjs';
import {existingValueTier} from './ai-baseline.mjs';
export const PROMOTION_POLICY=Object.freeze({min_test:30,min_per_label:5,min_accuracy:.8,min_wilson:.65,max_age_days:90,min_improvement:.01});
export function wilson(successes,n) {
  if(!n)return 0;const z=1.96,p=successes/n;
  return (p+z*z/(2*n)-z*Math.sqrt((p*(1-p)+z*z/(4*n))/n))/(1+z*z/n);
}
const brier=(p,label)=>p.reduce((s,v,i)=>s+(v-+(label===i))**2,0)/p.length;
export function validateModel(model,dataset,{now=Date.now(),champion=null}={}) {
  const reports={};
  for(const task of ['value','review']) {
    const width=task==='value'?4:2,counts=Array(width).fill(1);
    dataset.train.filter(s=>s.labels[task]!==null).forEach(s=>counts[s.labels[task]]++);
    const total=counts.reduce((a,b)=>a+b,0),prior=counts.map(n=>n/total);
    const rows=dataset.test.filter(s=>s.provenance[task]==='human'&&s.labels[task]!==null&&now-s.reviewed_at<=PROMOTION_POLICY.max_age_days*86400000&&s.reviewed_at<=now);
    const accepted=rows.map(s=>({s,p:infer(model,s.context,task)})).filter(x=>x.p.status==='predicted');
    if(task==='value')for(const x of accepted)x.existing=existingValueTier(x.s.context);
    const byLabel=Array(width).fill(0);let correct=0,error=0,baseline=0;
    for(const {s,p} of accepted) {byLabel[s.labels[task]]++;correct+=+(p.label===s.labels[task]);error+=brier(p.probabilities,s.labels[task]);baseline+=brier(prior,s.labels[task]);}
    const n=accepted.length,accuracy=n?correct/n:0,lower=wilson(correct,n),meanError=n?error/n:null,baseError=n?baseline/n:null,reasons=[];
    if(n<PROMOTION_POLICY.min_test)reasons.push('independent_human_test_below_30');
    if(byLabel.filter(n=>n>=PROMOTION_POLICY.min_per_label).length<2)reasons.push('need_two_labels_with_five_examples_each');
    if(accuracy<PROMOTION_POLICY.min_accuracy||lower<PROMOTION_POLICY.min_wilson)reasons.push('accuracy_not_validated');
    if(meanError===null||meanError+PROMOTION_POLICY.min_improvement>=baseError)reasons.push('not_better_than_training_prior');
    const comparable=task==='value'?accepted.filter(x=>x.existing!==null):[];
    const existingCorrect=comparable.filter(x=>x.existing===x.s.labels.value).length;
    const nextCorrect=comparable.filter(x=>x.p.label===x.s.labels.value).length;
    if(comparable.length&&nextCorrect<existingCorrect)reasons.push('worse_than_existing_engine_projection');
    if(champion) {
      const both=accepted.filter(({s})=>infer(champion,s.context,task).status==='predicted');
      const old=both.reduce((sum,{s})=>sum+brier(infer(champion,s.context,task).probabilities,s.labels[task]),0);
      const next=both.reduce((sum,{s,p})=>sum+brier(p.probabilities,s.labels[task]),0);
      if(both.length&&next>old)reasons.push('worse_than_active_model');
    }
    if(task==='review'&&(accuracy<.95||lower<.85))reasons.push('automatic_review_requires_stricter_precision');
    const families=[];
    for(const key of new Set(accepted.map(x=>family(x.s.context)))) {
      const group=accepted.filter(x=>family(x.s.context)===key),right=group.filter(x=>x.p.label===x.s.labels[task]).length;
      const labels=Array(width).fill(0);for(const x of group)labels[x.s.labels[task]]++;
      const threshold=task==='review'?.85:.65;
      const groupError=group.reduce((sum,x)=>sum+brier(x.p.probabilities,x.s.labels[task]),0)/group.length;
      const groupPrior=group.reduce((sum,x)=>sum+brier(prior,x.s.labels[task]),0)/group.length;
      const actionPrecise=task!=='review'||[0,1].every(label=>{const action=group.filter(x=>x.p.label===label);return action.length>=5&&wilson(action.filter(x=>x.s.labels[task]===label).length,action.length)>=.85});
      const comparableGroup=task==='value'?group.filter(x=>x.existing!==null):[];
      const notWorse=comparableGroup.filter(x=>x.p.label===x.s.labels.value).length>=comparableGroup.filter(x=>x.existing===x.s.labels.value).length;
      if(group.length>=30&&labels.filter(n=>n>=5).length>=2&&right/group.length>=(task==='review'?.95:.8)&&wilson(right,group.length)>=threshold&&groupError+.01<groupPrior&&actionPrecise&&notWorse)families.push(key);
    }
    if(!families.length)reasons.push('no_validated_item_family');
    reports[task]={passed:!reasons.length,reasons,families,total_human_test:rows.length,accepted:n,correct,accuracy,wilson_lower:lower,brier:meanError,baseline_brier:baseError,existing_engine_comparable:comparable.length,existing_engine_correct:existingCorrect,labels:byLabel,coverage:rows.length?n/rows.length:0};
  }
  return {policy:PROMOTION_POLICY,tasks:reports,passed:reports.value.passed||reports.review.passed};
}
