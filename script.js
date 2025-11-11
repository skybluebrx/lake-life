const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');

let mute = false;
let scale = 1;
let levelPopupShown = false;
let firstLoad = true;
let currentLevel = 1;
const unlockedLevels = [1];
const pondStates = {};
let pond = {}, ripples=[], fish=[];

// Pond shapes per level (set, irregular shapes)
const pondShapes = {
  1: [{x:0,y:-100},{x:150,y:0},{x:0,y:100},{x:-150,y:0}],
  2: [{x:-50,y:-120},{x:140,y:-60},{x:100,y:80},{x:-140,y:60}],
  3: [{x:-70,y:-140},{x:150,y:-70},{x:130,y:100},{x:-150,y:90}],
  4: [{x:-90,y:-160},{x:170,y:-80},{x:150,y:130},{x:-170,y:120}]
};

// UI Elements
const levelPopup = document.getElementById('levelPopup');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeBtn = document.getElementById('closeBtn');
const welcomePopup = document.getElementById('welcomePopup');
const startBtn = document.getElementById('startBtn');
const sidePanel = document.getElementById('sidePanel');
const panelHeader = document.getElementById('panelHeader');
const pondListEl = document.getElementById('pondList');
const percentCompleteEl = document.getElementById('percentComplete');

// Panel toggle
panelHeader.addEventListener('click', ()=>sidePanel.classList.toggle('collapsed'));

// Mute button
document.getElementById('muteBtn').addEventListener('click',()=>{
  mute=!mute;
  document.getElementById('muteBtn').textContent = mute?'Unmute':'Mute';
});

// Zoom buttons (small increments)
document.getElementById('zoomIn').addEventListener('click', ()=>{ scale += 0.02; if(scale>3) scale=3; });
document.getElementById('zoomOut').addEventListener('click', ()=>{ scale -= 0.02; if(scale<0.5) scale=0.5; });

// Canvas resize
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Pond interaction
canvas.addEventListener('pointerdown', e=>{
  const x = (e.clientX - canvas.width/2)/scale + canvas.width/2;
  const y = (e.clientY - canvas.height/2)/scale + canvas.height/2;
  if(!inPond(x,y)) return;
  ripples.push({x,y,radius:0,maxRadius:60,alpha:0.3});
  if(!mute){
    const audio=new AudioContext(); 
    const o=audio.createOscillator(); 
    const g=audio.createGain(); 
    o.connect(g); g.connect(audio.destination); 
    o.type='sine'; o.frequency.value=220; 
    o.start(); 
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime+0.3); 
    o.stop(audio.currentTime+0.3);
  }
});

// Check if point is in pond
function inPond(x,y){
  if(!pond.points) return false;
  ctx.beginPath();
  const pts = pond.points;
  ctx.moveTo(pond.x+pts[0].x, pond.y+pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pond.x+pts[i].x, pond.y+pts[i].y);
  ctx.closePath();
  return ctx.isPointInPath(x,y);
}

// Fish stay in pond
function clampFish(f){
  if(!pond.points) return;
  ctx.beginPath();
  const pts = pond.points;
  ctx.moveTo(pond.x+pts[0].x, pond.y+pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pond.x+pts[i].x, pond.y+pts[i].y);
  ctx.closePath();
  if(!ctx.isPointInPath(f.x,f.y)){
    f.vx*=-1; f.vy*=-1;
    f.x+=f.vx; f.y+=f.vy;
  }
}

// Start level
function startLevel(level){
  currentLevel = level;
  levelPopupShown = false;
  ripples=[];
  pond.points = pondShapes[level] || pondShapes[1];
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;

  if(pondStates[level]){
    fish = pondStates[level].fish;
    pond.cleanedPoints = pondStates[level].cleanedPoints;
  } else {
    fish=[];
    pond.cleanedPoints=[];
    for(let i=0;i<15;i++){
      const p=pond.points[Math.floor(Math.random()*pond.points.length)];
      fish.push({x:pond.x+p.x/2, y:pond.y+p.y/2, vx:(Math.random()-0.5)*1.5, vy:(Math.random()-0.5)*1.5});
    }
    pondStates[level]={fish, cleanedPoints:[]};
  }
}

// Draw grass and trees
function drawGrass(){
  ctx.fillStyle='#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<100;i++){
    const tx = Math.random()*canvas.width;
    const ty = Math.random()*canvas.height;
    const height = 20+Math.random()*30;
    ctx.fillStyle='#0b3d0b';
    ctx.beginPath();
    ctx.moveTo(tx,ty);
    ctx.lineTo(tx-5,ty+height);
    ctx.lineTo(tx+5,ty+height);
    ctx.closePath();
    ctx.fill();
  }
}

// Draw pond, ripples, blue water, fish
function drawPond(){
  if(!pond.points) return;

  // Murky pond
  ctx.beginPath();
  const pts = pond.points;
  ctx.moveTo(pond.x+pts[0].x, pond.y+pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pond.x+pts[i].x, pond.y+pts[i].y);
  ctx.closePath();
  ctx.fillStyle='#355e2f'; // murky green
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

  // Solid blue water where cleaned
  pond.cleanedPoints.forEach(c=>{
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.radius,0,Math.PI*2);
    ctx.fillStyle='#66ccff';
    ctx.fill();
  });

  // Fish
  fish.forEach(f=>{
    f.x+=f.vx; f.y+=f.vy; clampFish(f);
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

// Level complete check
function checkLevelComplete(){
  return pond.cleanedPoints.length>200;
}

// Animate
function animate(){
  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.scale(scale,scale);
  ctx.translate(-canvas.width/2,-canvas.height/2);

  drawGrass();
  drawPond();

  ctx.restore();

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
} else {
  startLevel(1);
}

// Menu click for saved levels
pondListEl.addEventListener('click', e=>{
  if(e.target.tagName==='LI'){
    const lvl=parseInt(e.target.dataset.level);
    startLevel(lvl);
  }
});
