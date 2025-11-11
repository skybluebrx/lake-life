const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');

let cw = canvas.width = window.innerWidth;
let ch = canvas.height = window.innerHeight;

let scale = 1;
let offsetX = 0, offsetY = 0;

let level = 1;
const totalLevels = 5;

let pondShapes = [
  {x:cw/2, y:ch/2, radius:100}, // level 1
  {x:cw/2, y:ch/2, radius:120},
  {x:cw/2, y:ch/2, radius:150},
  {x:cw/2, y:ch/2, radius:180},
  {x:cw/2, y:ch/2, radius:200},
];

let pond = {...pondShapes[level-1]};

let ripples = [];
let fish = [];
let trees = [];

let unlockedLevels = [1];
let pondCleanPercent = 0;

// Populate fish
function createFish(){
  fish = [];
  for(let i=0;i<10+level*2;i++){
    fish.push({
      x: pond.x + (Math.random()-0.5)*pond.radius*1.5,
      y: pond.y + (Math.random()-0.5)*pond.radius*1.5,
      vx: (Math.random()-0.5)*2,
      vy: (Math.random()-0.5)*2
    });
  }
}

// Populate trees
function createTrees(){
  trees = [];
  for(let i=0;i<50;i++){
    trees.push({
      x: Math.random()*cw,
      y: Math.random()*ch,
      size: 20 + Math.random()*30
    });
  }
}

// Initial setup
createFish();
createTrees();

// Menu elements
const levelDisplay = document.getElementById('levelDisplay');
const percentDisplay = document.getElementById('percentDisplay');
const unlockedDiv = document.getElementById('unlockedLevels');
const popup = document.getElementById('popup');
const popupText = document.getElementById('popupText');
const startBtn = document.getElementById('startBtn');

startBtn.onclick = () => { popup.style.display='none'; }

// Zoom
function zoom(delta){
  scale += delta;
  if(scale<0.2) scale=0.2;
  if(scale>2) scale=2;
}

// Menu toggle
let menuMinimized = false;
function toggleMenu(){
  menuMinimized = !menuMinimized;
  document.getElementById('menu').style.width = menuMinimized ? '40px':'200px';
}

// Click pond
canvas.addEventListener('click', e=>{
  const mx = (e.clientX - offsetX)/scale;
  const my = (e.clientY - offsetY)/scale;
  const dx = mx - pond.x;
  const dy = my - pond.y;
  if(Math.sqrt(dx*dx + dy*dy) <= pond.radius){
    ripples.push({x:mx, y:my, radius:0, maxRadius:pond.radius/3});
  }
});

// Draw loop
function draw(){
  ctx.setTransform(scale,0,0,scale,offsetX,offsetY);
  ctx.clearRect(0,0,cw,ch);

  // Grass
  ctx.fillStyle = "#228B22";
  ctx.fillRect(0,0,cw, ch);

  // Trees
  trees.forEach(t=>{
    ctx.fillStyle = "#006400";
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x-t.size/2, t.y+t.size);
    ctx.lineTo(t.x+t.size/2, t.y+t.size);
    ctx.closePath();
    ctx.fill();
  });

  // Pond
  ctx.beginPath();
  ctx.arc(pond.x, pond.y, pond.radius, 0, Math.PI*2);
  ctx.fillStyle = "#4b6c2f"; // murky green
  ctx.fill();

  // Ripples / blue water
  ripples.forEach(r=>{
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
    ctx.fillStyle = "rgba(102,204,255,0.5)";
    ctx.fill();
    if(r.radius < r.maxRadius) r.radius += 1.5;
  });

  // Fish
  fish.forEach(f=>{
    f.x += f.vx; f.y += f.vy;
    const dx = f.x - pond.x;
    const dy = f.y - pond.y;
    if(Math.sqrt(dx*dx + dy*dy) > pond.radius){
      f.vx*=-1; f.vy*=-1; f.x+=f.vx; f.y+=f.vy;
    }
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

  // Update completion %
  pondCleanPercent = Math.min(100, ripples.reduce((acc,r)=>acc+Math.PI*r.radius*r.radius,0)/(Math.PI*pond.radius*pond.radius)*100);
  percentDisplay.innerText = pondCleanPercent.toFixed(0)+'%';

  // Level complete
  if(pondCleanPercent>=100){
    if(level<totalLevels){
      if(!document.getElementById('levelComplete')){
        popup.style.display='block';
        popupText.innerText='LEVEL '+level+' COMPLETE!';
        popupText.id='levelComplete';
        startBtn.innerText='Next Level';
        startBtn.onclick = () => {
          popup.style.display='none';
          popupText.id='';
          level++;
          pond={...pondShapes[level-1]};
          createFish();
          createTrees();
          unlockedLevels.push(level);
          startBtn.innerText='Start';
          ripples=[];
        }
      }
    }
  }

  // Unlocked levels
  unlockedDiv.innerHTML='';
  unlockedLevels.forEach(l=>{
    const lv = document.createElement('div');
    lv.className='level';
    lv.innerText='Level '+l;
    lv.onclick=()=>{ 
      level=l; 
      pond={...pondShapes[level-1]};
      createFish();
      ripples=[];
    }
    unlockedDiv.appendChild(lv);
  });

  requestAnimationFrame(draw);
}

draw();
