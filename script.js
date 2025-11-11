const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;
let levelPopupShown = false;
let currentLevel = 1;
let unlockedLevels = [1];

// UI Elements
const levelPopup = document.getElementById('levelPopup');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeBtn = document.getElementById('closeBtn');
const panelHeader = document.getElementById('panelHeader');
const sidePanel = document.getElementById('sidePanel');
const percentCompleteEl = document.getElementById('percentComplete');
const pondListEl = document.getElementById('pondList');

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

// Collapse/expand side panel
panelHeader.addEventListener('click', () => {
  sidePanel.classList.toggle('collapsed');
});

// Select unlocked pond
pondListEl.addEventListener('click', e => {
  if(e.target.tagName === 'LI'){
    const lvl = parseInt(e.target.dataset.level);
    startLevel(lvl);
  }
});

// Canvas resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if(pond) {
    pond.x = canvas.width / 2;
    pond.y = canvas.height / 2;
  }
}
window.addEventListener('resize', resizeCanvas);

// Pond and game state
let pond = {};
let ripples = [];
let fish = [];
let pondGrid = [];
const GRID_STEP = 10;

// Initialize first level
startLevel(1);

// Ripple on click
canvas.addEventListener('pointerdown', e=>{
  if(!inPond(e.clientX,e.clientY)) return;
  ripples.push({x:e.clientX, y:e.clientY, radius:0, maxRadius:60, alpha:0.3});
  if(!mute){
    const audio = new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.type='sine';
    o.frequency.value=220;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001,audio.currentTime+0.3);
    o.stop(audio.currentTime+0.3);
  }
});

// Functions
function inPond(x,y){
  const dx = x-pond.x;
  const dy = y-pond.y;
  return (dx*dx)/(pond.rx*pond.rx) + (dy*dy)/(pond.ry*pond.ry) <= 1;
}

function clampFish(f){
  const dx = f.x - pond.x;
  const dy = f.y - pond.y;
  const val = (dx*dx)/(pond.rx*pond.rx) + (dy*dy)/(pond.ry*pond.ry);
  if(val > 1){
    const angle = Math.atan2(dy, dx);
    f.x = pond.x + Math.cos(angle)*pond.rx*0.95;
    f.y = pond.y + Math.sin(angle)*pond.ry*0.95;
    f.vx *= -1;
    f.vy *= -1;
  }
}

function
