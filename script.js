const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

const muteBtn = document.getElementById('muteBtn');
muteBtn.addEventListener('click', () => {
  mute = !mute;
  muteBtn.textContent = mute ? 'Unmute' : 'Mute';
});

let ripples = [];
let scale = 1;
let offsetX = 0;
let offsetY = 0;

const pondWidth = 2000;  // Virtual pond size
const pondHeight = 1000;
let lakeData = [];        // stores cleaned percentage for each pixel block

// Initialize lake data
for (let x = 0; x < pondWidth; x++) {
  lakeData[x] = [];
  for (let y = 0; y < pondHeight; y++) {
    lakeData[x][y] = 0; // 0 = dirty, 1 = cleaned
  }
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Click/tap
canvas.addEventListener('pointerdown', (e) => {
  const x = (e.clientX - offsetX) / scale;
  const y = (e.clientY - offsetY) / scale;
  ripples.push({ x, y, radius: 0, alpha: 1 });
  if (!mute) {
    const audio = new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.type = 'sine';
    o.frequency.value = 220;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.5);
    o.stop(audio.currentTime + 0.5);
  }
});

// Zooming
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoom = e.deltaY < 0 ? 1.1 : 0.9;
  const mx = e.clientX;
  const my = e.clientY;
  offsetX = mx - (mx - offsetX) * zoom;
  offsetY = my - (my - offsetY) * zoom;
  scale *= zoom;
});

// Draw pond
function drawPond() {
  for (let x = 0; x < pondWidth; x+=4) {
    for (let y = 0; y < pondHeight; y+=4) {
      const val = lakeData[x][y];
      if (val < 1) {
        ctx.fillStyle = `rgba(${50 + val*100}, ${30 + val*100}, ${20 + val*50},1)`; // murky → cleaner
      } else {
        ctx.fillStyle = `#66ccff`; // clean water
      }
      ctx.fillRect(x, y, 4, 4);
    }
  }
}

// Animate
function animate() {
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  // Clear canvas
  ctx.clearRect(-offsetX/scale, -offsetY/scale, canvas.width/scale, canvas.height/scale);

  // Update ripples
  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    r.radius += 5;
    r.alpha -= 0.01;

    // Clean lake within ripple
    for (let x = Math.max(0, r.x - r.radius); x < Math.min(pondWidth, r.x + r.radius); x+=4) {
      for (let y = Math.max(0, r.y - r.radius); y < Math.min(pondHeight, r.y + r.radius); y+=4) {
        const dx = x - r.x;
        const dy = y - r.y;
        if (Math.sqrt(dx*dx + dy*dy) <= r.radius) {
          lakeData[x][y] = Math.min(1, lakeData[x][y]+0.05); // increment cleaning
        }
      }
    }

    // Draw ripple
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (r.alpha <= 0) {
      ripples.splice(i,1);
      i--;
    }
  }

  drawPond();

  requestAnimationFrame(animate);
}

animate();
