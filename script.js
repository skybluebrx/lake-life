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

// Track cleaned areas as array of ripples
let ripples = [];

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

// Add ripple on click/tap
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

  // Draw pond base brown
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw blue water as continuous overlay
  ctx.fillStyle = '#66ccff';
  ripples.forEach(r=>{
    const gradient = ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.radius);
    gradient.addColorStop(0,'rgba(102,204,255,0.8)');
    gradient.addColorStop(1,'rgba(102,204,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
    ctx.fill();
  });

  // Update ripple radii
  for(let i=ripples.length-1;i>=0;i--){
    ripples[i].radius += 2; // smaller incremental growth
    ripples[i].alpha -= 0.01;
    if(ripples[i].alpha <= 0) ripples.splice(i,1);
  }

  // Move fish
  fish.forEach(f=>{
    // Check if fish is under cleaned water
    let underClean = false;
    ripples.forEach(r=>{
      const dist = Math.hypot(f.x - r.x, f.y - r.y);
      if(dist <= r.radius) underClean = true;
    });
    f.visible = underClean;

    if(f.visible){
      f.x += f.vx;
      f.y += f.vy;

      if(!inPond(f.x,f.y)){
        f.vx *= -1;
        f.vy *= -1;
      }

      // Draw fish: ellipse body + triangle tail
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(Math.atan2(f.vy,f.vx));
      // body
      ctx.beginPath();
      ctx.ellipse(0,0,8,4,0,0,Math.PI*2);
      ctx.fillStyle = 'yellow';
      ctx.fill();
      // tail
      ctx.beginPath();
      ctx.moveTo(-8,0);
      ctx.lineTo(-12,3);
      ctx.lineTo(-12,-3);
      ctx.closePath();
      ctx.fillStyle='yellow';
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.restore();
  requestAnimationFrame(animate);
}

resizeCanvas();
animate();
