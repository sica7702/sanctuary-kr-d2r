(function(){
 'use strict';
 const el=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let enabled=true;
 const reason={independent_human_test_below_30:'적용 가능한 독립 사람 검증 표본 30건 미만',need_two_labels_with_five_examples_each:'서로 다른 정답 2종류가 각각 5건 이상 필요',accuracy_not_validated:'정확도 또는 신뢰 하한 미달',not_better_than_training_prior:'단순 기준선보다 개선되지 않음',worse_than_active_model:'현재 모델보다 검증 오차 증가',automatic_review_requires_stricter_precision:'자동 승인·폐기용 엄격한 검증 기준 미달'};
 reason.no_validated_item_family='부위·종류·직업·래더별 검증 또는 자동 처리 방향별 정밀도 부족';
 reason.worse_than_existing_engine_projection='동일 검증 표본에서 기존 감정 점수의 가치 분류보다 정확도가 낮음';
 async function api(path='',body){const response=await fetch('/api/admin/ai'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await response.json();if(!response.ok)throw Error(result.error||'연결 실패');return result}
 async function load(){
  const target=el('neuralStatus');target.textContent='PC 학습·서버 모델 상태 확인 중…';
  try{const data=await api();enabled=data.enabled;el('neuralPause').textContent=enabled?'학습·모델 사용 중지':'학습·모델 사용 재개';
   const counts=data.counts||[],eligible=counts.filter(c=>c.eligible).reduce((s,c)=>s+c.n,0),excluded=counts.filter(c=>!c.eligible).reduce((s,c)=>s+c.n,0),last=data.jobs?.[0];
   target.innerHTML='<div class="stats"><span class="pill">학습 가능 '+eligible+'건</span><span class="pill">제외 '+excluded+'건</span><span class="pill">PC 연결 키 '+(data.trainer_configured?'발급됨':'미발급')+'</span></div>'+
    '<p><b>'+(data.active?'검증 모델 적용 중 · '+escape(data.active.id.slice(0,12)):'현재 기존 감정 사용 · 활성 신경망 모델 없음')+'</b></p>'+
    '<p>PC가 꺼져 있으면 다음 학습만 기다립니다. 이미 배포된 모델은 서버에서 실행됩니다. 연결 키 발급은 학습 실행기 시작과 다릅니다.</p>'+
    (last?'<p>최근 작업: '+escape(last.status)+' · '+escape(last.updated_at)+(last.error?' · '+escape(last.error):'')+'</p>':'<p>학습 작업 기록이 없습니다. 파일의 PC 학습 설정 안내를 따라 실행기를 연결하세요.</p>')+
    (last?.result?.metrics?Object.entries(last.result.metrics.tasks).map(([task,m])=>'<p><b>'+(task==='value'?'OCR·수동 가치 감정':'자동 승인·폐기')+': '+(m.passed?'검증 통과':'기존 기능 유지')+'</b> · 독립 검증 '+m.accepted+'건 · 정확도 '+Math.round(m.accuracy*100)+'%<br>'+m.reasons.map(r=>escape(reason[r]||r)).join(' / ')+'</p>').join(''):'')+
    '<details><summary>최근 모델 이력·복구</summary>'+(data.jobs||[]).filter(j=>j.result?.metrics?.passed).map(j=>'<p>'+escape(j.updated_at)+' <button type="button" data-ai-restore="'+escape(j.result.model_id)+'">이 검증 모델로 복구</button></p>').join('')+'</details>';
   target.querySelectorAll('[data-ai-restore]').forEach(button=>button.onclick=async()=>{if(!confirm('선택한 검증 모델로 복구할까요? 진행 중 학습의 적용은 취소됩니다.'))return;await api('/rollback',{model_id:button.dataset.aiRestore});load()});
  }catch(error){target.textContent='학습 상태 확인 실패: '+error.message+' · DB 마이그레이션과 로그인 상태를 확인하세요.'}
 }
 async function action(fn){try{await fn()}catch(error){el('neuralStatus').textContent='작업 실패: '+error.message}}
 el('neuralRefresh').onclick=load;
 el('neuralToken').onclick=()=>action(async()=>{if(!confirm('PC 연결 키를 발급할까요? 기존 키가 있으면 즉시 폐기됩니다.'))return;const r=await api('/token',{});el('neuralTokenValue').value=r.token;el('neuralTokenDialog').showModal()});
 el('neuralTokenClose').onclick=()=>el('neuralTokenDialog').close();
 el('neuralTokenDialog').addEventListener('close',()=>{el('neuralTokenValue').value='';load()});
 el('neuralPause').onclick=()=>action(async()=>{await api('/settings',{enabled:!enabled});load()});
 el('neuralRollback').onclick=()=>action(async()=>{if(!confirm('학습 모델 사용을 해제하고 기존 감정으로 복귀할까요? 원본 데이터는 삭제하지 않습니다.'))return;await api('/rollback',{model_id:''});load()});
 window.loadNeuralLearning=load;
})();
