'use strict';

window.AppCommon = (() => {
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
  const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label';

  const $flood = document.getElementById('flood');
  const $toast = document.getElementById('toast');

  let toastTmr = null;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.toggle('active', screen.id === id);
      screen.classList.toggle('hidden', screen.id !== id);
    });
  }

  function toast(message) {
    if (!$toast) return;

    $toast.textContent = message;
    $toast.classList.add('show');

    clearTimeout(toastTmr);
    toastTmr = setTimeout(() => $toast.classList.remove('show'), 2400);
  }

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

  function spawnConfetti(winnerHex) {
    const palette = [
      winnerHex,
      '#fff',
      'rgba(255,255,255,.5)',
      ...COLORS.slice(0, 5).map(color => color.hex),
    ];

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

  return {
    COLORS,
    EMOJIS,
    INTERACTIVE_SELECTOR,
    showScreen,
    toast,
    floodColor,
    clearFlood,
    spawnConfetti,
    isInteractiveTarget,
  };
})();