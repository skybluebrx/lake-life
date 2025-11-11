const canvas = document.getElementById("pondCanvas");
const ctx = canvas.getContext("2d");

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let viewX = 0;
let viewY = 0;
let zoom = 1;

let level = 1;
const totalLevels = 10;
let ponds = [];
let fishList = [];
const trees = [];
const treeCount = 40;

// Pond settings
function generatePond(level) {
  const baseRadius = 100 + level * 20;
  const irregularity = level * 10;
  const x = canvasWidth/2;
  const y = canvasHeight/2;
  return {
    x, y,
    radius: baseRadius,
    irregularity: irregularity,
    cleaned: [],
    shape: generatePondShape(baseRadius, irregularity),
  };
}

function generatePondShape(radius, irregularity) {
  const points = [];
  const step = Math.PI*2 / 100;
  for(let theta=0; theta<Math.PI*2; theta+=step){
    const r = radius + Math.random()*irregularity - irregularity/2;
    const px = r * Math.cos(theta);
    const py = r * Math.sin(theta);
    points.push({x:px, y:py});
  }
  return points;
}

// Generate ponds
for(let i=1;i<=totalLevels;i++){
  ponds.push(generatePond(i));
}

// Trees
function generateTrees(){
  for(let i=0;i<treeCount;i++){
    const x = Math.random()*canvasWidth;
    const y = Math.random()*canvasHeight;
    const size = 20 + Math.random()*30;
    trees.push({x,y,size});
  }
}

// Fish
function generateFish() {
  fishList = [];
  for(let i=0;i<15;i++){
    const fish = {
      x: ponds[level-1].x,
      y: ponds[level-1].y,
      angle: Math.random()*2*Math.PI,
      speed: 0.5 + Math.random()*1,
      size: 10 + Math.random()*5
    };
    fishList.push(fish);
  }
}

// Zoom buttons
document.getElementById("zoomIn").addEventListener("click",()=>{zoom+=0.05;});
document.getElementById("zoomOut").addEventListener("click",()=>{zoom-=0.05;});

// Pan buttons
document.getElementById("panUp").addEventListener("click",()=>{viewY-=20;});
document.getElementById("panDown").addEventListener("click",()=>{viewY+=20;});
document.getElementById("panLeft").addEventListener("click",()=>{viewX-=20;});
document.getElementById("panRight").addEventListener("click",()=>{viewX+=20;});

// Menu collapse
const menu = document.getElementById("menu");
const menuHeader = document.getElementById("menuHeader");
menuHeader.addEventListener("click",()=>{
  menu.classList.toggle("collapsed");
});

// Popup
const levelPopup = document.getElementById("levelPopup");
const popupText = document.getElementById("popupText");
const popupButton = document.getElementById("popupButton");

function showPopup(text,btnText){
  popupText.innerText=text;
  popupButton.innerText=btnText;
  levelPopup.style.display="block";
}

popupButton.addEventListener("click",()=>{
  levelPopup.style.display="none";
  generateFish();
  draw();
});

showPopup("WELCOME TO LAKE LIFE\nClick Start to Clean Your First Pond","Start");

// Pond cleaning
canvas.addEventListener("click",(e)=>{
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX-rect.left-viewX)/zoom;
  const my = (e.clientY-rect.top-viewY)/zoom;

  const pond = ponds[level-1];
  const dx = mx-pond.x;
  const dy = my-pond.y;
  const dist = Math.sqrt(dx*dx+dy*dy);

  if(dist<pond.radius){
    // Clean area
    pond.cleaned.push({x:mx, y:my, r:10});
  }

  checkLevelComplete();
});

function checkLevelComplete(){
  const pond = ponds[level-1];
  if(pond.cleaned.length>50){ // simplified, adjust later
    showPopup("LEVEL "+level+" COMPLETE","Next Level");
    level++;
    if(level>totalLevels) level=totalLevels;
  }
}

// Draw everything
function draw(){
  ctx.setTransform(zoom,0,0,zoom,viewX,viewY);
  ctx.clearRect(0,0,canvasWidth/zoom,canvasHeight/zoom);

  // Draw trees
  trees.forEach(t=>{
    ctx.fillStyle="#3b5723";
    ctx.beginPath();
    ctx.arc(t.x,t.y,t.size,0,2*Math.PI);
    ctx.fill();
  });

  // Draw pond
  const pond = ponds[level-1];
  ctx.save();
  ctx.translate(pond.x,pond.y);
  ctx.beginPath();
  pond.shape.forEach((p,i)=>{
    if(i===0) ctx.moveTo(p.x,p.y);
    else ctx.lineTo(p.x,p.y);
  });
  ctx.closePath();
  ctx.clip();

  // Murky water
  ctx.fillStyle="rgba(0,80,40,0.7)";
  ctx.fill();

  // Blue cleaned spots
  pond.cleaned.forEach(c=>{
    ctx.beginPath();
    ctx.arc(c.x-pond.x,c.y-pond.y,c.r,0,2*Math.PI);
    ctx.fillStyle="rgba(50,150,255,0.9)";
    ctx.fill();
  });

  ctx.restore();

  // Draw fish
  fishList.forEach(f=>{
    // Only draw if inside cleaned area
    let insideClean=false;
    pond.cleaned.forEach(c=>{
      const dx=f.x-c.x;
      const dy=f.y-c.y;
      if(Math.sqrt(dx*dx+dy*dy)<c.r){
        insideClean=true;
      }
    });
    if(insideClean){
      ctx.fillStyle="yellow";
      ctx.beginPath();
      ctx.ellipse(f.x,f.y,f.size,f.size/2,0,0,2*Math.PI);
      ctx.fill();

      // tail
      ctx.beginPath();
      ctx.moveTo(f.x-f.size,f.y);
      ctx.lineTo(f.x-f.size-5,f.y-5);
      ctx.lineTo(f.x-f.size-5,f.y+5);
      ctx.closePath();
      ctx.fill();
    }
  });

  requestAnimationFrame(draw);
}

// Animate fish movement
function animateFish(){
  const pond = ponds[level-1];
  fishList.forEach(f=>{
    f.x+=Math.cos(f.angle)*f.speed;
    f.y+=Math.sin(f.angle)*f.speed;

    // Keep inside pond radius
    const dx=f.x-pond.x;
    const dy=f.y-pond.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>pond.radius){
      f.angle+=Math.PI;
    }
  });
  setTimeout(animateFish,30);
}

generateTrees();
animateFish();
draw();
