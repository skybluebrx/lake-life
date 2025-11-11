const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

// Canvas and viewport
let scale = 1;
let offsetX = 0;
let offsetY = 0;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', ()=>{canvas.width=window.innerWidth; canvas.height=window.innerHeight;});

// Elliptical pond
const pond = {
  x: 0,
  y: 0,
  rx: 600,
  ry: 300,
  centerX: 0,
  centerY: 0,
  width: 1200,
  height: 600
};

// Ripples array
let ripples = [];

// Click / touch
canvas.addEventListener('pointerdown', e=>{
  const x = (e.clientX - offsetX)/scale;
  const y = (e.clientY - offsetY)/scale;
  ripples.push({x, y, radius:0, maxRadius:150, alpha:1});

  if(!mute){
    const audio = new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.type='sine';
    o.frequency.value=220;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime+0.3);
    o.stop(audio.currentTime+0.3);
  }
});

// Zoom
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const zoom = e.deltaY < 0 ? 1.1 : 0.9;
  const mx = e.clientX;
  const my = e.clientY;
  offsetX = mx - (mx - offsetX)*zoom;
  offsetY = my - (my - offsetY)*zoom;
  scale *= zoom;
});

// Pond cleaned areas
let cleaned = [];

// Check if point inside pond ellipse
function inPond(x, y){
  const dx = x - pond.x;
  const dy = y - pond.y;
  return (dx*dx)/(pond.rx*pond.rx) + (dy*dy)/(pond.ry*pond.ry) <= 1;
}

// Animate
function animate(){
  ctx.setTransform(scale,0,0,scale,offsetX,offsetY);

  // Green background
  ctx.fillStyle='#228B22';
  ctx.fillRect(-offsetX/scale,-offsetY/scale,canvas.width/scale,canvas.height/scale);

  // Draw pond base (murky brown)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.clip();
  ctx.fillStyle='#5a432b';
  ctx.fillRect(pond.x-pond.rx, pond.y-pond.ry, pond.rx*2, pond.ry*2);
  ctx.restore();

  // Draw cleaned areas
  cleaned.forEach(c=>{
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.radius, c.radius, 0, 0, Math.PI*2);
    ctx.clip();
    ctx.fillStyle='#66ccff';
    ctx.fillRect(pond.x-pond.rx, pond.y-pond.ry, pond.rx*2, pond.ry*2);
    ctx.restore();
  });

  // Draw ripples and expand cleaning
  for(let i=0;i<ripples.length;i++){
    let r = ripples[i];
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius,0,Math.PI*2);
    ctx.strokeStyle=`rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth=2;
    ctx.stroke();

    r.radius += 4;
    r.alpha -= 0.01;
    if(r.alpha <= 0){
      ripples.splice(i,1);
      i--;
    } else {
      // Add cleaned circle
      cleaned.push({x:r.x, y:r.y, radius:r.radius});
    }
  }

  requestAnimationFrame(animate);
}

// Set pond center
pond.x = 0;
pond.y = 0;

animate();
