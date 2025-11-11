const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');

let mute = false;
let scale = 1;
let levelPopupShown = false;
let currentLevel = 1;
let unlockedLevels = [1];
let pondStates = {}; // stores pondGrid & fish for each level
let firstLoad = true;

const levelPopup = document.getElementById('levelPopup');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeBtn = document.getElementById('closeBtn');
const welcomePopup = document.getElementById('welcomePopup');
const startBtn = document.getElementById('startBtn');
const panelHeader = document.getElementById('panelHeader');
const sidePanel = document.getElementById('sidePanel');
const percentCompleteEl = document.getElementById('percentComplete');
const pondListEl = document.getElementById('pondList');

// Only Level 1 should be visible at start
pondListEl.innerHTML = '<li data-level="1">Level 1</li>';

panelHeader.textContent = "MENU ▸";

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

panelHeader.addEventListener('click', () => {
  sidePanel.classList.toggle('collapsed');
});

pondListEl.addEventListener('click', e => {
  if (e.target.tagName === 'LI') {
    const lvl = parseInt(e.target.dataset.level);
    startLevel(lvl);
  }
});

// Zoom buttons with smaller increments
const zoomInBtn = document.createElement('button');
zoomInBtn.textContent = '+';
zoomInBtn.style.position = 'absolute';
zoomInBtn.style.top = '50px';
zoomInBtn.style.left = '10px';
zoomInBtn.style.zIndex = 30;
zoomInBtn.style.padding = '8px';
zoomInBtn.style.fontSize = '18px';
zoomInBtn.style.cursor = 'pointer';
document.body.appendChild(zoomInBtn);

const zoomOutBtn = document.createElement('button');
zoomOutBtn.textContent = '−';
zoomOutBtn.style.position = 'absolute';
zoomOutBtn.style.top = '90px';
zoomOutBtn.style.left = '10px';
zoomOutBtn.style.zIndex = 30;
zoomOutBtn.style.padding = '8px';
zoomOutBtn.style.fontSize = '18px';
zoomOutBtn.style.cursor = 'pointer';
document.body.appendChild(zoomOutBtn);

// Smaller zoom steps
zoomInBtn.addEventListener('click', () => { scale += 0.05; if(scale>3) scale=3; });
zoomOutBtn.addEventListener('click', () => { scale -= 0.05; if(scale<0.3) scale=0.3; });

let pond = { x: 0, y: 0, rx: 150, ry: 100 };
let ripples = [];
let fish = [];
let pondGrid = [];
const GRID_STEP = 10;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (pond) pond.x = canvas.width / 2, pond.y = canvas.height / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Pointer event
canvas.addEventListener('pointerdown', e => {
  const x = (e.clientX - canvas.width / 2) / scale + canvas.width / 2;
  const y = (e.clientY - canvas.height / 2) / scale + canvas.height / 2;
  if (!inPond(x, y)) return;
  ripples.push({ x, y, radius: 0, maxRadius: 60, alpha: 0.3 });
  if (!mute) {
    const audio = new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.type = 'sine';
    o.frequency.value = 220;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.3);
    o.stop(audio.currentTime + 0.3);
  }
});

function inPond(x, y) {
  const dx = x - pond.x;
  const dy = y - pond.y;
  return (dx * dx) / (pond.rx * pond.rx) + (dy * dy) / (pond.ry * pond.ry) <= 1;
}

function clampFish(f) {
  const dx = f.x - pond.x;
  const dy = f.y - pond.y;
  const val = (dx * dx) / (pond.rx * pond.rx) + (dy * dy) / (pond.ry * pond.ry);
  if (val > 1) {
    const angle = Math.atan2(dy, dx);
    f.x = pond.x + Math.cos(angle) * pond.rx * 0.95;
    f.y = pond.y + Math.sin(angle) * pond.ry * 0.95;
    f.vx *= -1;
    f.vy *= -1;
  }
}

function generatePondShape(level) {
  let rx = 200 + Math.random() * 200;
  let ry = 100 + Math.random() * 150;
  return { rx, ry };
}

function startLevel(level) {
  currentLevel = level;
  levelPopupShown = false;

  pond = { x: canvas.width/2, y: canvas.height/2, ...generatePondShape(level) };
  ripples = [];

  if (pondStates[level]) {
    pondGrid = pondStates[level].pondGrid;
    fish = pondStates[level].fish;
  } else {
    pondGrid = [];
    fish = [];
    for (let x = -pond.rx; x < pond.rx; x += GRID_STEP) {
      for (let y = -pond.ry; y < pond.ry; y += GRID_STEP) {
        if ((x*x)/(pond.rx*pond.rx) + (y*y)/(pond.ry*pond.ry) <= 1) {
          pondGrid.push({ x: pond.x + x, y: pond.y + y, cleaned: false });
        }
      }
    }
    const numFish = 15;
    for (let i=0;i<numFish;i++){
      const angle = Math.random()*2*Math.PI;
      const rFactor = Math.random();
      const x = pond.x + Math.cos(angle)*pond.rx*rFactor;
      const y = pond.y + Math.sin(angle)*pond.ry*rFactor;
      const vx = (Math.random()-0.5)*1.2;
      const vy = (Math.random()-0.5)*0.8;
      fish.push({x,y,vx,vy});
    }
  }
  pondStates[level] = { pondGrid, fish };
}

function updatePondGrid() {
  ripples.forEach(r => {
    pondGrid.forEach(p => {
      if (!p.cleaned) {
        const dist = Math.hypot(p.x - r.x, p.y - r.y);
        if (dist <= r.radius) p.cleaned = true;
      }
    });
  });
}

function checkLevelComplete() {
  return pondGrid.every(p => p.cleaned);
}

function animate() {
  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width/2, -canvas.height/2);

  // Grass background
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Pond base - murky brown-green
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5e4b3c';
  ctx.fill();
  ctx.clip();

  // Ripples
  ripples.forEach(r=>{
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius,0,Math.PI*2);
    ctx.fillStyle='rgba(102,204,255,0.6)';
    ctx.fill();
    if (r.radius < r.maxRadius) r.radius += 1.5;
  });

  updatePondGrid();

  // Blue water
  pondGrid.forEach(p=>{
    if(p.cleaned){
      ctx.fillStyle='#66ccff';
      ctx.fillRect(p.x-GRID_STEP/2, p.y-GRID_STEP/2, GRID_STEP, GRID_STEP);
    }
  });

  // Fish
  const cleanedPoints = pondGrid.filter(p=>p.cleaned);
  fish.forEach(f=>{
    f.x+=f.vx; f.y+=f.vy;
    clampFish(f);
    let visible = cleanedPoints.some(c=>Math.hypot(f.x-c.x,f.y-c.y)<=10);
    if(visible){
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(Math.atan2(f.vy,f.vx));
      ctx.beginPath();
      ctx.ellipse(0,0,8,4,0,0,Math.PI*2);
      ctx.fillStyle='yellow';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8,0); ctx.lineTo(-12,3); ctx.lineTo(-12,-3); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.restore();

  // Percent complete display
  const percent = pondGrid.length ? Math.floor((cleanedPoints.length/pondGrid.length)*100) : 0;
  percentCompleteEl.textContent = `Level ${currentLevel}: ${percent}%`;

  // Level complete popup
  if(checkLevelComplete() && !levelPopupShown && !firstLoad){
    levelPopup.style.display='flex';
    levelPopupShown=true;
    if(!unlockedLevels.includes(currentLevel+1)){
      unlockedLevels.push(currentLevel+1);
      const li=document.createElement('li');
      li.dataset.level=currentLevel+1;
      li.textContent=`Level ${currentLevel+1}`;
      pondListEl.appendChild(li);
    }
  }

  requestAnimationFrame(animate);
}

animate();

// Level complete popup buttons
nextLevelBtn.addEventListener('click',()=>{
  levelPopup.style.display='none';
  startLevel(currentLevel+1);
});
closeBtn.addEventListener('click',()=>{ levelPopup.style.display='none'; });

// Welcome popup
if(firstLoad){
  welcomePopup.style.display='flex';
  startBtn.addEventListener('click',()=>{
    welcomePopup.style.display='none';
    startLevel(1);
    firstLoad=false;
  });
} else {
  startLevel(1);
}
