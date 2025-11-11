// =====================
// Lake Life: Full working script.js
// =====================

// Canvas setup
const canvas = document.getElementById("pond");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let viewOffset = { x: 0, y: 0 };
let zoom = 1;

// Pond configuration
let pond = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 400,
  height: 300,
  gridSize: 4, // each cell in grid is 4x4 pixels
  cleanGrid: [],
  murkyColor: "#3c5a3c", // dark green algae murky water
  blueColor: "#5fc5e1",
  shape: [], // polygon/ellipse points
};

// Fish
let fishList = [];
const fishCount = 20;

// Initialize pond grid
const cols = Math.ceil(pond.width / pond.gridSize);
const rows = Math.ceil(pond.height / pond.gridSize);
for (let i = 0; i < cols; i++) {
  pond.cleanGrid[i] = [];
  for (let j = 0; j < rows; j++) {
    pond.cleanGrid[i][j] = false; // false = dirty
  }
}

// Initialize fish
for (let i = 0; i < fishCount; i++) {
  fishList.push({
    x: Math.random() * pond.width + pond.x - pond.width / 2,
    y: Math.random() * pond.height + pond.y - pond.height / 2,
    size: Math.random() * 6 + 4,
    angle: Math.random() * Math.PI * 2,
    speed: Math.random() * 1 + 0.5,
  });
}

// Ripples
let ripples = [];

canvas.addEventListener("click", function (e) {
  const x = (e.clientX - viewOffset.x - pond.x) / zoom + pond.x;
  const y = (e.clientY - viewOffset.y - pond.y) / zoom + pond.y;
  ripples.push({ x, y, radius: 0, maxRadius: 50 });
});

// Zoom buttons
document.getElementById("zoomIn").addEventListener("click", () => {
  zoom += 0.05;
});
document.getElementById("zoomOut").addEventListener("click", () => {
  zoom -= 0.05;
  if (zoom < 0.1) zoom = 0.1;
});

// Pan buttons
document.getElementById("panLeft").addEventListener("click", () => {
  viewOffset.x += 20;
});
document.getElementById("panRight").addEventListener("click", () => {
  viewOffset.x -= 20;
});
document.getElementById("panUp").addEventListener("click", () => {
  viewOffset.y += 20;
});
document.getElementById("panDown").addEventListener("click", () => {
  viewOffset.y -= 20;
});

// Helper: check if a point is inside the pond ellipse
function isInsidePond(px, py) {
  const dx = px - pond.x;
  const dy = py - pond.y;
  return (dx * dx) / ((pond.width / 2) ** 2) + (dy * dy) / ((pond.height / 2) ** 2) <= 1;
}

// Update cleaned grid based on ripples
function updateGrid() {
  ripples.forEach((ripple) => {
    ripple.radius += 2; // expand ripple gradually
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const gx = pond.x - pond.width / 2 + i * pond.gridSize + pond.gridSize / 2;
        const gy = pond.y - pond.height / 2 + j * pond.gridSize + pond.gridSize / 2;
        const dist = Math.hypot(gx - ripple.x, gy - ripple.y);
        if (dist <= ripple.radius && isInsidePond(gx, gy)) {
          pond.cleanGrid[i][j] = true;
        }
      }
    }
  });

  // Remove finished ripples
  ripples = ripples.filter((r) => r.radius < r.maxRadius);
}

// Draw pond
function drawPond() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = pond.x - pond.width / 2 + i * pond.gridSize;
      const y = pond.y - pond.height / 2 + j * pond.gridSize;
      ctx.fillStyle = pond.cleanGrid[i][j] ? pond.blueColor : pond.murkyColor;
      ctx.fillRect(x, y, pond.gridSize, pond.gridSize);
    }
  }
  // Draw ripple outlines
  ripples.forEach((r) => {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(200,200,255,0.5)";
    ctx.lineWidth = 2;
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// Draw fish
function drawFish() {
  fishList.forEach((fish) => {
    // Only move and draw fish if in clean areas
    const i = Math.floor((fish.x - (pond.x - pond.width / 2)) / pond.gridSize);
    const j = Math.floor((fish.y - (pond.y - pond.height / 2)) / pond.gridSize);
    if (i >= 0 && i < cols && j >= 0 && j < rows && pond.cleanGrid[i][j]) {
      fish.x += Math.cos(fish.angle) * fish.speed;
      fish.y += Math.sin(fish.angle) * fish.speed;

      // Bounce within pond
      const dx = fish.x - pond.x;
      const dy = fish.y - pond.y;
      const a = pond.width / 2;
      const b = pond.height / 2;
      if ((dx * dx) / (a * a) + (dy * dy) / (b * b) > 1) {
        fish.angle += Math.PI;
      }

      // Draw fish
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.ellipse(fish.x, fish.y, fish.size, fish.size / 2, fish.angle, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Calculate progress
function getProgress() {
  let cleanCount = 0;
  pond.cleanGrid.forEach((col) => {
    col.forEach((cell) => {
      if (cell) cleanCount++;
    });
  });
  return Math.floor((cleanCount / (cols * rows)) * 100);
}

// Draw the full scene
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.translate(viewOffset.x, viewOffset.y);
  ctx.scale(zoom, zoom);

  // Background
  ctx.fillStyle = "#3c8a3c"; // grass
  ctx.fillRect(-1000, -1000, 2000, 2000);

  // Draw pond and ripples
  drawPond();

  // Draw fish
  drawFish();

  // Draw progress text
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Progress: " + getProgress() + "%", 20 - viewOffset.x, 30 - viewOffset.y);

  requestAnimationFrame(draw);
}

draw();
