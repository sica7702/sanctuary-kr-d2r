(function(){
 'use strict';
 let generation=0,controller=null,restore=null;
 function cancel(){generation++;controller?.abort();controller=null;if(restore){restore();restore=null}}
 async function apply({context,heading,anchor,eligible=true,isCurrent=()=>true,onApplied=()=>{}}){
  cancel();if(!eligible||!heading||!anchor)return;
  const current=++generation,original=heading.textContent;controller=new AbortController();
  const requestController=controller;
  const timer=setTimeout(()=>requestController.abort(),6000);
  try{
   const response=await fetch('/api/public/valuation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context}),signal:controller.signal});
   if(!response.ok)return;const result=await response.json();
   if(current!==generation||!heading.isConnected||!isCurrent()||result.status!=='applied'||!Number.isInteger(result.value_tier)||result.value_tier<0||result.value_tier>3)return;
   const labels=['낮은 가치','거래 가능','높은 가치','최상급 후보'];
   heading.textContent=labels[result.value_tier]+' · 학습 기반 가치 평가';
   const note=document.createElement('p');note.id='aiValueResult';note.className='assessment-context muted';
   note.textContent='검수 데이터로 학습·검증한 가치 분류를 적용했습니다. 기존 기준: '+original+'. 아래 점수는 기존 기준 비교 점수이며, 실제 거래 가격은 아닙니다.';
   anchor.after(note);
   restore=()=>{if(heading.isConnected)heading.textContent=original;note.remove()};onApplied(result);
  }catch{/* Existing appraisal remains fully usable offline or when the model abstains. */}
  finally{clearTimeout(timer)}
 }
 document.addEventListener('input',cancel,true);
 document.addEventListener('change',cancel,true);
 window.SKR_AI_APPRAISAL={apply,cancel};
})();
