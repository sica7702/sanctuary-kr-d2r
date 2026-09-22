/* Presentation only. No parsing, rules, item values, calculation or trading changes. */
(() => {
  'use strict';
  const $ = (selector, host = document) => host.querySelector(selector);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls || '';
    if (text) node.textContent = text;
    return node;
  };
  function mount() {
    if (!window.SKR_APPRAISAL_UI || !$('.publisher-photo-actions') || !$('.publisher-steps')) return;
    if (document.documentElement.dataset.studioReady) return;
    document.documentElement.dataset.studioReady = 'true';

    const menu = $('.archive-menu-wrap');
    const brand = el('a', 'studio-brand');
    brand.href = 'library.html';
    brand.setAttribute('aria-label', 'Sanctuary KR 자료실 홈');
    const mark = el('span', 'studio-mark', 'S');
    mark.setAttribute('aria-hidden', 'true');
    const wordmark = el('span', 'studio-wordmark', 'SANCTUARY');
    wordmark.append(el('small', '', 'DIABLO II · 한국어 자료실'));
    brand.append(mark, wordmark);
    menu.prepend(brand);

    const main = $('main');
    const trail = el('div', 'studio-trail');
    const breadcrumb = el('div', 'studio-breadcrumb');
    const home = el('a', '', '자료실'); home.href = 'library.html';
    breadcrumb.append(home, el('span', '', '/'), el('span', '', '사진 감정'));
    const mode = el('span', 'studio-preview-note', 'SANCTUARY ARCHIVE');
    trail.append(breadcrumb, mode); main.prepend(trail);

    const hero = $('.publisher-steps').parentElement;
    hero.classList.add('studio-hero');
    const intro = el('div', 'studio-intro');
    intro.append(el('span', 'studio-eyebrow', 'ITEM APPRAISAL'));
    const title = $('h1', hero); const description = $('p', hero);
    if (title) intro.append(title);
    if (description) intro.append(description);
    const back = $('a', hero); if (back) back.classList.add('studio-old-back');
    hero.prepend(intro);
    const emblem = el('div', 'studio-emblem');
    emblem.setAttribute('aria-hidden', 'true');
    emblem.append(el('span', '', 'S'), el('small', '', 'SANCTUARY ARCHIVE'));
    intro.append(emblem);

    const photo = $('#drop').closest('.box');
    const panel = $('.evidence-panel');
    photo.classList.add('studio-photo');
    panel.classList.add('studio-options');
    const photoHeading = $('h3', photo); const optionHeading = $(':scope>h2', panel);
    photoHeading.classList.add('studio-section-heading');
    optionHeading.classList.add('studio-section-heading');
    // Existing heading text remains owned by the original UI.

    // Move the existing controls, never clone them or recreate their listeners.
    const actions = $('.publisher-photo-actions');
    const helper = $('small', actions);
    if (helper) { helper.classList.add('studio-photo-helper'); $('#drop').after(helper); }
    const photoInfo = el('div', 'studio-photo-label');
    photoInfo.append(el('span', '', '아이템 원본 사진'), el('small', '', '사진과 옵션을 나란히 확인하세요'));
    $('#drop').before(photoInfo);
    photoHeading.after(el('p', 'studio-section-description', '아이템 툴팁이 잘 보이는 사진을 선택하세요.'));

    const inputGroups = [...panel.children].filter(node => node.classList.contains('formrow'));
    const identity = el('div', 'studio-identity');
    if (inputGroups.length) {
      inputGroups[0].before(identity);
      identity.append(el('h3', 'studio-subheading', '아이템 정보'));
      identity.append(inputGroups[0]);
      const itemSelect = $('#uniqueIdentity');
      if (itemSelect && itemSelect.parentElement.tagName !== 'LABEL') {
        const label = el('label', 'studio-item-name', '확인된 아이템');
        label.htmlFor = itemSelect.id;
        itemSelect.before(label); label.append(itemSelect);
      }
      const detail = el('details', 'studio-item-details');
      const summary = el('summary', '', '아이템 세부 정보 확인');
      detail.append(summary);
      inputGroups.slice(1).forEach(node => detail.append(node));
      const meta = $('#assessmentMeta');
      if (meta) detail.append(meta);
      identity.append(detail);
      const sync = () => {
        const value = id => {const n = $('#'+id); return n?.selectedOptions?.[0]?.textContent || n?.value || '';};
        const description = [value('slot'), value('realm'), value('reqLevel') ? '요구 레벨 '+value('reqLevel') : ''].filter(Boolean).join(' · ');
        const next = '세부 정보 확인' + (description ? ' — '+description : '');
        if (summary.textContent !== next) summary.textContent = next;
      };
      detail.addEventListener('change', sync);
      document.addEventListener('change', sync);
      new MutationObserver(sync).observe($('#recognizedOptions'), {childList:true,subtree:true});
      sync();
    }
    const optionInfo = $('#restoredAssessment .welcome-heading');
    if (optionInfo) optionInfo.classList.add('studio-option-heading');
    const correction = $('.publisher-corrections');
    if (correction) correction.classList.add('studio-secondary-tools');

    const footer = $('.footer');
    if (footer) {
      const note = el('div', 'studio-footer-brand');
      note.append(el('b', '', 'SANCTUARY'), el('span', '', '아이템을 이해하는 가장 가까운 곳.'));
      footer.prepend(note);
    }
  }
  const observer = new MutationObserver(() => {
    if (document.documentElement.dataset.studioReady) { observer.disconnect(); return; }
    mount();
  });
  observer.observe(document.body, {subtree:true, childList:true});
  mount();
})();
