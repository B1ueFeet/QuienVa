'use strict';

const {
  COLORS,
  showScreen,
  toast,
  floodColor,
  clearFlood,
  spawnConfetti,
  stopConfetti,
  saveSession,
  promptSession,
  registerCleanup,
} = window.AppCommon;

const $playersList   = document.getElementById('players-list');
const $canvas        = document.getElementById('wheel-canvas');
const ctx            = $canvas.getContext('2d');

const $btnWheelBack     = document.getElementById('w-back-btn');
const $btnAddPlayer     = document.getElementById('btn-add');
const $btnGoSpin        = document.getElementById('btn-go-spin');
const $btnWheelSpinBack = document.getElementById('ws-back-btn');
const $btnDoSpin        = document.getElementById('btn-do-spin');
const $btnSpinAgain     = document.getElementById('btn-spin-again');
const $btnWheelHome     = document.getElementById('wr-home-btn');
const $wrName           = document.getElementById('wr-name');
const $wrSub            = document.getElementById('wr-sub');

let wheelPlayers = [];
let wheelAngle   = 0;
let isSpinning   = false;
let _spinRaf     = null; // track animation frame so we can cancel

function cancelSpin() {
  if (_spinRaf) { cancelAnimationFrame(_spinRaf); _spinRaf = null; }
  isSpinning = false;
  $btnDoSpin.disabled = false;
}

function fullStop() {
  cancelSpin();
  stopConfetti();
  clearFlood();
}

// Register so navigating away from any page calls this too
registerCleanup(fullStop);

function resetWheelSpinState() {
  cancelSpin();
}

const DEFAULT_PLAYERS = [
  { name: 'Jugador 1', colorIdx: 0 },
  { name: 'Jugador 2', colorIdx: 1 },
  { name: 'Jugador 3', colorIdx: 2 },
];

async function wheelSetupInit() {
  const chosen = await promptSession([...DEFAULT_PLAYERS]);

  if (wheelPlayers.length === 0) {
    chosen.forEach(p => wheelPlayers.push({ ...p }));
  }

  resetWheelSpinState();
  renderPlayersList();
}

function renderPlayersList() {
  $playersList.innerHTML = '';

  wheelPlayers.forEach((player, index) => {
    const color = COLORS[player.colorIdx];
    const row   = document.createElement('div');
    const dot   = document.createElement('div');
    const input = document.createElement('input');
    const btn   = document.createElement('button');

    row.className = 'player-row';

    dot.className = 'player-dot';
    dot.style.background = color.hex;

    input.className   = 'player-input';
    input.type        = 'text';
    input.value       = player.name;
    input.placeholder = 'Nombre…';
    input.dataset.i   = String(index);

    input.addEventListener('input', () => {
      wheelPlayers[Number(input.dataset.i)].name =
        input.value.trim() || `Jugador ${Number(input.dataset.i) + 1}`;
    });

    input.addEventListener('touchstart', event => event.stopPropagation(), { passive: true });

    btn.className   = 'btn-del-player';
    btn.dataset.i   = String(index);
    btn.type        = 'button';
    btn.textContent = '✕';

    btn.addEventListener('click', () => {
      if (wheelPlayers.length <= 2) { toast('Mínimo 2 jugadores'); return; }
      wheelPlayers.splice(Number(btn.dataset.i), 1);
      wheelPlayers.forEach((item, i) => { item.colorIdx = i % COLORS.length; });
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
  const total   = wheelPlayers.length;
  const size    = $canvas.width;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius  = size / 2 - 2;
  const slice   = (2 * Math.PI) / total;

  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < total; i += 1) {
    const start = rotation + i * slice;
    const end   = start + slice;
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
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(start + slice / 2);
    ctx.textAlign   = 'right';
    ctx.fillStyle   = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur  = 6;

    const fontSize = Math.max(14, Math.min(28, radius / (total * 0.6)));
    const name = wheelPlayers[i].name.length > 10
      ? `${wheelPlayers[i].name.slice(0, 9)}…`
      : wheelPlayers[i].name;

    ctx.font = `600 ${fontSize}px 'DM Sans', sans-serif`;
    ctx.fillText(name, radius - 18, fontSize * 0.38);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth   = 5;
  ctx.stroke();
}

function goToWheelSpin() {
  syncWheelNames();
  saveSession(wheelPlayers); // persist before spinning
  resetWheelSpinState();
  clearFlood();
  stopConfetti();
  wheelAngle = 0;
  drawWheel(wheelAngle);
  showScreen('wheel-spin');
}

// ── Back to home from setup ──────────────────────────────────────────────────
$btnWheelBack.addEventListener('click', () => {
  fullStop();
  window.location.href = 'index.html';
});

// ── Back to home from spin screen ────────────────────────────────────────────
$btnWheelSpinBack.addEventListener('click', () => {
  fullStop();
  showScreen('wheel-setup');
});

$btnAddPlayer.addEventListener('click', () => {
  if (wheelPlayers.length >= 10) { toast('Máximo 10 jugadores'); return; }
  wheelPlayers.push({
    name: `Jugador ${wheelPlayers.length + 1}`,
    colorIdx: wheelPlayers.length % COLORS.length,
  });
  renderPlayersList();
});

$btnGoSpin.addEventListener('click', () => {
  if (wheelPlayers.length < 2) { toast('Necesitas al menos 2 jugadores'); return; }
  goToWheelSpin();
});

$btnDoSpin.addEventListener('click', () => {
  if (isSpinning || wheelPlayers.length < 2) return;

  isSpinning = true;
  $btnDoSpin.disabled = true;

  const total        = wheelPlayers.length;
  const sliceRad     = (2 * Math.PI) / total;
  const winnerIndex  = Math.floor(Math.random() * total);
  const extraSpins   = 6 + Math.floor(Math.random() * 5);
  const targetRotation =
    -Math.PI / 2 - (winnerIndex * sliceRad + sliceRad / 2) + extraSpins * 2 * Math.PI;

  const startAngle  = wheelAngle;
  const totalDelta  = targetRotation - startAngle;
  const duration    = 4000 + Math.random() * 1500;
  const startTime   = performance.now();

  function easeOut(v) { return 1 - Math.pow(1 - v, 3); }

  function animate(now) {
    // If navigation happened and raf was cancelled externally, just stop
    if (!isSpinning) return;

    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    wheelAngle = startAngle + totalDelta * easeOut(progress);
    drawWheel(wheelAngle);

    if (progress < 1) {
      _spinRaf = requestAnimationFrame(animate);
      return;
    }

    // Spin finished normally
    _spinRaf  = null;
    isSpinning = false;

    const winner = wheelPlayers[winnerIndex];
    const color  = COLORS[winner.colorIdx];

    if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 200]);

    floodColor(color, 1);
    $wrName.textContent  = winner.name;
    $wrName.style.color  = color.hex;
    $wrName.style.textShadow = `0 0 40px rgba(${color.rgb},.7)`;
    $wrSub.textContent   = `De ${total} participantes · ¡La suerte ha hablado!`;

    setTimeout(() => {
      // Only show result if we haven't navigated away
      if (document.getElementById('wheel-spin').classList.contains('active') ||
          document.getElementById('wheel-setup').classList.contains('active')) {
        showScreen('wheel-result');
        spawnConfetti(color.hex);
      }
    }, 500);
  }

  _spinRaf = requestAnimationFrame(animate);
});

$btnSpinAgain.addEventListener('click', () => {
  fullStop();
  wheelAngle = 0;
  drawWheel(0);
  showScreen('wheel-spin');
});

$btnWheelHome.addEventListener('click', () => {
  fullStop();
  window.location.href = 'index.html';
});

wheelSetupInit();
showScreen('wheel-setup');