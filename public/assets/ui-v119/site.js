/* Site-wide presentation only. No data, controls, routing, calculations or persistence are replaced. */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.classList.contains('tz-compact')){
    const level=document.getElementById('tzCharLevel');
    if(level&&!level.labels?.length&&!level.getAttribute('aria-label'))level.setAttribute('aria-label','캐릭터 레벨');
    root.dataset.refinedReady='true';return;
  }
  const create=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  const brand=()=>{
    const link=create('a','refined-brand');link.href='/archive/library.html';link.setAttribute('aria-label','Sanctuary KR 자료실 홈');
    const mark=create('span','refined-mark','S');mark.setAttribute('aria-hidden','true');
    const word=create('span','refined-word','SANCTUARY');word.append(create('small','','DIABLO II · 한국어 자료실'));
    link.append(mark,word);return link;
  };
  if(root.dataset.publisherPage==='traderie-extension-guide'){
    const head=create('header','refined-document-head');head.append(brand());
    const back=create('a','','사진 감정으로 돌아가기 →');back.href='/archive/image-appraisal.html';head.append(back);document.body.prepend(head);
  }
  const menu=document.querySelector('.archive-menu-wrap');
  if(menu&&!menu.querySelector('.refined-brand'))menu.prepend(brand());
  const oldBrand=document.querySelector('header.top>.brand');
  if(oldBrand){
    // Retain the existing link node and destination. Only its wordmark changes.
    const content=brand();oldBrand.classList.add('refined-brand');oldBrand.replaceChildren(...content.childNodes);
  }
  const main=document.querySelector('main');
  if(main){
    const trail=create('div','refined-trail');
    const crumb=create('div','refined-crumb');const home=create('a','','자료실');home.href='/archive/library.html';
    crumb.append(home,create('span','','/'),create('span','',root.dataset.publisherPage==='library'?'전체 도구':root.dataset.publisherPage==='home'?'성역 커뮤니티':'성역 아카이브'));
    trail.append(crumb,create('span','refined-preview-label','SANCTUARY ARCHIVE'));main.prepend(trail);
  }
  const start=document.querySelector('.publisher-start-grid');
  if(start)[...start.children].forEach((n,i)=>n.dataset.chapter=String(i+1).padStart(2,'0'));
  const footer=document.querySelector('footer,.footer');
  if(footer){
    const signature=create('div','refined-signature');signature.append(create('strong','','SANCTUARY'),create('span','','성역의 기록, 당신의 다음 선택.'));footer.prepend(signature);
  }
  root.dataset.refinedReady='true';
  // Optional navigation/help layer. Failure must never block an existing tool.
  if(!location.pathname.startsWith('/admin')){
    import('./journey.js?v=126').catch(()=>{});
  }
})();
