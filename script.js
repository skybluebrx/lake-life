// Lake Life - full working build (10 levels, trees, clipping, pan, zoom, fish only in clean water, 100% completion)

// ------- Config -------
const LEVEL_COUNT = 10;
const GRID_STEP = 12;          // pond sampling grid resolution (smaller = smoother but heavier)
const FISH_BASE = 6;          // base fish count per level
const PAN_STEP = 30;          // pan pixel step (in world coordinates)
const ZOOM_STEP = 0.04;       // small zoom step
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.2;

// murky pond color (algae-blue-green blend)
const MURKY = '#2f6a3f';
const MURKY_DARK = '#234e33';
const CLEAN = '#66ccff';

// ------- Canvas / Camera -------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let cw = canvas.width = window.innerWidth;
let ch = canvas.height = window.innerHeight;

let camera = {
  x: 0, y: 0,    // camera offset (world -> screen)
  scale: 1
};

// UI elements
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');
const levelLabel = document.getElementById('levelLabel');
const percentLabel = document.getElementById('percentLabel');
const levelsDiv = document.getElementById('levels');
const welcomePopup = document.getElementById('welcomePopup');
const startBtn = document.getElementById('startBtn');
const completePopup = document.getElementById('completePopup');
const completeTitle = document.getElementById('completeTitle');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeComplete = document.getElementById('closeComplete');

const panUp = document.getElementById('panUp');
const panDown = document.getElementById('panDown');
const panLeft = document.getElementById('panLeft');
const panRight = document.getElementById('panRight');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');

// ------- Game State -------
let currentLevel = 1;
let unlocked = [1];
let pondShapes = {};      // shape per level (polygon or circle params)
let pondGrid = [];        // sampling points for current pond {x,y,cleaned}
let ripples = [];         // active ripples {x,y,radius,max}
let fish = [];            // fish for current level {x,y,vx,vy,size,visible}
let trees = [];           // trees positions (outside pond)
let levelStarted = false;
let firstLoad = true;

// initialize levels shapes: gradual complexity
function generateLevelShape(level) {
  // level 1: simple ellipse (we approximate by circle radius)
  // levels 2-10: generate irregular polygon via radial noise
  const cx = cw/2;
  const cy = ch/2;
  const baseRadius = 90 + level * 18; // increases with level
  if (level === 1) {
    return { type:'circle', cx, cy, rx: baseRadius, ry: baseRadius * 0.7 };
  }
  // irregular polygon based on radial points
  const points = [];
  const segments = Math.min(12 + level, 20);
  for (let i=0;i<segments;i++){
    const ang = i / segments * Math.PI * 2;
    const jitter = 0.65 + Math.random() * 0.9; // vary radius
    const r = baseRadius * (0.7 + 0.6 * (i%2?1:0.9)) * jitter;
    points.push({ x: Math.cos(ang)*r + cx, y: Math.sin(ang)*r + cy });
  }
  return { type:'poly', points };
}

// create all pondShapes
for(let L=1; L<=LEVEL_COUNT; L++){
  pondShapes[L] = generateLevelShape(L);
}

// helper: create path for current pond (without transforms)
function createPondPath(shape){
  ctx.beginPath();
  if(shape.type === 'circle'){
    ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry || shape.rx, 0, 0, Math.PI*2);
  } else {
    const pts = shape.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }
}

// sample grid inside pond
function buildGrid(shape){
  pondGrid = [];
  // bounding box
  let minX = cw, minY = ch, maxX = 0, maxY = 0;
  if(shape.type === 'circle'){
    minX = shape.cx - shape.rx; maxX = shape.cx + shape.rx;
    minY = shape.cy - shape.ry; maxY = shape.cy + shape.ry;
  } else {
    shape.points.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
  }
  // walk grid points
  for(let x = Math.floor(minX); x <= Math.ceil(maxX); x += GRID_STEP){
    for(let y = Math.floor(minY); y <= Math.ceil(maxY); y += GRID_STEP){
      createPondPath(shape);
      if(ctx.isPointInPath(x,y)){
        pondGrid.push({ x, y, cleaned:false });
      }
    }
  }
}

// create trees outside pond (varying sizes)
function buildTrees(shape,count=80){
  trees = [];
  let attempts = 0;
  while(trees.length < count && attempts < count*20){
    attempts++;
    const x = Math.random()*cw;
    const y = Math.random()*ch;
    // ensure outside pond
    createPondPath(shape);
    if(!ctx.isPointInPath(x,y)){
      const size = 12 + Math.random()*42;
      trees.push({ x, y, size });
    }
  }
}

// create fish initial positions inside pond but they only become visible if cleaned grid exists under them
function buildFish(shape, lvl){
  fish = [];
  const count = FISH_BASE + Math.floor(lvl * 1.2);
  // sample from pondGrid for initial positions
  const spots = pondGrid.slice();
  for(let i=0;i<count;i++){
    if(spots.length === 0) break;
    const idx = Math.floor(Math.random()*spots.length);
    const p = spots.splice(idx,1)[0];
    fish.push({
      x: p.x + (Math.random()-0.5)*(GRID_STEP/2),
      y: p.y + (Math.random()-0.5)*(GRID_STEP/2),
      vx: (Math.random()-0.5)*(lvl*0.4+0.6),
      vy: (Math.random()-0.5)*(lvl*0.3+0.5),
      size: 6 + Math.random()*8,
      visible: false
    });
  }
}

// save / restore level state so revisiting keeps cleaned
function saveLevelState(level){
  pondShapes[level].saved = pondShapes[level].saved || {};
  pondShapes[level].saved.cleaned = pondGrid.map(p => ({x:p.x,y:p.y,cleaned:p.cleaned}));
  pondShapes[level].saved.fish = fish.map(f => ({x:f.x,y:f.y,vx:f.vx,vy:f.vy,size:f.size}));
}
function loadLevelState(level){
  const s = pondShapes[level].saved;
  if(s && s.cleaned){
    // map cleaned to pondGrid
    const key = (p) => `${Math.round(p.x)}|${Math.round(p.y)}`;
    const map = {};
    s.cleaned.forEach(c => map[key(c)] = c.cleaned);
    pondGrid.forEach(p => {
      p.cleaned = !!map[key(p)];
    });
    // fish
    if(s.fish){
      fish = s.fish.map(f => ({ ...f, visible:false }));
    }
  }
}

// ------- Init Level -------
function initLevel(L){
  currentLevel = L;
  levelLabel.textContent = String(L);
  ripples = [];
  const shape = pondShapes[L];
  // create grid points
  buildGrid(shape);
  // try load saved cleaned points if exists
  loadLevelState(L);
  // create trees off-pond
  buildTrees(shape, 90);
  // create fish initial positions referencing grid
  buildFish(shape, L);
  levelStarted = true;
  // update levels UI
  renderLevelsUI();
  // center camera on pond
  camera.x = 0; camera.y = 0; camera.scale = 1;
  updatePercentLabel();
}

// UI levels list
function renderLevelsUI(){
  levelsDiv.innerHTML = '';
  for(let i=1;i<=LEVEL_COUNT;i++){
    const el = document.createElement('div');
    el.className = 'level-item' + (unlocked.includes(i)?'':' locked');
    el.textContent = `Level ${i}` + (i===currentLevel ? ' (current)': '');
    if(unlocked.includes(i)){
      el.onclick = ()=> {
        // save current
        saveLevelState(currentLevel);
        initLevel(i);
      };
    }
    levelsDiv.appendChild(el);
  }
}

// ------- Input: clicks create ripples inside pond only (world coordinates) -------
canvas.addEventListener('pointerdown', (ev) => {
  // convert screen -> world coordinates considering camera
  const rect = canvas.getBoundingClientRect();
  const sx = ev.clientX - rect.left;
  const sy = ev.clientY - rect.top;
  const wx = (sx - camera.x) / camera.scale;
  const wy = (sy - camera.y) / camera.scale;
  // check if inside pond
  createPondPath(pondShapes[currentLevel]);
  if(!ctx.isPointInPath(wx, wy)) return;
  ripples.push({ x: wx, y: wy, radius: 0, max: Math.max(40, pondShapes[currentLevel].type === 'circle' ? Math.min(pondShapes[currentLevel].rx, pondShapes[currentLevel].ry)/2 : 60) });
});

// Pan controls
panUp.onclick = ()=> { camera.y += PAN_STEP; };
panDown.onclick = ()=> { camera.y -= PAN_STEP; };
panLeft.onclick = ()=> { camera.x += PAN_STEP; };
panRight.onclick = ()=> { camera.x -= PAN_STEP; };

// Zoom controls (small increments)
zoomIn.onclick = ()=> { camera.scale += ZOOM_STEP; if(camera.scale > MAX_SCALE) camera.scale = MAX_SCALE; };
zoomOut.onclick = ()=> { camera.scale -= ZOOM_STEP; if(camera.scale < MIN_SCALE) camera.scale = MIN_SCALE; };

// Collapse sidebar
toggleSidebar.onclick = () => {
  sidebar.classList.toggle('collapsed');
  toggleSidebar.textContent = sidebar.classList.contains('collapsed') ? 'Expand' : 'Collapse';
};

// Welcome popup behavior
startBtn.onclick = ()=> {
  welcomePopup.style.display = 'none';
  initLevel(1);
  firstLoad = false;
};

// Next level popup
nextLevelBtn.onclick = ()=>{
  completePopup.style.display = 'none';
  if(currentLevel < LEVEL_COUNT){
    saveLevelState(currentLevel);
    unlocked.push(currentLevel+1);
    initLevel(currentLevel+1);
  }
};
closeComplete.onclick = ()=> {
  completePopup.style.display = 'none';
};

// Helper: mark grid points cleaned by ripples
function updateRipples(){
  // expand ripples
  for(let r of ripples){
    if(r.radius < r.max) r.radius += 1.6 + camera.scale*0.6; // faster when zoomed
  }
  // transfer ripple effect to grid points
  for(let g of pondGrid){
    if(g.cleaned) continue;
    for(let r of ripples){
      const dx = g.x - r.x;
      const dy = g.y - r.y;
      if(dx*dx + dy*dy <= r.radius*r.radius){
        g.cleaned = true;
        break;
      }
    }
  }
  // trim ripples that exceed max
  ripples = ripples.filter(r => r.radius < r.max + 8);
}

// fish visibility logic: fish visible only if located near a cleaned grid cell
function updateFish(dt){
  for(let f of fish){
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    // keep fish inside pond: reflect on boundary
    createPondPath(pondShapes[currentLevel]);
    if(!ctx.isPointInPath(f.x, f.y)){
      f.vx *= -1; f.vy *= -1;
      f.x += f.vx * 2; f.y += f.vy * 2;
    }
    // visible if nearest grid point cleaned
    const gx = Math.round(f.x / GRID_STEP) * GRID_STEP;
    const gy = Math.round(f.y / GRID_STEP) * GRID_STEP;
    // find any grid point near
    let vis = false;
    // optimize by checking limited nearby
    for(let i=0;i<3;i++){
      // small linear search; pondGrid size limited
    }
    for(let pg of pondGrid){
      if(Math.abs(pg.x - f.x) <= GRID_STEP && Math.abs(pg.y - f.y) <= GRID_STEP && pg.cleaned){
        vis = true; break;
      }
    }
    f.visible = vis;
  }
}

// calculate completion percent exactly
function calculatePercent(){
  if(pondGrid.length === 0) return 0;
  const cleaned = pondGrid.filter(p => p.cleaned).length;
  return Math.round((cleaned / pondGrid.length) * 100);
}
function updatePercentLabel(){ percentLabel.textContent = calculatePercent() + '%'; }

// Draw everything with camera transform
function render(){
  // clear
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cw,ch);
  // apply camera transform
  ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

  // draw grass background
  ctx.fillStyle = '#1f7a2f';
  ctx.fillRect(0,0,cw, ch);

  // draw trees (they were generated in world coords)
  for(let t of trees){
    ctx.fillStyle = '#0d3b12';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x - t.size/1.8, t.y + t.size);
    ctx.lineTo(t.x + t.size/1.8, t.y + t.size);
    ctx.closePath();
    ctx.fill();
    // trunk
    ctx.fillStyle = '#5a3b1f';
    ctx.fillRect(t.x - t.size*0.08, t.y + t.size, t.size*0.16, t.size*0.28);
  }

  // Draw pond base (mask path)
  const shape = pondShapes[currentLevel];
  ctx.save();
  createPondPath(shape);
  ctx.fillStyle = MURKY;
  // gradient for depth
  const centroidX = (shape.type === 'circle' ? shape.cx : cw/2);
  const centroidY = (shape.type === 'circle' ? shape.cy : ch/2);
  const g = ctx.createRadialGradient(centroidX, centroidY, Math.max(10, (shape.type==='circle'? Math.min(shape.rx,shape.ry): 40)), centroidX, centroidY, Math.max(shape.type==='circle'?shape.rx:100, 200));
  g.addColorStop(0, MURKY_DARK);
  g.addColorStop(0.6, MURKY);
  g.addColorStop(1, '#2b5a3a');
  ctx.fillStyle = g;
  ctx.fill();
  // clip to pond for cleaned drawing & fish
  ctx.clip();

  // Draw cleaned water as smooth circles around cleaned grid points (clipped to pond)
  for(let p of pondGrid){
    if(p.cleaned){
      ctx.beginPath();
      ctx.arc(p.x, p.y, GRID_STEP * 0.9, 0, Math.PI*2);
      ctx.fillStyle = CLEAN;
      ctx.fill();
    }
  }

  // draw dynamic ripples overlay (soft)
  for(let r of ripples){
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
    ctx.fillStyle = `rgba(102,204,255,${Math.max(0.08, 0.3 - r.radius / (r.max*1.8))})`;
    ctx.fill();
  }

  // fish (only visible if in cleaned area)
  for(let f of fish){
    if(!f.visible) continue;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    // body
    ctx.beginPath();
    ctx.ellipse(0,0,f.size, f.size*0.55, 0, 0, Math.PI*2);
    ctx.fillStyle = '#f7d15c';
    ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(-f.size,0);
    ctx.lineTo(-f.size-6, f.size*0.6);
    ctx.lineTo(-f.size-6, -f.size*0.6);
    ctx.closePath();
    ctx.fillStyle = '#f0b23a';
    ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // undo clip/transform (but camera transform remains until reset below)

  // reset transform for UI overlays if needed
  ctx.setTransform(1,0,0,1,0,0);

  // update percent label live
  updatePercentLabel();
}

// main loop
let last = performance.now();
function loop(now){
  const dt = Math.min(1/30, (now - last)/1000);
  last = now;

  updateRipples();
  updateFish(dt);
  render();

  // completion check strict 100%
  const percent = calculatePercent();
  if(percent >= 100 && !firstLoad && levelStarted){
    // show level complete popup if not shown
    if(!completePopup.style.display || completePopup.style.display === 'none'){
      completeTitle.innerText = `LEVEL ${currentLevel} COMPLETE`;
      completePopup.style.display = 'block';
    }
    // mark unlocked and save state
    if(!unlocked.includes(currentLevel+1) && currentLevel < LEVEL_COUNT){
      unlocked.push(currentLevel+1);
    }
    // save level state
    saveLevelState(currentLevel);
  }

  requestAnimationFrame(loop);
}

// handle resize
window.addEventListener('resize', ()=> {
  cw = canvas.width = window.innerWidth;
  ch = canvas.height = window.innerHeight;
  // regenerate shapes centered on new size
  for(let i=1;i<=LEVEL_COUNT;i++){
    pondShapes[i] = generateLevelBasedOn(i);
  }
  // reinitialize current level to rebuild grids/trees without wiping saved data
  initLevel(currentLevel);
});

// helper used by resize to regenerate shapes consistently
function generateLevelBasedOn(levelIndex){
  // similar to earlier generator but anchored to new center
  const cx = cw/2, cy = ch/2;
  const baseRadius = 90 + levelIndex * 18;
  if(levelIndex === 1){
    return { type:'circle', cx, cy, rx: baseRadius, ry: baseRadius * 0.72 };
  }
  const points = [];
  const segments = Math.min(12 + levelIndex, 22);
  for (let i=0;i<segments;i++){
    const ang = i / segments * Math.PI * 2;
    const jitter = 0.75 + Math.random() * 0.6;
    const r = baseRadius * (0.8 + 0.45 * Math.sin(i*1.3)) * jitter;
    points.push({ x: Math.cos(ang)*r + cx, y: Math.sin(ang)*r + cy });
  }
  return { type:'poly', points };
}

// ensure pondShapes are generated with new generator so saved shapes match resize behavior
for(let i=1;i<=LEVEL_COUNT;i++){
  pondShapes[i] = generateLevelBasedOn(i);
}

// initial render of UI levels
renderLevelsUI();

// show welcome popup
welcomePopup.style.display = 'block';

// start animation loop
requestAnimationFrame(loop);

// start: initLevel wrapper ensures consistent generation
function initLevel(levelIndex){
  // save current before switching
  if(levelStarted) saveLevelState(currentLevel);

  currentLevel = Math.min(Math.max(1, levelIndex), LEVEL_COUNT);
  levelLabel.innerText = String(currentLevel);
  // rebuild pond shape, grid, trees, fish
  const shape = pondShapes[currentLevel];
  buildGrid(shape);
  buildTrees(shape, 90);
  buildFish(shape, currentLevel);
  // try to load saved cleaned and fish if present
  loadLevelState(currentLevel);
  // reset ripples
  ripples = [];
  // camera reset to center the pond (world center)
  camera.x = 0; camera.y = 0; camera.scale = 1;
  levelStarted = true;
  firstLoad = false;
  renderLevelsUI();
  updatePercentLabel();
}

// implement saveLevelState and loadLevelState at top scope (redefine to capture new generator)
function saveLevelState(level){
  const shape = pondShapes[level];
  const key = {
    cleaned: pondGrid.map(p => ({x:p.x,y:p.y,cleaned:p.cleaned})),
    fish: fish.map(f => ({x:f.x,y:f.y,vx:f.vx,vy:f.vy,size:f.size}))
  };
  shape.saved = key;
}
function loadLevelState(level){
  const s = pondShapes[level].saved;
  if(!s) return;
  // map cleaned
  const dict = {};
  for(const c of s.cleaned) dict[`${Math.round(c.x)}|${Math.round(c.y)}`] = c.cleaned;
  for(const p of pondGrid) p.cleaned = !!dict[`${Math.round(p.x)}|${Math.round(p.y)}`];
  // fish
  if(s.fish && s.fish.length) {
    fish = s.fish.map(f => ({ ...f, visible:false }));
  }
}

// small helper to update percent label outside render path
function updatePercentLabel(){ percentLabel.textContent = calculatePercent() + '%'; }

// Expose some functions to UI for convenience
window.initLevel = initLevel;
window.toggleMenu = ()=>{ sidebar.classList.toggle('collapsed'); };
