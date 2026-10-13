const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

// Grid Config
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game State
let snake = [];
let food = { x: 0, y: 0 };
let dx = gridSize;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snake_high_score') || 0;
let gameInterval = null;
let isPlaying = false;
let changingDirection = false;

highScoreEl.textContent = highScore;

// Audio Synth (Beep gratis menggunakan Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, duration) {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Abaikan jika browser memblokir audio
  }
}

function initGame() {
  snake = [
    { x: 160, y: 200 },
    { x: 140, y: 200 },
    { x: 120, y: 200 }
  ];
  dx = gridSize;
  dy = 0;
  score = 0;
  scoreEl.textContent = score;
  changingDirection = false;
  spawnFood();
}

function spawnFood() {
  food.x = Math.floor(Math.random() * tileCount) * gridSize;
  food.y = Math.floor(Math.random() * tileCount) * gridSize;

  // Pastikan makanan tidak berada di tubuh ular
  snake.forEach(part => {
    if (part.x === food.x && part.y === food.y) {
      spawnFood();
    }
  });
}

function gameLoop() {
  if (hasGameEnded()) {
    endGame();
    return;
  }

  changingDirection = false;
  clearCanvas();
  drawFood();
  moveSnake();
  drawSnake();
}

function clearCanvas() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Garis Grid Tipis
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? '#38bdf8' : '#0284c7';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;

    // Smooth Rounded Segment
    ctx.beginPath();
    ctx.roundRect(part.x, part.y, gridSize - 1, gridSize - 1, [4]);
    ctx.fill();
    ctx.stroke();
  });
}

function moveSnake() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);

  // Jika ular memakan makanan
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    playSound(600, 0.1);

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('snake_high_score', highScore);
    }
    spawnFood();
  } else {
    snake.pop();
  }
}

function hasGameEnded() {
  const head = snake[0];

  // Tabrak Dinding
  const hitLeft = head.x < 0;
  const hitRight = head.x >= canvas.width;
  const hitTop = head.y < 0;
  const hitBottom = head.y >= canvas.height;

  if (hitLeft || hitRight || hitTop || hitBottom) return true;

  // Tabrak Badan Sendiri
  for (let i = 4; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }

  return false;
}

function drawFood() {
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(food.x + gridSize / 2, food.y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0; // Reset Shadow
}

function changeDirection(dir) {
  if (changingDirection) return;

  const goingUp = dy === -gridSize;
  const goingDown = dy === gridSize;
  const goingRight = dx === gridSize;
  const goingLeft = dx === -gridSize;

  if (dir === 'LEFT' && !goingRight) {
    dx = -gridSize;
    dy = 0;
    changingDirection = true;
  }
  if (dir === 'UP' && !goingDown) {
    dx = 0;
    dy = -gridSize;
    changingDirection = true;
  }
  if (dir === 'RIGHT' && !goingLeft) {
    dx = gridSize;
    dy = 0;
    changingDirection = true;
  }
  if (dir === 'DOWN' && !goingUp) {
    dx = 0;
    dy = gridSize;
    changingDirection = true;
  }
}

function startGame() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  initGame();
  isPlaying = true;
  overlay.classList.add('hidden');
  clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 100);
}

function endGame() {
  isPlaying = false;
  clearInterval(gameInterval);
  playSound(150, 0.3);

  overlayTitle.textContent = 'Game Over!';
  overlayMsg.textContent = `Skor akhir Anda: ${score}`;
  startBtn.textContent = 'Main Lagi';
  overlay.classList.remove('hidden');
}

// Event Listeners - Keyboard
document.addEventListener('keydown', (e) => {
  if (!isPlaying && (e.code === 'Space' || e.code === 'Enter')) {
    startGame();
    return;
  }

  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      changeDirection('LEFT');
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      changeDirection('UP');
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      changeDirection('RIGHT');
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      changeDirection('DOWN');
      break;
  }
});

// Event Listeners - Mobile Controls
document.getElementById('btn-up').addEventListener('click', () => changeDirection('UP'));
document.getElementById('btn-down').addEventListener('click', () => changeDirection('DOWN'));
document.getElementById('btn-left').addEventListener('click', () => changeDirection('LEFT'));
document.getElementById('btn-right').addEventListener('click', () => changeDirection('RIGHT'));

startBtn.addEventListener('click', startGame);

// Draw Initial State
clearCanvas();