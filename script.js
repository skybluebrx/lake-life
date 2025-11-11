const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');

let mute = false;
let scale = 1;
let currentLevel = 1;
let firstLoad = true;
let ripples = [];
let fish = [];
let pond = {};
let pondStates = {};
let unlockedLevels = [1];
let levelPopupShown = false;

// UI
const levelPopup = document.getElementById('levelPopup');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeBtn = document.getElementById('closeBtn');
const welcomePopup = document.getElementById('welcomePopup');
const startBtn = document.getElementById('startBtn');
const sidePanel = document.getElementById('sidePanel');
const panelHeader = document.getElementById('panelHeader');
const pondListEl = document.getElementById('pondList');
const percentCompleteEl = document.getElementById('percentComplete');

// Menu toggle
panelHeader.addEventListener('click', ()=>{
  sidePanel.classList.toggle('collapsed');
});

// Mute
document.getElementById('muteBtn').addEventListener('click', ()=>{
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

// Zoom
document.getElementById('zoomIn').addEventListener('click', ()=>{ scale += 0.02; if(scale>3) scale=3; });
document.getElementById('zoomOut').addEventListener('click', ()=>{ scale -= 0.02; if(scale<0.5) scale=0.5; });

// Resize
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Pond shapes per level
const pondShapes = {
  1: [{x:-80,y:-60},{x:80,y:-60},{x:80,y:60},{x:-80,y:60}],
  2: [{x:-100,y:-70},{x:90,y:-80},{x:110,y:80},{x:-90,y:90}],
  3: [{x:-120,y:-80},{x:100,y:-100},{x:130,y:90},{x:-110,y:100}]
};

// Helper: check if click is inside pond
function inPond(x,y){
  ctx.beginPath();
  const pts = pond.points;
  ctx.moveTo(pond.x+pts[0].x, pond.y+pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pond.x+pts[i].x, pond.y+pts[i].y);
  ctx.closePath();
  return ctx.isPointInPath(x,y);
}

// Start level
function startLevel(level){
  currentLevel = level;
  levelPopupShown = false;
  ripples=[];
  pond.points = pondShapes[level] || pondShapes[1];
  pond.cleanedPoints = pondStates[level]?.cleanedPoints || [];
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;

  if(!pondStates[level]){
    fish = [];
    for(let i=0;i<12;i++){
      const p=pond.points[Math.floor(Math.random()*pond.points.length)];
      fish.push({x:pond.x+p.x/2, y:pond.y+p.y/2, vx:(Math.random()-0.5)*1.5, vy:(Math.random()-0.5)*1.5});
    }
    pondStates[level]={fish, cleanedPoints:[]};
  } else {
    fish = pondStates[level].fish;
  }
}

// Click
canvas.addEventListener('pointerdown', e=>{
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);
  if(!inPond(x,y)) return;
  ripples.push({x, y, radius:0, maxRadius:50});
  if(!mute){
    const audio = new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.type='sine'; o.frequency.value=220;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime+0.3);
    o.stop(audio.currentTime+0.3);
  }
});

// Draw grass and trees
function drawGrass(){
  ctx.fillStyle='#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<60;i++){
    const tx=Math.random()*canvas.width;
    const ty=Math.random()*canvas.height;
    const h=20+Math.random()*30;
    ctx.fillStyle='#0b3d0b';
    ctx.beginPath();
    ctx.moveTo(tx,ty);
    ctx.lineTo(tx-5,ty+h);
    ctx.lineTo(tx+5,ty+h);
    ctx.closePath();
    ctx.fill();
  }
}

// Draw pond
function drawPond(){
  if(!pond.points) return;

  // Murky pond
  ctx.beginPath();
  const pts=pond.points;
  ctx.moveTo(pond.x+pts[0].x, pond.y+pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pond.x+pts[i].x, pond.y+pts[i].y);
  ctx.closePath();
  ctx.fillStyle='#4b6c2f';
  ctx.fill();

  // Ripples
  ripples.forEach(r=>{
    ctx.beginPath();
    ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);
    ctx.fillStyle='rgba(102,204,255,0.3)';
    ctx.fill();
    if(r.radius<r.maxRadius) r.radius+=1.5;
    pond.cleanedPoints.push({x:r.x,y:r.y,radius:r.radius});
  });

  // Solid blue water
  pond.cleanedPoints.forEach(c=>{
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.radius,0,Math.PI*2);
    ctx.fillStyle='#66ccff';
    ctx.fill();
  });

  // Fish
  fish.forEach(f=>{
    f.x+=f.vx; f.y+=f.vy;
    // keep fish inside pond
    if(!inPond(f.x,f.y)){ f.vx*=-1; f.vy*=-1; f.x+=f.vx; f.y+=f.vy; }
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
  });
}

// Check complete
function checkLevelComplete(){
  return pond.cleanedPoints.length>250;
}

// Animate
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrass();
  drawPond();

  percentCompleteEl.textContent=`Level ${currentLevel}: ${Math.min(100,Math.floor((pond.cleanedPoints.length/250)*100))}%`;

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

// Popups
nextLevelBtn.addEventListener('click',()=>{
  levelPopup.style.display='none';
  startLevel(currentLevel+1);
});
closeBtn.addEventListener('click',()=>levelPopup.style.display='none');

// Welcome popup
if(firstLoad){
  welcomePopup.style.display='flex';
  startBtn.addEventListener('click',()=>{
    welcomePopup.style.display='none';
    startLevel(1);
    firstLoad=false;
  });
} else startLevel(1);

// Menu click
pondListEl.addEventListener('click', e=>{
  if(e.target.tagName==='LI'){
    const lvl=parseInt(e.target.dataset.level);
    startLevel(lvl);
  }
});
