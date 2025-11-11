const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;
let levelPopupShown = false;

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

// Initial pond
const pond = { x: window.innerWidth/2, y: window.innerHeight/2, rx: 300, ry: 150 };

// Ripples and cleaned circles
let ripples = [];
let cleanedCircles = [];

// Fish
const fish = [];
const numFish = 15;
for(let i=0;i<numFish;i++){
  const angle = Math.random()*2*Math.PI;
  const rFactor = Math.random();
  const x = pond.x + Math.cos(angle)*pond.rx*rFactor;
  const y = pond.y + Math.sin(angle)*pond.ry*rFactor;
  const vx = (Math.random()-0.5)*1.2;
  const vy = (Math.random()-0.5)*0.8;
  fish.push({x,y,vx,vy});
}

// Ripple on click
canvas.addEventListener('pointerdown', e=>{
  ripples.push({x:e.clientX, y:e.clientY, radius:0, maxRadius:60, alpha:0.3});
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

// Check if point inside pond
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

// LEVEL COMPLETE popup elements
const levelPopup = document.getElementById('levelPopup');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeBtn = document.getElementById('closeBtn');

nextLevelBtn.addEventListener('click', ()=>{
  levelPopup.style.display = 'none';
  startNextLevel();
});
closeBtn.addEventListener('click', ()=>{
  levelPopup.style.display = 'none';
});

// Check if pond fully cleaned (approximate)
function checkLevelComplete(){
  // Pond area
  const pondArea = Math.PI*pond.rx*pond.ry;
  let cleanedArea = 0;
  cleanedCircles.forEach(c=>{
    cleanedArea += Math.PI*c.radius*c.radius;
  });
  return cleanedArea >= pondArea;
}

// Start next level
function startNextLevel(){
  // New random pond ellipse
  pond.rx = 200 + Math.random()*200;
  pond.ry = 100 + Math.random()*150;
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;

  // Reset ripples and cleaned areas
  ripples = [];
  cleanedCircles = [];

  // Reset fish positions
  fish.forEach(f=>{
    const angle = Math.random()*2*Math.PI;
    const rFactor = Math.random();
    f.x = pond.x + Math.cos(angle)*pond.rx*rFactor;
    f.y = pond.y + Math.sin(angle)*pond.ry*rFactor;
    f.vx = (Math.random()-0.5)*1.2;
    f.vy = (Math.random()-0.5)*0.8;
  });

  levelPopupShown = false;
}

// Animate loop
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Grass background
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw brown pond base
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle = '#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw expanding blue ripples
  ripples.forEach(r=>{
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
    ctx.fillStyle = `rgba(102,204,255,${r.alpha})`;
    ctx.fill();

    // Gradually expand ripple
    if(r.radius < r.maxRadius) r.radius += 1.5;
    if(r.alpha < 0.6) r.alpha += 0.005;

    // Add to cleanedCircles permanently when ripple maxed
    if(r.radius >= r.maxRadius && !cleanedCircles.includes(r)){
      cleanedCircles.push(r);
    }
  });

  // Move and draw fish
  fish.forEach(f=>{
    f.x += f.vx;
    f.y += f.vy;
    clampFish(f);

    // Fish visible only under blue ripples
    let visible = false;
    cleanedCircles.forEach(c=>{
      const dist = Math.hypot(f.x-c.x, f.y-c.y);
      if(dist <= c.radius) visible = true;
    });

    if(visible){
      ctx.save();
      ctx.translate(f.x,f.y);
      ctx.rotate(Math.atan2(f.vy,f.vx));
      // Fish body
      ctx.beginPath();
      ctx.ellipse(0,0,8,4,0,0,Math.PI*2);
      ctx.fillStyle='yellow';
      ctx.fill();
      // Fish tail
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

  // Show level complete popup if pond fully cleaned
  if(checkLevelComplete() && !levelPopupShown){
    levelPopup.style.display = 'flex';
    levelPopupShown = true;
  }

  requestAnimationFrame(animate);
}

resizeCanvas();
animate();
