/* Study 03 — presentation composition only. No source values or rules are written. */
(() => {
  'use strict';
  const $=(selector,host=document)=>host.querySelector(selector);
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
  function mount(){
    if(!document.documentElement.dataset.atelierReady||document.documentElement.dataset.finishReady)return;
    document.documentElement.dataset.finishReady='true';
    $('.studio-preview-note').textContent='SANCTUARY ARCHIVE';

    const hero=$('.studio-hero');
    const title=$('.studio-intro h1');
    title.classList.add('finish-title');
    const rule=make('span','finish-heading-rule');rule.setAttribute('aria-hidden','true');
    $('.studio-eyebrow').before(rule);
    const photo=$('.studio-photo');
    const panel=$('.studio-options');
    photo.classList.add('finish-workspace-panel');panel.classList.add('finish-workspace-panel');
    const photoHeader=make('header','finish-panel-heading');
    const photoNodes=[$('.atelier-section-kicker',photo),$('.studio-section-heading',photo),$('.studio-section-description',photo)];
    photoNodes[0].before(photoHeader);photoNodes.forEach(n=>photoHeader.append(n));
    const panelHeader=make('header','finish-panel-heading');
    const panelNodes=[$('.atelier-section-kicker',panel),$('.studio-section-heading',panel),$(':scope>p',panel)];
    panelNodes[0].before(panelHeader);panelNodes.filter(Boolean).forEach(n=>panelHeader.append(n));

    // Original zoom/fit controls are moved intact, retaining their own listeners.
    const viewerTools=make('div','finish-viewer-tools');viewerTools.setAttribute('aria-label','사진 확대와 축소');
    const zoom=make('div','finish-zoom-readout');
    zoom.append(make('span','','화면 배율'),$('#zoom'));
    const buttons=make('div','finish-zoom-buttons');
    buttons.append($('#minus'),$('#plus'),$('#fit'));
    viewerTools.append(zoom,buttons);
    $('#drop').after(viewerTools);
    $('.publisher-image-tools>summary').textContent='글자 인식 영역 조정';
    const photoCaption=$('.atelier-caption');
    const ornament=make('span','finish-caption-ornament','◇');ornament.setAttribute('aria-hidden','true');
    photoCaption.prepend(ornament);

    const originalActions=$('#runAppraisal').parentElement;
    const actionBlock=make('div','finish-decision-block');
    const actionNote=$('.atelier-judge-note');
    actionNote.before(actionBlock);actionBlock.append(actionNote,originalActions);
    const notePrefix=make('span','finish-note-icon','i');notePrefix.setAttribute('aria-hidden','true');
    actionNote.prepend(notePrefix);

    const resultLayout=$('.publisher-result-layout');
    if(resultLayout){
      const heading=make('header','finish-results-heading');
      const copy=make('div','');
      copy.append(make('span','finish-results-kicker','03 / APPRAISAL & MARKET'),make('h2','','감정 결과와 시세 확인'));
      heading.append(copy,make('p','','감정 근거를 살펴보고, 비교 매물을 확인하세요.'));
      resultLayout.prepend(heading);
    }

    // Read-only UI state: whether the existing canvas/options are visible.
    const update=()=>{
      const picture=$('#canvas');
      const hasPhoto=picture&&picture.style.display!=='none';
      const hasOptions=!!$('.recognized-option');
      const root=document.documentElement;
      for(const [name,value]of [['finishHasPhoto',hasPhoto],['finishHasOptions',hasOptions]]){
        if(root.dataset[name]!==String(value))root.dataset[name]=String(value);
      }
    };
    const stateObserver=new MutationObserver(update);
    stateObserver.observe($('#recognizedOptions'),{childList:true,subtree:true});
    stateObserver.observe($('#canvas'),{attributes:true,attributeFilter:['style','hidden']});
    document.addEventListener('change',update);update();
  }
  const ready=new MutationObserver(()=>{mount();if(document.documentElement.dataset.finishReady)ready.disconnect();});
  ready.observe(document.body,{childList:true,subtree:true});mount();
})();
