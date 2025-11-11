const WATER_COLOR = '#1e90ff';
const RIPPLE_COLOR = 'rgba(255,255,255,0.4)';
const LAND_COLOR = '#2c3e50';
const TILE_SIZE = 40;
const RIPPLE_SPEED = 2;
const CHECKPOINT_TILES = 100;
const QUOTES = [
  "The water spreads gently, just like your breath.",
  "Every ripple is a quiet step forward.",
  "Peace grows one circle at a time.",
  "Let the pond hold your worries.",
  "Stillness expands with you."
];

const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
const muteBtn = document.getElementById('muteBtn');
const quoteEl = document.getElementById('quote');

let muted = false;
muteBtn.onclick = () => {
  muted = !muted;
  muteBtn.textContent = muted ? 'Muted' : 'Mute';
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let scale = 1;
let offsetX = 0, offsetY = 0;
let isDragging = false, dragStartX, dragStartY;

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const zoom = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.2, Math.min(scale * zoom, 5));
  const mx = e.clientX, my = e.clientY;
  offsetX = mx - (mx - offsetX) * (newScale / scale);
  offsetY = my - (my - offsetY) * (newScale / scale);
  scale = newScale;
  draw();
});

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  dragStartX = e.clientX - offsetX;
  dragStartY = e.clientY - offsetY;
});
canvas.addEventListener('mousemove', e => {
  if (isDragging) {
    offsetX = e.clientX - dragStartX;
    offsetY = e.clientY - dragStartY;
    draw();
  }
});
canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDragging = true;
  dragStartX = t.clientX - offsetX;
  dragStartY = t.clientY - offsetY;
});
canvas.addEventListener('touchmove', e => {
  if (isDragging) {
    const t = e.touches[0];
    offsetX = t.clientX - dragStartX;
    offsetY = t.clientY - dragStartY;
    draw();
  }
});
canvas.addEventListener('touchend', () => isDragging = false);

const grid = new Map();
let waterCount = 0;

function worldToScreen(wx, wy) {
  return {
    x: (wx * TILE_SIZE * scale) + offsetX,
    y: (wy * TILE_SIZE * scale) + offsetY
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = LAND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = WATER_COLOR;
  for (const [key] of grid) {
    const [x, y] = key.split(',').map(Number);
    const p = worldToScreen(x, y);
    ctx.fillRect(p.x, p.y, TILE_SIZE * scale, TILE_SIZE * scale);
  }

  ripples.forEach(r => r.draw());
}

class Ripple {
  constructor(wx, wy) {
    this.wx = wx; this.wy = wy;
    this.radius = 0;
    this.maxRadius = 8;
    this.alive = true;
  }
  update() {
    this.radius += RIPPLE_SPEED;
    if (this.radius > this.maxRadius) this.alive = false;

    const r = Math.floor(this.radius);
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      const tx = Math.round(this.wx + dx);
      const ty = Math.round(this.wy + dy);
      const key = `${tx},${ty}`;
      if (!grid.has(key)) {
        grid.set(key, true);
        waterCount++;
        checkCheckpoint();
      }
    }
  }
  draw() {
    if (!this.alive) return;
    const c = worldToScreen(this.wx, this.wy);
    const rad = this.radius * TILE_SIZE * scale;
    ctx.strokeStyle = RIPPLE_COLOR;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(c.x + TILE_SIZE*scale/2, c.y + TILE_SIZE*scale/2, rad, 0, Math.PI*2);
    ctx.stroke();
  }
}
const ripples = [];

canvas.addEventListener('click', e => {
  if (!muted) {
    const audioCtx = ctx.audioCtx || (ctx.audioCtx = new AudioContext());
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain).connect(audioCtx.destination);
    gain.gain.value = 0.1;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const wx = Math.floor((mx - offsetX) / (TILE_SIZE * scale));
  const wy = Math.floor((my - offsetY) / (TILE_SIZE * scale));

  ripples.push(new Ripple(wx, wy));
});

function animate() {
  ripples.forEach(r => r.update());
  ripples = ripples.filter(r => r.alive);
  draw();
  requestAnimationFrame(animate);
}
animate();

let lastQuoteTiles = 0;
function checkCheckpoint() {
  if (waterCount - lastQuoteTiles >= CHECKPOINT_TILES) {
    lastQuoteTiles = waterCount;
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteEl.textContent = q;
    quoteEl.style.opacity = 1;
    setTimeout(() => quoteEl.style.opacity = 0, 4000);
  }
}

for (let x = -3; x <= 3; x++) {
  for (let y = -3; y <= 3; y++) {
    grid.set(`${x},${y}`, true);
    waterCount++;
  }
}
draw();