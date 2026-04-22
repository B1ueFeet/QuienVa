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

const $fingerIdle   = document.getElementById('finger-idle');
const $fingerCd     = document.getElementById('finger-cd');
const $fBadge       = document.getElementById('f-badge');
const $cdNum        = document.getElementById('cd-num');
const $fBlob        = document.getElementById('f-winner-blob');
const $fName        = document.getElementById('f-winner-name');
const $fSub         = document.getElementById('f-winner-sub');
const $fInstr       = document.getElementById('f-instr');
const $fHand        = document.getElementById('f-hand');
const $fResEyebrow  = document.getElementById('f-res-eyebrow');

const $fSingleResult = document.getElementById('f-single-result');
const $fMultiResult  = document.getElementById('f-multi-result');
const $fMultiWinners = document.getElementById('f-multi-winners');
const $fMultiSub     = document.getElementById('f-multi-sub');
const $fTeamsResult  = document.getElementById('f-teams-result');
const $fTeamsContainer = document.getElementById('f-teams-container');
const $fTeamsSub     = document.getElementById('f-teams-sub');

const $btnFingerBack   = document.getElementById('f-back-btn');
const $btnFingerReplay = document.getElementById('f-replay-btn');
const $btnFingerHome   = document.getElementById('f-home-btn');

// ── Dropdown elements ────────────────────────────────────────────────────────
const $modePill    = document.getElementById('mode-pill');
const $modeLabel   = document.getElementById('mode-label');
const $modeMenu    = document.getElementById('mode-menu');
const $countPill   = document.getElementById('count-pill');
const $countLabel  = document.getElementById('count-label');
const $countMenu   = document.getElementById('count-menu');
const $countDrop   = document.getElementById('count-dropdown');
const $topControls = document.getElementById('top-controls');

// ── State ────────────────────────────────────────────────────────────────────
let fTouches   = new Map();
let fColorPool = 0;
let fState     = 'idle';
let fHoldTimer = null;
let fCdTimer   = null;

let selectedMode  = 'random';  // 'random' | 'teams'
let selectedCount = 1;         // 1 | 2 | 3

// ── Dropdown logic ────────────────────────────────────────────────────────────
let openMenu = null;

function closeAllMenus() {
  if (!openMenu) return;
  openMenu.classList.remove('open');
  openMenu = null;
}

function toggleMenu(menu) {
  if (openMenu && openMenu !== menu) closeAllMenus();
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    openMenu = null;
  } else {
    menu.classList.add('open');
    openMenu = menu;
  }
}

$modePill.addEventListener('click', e => {
  e.stopPropagation();
  toggleMenu($modeMenu);
});

$countPill.addEventListener('click', e => {
  e.stopPropagation();
  if (selectedMode === 'teams') return; // disabled in teams mode
  toggleMenu($countMenu);
});

// Mode options
$modeMenu.querySelectorAll('.ctrl-option').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const val = btn.dataset.value;
    selectedMode = val;

    // Update active state
    $modeMenu.querySelectorAll('.ctrl-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update pill label & icon
    const icon = btn.querySelector('.ctrl-opt-icon').textContent;
    const text = btn.querySelector('.ctrl-opt-text').textContent;
    $modeLabel.textContent = text;
    $modePill.querySelector('.ctrl-pill-icon').textContent = icon;

    // Teams mode: disable count dropdown
    if (val === 'teams') {
      $countDrop.classList.add('disabled');
      $countPill.disabled = true;
    } else {
      $countDrop.classList.remove('disabled');
      $countPill.disabled = false;
    }

    updateInstructions();
    closeAllMenus();
  });
});

// Count options
$countMenu.querySelectorAll('.ctrl-option').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const val = parseInt(btn.dataset.value);
    selectedCount = val;

    $countMenu.querySelectorAll('.ctrl-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $countLabel.textContent = val;

    updateInstructions();
    closeAllMenus();
  });
});

// Close menus on outside tap
document.addEventListener('touchstart', e => {
  if (!openMenu) return;
  if (!e.target.closest('.ctrl-dropdown')) closeAllMenus();
}, { passive: true });
document.addEventListener('click', e => {
  if (!openMenu) return;
  if (!e.target.closest('.ctrl-dropdown')) closeAllMenus();
});

function updateInstructions() {
  if (selectedMode === 'teams') {
    $fHand.textContent = '⚔️';
    $fInstr.innerHTML = 'Todos apoyan un<br><em>dedo en la pantalla</em><br><span style="font-size:.85em;color:rgba(255,255,255,.4)">Se formarán 2 equipos</span>';
  } else if (selectedCount === 1) {
    $fHand.textContent = '☝️';
    $fInstr.innerHTML = 'Todos apoyan un<br><em>dedo en la pantalla</em>';
  } else {
    $fHand.textContent = selectedCount === 2 ? '✌️' : '🤟';
    $fInstr.innerHTML = `Todos apoyan un<br><em>dedo en la pantalla</em><br><span style="font-size:.85em;color:rgba(255,255,255,.4)">Se eligen ${selectedCount} personas</span>`;
  }
}

// ── Finger state helpers ─────────────────────────────────────────────────────
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
  el.style.top  = `${y}px`;
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
      if (selectedMode === 'teams') {
        fPickTeams();
      } else {
        fPickWinners();
      }
    }
  }, 950);
}

// ── Pick multiple random winners ─────────────────────────────────────────────
function fPickWinners() {
  fState = 'result';

  const ids    = [...fTouches.keys()];
  const total  = ids.length;
  const count  = Math.min(selectedCount, total);

  // Shuffle and pick `count` winners
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const winnerIds = new Set(shuffled.slice(0, count));

  const winners = [];
  fTouches.forEach((entry, id) => {
    if (winnerIds.has(id)) {
      fGlowWinner(entry);
      winners.push(entry);
    } else {
      fDimLoser(entry.el);
    }
  });

  // Use first winner's color for flood
  const primaryColor = COLORS[winners[0].colorIdx];
  floodColor(primaryColor, 1);

  if (count === 1) {
    // Single winner — existing layout
    const w = winners[0];
    const color = COLORS[w.colorIdx];

    $fResEyebrow.textContent = '';
    $fSingleResult.style.display = '';
    $fMultiResult.style.display  = 'none';
    $fTeamsResult.style.display  = 'none';

    $fBlob.textContent = EMOJIS[w.colorIdx % EMOJIS.length];
    Object.assign($fBlob.style, {
      background: `radial-gradient(circle at 38% 35%, rgba(${color.rgb},.5), rgba(${color.rgb},.08))`,
      border: `3px solid ${color.hex}`,
      boxShadow: `0 0 0 3px ${color.hex}, 0 0 60px rgba(${color.rgb},.75), 0 0 130px rgba(${color.rgb},.4)`,
      color: color.hex,
    });
    $fName.textContent = '';
    $fSub.textContent  = '';

  } else {
    // Multi-winner layout
    $fResEyebrow.textContent = '';
    $fSingleResult.style.display = 'none';
    $fMultiResult.style.display  = '';
    $fTeamsResult.style.display  = 'none';

    $fMultiWinners.innerHTML = '';

    winners.forEach((w, idx) => {
      const color = COLORS[w.colorIdx];
      const chip  = document.createElement('div');
      chip.className = 'multi-winner-chip';
      chip.style.setProperty('--c', color.hex);
      chip.style.setProperty('--rgb', color.rgb);
      chip.style.animationDelay = `${idx * 0.12}s`;
      chip.innerHTML = `<div class="mwc-blob">${EMOJIS[w.colorIdx % EMOJIS.length]}</div>`;
      $fMultiWinners.appendChild(chip);
    });

    $fMultiSub.textContent = '';
  }

  if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 180]);

  setTimeout(() => {
    showScreen('finger-result');
    spawnConfetti(primaryColor.hex);
  }, 370);
}

// ── Pick teams ────────────────────────────────────────────────────────────────
function fPickTeams() {
  fState = 'result';

  const ids      = [...fTouches.keys()];
  const total    = ids.length;

  // Shuffle all players
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const half     = Math.ceil(shuffled.length / 2);

  const teamA = shuffled.slice(0, half);        // Rojo
  const teamB = shuffled.slice(half);           // Azul

  const redColor  = COLORS[0]; // Rojo
  const blueColor = COLORS[1]; // Azul

  // Glow all with their team color
  fTouches.forEach((entry, id) => {
    const isTeamA  = teamA.includes(id);
    const teamColor = isTeamA ? redColor : blueColor;
    Object.assign(entry.el.style, {
      width: '120px',
      height: '120px',
      background: `rgba(${teamColor.rgb},.35)`,
      border: `4px solid ${teamColor.hex}`,
      boxShadow: `0 0 0 4px ${teamColor.hex}, 0 0 60px rgba(${teamColor.rgb},.8)`,
      transition: 'all .45s cubic-bezier(.17,.67,.3,1.5)',
      zIndex: '500',
    });
  });

  // Mixed flood
  floodColor(redColor, 0.6);

  $fResEyebrow.textContent = '';
  $fSingleResult.style.display = 'none';
  $fMultiResult.style.display  = 'none';
  $fTeamsResult.style.display  = '';

  $fTeamsContainer.innerHTML = '';

  [
    { color: redColor,  members: teamA },
    { color: blueColor, members: teamB },
  ].forEach((team, tIdx) => {
    const col = document.createElement('div');
    col.className = 'team-col';
    col.style.setProperty('--tc', team.color.hex);
    col.style.setProperty('--trgb', team.color.rgb);
    col.style.animationDelay = `${tIdx * 0.15}s`;

    const list = document.createElement('div');
    list.className = 'team-members';

    team.members.forEach((id, mIdx) => {
      const entry = fTouches.get(id);
      const chip = document.createElement('div');
      chip.className = 'team-member-chip';
      chip.style.animationDelay = `${tIdx * 0.15 + mIdx * 0.08}s`;
      chip.innerHTML = `<span class="tmc-emoji">${EMOJIS[entry.colorIdx % EMOJIS.length]}</span>`;
      list.appendChild(chip);
    });

    col.append(list);
    $fTeamsContainer.appendChild(col);
  });

  $fTeamsSub.textContent = '';

  if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 60, 40, 180]);

  setTimeout(() => {
    showScreen('finger-result');
    spawnConfetti(redColor.hex);
    setTimeout(() => spawnConfetti(blueColor.hex), 600);
  }, 370);
}

// ── Reset ─────────────────────────────────────────────────────────────────────
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
  closeAllMenus();
}

// ── Button listeners ──────────────────────────────────────────────────────────
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

// ── Touch handling ────────────────────────────────────────────────────────────
document.addEventListener('touchstart', event => {
  if (!isFingerScreen() || isInteractiveTarget(event.target)) return;
  if (event.target.closest('#top-controls')) return;

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
  } else if (fState === 'countdown') {
    // New finger added — restart the countdown
    clearInterval(fCdTimer);
    fCdTimer = null;
    fStartCd();
  }
}, { passive: false });

document.addEventListener('touchmove', event => {
  if (!isFingerScreen() || isInteractiveTarget(event.target)) return;
  if (event.target.closest('#top-controls')) return;

  event.preventDefault();

  for (const touch of event.changedTouches) {
    const entry = fTouches.get(touch.identifier);
    if (entry) fMoveRing(entry.el, touch.clientX, touch.clientY);
  }
}, { passive: false });

document.addEventListener('touchend', event => {
  if (!isFingerScreen() || isInteractiveTarget(event.target)) return;
  if (event.target.closest('#top-controls')) return;

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
  if (event.target.closest('#top-controls')) return;

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

// ── Init ──────────────────────────────────────────────────────────────────────
fingerReset();
showScreen('finger-idle');
updateInstructions();
