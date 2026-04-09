'use strict';

const {
  COLORS,
  EMOJIS,
  showScreen,
  toast,
  floodColor,
  clearFlood,
  spawnConfetti,
  stopConfetti,
  isInteractiveTarget,
} = window.AppCommon;

const MIN_TOUCH = 2;
const HOLD_MS = 2600;
const CD_START = 3;

const $fingerIdle = document.getElementById('finger-idle');
const $fingerCd = document.getElementById('finger-cd');
const $fBadge = document.getElementById('f-badge');
const $cdNum = document.getElementById('cd-num');
const $fBlob = document.getElementById('f-winner-blob');
const $fName = document.getElementById('f-winner-name');
const $fSub = document.getElementById('f-winner-sub');

const $btnFingerBack = document.getElementById('f-back-btn');
const $btnFingerReplay = document.getElementById('f-replay-btn');
const $btnFingerHome = document.getElementById('f-home-btn');

let fTouches = new Map();
let fColorPool = 0;
let fState = 'idle';
let fHoldTimer = null;
let fCdTimer = null;

function isFingerScreen() {
  return $fingerIdle.classList.contains('active') || $fingerCd.classList.contains('active');
}

function fUpdateBadge() {
  const total = fTouches.size;

  $fBadge.textContent = total === 0
    ? 'Sin dedos aún'
    : total === 1
      ? '1 dedo — falta al menos uno más'
      : `${total} dedos detectados`;

  $fBadge.classList.toggle('live', total > 0);
}

function fCreateRing(colorIdx, x, y) {
  const color = COLORS[colorIdx];
  const el = document.createElement('div');

  el.className = 't-ring';

  Object.assign(el.style, {
    width: '100px',
    height: '100px',
    left: `${x}px`,
    top: `${y}px`,
    background: `rgba(${color.rgb},.22)`,
    border: `4px solid ${color.hex}`,
    boxShadow: `0 0 30px rgba(${color.rgb},.7), 0 0 70px rgba(${color.rgb},.3), inset 0 0 20px rgba(${color.rgb},.15)`,
    color: color.hex,
  });

  document.body.appendChild(el);
  return el;
}

function fMoveRing(el, x, y) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function fRemoveRing(el) {
  el.style.animation = 'ring-out-anim .28s ease forwards';
  setTimeout(() => el.remove(), 300);
}

function fGlowWinner(entry) {
  const color = COLORS[entry.colorIdx];

  Object.assign(entry.el.style, {
    width: '130px',
    height: '130px',
    background: `rgba(${color.rgb},.4)`,
    boxShadow: `0 0 0 5px ${color.hex}, 0 0 80px rgba(${color.rgb},.9), 0 0 160px rgba(${color.rgb},.5)`,
    transition: 'all .45s cubic-bezier(.17,.67,.3,1.5)',
    animation: 'winner-pulse 1s ease-in-out infinite',
    zIndex: '500',
  });
}

function fDimLoser(el) {
  el.style.opacity = '.12';
  el.style.transition = 'opacity .5s';
}

function fCancelHold() {
  clearTimeout(fHoldTimer);
  fHoldTimer = null;
}

function fStartHold() {
  if (fHoldTimer || fState !== 'idle') return;

  fHoldTimer = setTimeout(() => {
    if (fTouches.size >= MIN_TOUCH) fStartCd();
  }, HOLD_MS);
}

function fCancelCd() {
  clearInterval(fCdTimer);
  fCdTimer = null;
  clearFlood();

  if (fState === 'countdown') {
    fState = 'idle';
    showScreen('finger-idle');
  }
}

function fStartCd() {
  fState = 'countdown';
  let cdVal = CD_START;

  $cdNum.textContent = cdVal;

  const first = fTouches.values().next().value;
  if (first) floodColor(COLORS[first.colorIdx], 0.3);

  showScreen('finger-cd');

  fCdTimer = setInterval(() => {
    cdVal -= 1;
    $cdNum.textContent = cdVal;

    if (navigator.vibrate) navigator.vibrate(35);

    if (cdVal <= 0) {
      clearInterval(fCdTimer);
      fCdTimer = null;
      fPickWinner();
    }
  }, 950);
}

function fPickWinner() {
  fState = 'result';

  const ids = [...fTouches.keys()];
  const total = ids.length;
  const winnerId = ids[Math.floor(Math.random() * total)];
  const winner = fTouches.get(winnerId);
  const color = COLORS[winner.colorIdx];

  fTouches.forEach((entry, id) => {
    if (id === winnerId) {
      fGlowWinner(entry);
    } else {
      fDimLoser(entry.el);
    }
  });

  floodColor(color, 1);

  $fBlob.textContent = EMOJIS[winner.colorIdx % EMOJIS.length];

  Object.assign($fBlob.style, {
    background: `radial-gradient(circle at 38% 35%, rgba(${color.rgb},.5), rgba(${color.rgb},.08))`,
    border: `3px solid ${color.hex}`,
    boxShadow: `0 0 0 3px ${color.hex}, 0 0 60px rgba(${color.rgb},.75), 0 0 130px rgba(${color.rgb},.4)`,
    color: color.hex,
  });

  $fName.textContent = `Jugador ${color.name}`;
  $fName.style.color = color.hex;
  $fName.style.textShadow = `0 0 40px rgba(${color.rgb},.65)`;
  $fSub.textContent = `${total} participante${total !== 1 ? 's' : ''} · ¡La suerte ha hablado!`;

  if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 180]);

  setTimeout(() => {
    showScreen('finger-result');
    spawnConfetti(color.hex);
  }, 370);
}

function fingerReset() {
  fCancelHold();
  fCancelCd();

  fTouches.forEach(entry => fRemoveRing(entry.el));
  fTouches.clear();

  fColorPool = 0;
  fState = 'idle';

  stopConfetti();
  clearFlood();
  fUpdateBadge();
}

$btnFingerBack.addEventListener('click', () => {
  fingerReset();
  window.location.href = 'index.html';
});

$btnFingerReplay.addEventListener('click', () => {
  fingerReset();
  showScreen('finger-idle');
});

$btnFingerHome.addEventListener('click', () => {
  fingerReset();
  window.location.href = 'index.html';
});

document.addEventListener('touchstart', event => {
  if (!isFingerScreen() || isInteractiveTarget(event.target)) return;

  event.preventDefault();

  for (const touch of event.changedTouches) {
    if (fTouches.has(touch.identifier)) continue;

    const colorIdx = fColorPool % COLORS.length;
    fColorPool += 1;

    const el = fCreateRing(colorIdx, touch.clientX, touch.clientY);
    fTouches.set(touch.identifier, { colorIdx, el });
  }

  fUpdateBadge();

  if (fState === 'idle') {
    if (fTouches.size >= MIN_TOUCH) {
      fStartHold();
    } else {
      toast('Necesitas al menos 2 dedos 👆');
    }
  }
}, { passive: false });

document.addEventListener('touchmove', event => {
  if (!isFingerScreen() || isInteractiveTarget(event.target)) return;

  event.preventDefault();

  for (const touch of event.changedTouches) {
    const entry = fTouches.get(touch.identifier);
    if (entry) fMoveRing(entry.el, touch.clientX, touch.clientY);
  }
}, { passive: false });

document.addEventListener('touchend', event => {
  if (!isFingerScreen() || isInteractiveTarget(event.target)) return;

  event.preventDefault();

  for (const touch of event.changedTouches) {
    const entry = fTouches.get(touch.identifier);
    if (!entry) continue;

    fRemoveRing(entry.el);
    fTouches.delete(touch.identifier);
  }

  fUpdateBadge();

  if (fTouches.size < MIN_TOUCH) {
    fCancelHold();
    fCancelCd();
  }
}, { passive: false });

document.addEventListener('touchcancel', event => {
  if (isInteractiveTarget(event.target)) return;

  for (const touch of event.changedTouches) {
    const entry = fTouches.get(touch.identifier);
    if (!entry) continue;

    fRemoveRing(entry.el);
    fTouches.delete(touch.identifier);
  }

  fUpdateBadge();

  if (fTouches.size < MIN_TOUCH) {
    fCancelHold();
    fCancelCd();
  }
}, { passive: false });

fingerReset();
showScreen('finger-idle');