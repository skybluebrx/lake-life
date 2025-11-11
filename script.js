const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let cw = canvas.width = window.innerWidth;
let ch = canvas.height = window.innerHeight;

let offsetX = 0;
let offsetY = 0;
let zoom = 1;

const pondLevels = [
  {shape: 'ellipse', width: 300, height: 200}, // level 1
  {shape: 'ellipse', width: 350, height: 220}, // level 2
  {shape: 'ellipse', width: 400, height: 250},
  {shape: 'ellipse', width: 450, height: 300},
  {shape: 'ellipse', width: 500, height: 320},
  {shape: 'ellipse', width: 550, height: 350},
  {shape: 'ellipse', width: 600, height: 380},
  {shape: 'ellipse', width: 650, height: 420},
  {shape: 'ellipse', width: 700, height: 450},
  {shape: 'abstract', width: 750, height: 500} // level 10 irregular
];

let currentLevel = 0;
let pondX, pondY, pondWidth, pondHeight;
let cleanedAreas = [];
let ripples = [];
let fish = [];
let trees = [];

const menu = document.getElementById('menu');
const menuToggle = document.getElementById('menu-toggle');
const menuContent = document.getElementById('menu-content');
const currentLevelEl = document.getElementById('current-level');
const levelListEl = document.getElementById('level-list');
const progressEl = document.getElementById('progress');
const welcomePopup = document.getElementById('welcome-popup');
const startBtn = document.getElementById('start-btn');
const levelCompletePopup = document.getElementById('level-complete-popup');
const nextLevelBtn = document.getElementById('next-level-btn');

menuToggle.addEventListener('click', () => {
  menu.classList.toggle('collapsed');
});

startBtn.addEventListener('click', () => {
  welcomePopup.style.display = 'none';
  initLevel(currentLevel);
});

nextLevelBtn.addEventListener('click', () => {
  levelCompletePopup.style.display = 'none';
  currentLevel++;
  if(currentLevel >= pondLevels.length) currentLevel = pondLevels.length -1;
  initLevel(currentLevel);
});

function initLevel(level) {
  pondWidth = pondLevels[level].width;
  pondHeight = pondLevels[level].height;
  pondX = cw/2;
  pondY = ch/2;
  cleanedAreas = [];
  ripples = [];
  fish = [];
  trees = [];
  generateTrees();
  generateFish();
  currentLevelEl.textContent = 'Level '+(level+1);
  updateLevelList();
  draw();
}

function generateTrees(){
  for(let i=0;i<30;i++){
    let angle = Math.random()*2*Math.PI;
    let radius = Math.random()*Math.min(cw,ch)/2;
    let x = pondX + radius*Math.cos(angle);
    let y = pondY + radius*Math.sin(angle);
    if(!isInsidePond(x,y)){
      trees.push({x,y,size:20+Math.random()*20});
    }
  }
}

function generateFish(){
  for(let i=0;i<10;i++){
    let angle = Math.random()*2*Math.PI;
    let r = Math.random()*Math.min(pondWidth,pondHeight)/2;
    let x = pondX + r*Math.cos(angle);
    let y = pondY + r*Math.sin(angle);
    fish.push({x,y,dx:Math.random()*2-1, dy:Math.random()*2-1, size:5+Math.random()*5});
  }
}

function updateLevelList(){
  levelListEl.innerHTML = '';
  for(let i=0;i<=currentLevel;i++){
    const btn = document.createElement('button');
    btn.textContent = 'Level '+(i+1);
    btn.addEventListener('click', ()=> initLevel(i));
    levelListEl.appendChild(btn);
  }
}

function isInsidePond(x,y){
  let dx = (x-pondX)/pondWidth;
  let dy = (y-pondY)/pondHeight;
  if(pondLevels[currentLevel].shape==='ellipse'){
    return dx*dx + dy*dy <=0.25;
  }
  return dx*dx + dy*dy <=0.5; // irregular, simple approximation
}

canvas.addEventListener('click',(e)=>{
  let rect = canvas.getBoundingClientRect();
  let clickX = (e.clientX - rect.left - offsetX)/zoom;
  let clickY = (e.clientY - rect.top - offsetY)/zoom;
  if(isInsidePond(clickX,clickY)){
    ripples.push({x:clickX,y:clickY,radius:5,maxRadius:50});
  }
});

document.getElementById('zoom-in').addEventListener('click',()=>{zoom*=1.05;});
document.getElementById('zoom-out').addEventListener('click',()=>{zoom/=1.05;});

document.getElementById('pan-up').addEventListener('click',()=>{offsetY+=20;});
document.getElementById('pan-down').addEventListener('click',()=>{offsetY-=20;});
document.getElementById('pan-left').addEventListener('click',()=>{offsetX+=20;});
document.getElementById('pan-right').addEventListener('click',()=>{offsetX-=20;});

function draw(){
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cw,ch);
  ctx.translate(offsetX,offsetY);
  ctx.scale(zoom,zoom);

  // grass background
  ctx.fillStyle = '#7bb661';
  ctx.fillRect(0,0,cw,ch);

  // trees
  trees.forEach(t=>{
    ctx.fillStyle = '#2d7b2d';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x-t.size/2, t.y+t.size);
    ctx.lineTo(t.x+t.size/2, t.y+t.size);
    ctx.closePath();
    ctx.fill();
  });

  // pond base (murky green)
  ctx.fillStyle = '#4a6b3b';
  ctx.beginPath();
  if(pondLevels[currentLevel].shape==='ellipse'){
    ctx.ellipse(pondX, pondY, pondWidth/2, pondHeight/2, 0,0,2*Math.PI);
  } else {
    ctx.ellipse(pondX, pondY, pondWidth/2, pondHeight/2, 0,0,2*Math.PI);
  }
  ctx.fill();

  // ripples & cleaned areas
  ripples.forEach(r=>{
    r.radius += 2;
    ctx.beginPath();
    ctx.arc(r.x,r.y,r.radius,0,2*Math.PI);
    ctx.clip();
    ctx.fillStyle='#4dc3ff';
    ctx.fill();
    if(r.radius<r.maxRadius){
      cleanedAreas.push({x:r.x,y:r.y,radius:r.radius});
    }
  });
  ripples = ripples.filter(r=>r.radius<r.maxRadius);

  // fish only in cleaned areas
  fish.forEach(f=>{
    let inClean = cleanedAreas.some(c=>{
      let dx = f.x-c.x;
      let dy = f.y-c.y;
      return dx*dx+dy*dy<c.radius*c.radius;
    });
    if(inClean){
      ctx.fillStyle='orange';
      ctx.beginPath();
      ctx.ellipse(f.x,f.y,f.size,f.size/2,0,0,2*Math.PI);
      ctx.fill();
      f.x += f.dx;
      f.y += f.dy;
      // keep in cleaned area
      cleanedAreas.forEach(c=>{
        let dx = f.x-c.x;
        let dy = f.y-c.y;
        let dist = Math.sqrt(dx*dx+dy*dy);
        if(dist>c.radius-5){
          f.dx*=-1;
          f.dy*=-1;
        }
      });
    }
  });

  // check progress
  let sampleCount = 1000;
  let cleanedCount = 0;
  for(let i=0;i<sampleCount;i++){
    let sx = pondX + (Math.random()-0.5)*pondWidth;
    let sy = pondY + (Math.random()-0.5)*pondHeight;
    if(isInsidePond(sx,sy)){
      if(cleanedAreas.some(c=>{
        let dx = sx-c.x;
        let dy = sy-c.y;
        return dx*dx+dy*dy<c.radius*c.radius;
      })){
        cleanedCount++;
      }
    }
  }
  let percent = Math.floor(cleanedCount/sampleCount*100);
  progressEl.textContent = percent+'%';
  if(percent>=100 && cleanedAreas.length>0){
    levelCompletePopup.style.display='block';
  }

  ctx.restore();
  requestAnimationFrame(draw);
}

window.addEventListener('resize',()=>{
  cw = canvas.width = window.innerWidth;
  ch = canvas.height = window.innerHeight;
});
