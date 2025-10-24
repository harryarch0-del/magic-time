/* script.js - mobile-friendly flower bubbles */
const EMOJIS = ["🌸","🌼","🌷","💮","🌹","💐"];
let activeFlowers = 0;
let flowerId = 0;

// Adaptive limits for performance
function getMaxFlowers() {
  const vw = Math.max(window.innerWidth || 360, 360);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  if (isTouch || vw < 520) return 6;      // phones -> fewer flowers
  if (vw < 900) return 10;                // tablets -> modest
  return 18;                              // desktops -> more
}

const MAX_FLOWERS = () => getMaxFlowers();

// Utility: random in range
const rand = (min, max) => Math.random() * (max - min) + min;

// Only spawn when visible (saves battery)
function canSpawn() {
  return !document.hidden && MAX_FLOWERS() > 0;
}

// Create one flower element
function createFlower() {
  if (!canSpawn()) return;
  if (activeFlowers >= MAX_FLOWERS()) return;

  activeFlowers++;
  const el = document.createElement('div');
  el.className = 'flower';
  el.dataset.id = ++flowerId;

  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  // nested span so we can rotate/transform separately if needed
  el.innerHTML = `<span>${emoji}</span>`;

  // starting pos: random left but keep inside viewport safely
  const left = rand(4, 96);
  el.style.left = left + 'vw';

  // choose size & duration (smaller on phones)
  const baseSize = (window.innerWidth < 520) ? rand(18, 34) : rand(20, 40);
  el.style.fontSize = baseSize + 'px';

  // small horizontal drift achieved by CSS transform on creation
  const drift = rand(-25, 25);
  el.style.setProperty('--drift', drift + 'px');

  // randomize rise duration slightly
  const dur = rand(5.5, 9.5);
  el.style.setProperty('--rise-dur', dur + 's');

  // small random initial rotation
  el.style.transform = `translateY(0) rotate(${rand(-20, 20)}deg)`;

  document.body.appendChild(el);

  // remove element after duration + buffer
  const lifetime = (dur * 1000) + 600;
  setTimeout(() => {
    if (el && el.remove) el.remove();
    activeFlowers = Math.max(0, activeFlowers - 1);
  }, lifetime);

  // allow a little sway via small CSS rotation using requestAnimationFrame
  let rot = rand(-15,15);
  let dir = Math.random() > 0.5 ? 1 : -1;
  let swayFrames = 0;

  function swayTick() {
    if (!el.parentElement) return;
    swayFrames++;
    const angle = rot + Math.sin(swayFrames / rand(20,60)) * dir * rand(6,14);
    el.style.transform = `translateY(0) rotate(${angle}deg)`;
    requestAnimationFrame(swayTick);
  }
  requestAnimationFrame(swayTick);
}

// spawn flowers on interval but adaptive
let spawnInterval = null;
function startSpawner() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (spawnInterval) clearInterval(spawnInterval);
  const baseInterval = (window.innerWidth < 520) ? 1000 : 600;
  spawnInterval = setInterval(() => {
    if (canSpawn()) createFlower();
  }, baseInterval + rand(-200, 400));
}
startSpawner();

// stop when page hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && spawnInterval) clearInterval(spawnInterval);
  else startSpawner();
});

// adapt on resize/orientation change
window.addEventListener('resize', () => {
  // reduce active flowers if limit changed
  // restart spawner for new interval & limits
  startSpawner();
});

// Touch / mouse interaction: tap -> create a small burst and repel nearby flowers
function makeBurst(x, y) {
  const burst = document.createElement('div');
  burst.className = 'burst';
  burst.style.left = (x - 12) + 'px';
  burst.style.top = (y - 12) + 'px';
  burst.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 800);

  // repel nearby flowers
  const flowers = Array.from(document.querySelectorAll('.flower'));
  flowers.forEach(f => {
    const rect = f.getBoundingClientRect();
    const fx = rect.left + rect.width / 2;
    const fy = rect.top + rect.height / 2;
    const dist = Math.hypot(fx - x, fy - y);
    if (dist < 140) {
      f.classList.add('repel');
      // compute vector and translate
      const vx = (fx - x) / Math.max(dist, 20);
      const vy = (fy - y) / Math.max(dist, 20);
      const tx = vx * rand(28, 80);
      const ty = vy * rand(18, 80);
      f.style.transform = `translate(${tx}px, ${ty}px) rotate(${rand(-30,30)}deg) scale(${rand(0.9,1.15)})`;
      // subtle fade
      f.style.opacity = 0.92;
      setTimeout(() => {
        // remove repel class so normal animation can continue (if any)
        if (f && f.classList) f.classList.remove('repel');
      }, 420);
    }
  });
}

// pointer event handling — supports both mouse and touch
let pointerDown = false;
function handlePointer(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  makeBurst(x, y);
}

// on tap/click
document.addEventListener('click', (e) => {
  handlePointer(e);
});

// also support touchstart for faster response on mobile
document.addEventListener('touchstart', (e) => {
  handlePointer(e);
}, {passive: true});

// gracefully stop spawning on low battery or constrained devices? (best-effort)
if ('connection' in navigator) {
  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || (conn.effectiveType && /2g|slow-2g/.test(conn.effectiveType)))) {
      // reduce spawn rate drastically or disable
      if (spawnInterval) clearInterval(spawnInterval);
      spawnInterval = setInterval(() => { if (canSpawn() && Math.random() > 0.85) createFlower(); }, 2500);
    }
  } catch (e) { /* ignore */ }
}
