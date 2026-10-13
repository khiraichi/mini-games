const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

let score = 0;
let timeLeft = 30;
let highScore = localStorage.getItem('whack_high_score') || 0;
let isPlaying = false;
let gameInterval = null;
let moleTimer = null;

highScoreEl.textContent = highScore;

// 9 Koordinat Lubang (Grid 3x3 di dalam Canvas 360x360)
const holes = [
  { x: 60, y: 80 },  { x: 180, y: 80 },  { x: 300, y: 80 },
  { x: 60, y: 200 }, { x: 180, y: 200 }, { x: 300, y: 200 },
  { x: 60, y: 320 }, { x: 180, y: 320 }, { x: 300, y: 320 }
];

let activeMole = -1; // Indeks lubang tempat tikus muncul (-1 jika kosong)

function startGame() {
  score = 0;
  timeLeft = 30;
  scoreEl.textContent = score;
  timerEl.textContent = timeLeft;
  isPlaying = true;
  overlay.classList.add('hidden');

  clearInterval(gameInterval);
  clearTimeout(moleTimer);

  // Timer Hitung Mundur Waktu Bermain
  gameInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  nextMole();
}

function endGame() {
  isPlaying = false;
  clearInterval(gameInterval);
  clearTimeout(moleTimer);
  activeMole = -1;

  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    localStorage.setItem('whack_high_score', highScore);
  }

  overlayTitle.textContent = 'Waktu Habis!';
  overlayMsg.textContent = `Skor akhir Anda: ${score}`;
  startBtn.textContent = 'Main Lagi';
  overlay.classList.remove('hidden');
  draw();
}

function nextMole() {
  if (!isPlaying) return;

  // Pilih lubang secara acak, pastikan tidak sama persis dengan sebelumnya
  let newHole;
  do {
    newHole = Math.floor(Math.random() * holes.length);
  } while (newHole === activeMole);

  activeMole = newHole;
  draw();

  // Waktu tikus muncul di lubang (makin lama makin cepat sedikit)
  let popTime = Math.max(600, 1000 - (30 - timeLeft) * 15);

  moleTimer = setTimeout(() => {
    activeMole = -1;
    draw();
    if (isPlaying) {
      // Jeda acak sebelum tikus berikutnya muncul
      let pauseTime = Math.random() * 400 + 200;
      setTimeout(nextMole, pauseTime);
    }
  }, popTime);
}

function draw() {
  ctx.fillStyle = '#3b220c'; // Warna latar tanah
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gambar 9 Lubang
  holes.forEach((hole, index) => {
    // Pinggiran lubang (Efek 3D tanah)
    ctx.fillStyle = '#1d1106';
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, 45, 0, Math.PI * 2);
    ctx.fill();

    // Dasar lubang dalam
    ctx.fillStyle = '#110a03';
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, 38, 0, Math.PI * 2);
    ctx.fill();

    // Jika tikus aktif di lubang ini, gambar tikusnya
    if (index === activeMole) {
      drawMole(hole.x, hole.y);
    }
  });
}

function drawMole(x, y) {
  // Badan Tikus / Kepala
  ctx.fillStyle = '#a1887f';
  ctx.beginPath();
  ctx.arc(x, y + 10, 30, Math.PI, 0, false);
  ctx.fill();

  // Telinga Kiri & Kanan
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.arc(x - 20, y - 5, 10, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 5, 10, 0, Math.PI * 2);
  ctx.fill();

  // Mata Tikus (Bulat hitam putih)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 10, y + 2, 5, 0, Math.PI * 2);
  ctx.arc(x + 10, y + 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(x - 10, y + 2, 2, 0, Math.PI * 2);
  ctx.arc(x + 10, y + 2, 2, 0, Math.PI * 2);
  ctx.fill();

  // Hidung Tikus
  ctx.fillStyle = '#e91e63';
  ctx.beginPath();
  ctx.arc(x, y + 10, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Deteksi Klik / Ketuk untuk Memukul Tikus
canvas.addEventListener('click', (e) => {
  if (!isPlaying) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  if (activeMole !== -1) {
    let mole = holes[activeMole];
    // Hitung jarak klik dari pusat tikus aktif
    let distance = Math.hypot(clickX - mole.x, clickY - (mole.y + 5));

    if (distance < 40) {
      score++;
      scoreEl.textContent = score;
      activeMole = -1; // Tikus langsung masuk setelah dipukul
      clearTimeout(moleTimer);
      draw();

      // Munculkan tikus baru dengan sedikit jeda
      setTimeout(nextMole, 200);
    }
  }
});

startBtn.addEventListener('click', startGame);

// Gambar Tampilan Awal
draw();