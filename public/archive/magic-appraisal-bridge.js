(function(){
  const rare=window.SKR_RARE_ENGINE;
  if(!rare||!Array.isArray(window.SKR_MAGIC_DATA))return;
  const norm=s=>String(s||'').toLowerCase().replace(/[^0-9a-z가-힣]+/g,'');
  const slotCats={반지:['장신구'],목걸이:['장신구'],써클릿:['써클릿','투구'],장갑:['장갑'],부츠:['일반 방어구'],벨트:['일반 방어구'],갑옷:['갑옷','일반 방어구'],방패:['방패'],무기:['일반 무기'],활:['아마존 무기','일반 무기'],자벨린:['아마존 무기'],클러:['암살자','직업 전용'],오브:['원소술사','직업 전용'],완드:['강령술사','직업 전용'],셉터:['성기사','직업 전용'],'직업 전용':['직업 전용','성기사','강령술사','원소술사','암살자','야만용사','드루이드']};
  const optionWords={
    '공격 속도 증가':['공격속도','공속'], '시전 속도 증가':['시전속도','패캐'],
    '달리기/걷기 속도':['달리기','걷기','달려'], '마법 아이템 발견 확률':['마법아이템','매찬'],
    '투창과 창 기술 레벨':['투창','자벨'], '활과 쇠뇌 기술 레벨':['활','쇠뇌'],
    '지속 효과와 마법 기술 레벨':['지속효과','패시브'], '덫 기술 레벨':['덫','트랩'],
    '번개 기술 레벨':['번개기술'], '화염 기술 레벨':['화염기술'], '냉기 기술 레벨':['냉기기술'],
    '혼돈 기술 레벨':['혼돈기술','악마술사혼돈'], '기괴 기술 레벨':['기괴기술','악마술사기괴'],
    '악마 기술 레벨':['악마기술','악마술사악마'], '악마술사 기술 레벨':['악마술사기술'],
    '모든 기술 레벨':['모든기술'], '생명력':['생명력'], '마나':['마나'],
    '모든 저항':['모든저항','올레지'], '소켓':['소켓'], '방어력 증가':['방어력증가','증방'],
    '피해 증가':['피해증가','증뎀'], '최대 피해':['최대피해','맥뎀']
  };
  function words(name){const n=norm(name);const extra=[];for(const [key,list] of Object.entries(optionWords))if(n.includes(norm(key)))extra.push(...list);return [name,...extra].map(norm).filter(Boolean)}
  function inspect(slot,items){
    const cats=slotCats[slot]||[];
    const records=window.SKR_MAGIC_DATA.filter(r=>cats.includes(r.cat));
    const ranked=records.map(record=>{
      const blob=norm([record.title,record.bases,...(record.aliases||[]),...(record.checks||[]),...(record.tiers||[])].join(' '));
      const matched=items.filter(it=>words(it.name).some(w=>w.length>1&&blob.includes(w))&&(!String(it.value).match(/^\d+$/)||blob.includes(String(it.value))));
      return {record,matched,fit:items.length?Math.round(matched.length/items.length*100):0};
    }).sort((a,b)=>b.matched.length-a.matched.length||b.fit-a.fit);
    const best=ranked[0];
    return best&&best.matched.length>=2?best:null;
  }
  function evaluate(input){
    const base=rare.evaluate(input);
    if(input.rarity!=='매직')return base;
    const hit=inspect(input.slot,input.items||[]);
    const exact=!!hit&&hit.fit===100&&hit.matched.length>=2;
    const items=input.items||[], prefixes=items.filter(x=>/기술 레벨|모든 기술|소켓|방어력 증가|피해 증가/.test(x.name)), suffixes=items.filter(x=>/시전 속도|달리기\/걷기|생명력|마나|저항|마법 아이템/.test(x.name));
    const rangeIssues=items.filter(x=>{const v=Number(x.value);if(!Number.isFinite(v))return true;if(/기술 레벨/.test(x.name))return v<1||v>3;if(/달리기\/걷기 속도/.test(x.name))return v<1||v>30;if(/시전 속도/.test(x.name))return v<1||v>20;return false});
    const structureOk=false;
    const generationCheck={optionCount:items.length,prefixes:prefixes.length,suffixes:suffixes.length,structureOk,rangeOk:false,missingRisk:'원문과 원본 접사 대조 필요'};
    const grade='검토';
    return {...base,mode:'magic',grade,market:exact?'검증된 매직 유형과 핵심 옵션 일치':(structureOk&&!rangeIssues.length?'옵션 판독 정상 · 시세 등급만 보류':'옵션 구조 또는 수치 재확인 필요'),coreFit:hit?hit.fit:0,generationCheck,
      tags:['매직 1접두·1접미',...(hit?[hit.record.title]:[])],
      strengths:hit?[`검증된 매직 유형 “${hit.record.title}”과 ${hit.matched.length}개 핵심 옵션이 일치합니다.`]:(structureOk&&!rangeIssues.length?[`인식된 ${items.length}개 옵션의 수치와 매직 접두·접미 구조가 정상입니다.`]:['현재 입력으로 옵션 구조를 확정할 수 없습니다.']),
      weaknesses:exact?['베이스와 실제 표시 수치를 최종 확인하세요.']:(structureOk&&!rangeIssues.length?['동일 옵션 조합의 교차검증 거래군이 없어 시세 등급은 확정하지 않습니다.']:['옵션과 수치를 다시 확인하세요.']),
      verdict:exact?'입력 옵션이 검증 레코드와 모두 일치합니다. 베이스와 실제 수치를 확인한 뒤 거래 자료와 대조하세요.':(structureOk&&!rangeIssues.length?'OCR로 읽은 옵션과 수치는 매직 1접두·1접미 구조에 맞습니다. 동일 조합의 검증 거래군이 없어 시세 등급만 보류합니다.':'인식 옵션의 수치 또는 접두·접미 구조를 다시 확인해야 합니다.'),
      use:hit?(hit.record.checks||[]).join(' · '):'매직 아이템은 최대 1접두·1접미 조합으로 판정합니다.',
      compare:hit?{title:hit.record.title,fit:hit.fit,tierText:exact?`검증 기준 ${hit.record.grade}`:'유사 유형 · 확정 보류',matched:hit.matched.map(x=>`${x.name} ${x.value}`),missing:exact?[]:['검증 유형의 핵심 옵션 또는 수치']} : null,
      evidence:{record:hit?.record||null,sources:hit?.record.sources||[],marketNote:exact?hit.record.market:'주관적 시세 판단은 적용하지 않았습니다.'},
      buildDemand:{score:0,top:[]}
    };
  }
  window.SKR_RARE_ENGINE={...rare,evaluate};
})();
