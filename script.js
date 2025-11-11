const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

let scale = 1;
let offsetX = 0;
let offsetY = 0;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', ()=>{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pond.x = canvas.width/2;
  pond.y = canvas.height/2;
});

// Elliptical pond
const pond = {
  x: canvas.width/2,
  y: canvas.height/2,
  rx: 300,
  ry: 150
};

// Ripples array
let ripples = [];

// Fish/plants
const fish = [];
for(let i=0;i<10;i++){
  // Random positions inside pond ellipse
  let angle = Math.random()*2*Math.PI;
  let rx = Math.random();
  let x = pond.x + Math.cos(angle)*pond.rx*rx;
  let y = pond.y + Math.sin(angle)*pond.ry*rx;
  fish.push({x,y,visible:false});
}

// Pointer click
canvas.addEventListener('pointerdown', e=>{
  const x = (e.clientX - offsetX)/scale;
  const y = (e.clientY - offsetY)/scale;
  ripples.push({x, y, radius:0, maxRadius:100, alpha:1});

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
  scale*=zoom;
});

// Check if point inside pond ellipse
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

  // Pond base (brown)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI*2);
  ctx.fillStyle='#5a432b';
  ctx.fill();
  ctx.clip();

  // Draw ripples as cleaned blue water inside pond
  ripples.forEach(r=>{
    ctx.beginPath();
    // Smooth ellipse ripple
    ctx.ellipse(r.x, r.y, r.radius, r.radius*r.ry/r.rx, 0, 0, Math.PI*2);
    ctx.fillStyle=`rgba(102,204,255,0.5)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);
    ctx.strokeStyle=`rgba(173,216,230,${r.alpha})`;
    ctx.lineWidth=2;
    ctx.stroke();
  });

  ctx.restore();

  // Expand ripples
  for(let i=0;i<ripples.length;i++){
    let r = ripples[i];
    r.radius += 2;
    r.alpha -= 0.005;
    // Reveal fish inside ripple
    fish.forEach(f=>{
      const dx = f.x - r.x;
      const dy = f.y - r.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      if(distance < r.radius) f.visible = true;
    });
    if(r.alpha<=0) ripples.splice(i,1);
  }

  // Draw fish/plants
  fish.forEach(f=>{
    if(f.visible){
      ctx.beginPath();
      ctx.arc(f.x,f.y,5,0,Math.PI*2);
      ctx.fillStyle='orange';
      ctx.fill();
    }
  });

  requestAnimationFrame(animate);
}

animate();
