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
let cleanedCircles = [];
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

function startLevel(level){
  currentLevel = level;
  panelHeader.textContent = `Level ${currentLevel} ▸`;

  // Pond size (randomized for each level)
  pond = {
    x: canvas.width/2,
    y: canvas.height/2,
    rx: 200 + Math.random()*200,
    ry: 100 + Math.random()*150
  };

  // Reset
  ripples = [];
  cleanedCircles = [];
  fish = [];
  pondGrid = [];

  // Create pond grid for level completion
  for(let x=-pond.rx; x<pond.rx; x+=GRID_STEP){
    for(let y=-pond.ry; y<pond.ry; y+=GRID_STEP){
      if((x*x)/(pond.rx*pond.rx) + (y*y)/(pond.ry*pond.ry) <=1){
        pondGrid.push({x: pond.x+x, y: pond.y+y, cleaned:false});
      }
    }
  }

  // Fish
  const numFish = 15;
  for(let i=0;i<numFish;i++){
    const angle = Math.random()*2*Math.PI;
    const rFactor = Math.random();
    const x = pond.x + Math.cos(angle)*pond.rx*rFactor;
    const y = pond.y + Math.sin(angle)*pond.ry*rFactor;
    const vx = (Math.random()-0.5)*1.2;
    const vy = (Math.random()-0.5)*0.8;
    fish.push({x,y,vx,vy});
  }

  levelPopupShown = false;
}

// Check level completion based on grid
function updatePondGrid(){
  ripples.forEach(r=>{
    pondGrid.forEach(p=>{
      if(!p.cleaned){
        const dist = Math.hypot(p.x - r.x, p.y - r.y);
        if(dist <= r.radius) p.cleaned = true;
      }
    });
  });
  cleanedCircles = pondGrid.filter(p => p.cleaned);
}

function checkLevelComplete(){
  return pondGrid.every(p=>p.cleaned);
}

// Animate loop
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Grass background
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw pond base
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw expanding blue ripples
  ripples.forEach(r=>{
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
    ctx.fillStyle = `rgba(102,204,255,0.6)`;
    ctx.fill();

    if(r.radius < r.maxRadius) r.radius += 1.5;
  });

  // Update pond grid
  updatePondGrid();

  // Draw fish inside cleaned water only
  fish.forEach(f=>{
    f.x += f.vx;
    f.y += f.vy;
    clampFish(f);

    let visible = false;
    cleanedCircles.forEach(c=>{
      const dist = Math.hypot(f.x-c.x, f.y-c.y);
      if(dist <= 10) visible = true; // fish visible if near cleaned point
    });

    if(visible){
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(Math.atan2(f.vy,f.vx));
      ctx.beginPath();
      ctx.ellipse(0,0,8,4,0,0,Math.PI*2);
      ctx.fillStyle='yellow';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8,0);
      ctx.lineTo(-12,3);
      ctx.lineTo(-12,-3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.restore();

  // Update percent complete
  const percent = Math.floor((cleanedCircles.length/pondGrid.length)*100);
  percentCompleteEl.textContent = percent + '%';

  // Show level complete popup if pond fully cleaned
  if(checkLevelComplete() && !levelPopupShown){
    levelPopup.style.display = 'flex';
    levelPopupShown = true;
    // Unlock next level if not already unlocked
    if(!unlockedLevels.includes(currentLevel+1)){
      unlockedLevels.push(currentLevel+1);
      const li = document.createElement('li');
      li.dataset.level = currentLevel+1;
      li.textContent = `Level ${currentLevel+1}`;
      pondListEl.appendChild(li);
    }
  }

  requestAnimationFrame(animate);
}

resizeCanvas();
animate();

// Level popup buttons
nextLevelBtn.addEventListener('click', ()=>{
  levelPopup.style.display = 'none';
  startLevel(currentLevel+1);
});
closeBtn.addEventListener('click', ()=>{
  levelPopup.style.display = 'none';
});
