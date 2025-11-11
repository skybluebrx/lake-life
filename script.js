const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;
}
window.addEventListener('resize', resizeCanvas);

// Pond
const pond = {x: window.innerWidth/2, y: window.innerHeight/2, rx: 300, ry: 150};

// Grid
const gridSize = 12;
const cols = Math.ceil(pond.rx*2/gridSize);
const rows = Math.ceil(pond.ry*2/gridSize);
const cleanGrid = [];
for(let i=0;i<cols;i++){
  cleanGrid[i] = [];
  for(let j=0;j<rows;j++) cleanGrid[i][j] = false;
}

// Fish
const fish = [];
for(let i=0;i<15;i++){
  const angle = Math.random()*2*Math.PI;
  const rFactor = Math.random();
  const x = pond.x + Math.cos(angle)*pond.rx*rFactor;
  const y = pond.y + Math.sin(angle)*pond.ry*rFactor;
  fish.push({x,y,visible:false});
}

// Ripples
let ripples = [];

canvas.addEventListener('pointerdown', e=>{
  const x = e.clientX;
  const y = e.clientY;
  ripples.push({x,y,radius:0,alpha:1});
});

// Check if inside pond
function inPond(x,y){
  const dx = x-pond.x;
  const dy = y-pond.y;
  return (dx*dx)/(pond.rx*pond.rx) + (dy*dy)/(pond.ry*pond.ry) <= 1;
}

// Animate
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Grass background
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Pond base
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw cleaned areas
  for(let i=0;i<cols;i++){
    for(let j=0;j<rows;j++){
      if(cleanGrid[i][j]){
        const cellX = pond.x - pond.rx + i*gridSize + gridSize/2;
        const cellY = pond.y - pond.ry + j*gridSize + gridSize/2;
        ctx.beginPath();
        ctx.ellipse(cellX, cellY, gridSize/2, gridSize/2, 0, 0, Math.PI*2);
        ctx.fillStyle = '#66ccff';
        ctx.fill();
      }
    }
  }

  // Draw ripples
  for(let k=0;k<ripples.length;k++){
    const r = ripples[k];
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius,0,Math.PI*2);
    ctx.strokeStyle = `rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Update cleaned cells
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const cellX = pond.x - pond.rx + i*gridSize + gridSize/2;
        const cellY = pond.y - pond.ry + j*gridSize + gridSize/2;
        if(!cleanGrid[i][j] && Math.hypot(cellX-r.x, cellY-r.y) <= r.radius && inPond(cellX,cellY)){
          cleanGrid[i][j] = true;
        }
      }
    }

    r.radius += 2;
    r.alpha -= 0.01;
    if(r.alpha<=0) ripples.splice(k,1);
  }

  // Draw fish
  fish.forEach(f=>{
    const col = Math.floor((f.x-(pond.x-pond.rx))/gridSize);
    const row = Math.floor((f.y-(pond.y-pond.ry))/gridSize);
    if(col>=0 && row>=0 && col<cols && row<rows && cleanGrid[col][row]) f.visible=true;

    if(f.visible){
      ctx.beginPath();
      ctx.arc(f.x,f.y,5,0,Math.PI*2);
      ctx.fillStyle='orange';
      ctx.fill();
    }
  });

  ctx.restore();
  requestAnimationFrame(animate);
}

resizeCanvas();
animate();
