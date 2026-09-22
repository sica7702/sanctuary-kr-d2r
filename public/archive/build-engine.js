/* Allocation is a reproducible example, not an optimiser or a damage calculator. */
(function(root){
 'use strict';
 function allocate(catalog,plan,level,quests){
  if(!Number.isInteger(level)||level<1||level>99||!Number.isInteger(quests)||quests<0||quests>12)throw Error('레벨 또는 퀘스트 포인트 범위를 확인하세요.');
  const byId=new Map(catalog.map(s=>[s.id,s])),points={},budget=level-1+quests;let left=budget;
  function learn(id,target,stack=new Set()){
   const s=byId.get(id);if(!s)throw Error('등록되지 않은 기술: '+id);
   if(stack.has(id))throw Error('선행 기술 순환: '+id);
   if(s.unlock>level)return;
   stack=new Set(stack).add(id);
   for(const r of s.requires)learn(r,1,stack);
   if(s.requires.some(r=>!points[r]))return;
   const cap=Math.min(target,s.max,level-s.unlock+1),delta=Math.min(left,Math.max(0,cap-(points[id]||0)));
   if(delta){points[id]=(points[id]||0)+delta;left-=delta;}
  }
  for(const id of plan.support||[])learn(id,1);
  for(const [id,n] of plan.priority)learn(id,n);
  return {points,spent:budget-left,left,budget,level,quests};
 }
 root.SKRBuildEngine={allocate};
 if(typeof module!=='undefined')module.exports=root.SKRBuildEngine;
})(typeof window==='undefined'?globalThis:window);
