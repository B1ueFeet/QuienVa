'use strict';

/* ══════════════════════════════════════════
   PLAYER COLORS
══════════════════════════════════════════ */
const COLORS = [
  { hex: '#ff3c5f', rgb: '255,60,95',   name: 'Rojo'     },
  { hex: '#3b82f6', rgb: '59,130,246',  name: 'Azul'     },
  { hex: '#22c55e', rgb: '34,197,94',   name: 'Verde'    },
  { hex: '#f59e0b', rgb: '245,158,11',  name: 'Amarillo' },
  { hex: '#a855f7', rgb: '168,85,247',  name: 'Violeta'  },
  { hex: '#06b6d4', rgb: '6,182,212',   name: 'Cyan'     },
  { hex: '#f97316', rgb: '249,115,22',  name: 'Naranja'  },
  { hex: '#ec4899', rgb: '236,72,153',  name: 'Rosa'     },
  { hex: '#14b8a6', rgb: '20,184,166',  name: 'Teal'     },
  { hex: '#84cc16', rgb: '132,204,22',  name: 'Lima'     },
];
const EMOJIS = ['☝️','✌️','🤙','🫵','👆','🤞','🖐️','👌','🤘','👍'];

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
const $flood = document.getElementById('flood');

function getAllScreens() {
  return document.querySelectorAll('.screen');
}
function showScreen(id) {
  getAllScreens().forEach(s => {
    s.classList.toggle('active', s.id === id);
    s.classList.toggle('hidden', s.id !== id);
  });
}

let toastTmr = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => el.classList.remove('show'), 2400);
}

function floodColor(c, opacity = 1) {
  $flood.style.background =
    `radial-gradient(ellipse at 50% 38%, rgba(${c.rgb},.82) 0%, rgba(${c.rgb},.45) 46%, #080810 78%)`;
  void $flood.offsetWidth;
  $flood.style.opacity = String(opacity);
  $flood.classList.add('show');
}
function clearFlood() {
  $flood.style.opacity = '0';
  setTimeout(() => { $flood.classList.remove('show'); $flood.style.background = ''; }, 800);
}

function spawnConfetti(winnerHex) {
  const palette = [winnerHex, '#fff', 'rgba(255,255,255,.5)',
    ...COLORS.slice(0,5).map(c => c.hex)];
  for (let i = 0; i < 72; i++) {
    const el = document.createElement('div');
    const w  = 5 + Math.random() * 9;
    Object.assign(el.style, {
      position:'fixed', left:(8+Math.random()*84)+'vw', top:'-18px',
      width:w+'px', height:(Math.random()>.5?w:w*2.8)+'px',
      background:palette[Math.floor(Math.random()*palette.length)],
      borderRadius:Math.random()>.4?'50%':'2px',
      opacity:.55+Math.random()*.45,
      animation:`confetti-drop ${1.4+Math.random()*2.3}s ${Math.random()*.9}s ease-in forwards`,
      transform:`rotate(${Math.random()*360}deg)`,
      pointerEvents:'none', zIndex:'999',
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

/* ══════════════════════════════════════════
   HOME NAVIGATION
══════════════════════════════════════════ */
document.getElementById('btn-go-finger').addEventListener('click', () => {
  fingerReset();
  showScreen('finger-idle');
});
document.getElementById('btn-go-wheel').addEventListener('click', () => {
  wheelSetupInit();
  showScreen('wheel-setup');
});

/* ══════════════════════════════════════════
   ███  FINGER MODE  ███
══════════════════════════════════════════ */
const MIN_TOUCH = 2;
const HOLD_MS   = 2600;
const CD_START  = 3;

let fTouches   = new Map();  // touchId → { colorIdx, el }
let fColorPool = 0;
let fState     = 'idle';     // idle | countdown | result
let fHoldTimer = null;
let fCdTimer   = null;

const $fBadge = document.getElementById('f-badge');
const $cdNum  = document.getElementById('cd-num');
const $fBlob  = document.getElementById('f-winner-blob');
const $fName  = document.getElementById('f-winner-name');
const $fSub   = document.getElementById('f-winner-sub');

function fUpdateBadge() {
  const n = fTouches.size;
  $fBadge.textContent =
    n === 0 ? 'Sin dedos aún' :
    n === 1 ? '1 dedo — falta al menos uno más' :
              `${n} dedos detectados`;
  $fBadge.classList.toggle('live', n > 0);
}

/* rings */
function fCreateRing(colorIdx, x, y) {
  const c  = COLORS[colorIdx];
  const el = document.createElement('div');
  el.className = 't-ring';
  const S = 100; // bigger so it's visible around fingertip
  Object.assign(el.style, {
    width:      S + 'px', height: S + 'px',
    left: x + 'px', top: y + 'px',
    background: `rgba(${c.rgb},.22)`,
    border:     `4px solid ${c.hex}`,
    boxShadow:  `0 0 30px rgba(${c.rgb},.7), 0 0 70px rgba(${c.rgb},.3), inset 0 0 20px rgba(${c.rgb},.15)`,
    color:      c.hex,
  });
  document.body.appendChild(el);
  return el;
}
function fMoveRing(el, x, y) { el.style.left = x+'px'; el.style.top = y+'px'; }
function fRemoveRing(el) {
  el.style.animation = 'ring-out-anim .28s ease forwards';
  setTimeout(() => el.remove(), 300);
}
function fGlowWinner(entry) {
  const c = COLORS[entry.colorIdx];
  Object.assign(entry.el.style, {
    width: '130px', height: '130px',
    background: `rgba(${c.rgb},.4)`,
    boxShadow: `0 0 0 5px ${c.hex}, 0 0 80px rgba(${c.rgb},.9), 0 0 160px rgba(${c.rgb},.5)`,
    transition: 'all .45s cubic-bezier(.17,.67,.3,1.5)',
    animation: 'winner-pulse 1s ease-in-out infinite',
    zIndex: '500',
  });
}
function fDimLoser(el) { el.style.opacity = '.12'; el.style.transition = 'opacity .5s'; }

/* hold timer */
function fStartHold() {
  if (fHoldTimer || fState !== 'idle') return;
  fHoldTimer = setTimeout(() => {
    if (fTouches.size >= MIN_TOUCH) fStartCd();
  }, HOLD_MS);
}
function fCancelHold() { clearTimeout(fHoldTimer); fHoldTimer = null; }

/* countdown */
function fStartCd() {
  fState = 'countdown';
  let cdVal = CD_START;
  $cdNum.textContent = cdVal;
  const first = fTouches.values().next().value;
  if (first) floodColor(COLORS[first.colorIdx], .3);
  showScreen('finger-cd');
  fCdTimer = setInterval(() => {
    cdVal--;
    $cdNum.textContent = cdVal;
    navigator.vibrate && navigator.vibrate(35);
    if (cdVal <= 0) { clearInterval(fCdTimer); fCdTimer = null; fPickWinner(); }
  }, 950);
}
function fCancelCd() {
  clearInterval(fCdTimer); fCdTimer = null;
  clearFlood();
  if (fState === 'countdown') { fState = 'idle'; showScreen('finger-idle'); }
}

/* pick winner */
function fPickWinner() {
  fState = 'result';
  const ids    = [...fTouches.keys()];
  const total  = ids.length;
  const wId    = ids[Math.floor(Math.random() * total)];
  const winner = fTouches.get(wId);
  const c      = COLORS[winner.colorIdx];

  fTouches.forEach((entry, id) => {
    if (id === wId) fGlowWinner(entry);
    else            fDimLoser(entry.el);
  });

  floodColor(c, 1);

  $fBlob.textContent = EMOJIS[winner.colorIdx % EMOJIS.length];
  Object.assign($fBlob.style, {
    background: `radial-gradient(circle at 38% 35%, rgba(${c.rgb},.5), rgba(${c.rgb},.08))`,
    border: `3px solid ${c.hex}`,
    boxShadow: `0 0 0 3px ${c.hex}, 0 0 60px rgba(${c.rgb},.75), 0 0 130px rgba(${c.rgb},.4)`,
    color: c.hex,
  });
  $fName.textContent   = `Jugador ${c.name}`;
  $fName.style.color   = c.hex;
  $fName.style.textShadow = `0 0 40px rgba(${c.rgb},.65)`;
  $fSub.textContent    = `${total} participante${total !== 1 ? 's' : ''} · ¡La suerte ha hablado!`;

  navigator.vibrate && navigator.vibrate([60,40,60,40,180]);
  setTimeout(() => { showScreen('finger-result'); spawnConfetti(c.hex); }, 370);
}

/* reset */
function fingerReset() {
  fCancelHold();
  fCancelCd();
  fTouches.forEach(e => fRemoveRing(e.el));
  fTouches.clear();
  fColorPool = 0;
  fState = 'idle';
  clearFlood();
  fUpdateBadge();
}

/* buttons */
document.getElementById('f-back-btn').addEventListener('click', () => {
  fingerReset();
  showScreen('home');
});
document.getElementById('f-replay-btn').addEventListener('click', () => {
  fingerReset();
  showScreen('finger-idle');
});
document.getElementById('f-home-btn').addEventListener('click', () => {
  fingerReset();
  showScreen('home');
});

/* touch events — only active in finger screens */
function isFingerScreen() {
  return document.getElementById('finger-idle').classList.contains('active') ||
         document.getElementById('finger-cd').classList.contains('active');
}

document.addEventListener('touchstart', e => {
  if (!isFingerScreen()) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (fTouches.has(t.identifier)) continue;
    const colorIdx = fColorPool++ % COLORS.length;
    const el = fCreateRing(colorIdx, t.clientX, t.clientY);
    fTouches.set(t.identifier, { colorIdx, el });
  }
  fUpdateBadge();
  if (fState === 'idle') {
    if (fTouches.size >= MIN_TOUCH) fStartHold();
    else toast('Necesitas al menos 2 dedos 👆');
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (!isFingerScreen()) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    const entry = fTouches.get(t.identifier);
    if (entry) fMoveRing(entry.el, t.clientX, t.clientY);
  }
}, { passive: false });

document.addEventListener('touchend', e => {
  if (!isFingerScreen()) return;
  e.preventDefault();
  for (const t of e.changedTouches) {
    const entry = fTouches.get(t.identifier);
    if (entry) { fRemoveRing(entry.el); fTouches.delete(t.identifier); }
  }
  fUpdateBadge();
  if (fTouches.size < MIN_TOUCH) { fCancelHold(); fCancelCd(); }
}, { passive: false });

document.addEventListener('touchcancel', e => {
  for (const t of e.changedTouches) {
    const entry = fTouches.get(t.identifier);
    if (entry) { fRemoveRing(entry.el); fTouches.delete(t.identifier); }
  }
  fUpdateBadge();
  if (fTouches.size < MIN_TOUCH) { fCancelHold(); fCancelCd(); }
}, { passive: false });

/* ══════════════════════════════════════════
   ███  WHEEL MODE  ███
══════════════════════════════════════════ */
let wheelPlayers = [];  // [{ name, colorIdx }]
let wheelAngle   = 0;   // current rotation in radians
let isSpinning   = false;

const $playersList = document.getElementById('players-list');
const $canvas      = document.getElementById('wheel-canvas');
const ctx          = $canvas.getContext('2d');

/* ── setup ── */
function wheelSetupInit() {
  if (wheelPlayers.length === 0) {
    // default players
    ['Jugador 1','Jugador 2','Jugador 3'].forEach((n, i) => {
      wheelPlayers.push({ name: n, colorIdx: i });
    });
  }
  renderPlayersList();
}

function renderPlayersList() {
  $playersList.innerHTML = '';

  wheelPlayers.forEach((p, i) => {
    const c = COLORS[p.colorIdx];

    const row = document.createElement('div');
    row.className = 'player-row';

    const dot = document.createElement('div');
    dot.className = 'player-dot';
    dot.style.background = c.hex;

    const input = document.createElement('input');
    input.className = 'player-input';
    input.type = 'text';
    input.value = p.name;
    input.placeholder = 'Nombre…';
    input.dataset.i = i;
    input.addEventListener('input', () => {
      wheelPlayers[+input.dataset.i].name = input.value || `Jugador ${+input.dataset.i + 1}`;
    });
    input.addEventListener('touchstart', e => e.stopPropagation());

    const btn = document.createElement('button');
    btn.className = 'btn-del-player';
    btn.dataset.i = i;
    btn.type = 'button';
    btn.textContent = '✕';
    btn.addEventListener('click', () => {
      if (wheelPlayers.length <= 2) {
        toast('Mínimo 2 jugadores');
        return;
      }
      wheelPlayers.splice(+btn.dataset.i, 1);
      wheelPlayers.forEach((player, index) => {
        player.colorIdx = index % COLORS.length;
      });
      renderPlayersList();
    });

    row.append(dot, input, btn);
    $playersList.appendChild(row);
  });

  document.getElementById('btn-go-spin').disabled = wheelPlayers.length < 2;
}

document.getElementById('btn-add').addEventListener('click', () => {
  if (wheelPlayers.length >= 10) { toast('Máximo 10 jugadores'); return; }
  const idx = wheelPlayers.length % COLORS.length;
  wheelPlayers.push({ name: `Jugador ${wheelPlayers.length + 1}`, colorIdx: idx });
  renderPlayersList();
});

document.getElementById('w-back-btn').addEventListener('click', () => showScreen('home'));

document.getElementById('btn-go-spin').addEventListener('click', () => {
  // sync names from inputs
  $playersList.querySelectorAll('.player-input').forEach(inp => {
    wheelPlayers[+inp.dataset.i].name = inp.value.trim() || `Jugador ${+inp.dataset.i + 1}`;
  });
  wheelAngle = 0;
  isSpinning = false;
  drawWheel(wheelAngle);
  showScreen('wheel-spin');
});

document.getElementById('ws-back-btn').addEventListener('click', () => {
  isSpinning = false;
  showScreen('wheel-setup');
});

/* ── draw wheel ── */
function drawWheel(rotation) {
  const n = wheelPlayers.length;
  const W = $canvas.width;
  const cx = W / 2, cy = W / 2, r = W / 2 - 2;
  const slice = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, W, W);

  for (let i = 0; i < n; i++) {
    const start = rotation + i * slice;
    const end   = start + slice;
    const c     = COLORS[wheelPlayers[i].colorIdx];

    // slice fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = c.hex;
    ctx.fill();

    // slice border
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur  = 6;
    const fontSize = Math.max(14, Math.min(28, r / (n * .6)));
    ctx.font = `600 ${fontSize}px 'DM Sans', sans-serif`;
    const name = wheelPlayers[i].name.length > 10
      ? wheelPlayers[i].name.slice(0, 9) + '…'
      : wheelPlayers[i].name;
    ctx.fillText(name, r - 18, fontSize * .38);
    ctx.restore();
  }

  // outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 5;
  ctx.stroke();
}

/* ── spin ── */
document.getElementById('btn-do-spin').addEventListener('click', () => {
  if (isSpinning) return;
  isSpinning = true;
  document.getElementById('btn-do-spin').disabled = true;

  const n          = wheelPlayers.length;
  const sliceRad   = (2 * Math.PI) / n;
  // pick winner index
  const winIdx     = Math.floor(Math.random() * n);
  // target angle: pointer is at top (−π/2). We want midpoint of winIdx slice to land at top.
  // midpoint of slice i in un-rotated wheel = i * sliceRad + sliceRad/2
  // We need: rotation + midpoint = −π/2 + k*2π  → solve for rotation
  const extraSpins = 6 + Math.floor(Math.random() * 5); // 6-10 full spins
  const targetRotation = -Math.PI / 2 - (winIdx * sliceRad + sliceRad / 2) + extraSpins * 2 * Math.PI;

  const startAngle = wheelAngle;
  const totalDelta = targetRotation - startAngle;
  const duration   = 4000 + Math.random() * 1500; // 4–5.5s
  const startTime  = performance.now();

  function easeOut(t) {
    // cubic ease-out
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const t       = Math.min(elapsed / duration, 1);
    wheelAngle    = startAngle + totalDelta * easeOut(t);
    drawWheel(wheelAngle);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      // show result
      const winner = wheelPlayers[winIdx];
      const c      = COLORS[winner.colorIdx];
      navigator.vibrate && navigator.vibrate([60,40,60,40,200]);
      floodColor(c, 1);
      document.getElementById('wr-name').textContent = winner.name;
      document.getElementById('wr-name').style.color = c.hex;
      document.getElementById('wr-name').style.textShadow = `0 0 40px rgba(${c.rgb},.7)`;
      document.getElementById('wr-sub').textContent  = `De ${n} participantes · ¡La suerte ha hablado!`;
      setTimeout(() => { showScreen('wheel-result'); spawnConfetti(c.hex); }, 500);
    }
  }
  requestAnimationFrame(animate);
});

/* spin again = back to spin screen with same players */
document.getElementById('btn-spin-again').addEventListener('click', () => {
  clearFlood();
  wheelAngle = 0;
  isSpinning = false;
  document.getElementById('btn-do-spin').disabled = false;
  drawWheel(0);
  showScreen('wheel-spin');
});

document.getElementById('wr-home-btn').addEventListener('click', () => {
  clearFlood();
  isSpinning = false;
  showScreen('home');
});