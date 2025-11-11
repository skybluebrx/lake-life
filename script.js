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

// Ripples and cleaned area
let ripples = [];
let cleanedCircles = [];

// Fish
const fish = [];
for(let i=0;i<15;i++){
  const angle = Math.random()*2*Math.PI;
  const rFactor = Math.random();
  const x = pond.x + Math.cos(angle)*pond.rx*rFactor;
  const y = pond.y + Math.sin(angle)*pond.ry*rFactor;
  const vx = (Math.random()-0.5)*1.2;
  const vy = (Math.random()-0.5)*0.8;
  fish.push({x,y,vx,vy});
}

// Add ripple on click
canvas.addEventListener('pointerdown', e=>{
  ripples.push({x:e.clientX, y:e.clientY, radius:0, alpha:0.8});

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

// Check if point is inside pond ellipse
function inPond(x,y){
  const dx = x-pond.x;
  const dy = y-pond.y;
  return (dx*dx)/(pond.rx*pond.rx) + (dy*dy)/(pond.ry*pond.ry) <= 1;
}

// Clamp fish inside pond
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

// Animate
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Grass background
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw brown pond
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw cleaned blue areas (continuous)
  ctx.fillStyle = '#66ccff';
  cleanedCircles.forEach(c=>{
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.radius,0,Math.PI*2);
    ctx.fill();
  });

  // Update ripples
  for(let i=ripples.length-1;i>=0;i--){
    const r = ripples[i];
    // Draw ripple stroke
    ctx.beginPath();
    ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);
    ctx.strokeStyle = `rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Increase ripple radius
    r.radius += 2;
    r.alpha -= 0.01;
    if(r.alpha <= 0){
      ripples.splice(i,1);
      // Add to cleanedCircles permanently
      cleanedCircles.push({x:r.x,y:r.y,radius:r.radius});
    }
  }

  // Move and draw fish
  fish.forEach(f=>{
    f.x += f.vx;
    f.y += f.vy;
    clampFish(f);

    // Fish visible only if inside a cleaned blue area
    let visible = false;
    cleanedCircles.forEach(c=>{
      const dist = Math.hypot(f.x-c.x, f.y-c.y);
      if(dist <= c.radius) visible = true;
    });

    if(visible){
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(Math.atan2(f.vy,f.vx));
      ctx.beginPath();
      ctx.ellipse(0,0,8,4,0,0,Math.PI*2);
      ctx.fillStyle='yellow';
      ctx.fill();
      // tail
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
  requestAnimationFrame(animate);
}

resizeCanvas();
animate();
