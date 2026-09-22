(function(){
  const state={ready:false,online:false,revision:null,rules:[],error:null};
  const valueState={ready:false,online:false,revision:null,models:[],error:null};
  const VALUE_LABELS=['낮음','거래 가능','높은 가치','최상급 후보'];

  function setStatus(){
    const el=document.getElementById('runtimeDbStatus');
    if(!el)return;
    if(state.online){
      el.textContent=`운영 규칙 DB 연결 · ${state.rules.length}개`;
      el.style.borderColor='#365b42';el.style.color='#a9d6b6';el.style.background='#0e1711';
    }else{
      el.textContent='운영 규칙 DB 미연결 · 기본 v62 규칙 사용';
      el.style.borderColor='#5b4932';el.style.color='#d3b98d';el.style.background='#17120d';
    }
  }

  function cmp(actual, spec){
    if(spec===null || spec===undefined)return true;
    if(actual===null || actual===undefined)return false;
    if(typeof spec!=='object' || Array.isArray(spec)) return actual===spec;
    if('eq' in spec && actual!==spec.eq)return false;
    if('neq' in spec && actual===spec.neq)return false;
    if(['gte','lte','gt','lt'].some(k=>k in spec) && !Number.isFinite(Number(actual)))return false;
    if('gte' in spec && Number(actual)<Number(spec.gte))return false;
    if('lte' in spec && Number(actual)>Number(spec.lte))return false;
    if('gt' in spec && Number(actual)<=Number(spec.gt))return false;
    if('lt' in spec && Number(actual)>=Number(spec.lt))return false;
    if('truthy' in spec && Boolean(actual)!==Boolean(spec.truthy))return false;
    if(Array.isArray(spec.in) && !spec.in.includes(actual))return false;
    if('contains' in spec && !String(actual??'').includes(String(spec.contains)))return false;
    return true;
  }

  function matches(rule,ctx){
    if(rule.slot && rule.slot!==ctx.slot)return false;
    if(rule.item_type && rule.item_type!==ctx.item_type)return false;
    for(const [k,spec] of Object.entries(rule.conditions||{})){
      if(!cmp(ctx.values?.[k],spec))return false;
    }
    for(const [k,spec] of Object.entries(rule.profile||{})){
      if(!cmp(ctx.profile?.[k],spec))return false;
    }
    return true;
  }

  function evaluate(ctx){
    let scoreDelta=0;
    const matched=[],strengths=[],warnings=[],tags=[];
    for(const rule of state.rules){
      if(rule?.effects?.market_watch_only===true)continue;
      if(!matches(rule,ctx))continue;
      const ef=rule.effects||{};
      scoreDelta += Number(ef.score_delta)||0;
      if(ef.strength_note)strengths.push(String(ef.strength_note));
      if(ef.warning_note)warnings.push(String(ef.warning_note));
      if(Array.isArray(ef.tags))tags.push(...ef.tags.map(String));
      matched.push({rule_key:rule.rule_key,label:rule.label,delta:Number(ef.score_delta)||0});
    }
    return {
      scoreDelta:Math.max(-30,Math.min(30,scoreDelta)),
      matched,strengths,warnings,tags,
      online:state.online,revision:state.revision
    };
  }

  // Review-derived value tiers are advisory. They never alter the established
  // appraisal score, grade, or the valuation-rule evaluator above.
  function modelCmp(actual,spec){
    if(actual===null||actual===undefined||spec===null||spec===undefined)return false;
    if(typeof spec!=='object'||Array.isArray(spec))return actual===spec;
    const keys=Object.keys(spec),allowed=new Set(['eq','neq','gte','lte','gt','lt','truthy','in','contains']);
    if(!keys.length||keys.some(key=>!allowed.has(key)))return false;
    if('eq' in spec&&actual!==spec.eq)return false;
    if('neq' in spec&&actual===spec.neq)return false;
    for(const [key,compare] of [['gte',(a,b)=>a>=b],['lte',(a,b)=>a<=b],['gt',(a,b)=>a>b],['lt',(a,b)=>a<b]]){
      if(!(key in spec))continue;
      const a=Number(actual),b=Number(spec[key]);
      if(!Number.isFinite(a)||!Number.isFinite(b)||!compare(a,b))return false;
    }
    if('truthy' in spec&&Boolean(actual)!==Boolean(spec.truthy))return false;
    if('in' in spec&&(!Array.isArray(spec.in)||!spec.in.includes(actual)))return false;
    if('contains' in spec&&!String(actual).includes(String(spec.contains)))return false;
    return true;
  }

  function exactAffixKeys(ctx,meta){
    const required=meta?.affix_keys,allowed=meta?.allowed_affix_keys;
    if(!Array.isArray(required)||!required.length||!Array.isArray(allowed)||!allowed.length)return false;
    const keys=new Set(allowed.filter(key=>typeof key==='string'&&key!=='reqlevel'));
    if(keys.size!==allowed.length)return false;
    if(required.some(key=>!keys.has(key))||new Set(required).size!==required.length)return false;
    const actual=Object.entries(ctx.values||{}).filter(([key,value])=>
      key!=='reqlevel'&&value!==''&&value!==null&&value!==undefined&&
      Number.isFinite(Number(value))&&Number(value)!==0).map(([key])=>key);
    if(actual.some(key=>!keys.has(key)))return false;
    return actual.length===required.length&&required.every(key=>actual.includes(key));
  }

  function evaluateValue(ctx){
    const abstain={status:'abstain',revision:valueState.revision};
    if(!valueState.ready||!valueState.online||!ctx?.slot||!ctx?.item_type)return abstain;
    const matches=[];
    for(const model of valueState.models){
      if(!model||model.active===false||model.active===0||model.slot!==ctx.slot||model.item_type!==ctx.item_type)continue;
      const conditions=model.conditions,profile=model.profile||{},meta=model.learning_meta||{};
      const tier=Number(model.effects?.learned_value_tier),sampleCount=Number(meta.sample_count),accuracy=Number(meta.holdout_accuracy);
      if(meta.source!=='reviewed_value'||meta.model_version!=='review-value-v1'||
         !conditions||typeof conditions!=='object'||Array.isArray(conditions)||!Object.keys(conditions).length||
         !profile||typeof profile!=='object'||Array.isArray(profile)||
         !Number.isInteger(tier)||tier<0||tier>=VALUE_LABELS.length||
         !Number.isInteger(sampleCount)||sampleCount<=0||!Number.isFinite(accuracy)||accuracy<0||accuracy>1)continue;
      if(!exactAffixKeys(ctx,meta))continue;
      if(meta.affix_keys.includes('classskill')&&(!profile.char||!ctx.profile?.char||meta.class_char!==ctx.profile.char))continue;
      if(Object.entries(conditions).some(([key,spec])=>!modelCmp(ctx.values?.[key],spec)))continue;
      if(Object.entries(profile).some(([key,spec])=>!modelCmp(ctx.profile?.[key],spec)))continue;
      matches.push({model,tier,sampleCount,accuracy,specificity:Object.keys(conditions).length+Object.keys(profile).length});
    }
    if(!matches.length||matches.some(hit=>hit.tier!==matches[0].tier))return abstain;
    matches.sort((a,b)=>b.specificity-a.specificity||b.accuracy-a.accuracy||b.sampleCount-a.sampleCount);
    const chosen=matches[0];
    return {status:'learned',value_tier:chosen.tier,label:VALUE_LABELS[chosen.tier],
      sample_count:chosen.sampleCount,holdout_accuracy:chosen.accuracy,
      matched_count:matches.length,revision:valueState.revision};
  }

  async function loadValue(){
    try{
      const response=await fetch('/api/public/review-value-model',{headers:{'Accept':'application/json'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const body=await response.json();
      if(!body.ok||!Array.isArray(body.models))throw new Error(body.error||'invalid_response');
      valueState.models=body.models;valueState.revision=body.revision||null;valueState.online=true;valueState.error=null;
    }catch(error){
      valueState.models=[];valueState.revision=null;valueState.online=false;valueState.error=String(error?.message||error);
    }finally{
      valueState.ready=true;
      window.dispatchEvent(new CustomEvent('skr-review-value-model-ready',{detail:{...valueState}}));
    }
  }

  async function load(){
    try{
      const r=await fetch('/api/public/rules',{headers:{'Accept':'application/json'}});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      if(!j.ok || !Array.isArray(j.rules))throw new Error(j.error||'invalid_response');
      state.rules=j.rules;state.revision=j.revision;state.online=true;state.error=null;
    }catch(e){
      state.rules=[];state.revision=null;state.online=false;state.error=String(e?.message||e);
    }finally{
      state.ready=true;setStatus();
      window.dispatchEvent(new CustomEvent('skr-runtime-rules-ready',{detail:{...state}}));
    }
  }

  window.SKR_RUNTIME_RULES={state,valueState,evaluate,evaluateValue,reload:load,reloadValue:loadValue};
  function loadAll(){load();loadValue();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadAll);
  else loadAll();
})();
