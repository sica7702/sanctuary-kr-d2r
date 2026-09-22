/* Visual composition only. Existing inputs, listeners and source values remain intact. */
(() => {
  'use strict';
  const $ = (s, h=document) => h.querySelector(s);
  const element = (tag, className, text) => {
    const n=document.createElement(tag); n.className=className||'';
    if(text)n.textContent=text; return n;
  };
  function mount() {
    if(!document.documentElement.dataset.studioReady || document.documentElement.dataset.atelierReady)return;
    document.documentElement.dataset.atelierReady='true';
    const photo=$('.studio-photo'), panel=$('.studio-options');
    const eyebrow=$('.studio-eyebrow'); eyebrow.textContent='SANCTUARY COLLECTION · 아이템 감정';
    $('.studio-preview-note').textContent='SANCTUARY ARCHIVE';

    const descriptions=['사진 선택·붙여넣기','종류와 수치 대조','감정·비교 매물 확인'];
    [...$('.publisher-steps').children].forEach((step,i)=>{
      const label=step.textContent;
      step.textContent='';
      const copy=element('span','atelier-step-copy');
      copy.append(element('b','',label),element('small','',descriptions[i]));
      step.append(copy); step.dataset.stepNumber=String(i+1).padStart(2,'0');
    });
    const photoTitle=$('h3',photo), optionTitle=$(':scope>h2',panel);
    photoTitle.before(element('div','atelier-section-kicker','ORIGINAL IMAGE'));
    optionTitle.before(element('div','atelier-section-kicker','REVIEW OPTIONS'));
    const itemNameLabel=$('.studio-item-name');
    if(itemNameLabel?.firstChild?.nodeType===Node.TEXT_NODE)itemNameLabel.firstChild.textContent='아이템 이름';
    const gallery=element('div','atelier-gallery');
    const drop=$('#drop'); drop.before(gallery);
    gallery.append($('.studio-photo-label'),drop);
    const caption=element('div','atelier-caption');
    const name=element('strong','atelier-item-name','아이템 원본 사진');
    const english=element('span','atelier-item-english','');
    const badge=element('span','atelier-item-kind','');
    const titleBlock=element('div','atelier-caption-title');
    titleBlock.append(name,english);caption.append(titleBlock,badge);gallery.append(caption);
    const details=$('.studio-item-details');
    // These controls already have their own original change listeners.
    // Put ancillary base/level information in the existing native disclosure.
    const detailFields=element('div','formrow atelier-base-fields');
    for(const id of ['evidenceBase','sourceIlvl']) {
      const field=$('#'+id)?.closest('label');
      if(field)detailFields.append(field);
    }
    if(detailFields.childElementCount)details.querySelector('summary').after(detailFields);
    const syncCaption=()=>{
      const read=id=>{const n=$('#'+id);return n?.selectedOptions?.[0]?.textContent?.trim()||'';};
      const unique=$('#uniqueIdentity');
      const hasPicture=$('#canvas')?.style.display!=='none';
      const identity=hasPicture&&unique&&!unique.hidden&&getComputedStyle(unique).display!=='none'&&unique.value ? read('uniqueIdentity') : '';
      const base=hasPicture?read('evidenceBase'):'';
      const parts=identity.split(/\s+·\s+/);
      const title=identity?parts[0]:base&&!/선택|확인 필요/.test(base)?base:'아이템 원본 사진';
      const subtitle=identity&&parts.length>1?parts.slice(1).join(' · '):'사진의 옵션과 오른쪽 수치를 대조하세요';
      const kind=hasPicture?read('sourceQuality'):'';
      if(name.textContent!==title)name.textContent=title;
      if(english.textContent!==subtitle)english.textContent=subtitle;
      if(badge.textContent!==kind)badge.textContent=kind;
      badge.hidden=!kind;
    };
    document.addEventListener('change',syncCaption);
    new MutationObserver(syncCaption).observe($('#recognizedOptions'),{childList:true,subtree:true});
    syncCaption();
    const options=$('#recognizedOptions');
    const columns=element('div','atelier-column-labels');
    columns.setAttribute('aria-hidden','true');
    columns.append(element('span','','아이템 옵션'),element('span','','인식한 수치'));
    options.before(columns);
    const actions=$('#runAppraisal').parentElement;
    actions.classList.add('atelier-judge-actions');
    const guidance=element('p','atelier-judge-note','사진과 수치를 확인한 뒤 감정 결과를 확인하세요.');
    actions.before(guidance);
    const empty=$('#empty');
    const emptyIcon=element('span','atelier-upload-icon');emptyIcon.setAttribute('aria-hidden','true');
    empty.prepend(emptyIcon);
    // No confidence badges, inferred prices, scores or item classifications are added.
  }
  const observer=new MutationObserver(()=>{mount();if(document.documentElement.dataset.atelierReady)observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});mount();
})();
