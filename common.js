'use strict';

window.AppCommon = (() => {
  const COLORS = [
    { hex: '#ff3c5f', rgb: '255,60,95',   name: 'Rojo' },
    { hex: '#3b82f6', rgb: '59,130,246',  name: 'Azul' },
    { hex: '#22c55e', rgb: '34,197,94',   name: 'Verde' },
    { hex: '#f59e0b', rgb: '245,158,11',  name: 'Amarillo' },
    { hex: '#a855f7', rgb: '168,85,247',  name: 'Violeta' },
    { hex: '#06b6d4', rgb: '6,182,212',   name: 'Cyan' },
    { hex: '#f97316', rgb: '249,115,22',  name: 'Naranja' },
    { hex: '#ec4899', rgb: '236,72,153',  name: 'Rosa' },
    { hex: '#14b8a6', rgb: '20,184,166',  name: 'Teal' },
    { hex: '#84cc16', rgb: '132,204,22',  name: 'Lima' },
  ];

  const EMOJIS = ['☝️', '✌️', '🤙', '🫵', '👆', '🤞', '🖐️', '👌', '🤘', '👍'];
  const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label';
  const SESSION_KEY = 'quien_va_session';

  const $flood = document.getElementById('flood');
  const $toast = document.getElementById('toast');

  let toastTmr = null;

  // ─── Navigation cancellation ────────────────────────────────────────────────
  const _cleanupCallbacks = [];

  function registerCleanup(fn) {
    _cleanupCallbacks.push(fn);
  }

  function runAllCleanups() {
    _cleanupCallbacks.forEach(fn => { try { fn(); } catch (_) {} });
  }

  // ─── Screen management ──────────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.toggle('active', screen.id === id);
      screen.classList.toggle('hidden', screen.id !== id);
    });
  }

  // ─── Toast ──────────────────────────────────────────────────────────────────
  function toast(message) {
    if (!$toast) return;
    $toast.textContent = message;
    $toast.classList.add('show');
    clearTimeout(toastTmr);
    toastTmr = setTimeout(() => $toast.classList.remove('show'), 2400);
  }

  // ─── Flood background ───────────────────────────────────────────────────────
  function floodColor(color, opacity = 1) {
    if (!$flood) return;
    $flood.style.background =
      `radial-gradient(ellipse at 50% 38%, rgba(${color.rgb},.82) 0%, rgba(${color.rgb},.45) 46%, #080810 78%)`;
    void $flood.offsetWidth;
    $flood.style.opacity = String(opacity);
    $flood.classList.add('show');
  }

  function clearFlood() {
    if (!$flood) return;
    $flood.style.opacity = '0';
    setTimeout(() => {
      $flood.classList.remove('show');
      $flood.style.background = '';
    }, 800);
  }

  // ─── Performant canvas confetti ─────────────────────────────────────────────
  let _confettiRaf = null;
  let _confettiCanvas = null;
  let _confettiCtx = null;
  let _confettiParticles = [];

  function _ensureConfettiCanvas() {
    if (_confettiCanvas) return;
    _confettiCanvas = document.createElement('canvas');
    Object.assign(_confettiCanvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '999',
    });
    document.body.appendChild(_confettiCanvas);
    _confettiCtx = _confettiCanvas.getContext('2d');
  }

  function _resizeConfettiCanvas() {
    if (!_confettiCanvas) return;
    _confettiCanvas.width  = window.innerWidth;
    _confettiCanvas.height = window.innerHeight;
  }

  function stopConfetti() {
    if (_confettiRaf) { cancelAnimationFrame(_confettiRaf); _confettiRaf = null; }
    _confettiParticles = [];
    if (_confettiCtx && _confettiCanvas) {
      _confettiCtx.clearRect(0, 0, _confettiCanvas.width, _confettiCanvas.height);
    }
  }

  function spawnConfetti(winnerHex) {
    stopConfetti();
    _ensureConfettiCanvas();
    _resizeConfettiCanvas();

    const palette = [
      winnerHex, '#fff', 'rgba(255,255,255,.6)',
      ...COLORS.slice(0, 5).map(c => c.hex),
    ];

    const W = _confettiCanvas.width;
    const H = _confettiCanvas.height;

    _confettiParticles = Array.from({ length: 90 }, () => {
      const size = 5 + Math.random() * 9;
      return {
        x: W * (0.08 + Math.random() * 0.84),
        y: -20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 2.5 + Math.random() * 2.8,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 6,
        w: size,
        h: Math.random() > 0.5 ? size : size * 2.8,
        color: palette[Math.floor(Math.random() * palette.length)],
        round: Math.random() > 0.4,
        opacity: 0.55 + Math.random() * 0.45,
        delay: Math.floor(Math.random() * 55),
      };
    });

    function frame() {
      _confettiCtx.clearRect(0, 0, W, H);
      let alive = 0;

      for (const p of _confettiParticles) {
        if (p.delay > 0) { p.delay--; alive++; continue; }
        p.x  += p.vx;
        p.y  += p.vy;
        p.rot += p.rotV;
        p.vy *= 1.009;
        if (p.y > H + 20) continue;
        alive++;

        _confettiCtx.save();
        _confettiCtx.globalAlpha = p.opacity;
        _confettiCtx.fillStyle   = p.color;
        _confettiCtx.translate(p.x, p.y);
        _confettiCtx.rotate((p.rot * Math.PI) / 180);
        if (p.round) {
          _confettiCtx.beginPath();
          _confettiCtx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          _confettiCtx.fill();
        } else {
          _confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        _confettiCtx.restore();
      }

      if (alive > 0) {
        _confettiRaf = requestAnimationFrame(frame);
      } else {
        stopConfetti();
      }
    }

    _confettiRaf = requestAnimationFrame(frame);
  }

  // ─── Session persistence ────────────────────────────────────────────────────
  function saveSession(players) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ players, ts: Date.now() }));
    } catch (_) {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.players || data.players.length < 2) return null;
      return data;
    } catch (_) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function promptSession(defaultPlayers) {
    return new Promise(resolve => {
      const session = loadSession();
      if (!session) { resolve(defaultPlayers); return; }

      const overlay = document.createElement('div');
      overlay.id = 'session-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0',
        background: 'rgba(8,8,16,.85)',
        backdropFilter: 'blur(10px)',
        webkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '9999',
        animation: 'pop .3s cubic-bezier(.17,.67,.3,1.35) both',
      });

      const names = session.players.map(p => p.name).join(', ');
      const short = names.length > 48 ? names.slice(0, 46) + '…' : names;

      overlay.innerHTML = `
        <div style="
          background:#12121f;
          border:1px solid rgba(255,255,255,.14);
          border-radius:22px;
          padding:28px 26px 22px;
          width:min(84vw,320px);
          text-align:center;
          font-family:'DM Sans',sans-serif;
          color:#e8e8f2;
          box-shadow:0 20px 60px rgba(0,0,0,.7);
        ">
          <div style="font-size:32px;margin-bottom:10px">🎡</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.05em;color:#fbbf24;margin-bottom:6px">Sesión anterior</div>
          <div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:18px;line-height:1.5">${short}</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button id="sess-load" style="
              padding:13px;border:none;border-radius:12px;
              background:linear-gradient(135deg,#f59e0b,#fbbf24);
              color:#1a0e00;font-family:'Bebas Neue',sans-serif;
              font-size:18px;letter-spacing:.06em;cursor:pointer;
              touch-action:manipulation;
            ">Cargar última sesión</button>
            <button id="sess-new" style="
              padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:12px;
              background:rgba(255,255,255,.06);
              color:rgba(255,255,255,.75);font-family:'DM Sans',sans-serif;
              font-size:14px;font-weight:500;cursor:pointer;
              touch-action:manipulation;
            ">Nueva ronda</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#sess-load').addEventListener('click', () => {
        overlay.remove();
        resolve(session.players);
      });
      overlay.querySelector('#sess-new').addEventListener('click', () => {
        clearSession();
        overlay.remove();
        resolve(defaultPlayers);
      });
    });
  }

  // ─── Misc helpers ────────────────────────────────────────────────────────────
  function isInteractiveTarget(target) {
    return Boolean(target.closest(INTERACTIVE_SELECTOR));
  }

  return {
    COLORS,
    EMOJIS,
    INTERACTIVE_SELECTOR,
    showScreen,
    toast,
    floodColor,
    clearFlood,
    spawnConfetti,
    stopConfetti,
    isInteractiveTarget,
    saveSession,
    loadSession,
    clearSession,
    promptSession,
    registerCleanup,
    runAllCleanups,
  };
})();