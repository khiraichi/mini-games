const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');
const flapBtn = document.getElementById('flap-btn');

let score = 0;
let highScore = localStorage.getItem('flappy_high_score') || 0;
let isPlaying = false;

highScoreEl.textContent = highScore;

// Konfigurasi Burung & Fisika
let bird = {
  x: 50,
  y: 150,
  radius: 12,
  gravity: 0.25,
  lift: -5.5,
  velocity: 0
};

// Konfigurasi Pipa
let pipes = [];
let pipeWidth = 52;
let pipeGap = 120;
let pipeSpeed = 2.2;
let frameCount = 0;

function resetGame() {
  bird.y = 150;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  scoreEl.textContent = score;
  frameCount = 0;
}

function flap() {
  if (!isPlaying) return;
  bird.velocity = bird.lift;
}

function startGame() {
  resetGame();
  isPlaying = true;
  overlay.classList.add('hidden');
  loop();
}

function endGame() {
  isPlaying = false;
  overlayTitle.textContent = 'Game Over!';
  overlayMsg.textContent = `Skor akhir Anda: ${score}`;
  startBtn.textContent = 'Main Lagi';
  overlay.classList.remove('hidden');
}

function update() {
  if (!isPlaying) return;

  // Fisika Burung
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;

  // Batas Atas & Bawah Kanvas
  if (bird.y + bird.radius >= canvas.height - 60) {
    bird.y = canvas.height - 60 - bird.radius;
    endGame();
  }
  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.velocity = 0;
  }

  // Spawn Pipa Baru
  if (frameCount % 100 === 0) {
    let minHeight = 50;
    let maxHeight = canvas.height - 180;
    let height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
      x: canvas.width,
      top: height,
      bottom: canvas.height - 60 - (height + pipeGap),
      passed: false
    });
  }

  // Gerakkan Pipa & Cek Tabrakan
  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= pipeSpeed;

    // Cek Skor
    if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
      score++;
      scoreEl.textContent = score;
      pipes[i].passed = true;

      if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('flappy_high_score', highScore);
      }
    }

    // Deteksi Tabrakan (Collision Box)
    if (
      bird.x + bird.radius > pipes[i].x &&
      bird.x - bird.radius < pipes[i].x + pipeWidth &&
      (bird.y - bird.radius < pipes[i].top || bird.y + bird.radius > canvas.height - 60 - pipes[i].bottom)
    ) {
      endGame();
    }

    // Hapus pipa yang sudah keluar layar
    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }

  frameCount++;
}

function draw() {
  // 1. Latar Belakang (Langit)
  ctx.fillStyle = '#70c5ce';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Gambar Pipa
  pipes.forEach(pipe => {
    // Pipa Atas
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.strokeStyle = '#558022';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.top);

    // Pipa Bawah
    let bottomY = canvas.height - 60 - pipe.bottom;
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(pipe.x, bottomY, pipeWidth, pipe.bottom);
    ctx.strokeRect(pipe.x, bottomY, pipeWidth, pipe.bottom);
  });

  // 3. Tanah / Daratan Bawah
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
  ctx.fillStyle = '#558022';
  ctx.fillRect(0, canvas.height - 60, canvas.width, 12);

  // 4. Gambar Burung
  ctx.fillStyle = '#f8e71c';
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b89d07';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Mata Burung
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(bird.x + 4, bird.y - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(bird.x + 5, bird.y - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Paruh Burung
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.moveTo(bird.x + bird.radius - 2, bird.y - 2);
  ctx.lineTo(bird.x + bird.radius + 6, bird.y + 1);
  ctx.lineTo(bird.x + bird.radius - 2, bird.y + 4);
  ctx.closePath();
  ctx.fill();
}

function loop() {
  update();
  draw();
  if (isPlaying) {
    requestAnimationFrame(loop);
  }
}

// Event Listeners
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!isPlaying && overlay.classList.contains('hidden') === false) {
      startGame();
    } else {
      flap();
    }
  }
});

canvas.addEventListener('click', () => {
  if (!isPlaying && !overlay.classList.contains('hidden')) {
    startGame();
  } else {
    flap();
  }
});

flapBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (!isPlaying && !overlay.classList.contains('hidden')) {
    startGame();
  } else {
    flap();
  }
});

startBtn.addEventListener('click', startGame);

// Gambar Tampilan Awal
draw();