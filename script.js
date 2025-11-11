const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

// Device pixel ratio
const dpr = window.devicePixelRatio || 1;
function resizeCanvas(){
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(1,0,0,1,0,0); // reset scale
  ctx.scale(dpr, dpr);
  pond.x = window.innerWidth/2;
  pond.y = window.innerHeight/2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Canvas viewport
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// Elliptical pond
const pond = { x: window.innerWidth/2, y: window.innerHeight/2, rx: 300, ry: 150 };

// Grid for cleaned areas
const gridSize = 12;
const cols = Math.ceil(pond.rx*2/gridSize);
const rows = Math.ceil(pond.ry*2/gridSize);
const cleanGrid = [];
for(let i=0;i<cols;i++){
  cleanGrid[i]=[];
  for(let j=0;j<rows;j++) cleanGrid[i][j]=false;
}

// Fish positions
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

// Click/tap
canvas.addEventListener('pointerdown', e=>{
  const x = (e.clientX - offsetX)/scale;
  const y = (e.clientY - offsetY)/scale;
  ripples.push({x, y, radius:0, maxRadius:80, alpha:1});

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

// Zoom
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const zoom = e.deltaY<0?1.1:0.9;
  const mx = e.clientX;
  const my = e.clientY;
  offsetX = mx - (mx - offsetX)*zoom;
  offsetY = my - (my - offsetY)*zoom;
  scale *= zoom;
});

// Check if point inside pond
function inPond(x,y){
  const dx = x - pond.x;
  const dy = y - pond.y;
  return (dx*dx)/(pond.rx*pond.rx) + (dy*dy)/(pond.ry*pond.ry) <= 1;
}

// Animate
function animate(){
  ctx.setTransform(scale,0,0,scale,offsetX,offsetY);
  ctx.clearRect(-offsetX/scale,-offsetY/scale,canvas.width/scale,canvas.height/scale);

  // Grass background
  ctx.fillStyle='#228B22';
  ctx.fillRect(-offsetX/scale,-offsetY/scale,canvas.width/scale,canvas.height/scale);

  // Pond brown base
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle='#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw cleaned areas as ellipses
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
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
    ctx.strokeStyle=`rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth=2;
    ctx.stroke();

    // Update cleaned cells touched by ripple
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

  // Draw fish in cleaned areas
  fish.forEach(f=>{
    const col = Math.floor((f.x - (pond.x - pond.rx))/gridSize);
    const row = Math.floor((f.y - (pond.y - pond.ry))/gridSize);
    if(col>=0 && row>=0 && col<cols && row<rows && cleanGrid[col][row]) f.visible=true;

    if(f.visible){
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5, 0, Math.PI*2);
      ctx.fillStyle='orange';
      ctx.fill();
    }
  });

  ctx.restore();
  requestAnimationFrame(animate);
}

animate();
