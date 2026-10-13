const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');
const btnJump = document.getElementById('btn-jump');
const btnDuck = document.getElementById('btn-duck');

let score = 0;
let highScore = localStorage.getItem('dino_high_score') || 0;
let isPlaying = false;
let gameSpeed = 5;
let frameCount = 0;

highScoreEl.textContent = String(highScore).padStart(5, '0');

// Karakter T-Rex
let dino = {
  x: 50,
  y: 140,
  width: 30,
  height: 40,
  vy: 0,
  gravity: 0.6,
  jumpForce: -10,
  isJumping: false,
  isDucking: false
};

let obstacles = [];
let clouds = [];

function resetGame() {
  score = 0;
  gameSpeed = 5;
  frameCount = 0;
  obstacles = [];
  clouds = [];
  dino.y = 140;
  dino.vy = 0;
  dino.isJumping = false;
  dino.isDucking = false;
  scoreEl.textContent = '00000';
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
  overlayMsg.textContent = `Skor akhir: ${Math.floor(score)}`;
  startBtn.textContent = 'Main Lagi';
  overlay.classList.remove('hidden');
}

function jump() {
  if (!isPlaying) return;
  if (!dino.isJumping) {
    dino.vy = dino.jumpForce;
    dino.isJumping = true;
    dino.isDucking = false;
  }
}

function duck(isDown) {
  if (!isPlaying) return;
  if (isDown && !dino.isJumping) {
    dino.isDucking = true;
    dino.height = 24;
    dino.y = 156;
  } else if (!isDown && dino.isDucking) {
    dino.isDucking = false;
    dino.height = 40;
    dino.y = 140;
  }
}

function update() {
  if (!isPlaying) return;

  // Skor & Kecepatan bertambah seiring waktu
  score += 0.1;
  scoreEl.textContent = String(Math.floor(score)).padStart(5, '0');

  if (Math.floor(score) % 100 === 0 && gameSpeed < 12) {
    gameSpeed += 0.002;
  }

  // Fisika Lompat Dino
  dino.vy += dino.gravity;
  dino.y += dino.vy;

  let groundLevel = dino.isDucking ? 156 : 140;
  if (dino.y > groundLevel) {
    dino.y = groundLevel;
    dino.vy = 0;
    dino.isJumping = false;
  }

  // Spawn Awan
  if (frameCount % 150 === 0) {
    clouds.push({
      x: canvas.width,
      y: Math.random() * 60 + 20,
      width: 40,
      speed: gameSpeed * 0.4
    });
  }

  // Gerakkan Awan
  clouds.forEach(cloud => cloud.x -= cloud.speed);
  clouds = clouds.filter(cloud => cloud.x + cloud.width > 0);

  // Spawn Rintangan (Kaktus / Burung)
  if (frameCount % Math.max(70, Math.floor(140 - gameSpeed * 6)) === 0) {
    let type = Math.random() > 0.75 && score > 200 ? 'bird' : 'cactus';

    if (type === 'cactus') {
      let sizeType = Math.floor(Math.random() * 3);
      obstacles.push({
        type: 'cactus',
        x: canvas.width,
        y: 145,
        width: 16 + sizeType * 8,
        height: 32 + sizeType * 6
      });
    } else {
      let birdHeights = [120, 100, 80]; // Ketinggian burung bervariasi
      obstacles.push({
        type: 'bird',
        x: canvas.width,
        y: birdHeights[Math.floor(Math.random() * birdHeights.length)],
        width: 30,
        height: 20
      });
    }
  }

  // Gerakkan & Cek Tabrakan Rintangan
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= gameSpeed;

    // Deteksi Tabrakan AABB (Hitbox)
    let dBox = {
      x: dino.x + 4,
      y: dino.y + 4,
      width: dino.width - 8,
      height: dino.height - 8
    };

    let oBox = {
      x: obstacles[i].x + 4,
      y: obstacles[i].y + 4,
      width: obstacles[i].width - 8,
      height: obstacles[i].height - 8
    };

    if (
      dBox.x < oBox.x + oBox.width &&
      dBox.x + dBox.width > oBox.x &&
      dBox.y < oBox.y + oBox.height &&
      dBox.y + dBox.height > oBox.y
    ) {
      endGame();
    }

    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    highScoreEl.textContent = String(highScore).padStart(5, '0');
    localStorage.setItem('dino_high_score', highScore);
  }

  frameCount++;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Gambar Awan
  ctx.fillStyle = '#b0b0b0';
  clouds.forEach(cloud => {
    ctx.fillRect(cloud.x, cloud.y, cloud.width, 10);
    ctx.fillRect(cloud.x + 10, cloud.y - 4, 20, 4);
  });

  // 2. Garis Tanah
  ctx.strokeStyle = '#535353';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.lineTo(canvas.width, 180);
  ctx.stroke();

  // 3. Gambar Rintangan (Kaktus / Burung)
  obstacles.forEach(obs => {
    ctx.fillStyle = '#535353';
    if (obs.type === 'cactus') {
      // Bentuk Kaktus
      ctx.fillRect(obs.x + 4, obs.y, obs.width - 8, obs.height);
      ctx.fillRect(obs.x, obs.y + 8, obs.width, 6); // Cabang kiri-kanan
    } else {
      // Gambar Burung (Piksel Sederhana dengan Sayap)
      ctx.fillRect(obs.x, obs.y + 6, 24, 6); // Badan
      ctx.fillRect(obs.x + 8, obs.y, 8, 6);   // Kepala
      // Animasi sayap kepak sederhana berdasarkan frame
      if (Math.floor(frameCount / 15) % 2 === 0) {
        ctx.fillRect(obs.x + 10, obs.y + 12, 8, 8); // Sayap kebawah
      } else {
        ctx.fillRect(obs.x + 10, obs.y - 4, 8, 8);  // Sayap keatas
      }
    }
  });

  // 4. Gambar T-Rex Piksel (Dino)
  ctx.fillStyle = '#535353';
  if (dino.isDucking) {
    // Bentuk Dino Menunduk (Lebih panjang ke samping)
    ctx.fillRect(dino.x, dino.y + 8, 40, 16); // Badan
    ctx.fillRect(dino.x + 28, dino.y, 14, 12); // Kepala
    ctx.fillRect(dino.x + 8, dino.y + 24, 6, 4);  // Kaki
    ctx.fillRect(dino.x + 24, dino.y + 24, 6, 4); // Kaki
  } else {
    // Bentuk Dino Berdiri Normal
    ctx.fillRect(dino.x + 8, dino.y + 10, 16, 20); // Badan
    ctx.fillRect(dino.x + 16, dino.y, 16, 14);     // Kepala
    ctx.fillRect(dino.x + 28, dino.y + 4, 4, 4);     // Mulut/Moncong
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(dino.x + 24, dino.y + 3, 2, 2);     // Mata Dino
    ctx.fillStyle = '#535353';
    ctx.fillRect(dino.x, dino.y + 12, 10, 6);      // Tangan depan
    ctx.fillRect(dino.x + 2, dno = dino.y + 26, 4, 14); // Ekor belakang

    // Kaki Dino (Bergantian gerak saat lari)
    if (dino.isJumping) {
      ctx.fillRect(dino.x + 10, dino.y + 30, 4, 10);
      ctx.fillRect(dino.x + 18, dino.y + 30, 4, 10);
    } else {
      let legStep = Math.floor(frameCount / 6) % 2;
      if (legStep === 0) {
        ctx.fillRect(dino.x + 10, dino.y + 30, 4, 10);
        ctx.fillRect(dino.x + 18, dino.y + 30, 4, 6);
      } else {
        ctx.fillRect(dino.x + 10, dino.y + 30, 4, 6);
        ctx.fillRect(dino.x + 18, dino.y + 30, 4, 10);
      }
    }
  }
}

function loop() {
  update();
  draw();
  if (isPlaying) {
    requestAnimationFrame(loop);
  }
}

// Event Listeners - Keyboard
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (!isPlaying && !overlay.classList.contains('hidden')) {
      startGame();
    } else {
      jump();
    }
  }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    duck(true);
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    duck(false);
  }
});

// Event Listeners - Mobile Buttons
btnJump.addEventListener('click', () => {
  if (!isPlaying && !overlay.classList.contains('hidden')) {
    startGame();
  } else {
    jump();
  }
});

btnDuck.addEventListener('mousedown', () => duck(true));
btnDuck.addEventListener('mouseup', () => duck(false));
btnDuck.addEventListener('touchstart', (e) => { e.preventDefault(); duck(true); });
btnDuck.addEventListener('touchend', (e) => { e.preventDefault(); duck(false); });

startBtn.addEventListener('click', startGame);

// Initial draw
draw();