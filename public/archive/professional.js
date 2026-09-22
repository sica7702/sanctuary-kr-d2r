(()=>{'use strict';
const compact=document.documentElement.classList.contains('tz-compact');
const icons=['M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5','M4 7h4l2-3h4l2 3h4v13H4z M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0','M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0','M12 3l8 5v8l-8 5-8-5V8z M12 3v18 M4 8l8 5 8-5','M4 5h16 M4 12h16 M4 19h16 M8 3v4 M16 10v4 M10 17v4','M3 8l9-5 9 5v12H3z M3 8h18 M9 12h6','M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5'];
const icon=i=>`<svg class="nav-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${icons[i%icons.length]}"/></svg>`;
if(compact){let last=0;new ResizeObserver(()=>{const h=document.body.scrollHeight;if(h!==last){last=h;parent.postMessage({type:'sanctuary-tz-height',height:h},location.origin);}}).observe(document.body);return;}
document.querySelectorAll('.primary-navigation').forEach(nav=>{
  if(!nav.querySelector('a[href="appraisal.html"]')){
    const manual=document.createElement('a');
    manual.href='appraisal.html';
    manual.className='manual-appraisal-link';
    manual.innerHTML='<strong>수동 감정</strong><span>옵션 직접 입력</span>';
    if(location.pathname.endsWith('/appraisal.html'))manual.setAttribute('aria-current','page');
    const photo=nav.querySelector('a[href="image-appraisal.html"]');
    if(photo)photo.after(manual);else nav.append(manual);
  }
  nav.classList.add('has-manual-appraisal');
  Array.from(nav.children).forEach((a,i)=>a.insertAdjacentHTML('afterbegin',icon(a.classList.contains('manual-appraisal-link')?6:i>2?i-1:i)));
});
const aside=document.querySelector('.sidebar'),nav=aside?.querySelector('.nav');
if(nav){
if(!nav.querySelector('a[href="act-guide.html"]')){const guide=document.createElement('a');guide.href='act-guide.html';guide.textContent='초보 액트 1~5 공략';nav.append(guide);}
const links=Array.from(nav.querySelectorAll('a'));const brand=aside.querySelector('.brand');if(brand)brand.innerHTML='<span class="archive-emblem">S</span><span>성역 자료실<small>SANCTUARY KR · ARCHIVE</small></span>';
const groups=[['아이템 · 감정',/unique|sets|bases|magic|rare|appraisal/],['파밍 · 드랍',/terror|drop|area|monster/],['제작 · 계산',/runeword|cube|socket|breakpoint/],['가이드 · 더 보기',/.*/]];
nav.replaceChildren();const home=links.find(a=>a.getAttribute('href')==='index.html');if(home){home.textContent='자료실 홈';home.insertAdjacentHTML('afterbegin',icon(0));nav.append(home);links.splice(links.indexOf(home),1);}
groups.forEach(([name,re],i)=>{const selected=links.filter(a=>re.test(a.getAttribute('href')));if(!selected.length)return;const section=document.createElement('section');section.className='nav-group';const label=document.createElement('h2');label.textContent=name;section.append(label);for(const a of selected){links.splice(links.indexOf(a),1);a.textContent=a.textContent.replace(/^[^가-힣A-Za-z0-9]+/,'').replace('레어이미지전문감정v40','사진 감정');if(a.getAttribute('href')==='image-appraisal.html')a.textContent='사진 감정';if(a.classList.contains('active'))a.setAttribute('aria-current','page');a.insertAdjacentHTML('afterbegin',icon(/appraisal/.test(a.href)?1:/drop|terror/.test(a.href)?3:/unique|sets|bases/.test(a.href)?0:/breakpoint|socket/.test(a.href)?4:2));section.append(a);}nav.append(section);});
aside.id='archive-sidebar';const toggle=document.createElement('button');toggle.className='archive-menu-toggle';toggle.setAttribute('aria-controls',aside.id);toggle.setAttribute('aria-expanded','false');toggle.textContent='자료실 메뉴 열기';aside.before(toggle);toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'자료실 메뉴 닫기':'자료실 메뉴 열기';aside.classList.toggle('menu-open',open);};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&aside.classList.contains('menu-open')){toggle.click();toggle.focus();}});
}
const tab=new URLSearchParams(location.search).get('tab');if(['live','db','rules','farm'].includes(tab))document.querySelector(`.skr-tab[data-tab="${tab}"]`)?.click();
const unified=document.documentElement.hasAttribute('data-unified');const root=location.pathname==='/'||location.pathname==='/index.html';
if(unified){const widget=document.createElement('section');widget.className='home-terror';widget.setAttribute('aria-label','현재와 다음 공포의 영역');widget.innerHTML=`<header class="home-terror-head"><div><span class="section-index">LIVE FIELD REPORT</span><h2>공포의 영역 <span>현재 · 다음 예상</span></h2></div><nav aria-label="공포의 영역 상세 메뉴"><a href="/archive/terror-zones.html">실시간 현황 ↗</a><a href="/archive/terror-zones.html?tab=db">지역 정보</a><a href="/archive/terror-zones.html?tab=rules">레벨 규칙</a></nav></header><iframe title="현재와 다음 공포의 영역 현황" src="/archive/terror-zones.html?compact=1" scrolling="no"></iframe>`;
if(unified){document.querySelector('.workspace').after(widget);const content=document.querySelector('#content');const update=()=>widget.hidden=!content.querySelector('.loot-welcome');new MutationObserver(update).observe(content,{childList:true,subtree:true});update();}else{document.querySelector('main').prepend(widget);}
const frame=widget.querySelector('iframe');addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='sanctuary-tz-height'&&Number.isFinite(e.data.height))frame.style.height=Math.max(200,Math.min(2500,e.data.height))+'px';});}
})();
