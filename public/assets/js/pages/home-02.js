(function () {
  const audio = document.getElementById('sanctuaryBgm');
  const toggle = document.getElementById('bgmToggle');
  const slider = document.getElementById('bgmVolume');
  const percent = document.getElementById('bgmPercent');
  const enter = document.getElementById('sanctuaryEnter');
  const enterBtn = document.getElementById('sanctuaryEnterBtn');

  const DRIVE_ID = '1wUG58Hhmp7b7Ol8uhyHhrJ7nPFzysLFq';
  // Google Drive는 일반 공유 링크가 <audio>에서 불안정할 수 있어
  // 직접 파일 응답 엔드포인트를 순서대로 시도한다.
  const bgmSources = [
    `https://drive.usercontent.google.com/download?id=${DRIVE_ID}&export=download`,
    `https://drive.google.com/uc?export=download&id=${DRIVE_ID}`,
    './bgm.mp3'
  ];

  let desiredOn = true;
  let sourceIndex = 0;
  let retryTimer = null;
  let entered = false;
  const savedVolume = localStorage.getItem('sanctuaryBgmVolume');

  if (savedVolume !== null) slider.value = savedVolume;
  audio.volume = Number(slider.value) / 100;
  percent.textContent = slider.value + '%';

  function render() {
    toggle.textContent = desiredOn ? '🔊 BGM ON' : '🔇 BGM OFF';
  }

  function setSource(index) {
    sourceIndex = index % bgmSources.length;
    audio.src = bgmSources[sourceIndex];
    audio.load();
  }

  function clearRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function tryPlay() {
    if (!desiredOn) return;
    clearRetry();

    if (!audio.src) setSource(sourceIndex);

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        retryNextSource();
      });
    }

    // Drive 응답이 멈춰 있는 경우 다음 직접 주소로 넘어간다.
    retryTimer = setTimeout(function () {
      if (desiredOn && audio.paused && audio.currentTime === 0) {
        retryNextSource();
      }
    }, 3500);
  }

  function retryNextSource() {
    clearRetry();
    if (!desiredOn) return;
    if (sourceIndex < bgmSources.length - 1) sourceIndex += 1;
    setSource(sourceIndex);
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        if (sourceIndex < bgmSources.length - 1) {
          window.setTimeout(retryNextSource, 250);
        }
      });
    }
  }

  audio.addEventListener('playing', clearRetry);
  audio.addEventListener('canplay', function () {
    if (entered && desiredOn && audio.paused) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
  });
  audio.addEventListener('error', function () {
    if (entered && desiredOn) retryNextSource();
  });
  audio.addEventListener('stalled', function () {
    if (entered && desiredOn && audio.currentTime === 0) retryNextSource();
  });

  enterBtn.addEventListener('click', function () {
    entered = true;
    desiredOn = true;
    render();
    enter.classList.add('hidden');
    sourceIndex = 0;
    setSource(sourceIndex);
    tryPlay();
  });

  toggle.addEventListener('click', function () {
    desiredOn = !desiredOn;
    if (desiredOn) {
      entered = true;
      tryPlay();
    } else {
      clearRetry();
      audio.pause();
    }
    render();
  });

  slider.addEventListener('input', function () {
    audio.volume = Number(slider.value) / 100;
    percent.textContent = slider.value + '%';
    localStorage.setItem('sanctuaryBgmVolume', slider.value);
  });

  render();
})();
