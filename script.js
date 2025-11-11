const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

// Canvas resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pond.x = canvas.width / 2;
  pond.y = canvas.height / 2;
}
window.addEventListener('resize', resizeCanvas);

// Pond ellipse
const pond = { x: window.innerWidth/2, y: window.innerHeight/2, rx: 300, ry: 150 };

// Grid for cleaned areas
const gridSize = 8; // smaller cells
const cols = Math.ceil(pond.rx*2/gridSize);
const rows = Math.ceil(pond.ry*2/gridSize);
const cleanGrid = [];
for(let i=0;i<cols;i++){
  cleanGrid[i]=[];
  for(let j=0;j<rows;j++) cleanGrid[i][j]=0; // 0–1 cleaned percentage
}

// Fish
const fish = [];
for(let i=0;i<15;i++){
  const angle = Math.random()*2*Math.PI;
  const rFactor = Math.random();
  const x = pond.x + Math.cos(angle)*pond.rx*rFactor;
  const y = pond.y + Math.sin(angle)*pond.ry*rFactor;
  const vx = (Math.random()-0.5)*1.2;
  const vy = (Math.random()-0.5)*0.8;
  fish.push({x,y,vx,vy,visible:false});
}

// Ripples
let ripples = [];

canvas.addEventListener('pointerdown', e=>{
  const x = e.clientX;
  const y = e.clientY;
  ripples.push({x,y,radius:0,alpha:0.8});

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

  // Pond brown base
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw water as continuous blue
  for(let i=0;i<cols;i++){
    for(let j=0;j<rows;j++){
      if(cleanGrid[i][j] > 0){
        const cellX = pond.x - pond.rx + i*gridSize + gridSize/2;
        const cellY = pond.y - pond.ry + j*gridSize + gridSize/2;
        ctx.beginPath();
        ctx.ellipse(cellX, cellY, gridSize/2, gridSize/2, 0, 0, Math.PI*2);
        ctx.fillStyle = `rgba(102,204,255,${cleanGrid[i][j]})`; // alpha based on cleaning
        ctx.fill();
      }
    }
  }

  // Update ripples and clean grid
  for(let k=0;k<ripples.length;k++){
    const r = ripples[k];
    // Draw ripple as semi-transparent circle
    ctx.beginPath();
    ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);
    ctx.strokeStyle = `rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Update cleaned cells
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const cellX = pond.x - pond.rx + i*gridSize + gridSize/2;
        const cellY = pond.y - pond.ry + j*gridSize + gridSize/2;
        if(inPond(cellX,cellY)){
          const dist = Math.hypot(cellX-r.x, cellY-r.y);
          if(dist <= r.radius){
            cleanGrid[i][j] = Math.min(cleanGrid[i][j]+0.05,1); // gradual cleaning
          }
        }
      }
    }

    r.radius += 1.5; // smaller ripple growth
    r.alpha -= 0.01;
    if(r.alpha<=0) ripples.splice(k,1);
  }

  // Move fish
  fish.forEach(f=>{
    const col = Math.floor((f.x-(pond.x-pond.rx))/gridSize);
    const row = Math.floor((f.y-(pond.y-pond.ry))/gridSize);
    if(col>=0 && row>=0 && col<cols && row<rows && cleanGrid[col][row]>0.5){
      f.visible = true;
    }
    if(f.visible){
      f.x += f.vx;
      f.y += f.vy;
      // bounce inside pond
      if(!inPond(f.x,f.y)){
        f.vx *= -1;
        f.vy *= -1;
      }
      // draw fish as small triangle
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(Math.atan2(f.vy,f.vx));
      ctx.beginPath();
      ctx.moveTo(0,-5);
      ctx.lineTo(10,0);
      ctx.lineTo(0,5);
      ctx.closePath();
      ctx.fillStyle='orange';
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.restore();
  requestAnimationFrame(animate);
}

resizeCanvas();
animate();
