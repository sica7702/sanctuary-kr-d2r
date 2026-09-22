(function () {
    const modal = document.getElementById('archiveUpdateModal');
    const enterBtn = document.getElementById('sanctuaryEnterBtn');
    const closeBtn = document.getElementById('archiveUpdateClose');
    const closeX = document.getElementById('archiveUpdateX');
    const todayBtn = document.getElementById('archiveUpdateToday');
    const STORAGE_KEY = 'sanctuaryArchiveUpdateHideDateV31';

    function localDateKey() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    function isHiddenToday() {
      try { return localStorage.getItem(STORAGE_KEY) === localDateKey(); }
      catch (e) { return false; }
    }
    function openModal() {
      if (!modal || isHiddenToday()) return;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (enterBtn) enterBtn.addEventListener('click', function () {
      window.setTimeout(openModal, 430);
    });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeX) closeX.addEventListener('click', closeModal);
    if (todayBtn) todayBtn.addEventListener('click', function () {
      try { localStorage.setItem(STORAGE_KEY, localDateKey()); } catch (e) {}
      closeModal();
    });
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('show')) closeModal();
    });
  })();
