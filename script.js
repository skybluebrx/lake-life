const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d');
let mute = false;

document.getElementById('muteBtn').addEventListener('click', () => {
  mute = !mute;
  document.getElementById('muteBtn').textContent = mute ? 'Unmute' : 'Mute';
});

let ripples = [];
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// Virtual pond dimensions
const pondWidth = 1500;
const pondHeight = 800;
const pondX = pondWidth/2;
const pondY = pondHeight/2;
const pondRadiusX = 600;
const pondRadiusY = 300;

// Clean layer (fish/plants)
let cleanLayer = ctx.createImageData(pondWidth, pondHeight);
for (let i=0;i<cleanLayer.data.length;i+=4){
  cleanLayer.data[i]=102;   // R
  cleanLayer.data[i+1]=204; // G
  cleanLayer.data[i+2]=255; // B
  cleanLayer.data[i+3]=255; // A
}

// Dirty layer initialization
let dirtyLayer = ctx.createImageData(pondWidth, pondHeight);
for (let y=0;y<pondHeight;y++){
  for (let x=0;x<pondWidth;x++){
    const dx = x - pondX;
    const dy = y - pondY;
    if (dx*dx/pondRadiusX/pondRadiusX + dy*dy/pondRadiusY/pondRadiusY <= 1){
      const idx = (y*pondWidth + x)*4;
      dirtyLayer.data[idx]=50 + Math.random()*30;    // R
      dirtyLayer.data[idx+1]=30 + Math.random()*30;  // G
      dirtyLayer.data[idx+2]=20 + Math.random()*20;  // B
      dirtyLayer.data[idx+3]=255;                     // A
    }
  }
}

// Resize
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Click/tap: add ripple
canvas.addEventListener('pointerdown', (e)=>{
  const x = (e.clientX - offsetX)/scale;
  const y = (e.clientY - offsetY)/scale;
  ripples.push({x,y,radius:0,alpha:1});
  if (!mute){
    const audio = new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.type='sine';
    o.frequency.value=220;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime+0.5);
    o.stop(audio.currentTime+0.5);
  }
});

// Zoom
canvas.addEventListener('wheel',(e)=>{
  e.preventDefault();
  const zoom = e.deltaY<0?1.1:0.9;
  const mx = e.clientX;
  const my = e.clientY;
  offsetX = mx - (mx - offsetX)*zoom;
  offsetY = my - (my - offsetY)*zoom;
  scale*=zoom;
});

// Draw pond shape
function drawPond(){
  const image = ctx.createImageData(pondWidth,pondHeight);
  image.data.set(dirtyLayer.data);

  // apply ripples to clean layer
  for(let i=0;i<ripples.length;i++){
    const r = ripples[i];
    for(let y=0;y<pondHeight;y++){
      for(let x=0;x<pondWidth;x++){
        const dx = x - r.x;
        const dy = y - r.y;
        if(dx*dx + dy*dy <= r.radius*r.radius){
          const idx = (y*pondWidth + x)*4;
          image.data[idx]=cleanLayer.data[idx];
          image.data[idx+1]=cleanLayer.data[idx+1];
          image.data[idx+2]=cleanLayer.data[idx+2];
          image.data[idx+3]=255;
        }
      }
    }
  }
  ctx.putImageData(image,0,0);
}

// Draw visible ripples
function drawRipples(){
  ctx.save();
  ctx.strokeStyle='rgba(173,216,230,0.5)';
  ctx.lineWidth=2;
  ripples.forEach((r,i)=>{
    ctx.beginPath();
    ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);
    ctx.stroke();
    r.radius+=5;
    r.alpha-=0.01;
    if(r.alpha<=0) ripples.splice(i,1);
  });
  ctx.restore();
}

// Animate
function animate(){
  ctx.setTransform(scale,0,0,scale,offsetX,offsetY);
  ctx.clearRect(-offsetX/scale,-offsetY/scale,canvas.width/scale,canvas.height/scale);

  // Draw land
  ctx.fillStyle='#333';
  ctx.fillRect(-offsetX/scale,-offsetY/scale,canvas.width/scale,canvas.height/scale);

  drawPond();
  drawRipples();

  requestAnimationFrame(animate);
}

animate();
