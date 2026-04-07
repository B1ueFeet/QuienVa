'use strict';

const COLORS = [
  { hex: '#ff3c5f', rgb: '255,60,95', name: 'Rojo' },
  { hex: '#3b82f6', rgb: '59,130,246', name: 'Azul' },
  { hex: '#22c55e', rgb: '34,197,94', name: 'Verde' },
  { hex: '#f59e0b', rgb: '245,158,11', name: 'Amarillo' },
  { hex: '#a855f7', rgb: '168,85,247', name: 'Violeta' },
  { hex: '#06b6d4', rgb: '6,182,212', name: 'Cyan' },
  { hex: '#f97316', rgb: '249,115,22', name: 'Naranja' },
  { hex: '#ec4899', rgb: '236,72,153', name: 'Rosa' },
  { hex: '#14b8a6', rgb: '20,184,166', name: 'Teal' },
  { hex: '#84cc16', rgb: '132,204,22', name: 'Lima' },
];

const EMOJIS = ['☝️', '✌️', '🤙', '🫵', '👆', '🤞', '🖐️', '👌', '🤘', '👍'];
const MIN_TOUCH = 2;
const HOLD_MS = 2600;
const CD_START = 3;
const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label';

const $flood = document.getElementById('flood');
const $toast = document.getElementById('toast');

const $home = document.getElementById('home');
const $fingerIdle = document.getElementById('finger-idle');
const $fingerCd = document.getElementById('finger-cd');
const $fingerResult = document.getElementById('finger-result');
const $wheelSetup = document.getElementById('wheel-setup');
const $wheelSpin = document.getElementById('wheel-spin');
const $wheelResult = document.getElementById('wheel-result');

const $fBadge = document.getElementById('f-badge');
const $cdNum = document.getElementById('cd-num');
const $fBlob = document.getElementById('f-winner-blob');
const $fName = document.getElementById('f-winner-name');
const $fSub = document.getElementById('f-winner-sub');

const $playersList = document.getElementById('players-list');
const $canvas = document.getElementById('wheel-canvas');
const ctx = $canvas.getContext('2d');
const $btnGoFinger = document.getElementById('btn-go-finger');
const $btnGoWheel = document.getElementById('btn-go-wheel');
const $btnFingerBack = document.getElementById('f-back-btn');
const $btnFingerReplay = document.getElementById('f-replay-btn');
const $btnFingerHome = document.getElementById('f-home-btn');
const $btnWheelBack = document.getElementById('w-back-btn');
const $btnAddPlayer = document.getElementById('btn-add');
const $btnGoSpin = document.getElementById('btn-go-spin');
const $btnWheelSpinBack = document.getElementById('ws-back-btn');
const $btnDoSpin = document.getElementById('btn-do-spin');
const $btnSpinAgain = document.getElementById('btn-spin-again');
const $btnWheelHome = document.getElementById('wr-home-btn');
const $wrName = document.getElementById('wr-name');
const $wrSub = document.getElementById('wr-sub');

let toastTmr = null;
let fTouches = new Map();
let fColorPool = 0;
let fState = 'idle';
let fHoldTimer = null;
let fCdTimer = null;

let wheelPlayers = [];
let wheelAngle = 0;
let isSpinning = false;

function getAllScreens() {
  return document.querySelectorAll('.screen');
}

function showScreen(id) {
  getAllScreens().forEach(screen => {
    screen.classList.toggle('active', screen.id === id);
    screen.classList.toggle('hidden', screen.id !== id);
  });
}

function toast(message) {
  $toast.textContent = message;
  $toast.classList.add('show');
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => $toast.classList.remove('show'), 2400);
}

function floodColor(color, opacity = 1) {
  $flood.style.background = `radial-gradient(ellipse at 50% 38%, rgba(${color.rgb},.82) 0%, rgba(${color.rgb},.45) 46%, #080810 78%)`;
  void $flood.offsetWidth;
  $flood.style.opacity = String(opacity);
  $flood.classList.add('show');
}

function clearFlood() {
  $flood.style.opacity = '0';
  setTimeout(() => {
    $flood.classList.remove('show');
    $flood.style.background = '';
  }, 800);
}

function spawnConfetti(winnerHex) {
  const palette = [winnerHex, '#fff', 'rgba(255,255,255,.5)', ...COLORS.slice(0, 5).map(color => color.hex)];

  for (let i = 0; i < 72; i += 1) {
    const el = document.createElement('div');
    const size = 5 + Math.random() * 9;

    Object.assign(el.style, {
      position: 'fixed',
      left: `${8 + Math.random() * 84}vw`,
      top: '-18px',
      width: `${size}px`,
      height: `${Math.random() > 0.5 ? size : size * 2.8}px`,
      background: palette[Math.floor(Math.random() * palette.length)],
      borderRadius: Math.random() > 0.4 ? '50%' : '2px',
      opacity: 0.55 + Math.random() * 0.45,
      animation: `confetti-drop ${1.4 + Math.random() * 2.3}s ${Math.random() * 0.9}s ease-in forwards`,
      transform: `rotate(${Math.random() * 360}deg)`,
      pointerEvents: 'none',
      zIndex: '999',
    });

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

function isInteractiveTarget(target) {
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

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
  clearFlood();
  fUpdateBadge();
}

function resetWheelSpinState() {
  isSpinning = false;
  $btnDoSpin.disabled = false;
}

function wheelSetupInit() {
  if (wheelPlayers.length === 0) {
    ['Jugador 1', 'Jugador 2', 'Jugador 3'].forEach((name, index) => {
      wheelPlayers.push({ name, colorIdx: index });
    });
  }

  resetWheelSpinState();
  renderPlayersList();
}

function renderPlayersList() {
  $playersList.innerHTML = '';

  wheelPlayers.forEach((player, index) => {
    const color = COLORS[player.colorIdx];
    const row = document.createElement('div');
    const dot = document.createElement('div');
    const input = document.createElement('input');
    const btn = document.createElement('button');

    row.className = 'player-row';

    dot.className = 'player-dot';
    dot.style.background = color.hex;

    input.className = 'player-input';
    input.type = 'text';
    input.value = player.name;
    input.placeholder = 'Nombre…';
    input.dataset.i = String(index);
    input.addEventListener('input', () => {
      wheelPlayers[Number(input.dataset.i)].name = input.value.trim() || `Jugador ${Number(input.dataset.i) + 1}`;
    });
    input.addEventListener('touchstart', event => event.stopPropagation(), { passive: true });

    btn.className = 'btn-del-player';
    btn.dataset.i = String(index);
    btn.type = 'button';
    btn.textContent = '✕';
    btn.addEventListener('click', () => {
      if (wheelPlayers.length <= 2) {
        toast('Mínimo 2 jugadores');
        return;
      }

      wheelPlayers.splice(Number(btn.dataset.i), 1);
      wheelPlayers.forEach((item, itemIndex) => {
        item.colorIdx = itemIndex % COLORS.length;
      });
      renderPlayersList();
    });

    row.append(dot, input, btn);
    $playersList.appendChild(row);
  });

  $btnGoSpin.disabled = wheelPlayers.length < 2;
}

function syncWheelNames() {
  $playersList.querySelectorAll('.player-input').forEach(input => {
    const index = Number(input.dataset.i);
    wheelPlayers[index].name = input.value.trim() || `Jugador ${index + 1}`;
  });
}

function drawWheel(rotation) {
  const total = wheelPlayers.length;
  const size = $canvas.width;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 2;
  const slice = (2 * Math.PI) / total;

  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < total; i += 1) {
    const start = rotation + i * slice;
    const end = start + slice;
    const color = COLORS[wheelPlayers[i].colorIdx];

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = color.hex;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(start + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 6;

    const fontSize = Math.max(14, Math.min(28, radius / (total * 0.6)));
    const name = wheelPlayers[i].name.length > 10 ? `${wheelPlayers[i].name.slice(0, 9)}…` : wheelPlayers[i].name;

    ctx.font = `600 ${fontSize}px 'DM Sans', sans-serif`;
    ctx.fillText(name, radius - 18, fontSize * 0.38);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 5;
  ctx.stroke();
}

function goToWheelSpin() {
  syncWheelNames();
  resetWheelSpinState();
  clearFlood();
  wheelAngle = 0;
  drawWheel(wheelAngle);
  showScreen('wheel-spin');
}

$btnGoFinger.addEventListener('click', () => {
  fingerReset();
  showScreen('finger-idle');
});

$btnGoWheel.addEventListener('click', () => {
  wheelSetupInit();
  showScreen('wheel-setup');
});

$btnFingerBack.addEventListener('click', () => {
  fingerReset();
  showScreen('home');
});

$btnFingerReplay.addEventListener('click', () => {
  fingerReset();
  showScreen('finger-idle');
});

$btnFingerHome.addEventListener('click', () => {
  fingerReset();
  showScreen('home');
});

$btnAddPlayer.addEventListener('click', () => {
  if (wheelPlayers.length >= 10) {
    toast('Máximo 10 jugadores');
    return;
  }

  wheelPlayers.push({
    name: `Jugador ${wheelPlayers.length + 1}`,
    colorIdx: wheelPlayers.length % COLORS.length,
  });

  renderPlayersList();
});

$btnWheelBack.addEventListener('click', () => {
  resetWheelSpinState();
  clearFlood();
  showScreen('home');
});

$btnGoSpin.addEventListener('click', () => {
  if (wheelPlayers.length < 2) {
    toast('Necesitas al menos 2 jugadores');
    return;
  }

  goToWheelSpin();
});

$btnWheelSpinBack.addEventListener('click', () => {
  resetWheelSpinState();
  clearFlood();
  showScreen('wheel-setup');
});

$btnDoSpin.addEventListener('click', () => {
  if (isSpinning || wheelPlayers.length < 2) return;

  isSpinning = true;
  $btnDoSpin.disabled = true;

  const total = wheelPlayers.length;
  const sliceRad = (2 * Math.PI) / total;
  const winnerIndex = Math.floor(Math.random() * total);
  const extraSpins = 6 + Math.floor(Math.random() * 5);
  const targetRotation = -Math.PI / 2 - (winnerIndex * sliceRad + sliceRad / 2) + extraSpins * 2 * Math.PI;
  const startAngle = wheelAngle;
  const totalDelta = targetRotation - startAngle;
  const duration = 4000 + Math.random() * 1500;
  const startTime = performance.now();

  function easeOut(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    wheelAngle = startAngle + totalDelta * easeOut(progress);
    drawWheel(wheelAngle);

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    isSpinning = false;

    const winner = wheelPlayers[winnerIndex];
    const color = COLORS[winner.colorIdx];

    if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 200]);

    floodColor(color, 1);
    $wrName.textContent = winner.name;
    $wrName.style.color = color.hex;
    $wrName.style.textShadow = `0 0 40px rgba(${color.rgb},.7)`;
    $wrSub.textContent = `De ${total} participantes · ¡La suerte ha hablado!`;

    setTimeout(() => {
      showScreen('wheel-result');
      spawnConfetti(color.hex);
    }, 500);
  }

  requestAnimationFrame(animate);
});

$btnSpinAgain.addEventListener('click', () => {
  resetWheelSpinState();
  clearFlood();
  wheelAngle = 0;
  drawWheel(0);
  showScreen('wheel-spin');
});

$btnWheelHome.addEventListener('click', () => {
  resetWheelSpinState();
  clearFlood();
  showScreen('home');
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
