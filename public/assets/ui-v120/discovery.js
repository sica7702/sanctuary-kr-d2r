/* Discovery UI only. Reuses existing criteria search and category-button handlers.
   No appraisal rules, item data, calculations, API calls, or storage are changed. */
(() => {
  'use strict';
  const html=document.documentElement;
  const $=(s,host=document)=>host.querySelector(s);
  const all=(s,host=document)=>[...host.querySelectorAll(s)];
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const setText=(n,text)=>{if(n&&n.textContent!==text)n.textContent=text;};
  const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g,'');

  function criteria(){
    const hero=$('.archive-hero'),search=$('.searchbar'),query=$('#query'),content=$('#content');
    if(!hero||!search||!query||!content)return;
    const intro=el('div','discovery-loot-intro');
    intro.append(el('p','discovery-eyebrow','ITEM KEEP GUIDE'),el('h1','','득환 기준, 바로 찾아보세요'),el('p','','아이템 이름이나 별명, 찾는 옵션을 입력하세요. 종류와 부위로 좁혀볼 수도 있습니다.'));
    hero.insertBefore(intro,search);
    const submit=el('button','discovery-search-submit','기준 검색');submit.type='button';submit.disabled=true;
    $('#clearQuery').before(submit);
    const examples=el('div','discovery-loot-examples');examples.setAttribute('aria-label','득환 기준 검색 예시');
    examples.append(el('span','','이렇게 찾아보세요'));
    for(const word of ['패캐링','모너크','3투창20공속','증어레']){const b=el('button','',word);b.type='button';b.dataset.lootQuery=word;examples.append(b);}
    search.append(examples);
    const filters=el('div','discovery-loot-filters'),field=el('label','discovery-part-field','장비 부위');field.htmlFor='criteriaPart';
    const part=el('select');part.id='criteriaPart';field.append(part);
    const status=el('p','discovery-loot-status');status.id='criteriaSearchStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    query.setAttribute('aria-describedby','criteriaSearchStatus');
    const reset=el('button','discovery-reset','검색·필터 초기화');reset.type='button';reset.disabled=true;
    filters.append(field,status,reset);hero.append(filters);
    part.addEventListener('change',()=>{
      // The original button still owns filtering. Do not reconstruct its predicate.
      all('.criteria-categories [data-loot-category]').find(b=>b.dataset.lootCategory===part.value)?.click();
    });
    reset.addEventListener('click',()=>{
      $('.criteria-types [data-loot-type=""]')?.click();
      $('#clearQuery').click();
    });
    submit.addEventListener('click',()=>{
      query.dispatchEvent(new Event('input',{bubbles:true}));
      requestAnimationFrame(()=>{
        const heading=$('.criteria-browser h2');
        if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});}
      });
    });
    query.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&!event.isComposing&&html.dataset.publisherView==='loot'&&!submit.disabled){event.preventDefault();submit.click();}
    });
    let pendingType=null,queued=false;
    document.addEventListener('click',event=>{
      const button=event.target.closest('.criteria-types [data-loot-type]');
      if(button)pendingType=button.dataset.lootType;
    },true);
    const refresh=()=>{
      queued=false;
      const browser=$('.criteria-browser'),isLoot=html.dataset.publisherView==='loot';
      const live=isLoot?'off':'polite';if(content.getAttribute('aria-live')!==live)content.setAttribute('aria-live',live);
      if(!browser)return;
      const buttons=all('.criteria-categories [data-loot-category]',browser);
      const signature=JSON.stringify(buttons.map(b=>[b.dataset.lootCategory,b.textContent]));
      if(part.dataset.options!==signature){
        part.replaceChildren(...buttons.map(b=>{const option=el('option','',b.textContent);option.value=b.dataset.lootCategory;return option;}));
        part.dataset.options=signature;
      }
      const category=buttons.find(b=>b.getAttribute('aria-pressed')==='true');
      part.value=category?.dataset.lootCategory||'';
      const type=$('.criteria-types [aria-pressed=true]',browser)?.textContent||'전체';
      const count=$('.criteria-count',browser)?.textContent||'';
      setText(status,[query.value.trim()?`“${query.value.trim()}”`:'전체 검색',type,category?.textContent||'모든 부위',count].join(' · '));
      submit.disabled=false;reset.disabled=false;
      if(!browser.dataset.discoveryReady){
        browser.dataset.discoveryReady='true';
        setText($('.welcome-heading h2',browser),'확인할 기준');
        setText($('.welcome-heading .eyebrow',browser),'기준 내용은 그대로, 필요한 항목만 찾아보세요');
        const empty=$('.empty',browser);
        if(empty){
          const retry=el('button','discovery-empty-reset','검색·필터 초기화');retry.type='button';retry.addEventListener('click',()=>reset.click());empty.prepend(retry);
        }
      }
      if(pendingType!==null){
        const target=all('.criteria-types [data-loot-type]',browser).find(b=>b.dataset.lootType===pendingType);
        if(document.activeElement===document.body)target?.focus({preventScroll:true});pendingType=null;
      }
    };
    const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(refresh);}};
    new MutationObserver(schedule).observe(content,{childList:true,subtree:true});
    new MutationObserver(schedule).observe(html,{attributes:true,attributeFilter:['data-publisher-view']});
    refresh();html.dataset.discoveryCriteria='true';
  }

  function library(){
    const hub=$('.resource-hub');
    // The older publisher module installs the existing quick links at DOMContentLoaded.
    if(!hub||!$('.publisher-start'))return false;
    const groups=all('.resource-group',hub);
    if(groups.length!==5)return false;
    const sectors=[
      ['item','아이템 확인','주운 아이템의 가치·옵션'],
      ['farm','사냥·드랍','사냥터·아이템 드랍 장소'],
      ['craft','제작·강화','룬워드·큐빙·소켓'],
      ['build','육성·장비','액트 공략·빌드·세팅'],
      ['all','전체 도구','모든 기능 한눈에']
    ];
    const groupSettings=[
      ['build','캐릭터를 키우고 장비를 맞출 때','진행 공략부터 빌드와 세팅 비교까지'],
      ['farm','어디서 사냥할지 찾을 때','원하는 아이템 또는 사냥 지역부터 선택하세요'],
      ['craft','아이템을 만들거나 바꿀 때','룬워드·큐빙·소켓 규칙을 확인하세요'],
      ['item','이름으로 아이템 정보를 찾을 때','아이템 종류를 알고 있다면 여기서 찾으세요'],
      ['item','주운 아이템을 확인할 때','사진으로 감정하거나, 보관할 옵션 기준을 찾아보세요']
    ];
    groups.forEach((group,i)=>{
      group.dataset.discoverySector=groupSettings[i][0];
      setText($('.group-head h3',group),groupSettings[i][1]);
      setText($('.group-head>p',group),groupSettings[i][2]);
    });
    const valueCards=$('.group-cards',groups[4]);
    const photo=$('a[href="image-appraisal.html"]',valueCards);if(photo)valueCards.prepend(photo);
    const criteriaLink=el('a','card card-feature discovery-criteria-link');criteriaLink.href='unified.html?view=loot';criteriaLink.dataset.key='득환 보관 가치 기준 버려도 옵션 패캐링 모너크 증어레 매직 레어 베이스';
    criteriaLink.append(el('h3','','득환 기준 찾기'),el('p','','이름·별명·옵션으로 보관할 아이템의 기준을 찾습니다.'),el('div','meta','베이스 재료 · 매직 · 레어'));
    photo?photo.after(criteriaLink):valueCards.prepend(criteriaLink);
    const names={
      'image-appraisal.html':['사진으로 아이템 감정','사진을 올리고 읽어 온 옵션을 확인한 뒤 감정합니다.'],
      'appraisal.html':['옵션을 입력해서 감정','사진 없이 아이템 옵션을 직접 입력해 감정합니다.'],
      'integrated-tools.html':['빌드·용병·엔드게임 가이드','직업별 빌드, 용병 정보와 엔드게임 공략을 모아 봅니다.'],
      'intelligence-center.html':['아이템 생성 조건·세팅 비교','생성 가능한 옵션인지 확인하고, 세팅과 파밍 동선을 비교합니다.']
    };
    all('.card',hub).forEach(card=>{
      const label=$('h3',card);card.dataset.discoveryOriginalTitle=label?.textContent||'';
      const replacement=names[card.getAttribute('href')];
      if(replacement){setText(label,replacement[0]);setText($('p',card),replacement[1]);}
      else if(label)setText(label,label.textContent.replace(/^[◆◈☠⌖↩✦⬡⌘⚔★◇✧]\s*/,''));
    });
    const directory=el('section','discovery-directory');directory.setAttribute('aria-labelledby','toolDirectoryTitle');
    const heading=el('div','discovery-directory-heading');const title=el('h2','','어떤 일을 하려는지 골라주세요');title.id='toolDirectoryTitle';
    heading.append(title,el('p','','목적을 선택하면 관련 도구만 보여드려요. 기능 이름으로 바로 찾아도 됩니다.'));
    const tabs=el('div','discovery-purpose-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','필요한 기능의 목적');
    const toolbar=el('div','discovery-directory-toolbar'),label=el('label','','기능 이름으로 찾기');label.htmlFor='toolSearch';
    const line=el('div','discovery-tool-searchline'),input=el('input');input.id='toolSearch';input.type='search';input.placeholder='예: 라주크, 룬 빼기, 공포의 영역';input.autocomplete='off';
    const clear=el('button','discovery-tool-clear','지우기');clear.type='button';clear.setAttribute('aria-label','기능 검색어 지우기');line.append(input,clear);label.append(line);
    const status=el('p','discovery-directory-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.id='toolSearchStatus';input.setAttribute('aria-describedby',status.id);
    toolbar.append(label,status);directory.append(heading,tabs,toolbar);hub.prepend(directory);
    const empty=el('div','discovery-tools-empty');empty.hidden=true;
    empty.append(el('h3','','일치하는 기능이 없어요'),el('p','','짧은 기능 이름으로 다시 검색해보세요. 예: 소켓, 룬워드, 사진'));
    const reset=el('button','','전체 도구 보기');reset.type='button';empty.append(reset);hub.append(empty);
    const cards=all('.resource-group .card',hub),index=new Map(cards.map(card=>[card,norm([card.textContent,card.dataset.key,card.dataset.discoveryOriginalTitle,card.getAttribute('href')==='cube.html'?'룬 빼기 큐브 큐빙':''].join(' '))]));
    let selected='item',composing=false;
    for(const [key,name,description] of sectors){
      const button=el('button','discovery-purpose');button.type='button';button.dataset.purpose=key;
      const count=key==='all'?cards.length:cards.filter(c=>c.closest('.resource-group').dataset.discoverySector===key).length;
      button.append(el('strong','',name),el('span','',description),el('small','',count+'개 도구'));
      button.addEventListener('click',()=>{selected=key;input.value='';draw();});tabs.append(button);
    }
    const draw=()=>{
      const words=input.value.trim().split(/\s+/).map(norm).filter(Boolean),searching=words.length>0;
      // Search the existing directory labels only, never the game's rules or item data.
      let count=0;
      for(const card of cards){const sector=card.closest('.resource-group').dataset.discoverySector;
        const show=searching?words.every(word=>index.get(card).includes(word)):selected==='all'||selected===sector;
        card.hidden=!show;if(show)count++;
      }
      for(const group of groups)group.hidden=!all('.card',group).some(c=>!c.hidden);
      for(const button of all('[data-purpose]',tabs))button.setAttribute('aria-pressed',String(!searching&&button.dataset.purpose===selected));
      const name=sectors.find(s=>s[0]===selected)[1];
      setText(status,searching?`전체 도구에서 “${input.value.trim()}” 검색 · ${count}개`:`${name} · ${count}개 도구`);
      empty.hidden=count!==0;clear.disabled=!input.value;html.dataset.discoveryLibrary='true';
    };
    input.addEventListener('compositionstart',()=>{composing=true;});
    input.addEventListener('compositionend',()=>{composing=false;draw();});
    input.addEventListener('input',()=>{if(!composing)draw();});
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';draw();}});
    clear.addEventListener('click',()=>{input.value='';draw();input.focus();});
    reset.addEventListener('click',()=>{input.value='';selected='all';draw();input.focus();});
    // Preserve the original cards, link destinations, and global item-search control.
    [groups[4],groups[3],groups[1],groups[2],groups[0]].forEach(group=>empty.before(group));
    const shortcuts=hub.parentElement.querySelector(':scope>.quick');
    if(shortcuts){
      const more=el('details','discovery-quick-details');more.append(el('summary','','많이 찾는 검색어'));
      shortcuts.before(more);more.append(shortcuts);
    }
    setText($('.hero h1'),'어떤 도구가 필요하세요?');
    setText($('.hero-card>p'),'아이템을 검색하거나, 아래에서 지금 하려는 일을 골라주세요.');
    const global=$('#globalSearch');if(global){global.placeholder='아이템 이름·별명 검색 — 샤코, 탈셋, 모너크';global.setAttribute('aria-label','아이템 이름 또는 별명 검색');}
    setText($('.publisher-start>h2'),'바로 시작하기');
    draw();return true;
  }
  if(html.hasAttribute('data-unified'))criteria();
  if(html.dataset.publisherPage==='library'){
    if(!library()){
      const observer=new MutationObserver(()=>{if(library())observer.disconnect();});
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }
})();
