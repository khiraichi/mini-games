const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status-text');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const restartBtn = document.getElementById('restart-btn');
const resetGameBtn = document.getElementById('reset-game-btn');
const modePvPBtn = document.getElementById('mode-pvp');
const modePvEBtn = document.getElementById('mode-pve');

const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X'; // 'X' atau 'O'
let isGameActive = true;
let gameMode = 'pvp'; // 'pvp' atau 'pve'

let scores = {
  X: parseInt(localStorage.getItem('ttt_score_x')) || 0,
  O: parseInt(localStorage.getItem('ttt_score_o')) || 0,
  draw: parseInt(localStorage.getItem('ttt_score_draw')) || 0
};

scoreXEl.textContent = scores.X;
scoreOEl.textContent = scores.O;
scoreDrawEl.textContent = scores.draw;

const winningConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Baris
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Kolom
  [0, 4, 8], [2, 4, 6]             // Diagonal
];

function handleCellClick(e) {
  const cell = e.target;
  const index = cell.getAttribute('data-index');

  if (board[index] !== '' || !isGameActive) return;
  if (gameMode === 'pve' && currentPlayer === 'O') return; // Blokir klik saat giliran bot

  makeMove(index, currentPlayer);

  if (isGameActive && gameMode === 'pve' && currentPlayer === 'O') {
    setTimeout(botMove, 400); // Jeda sedikit agar natural
  }
}

function makeMove(index, player) {
  board[index] = player;
  cells[index].textContent = player;
  cells[index].classList.add(player.toLowerCase());

  checkResult();
}

function checkResult() {
  let roundWon = false;
  let winningLine = [];

  for (let condition of winningConditions) {
    const [a, b, c] = condition;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      roundWon = true;
      winningLine = [a, b, c];
      break;
    }
  }

  if (roundWon) {
    isGameActive = false;
    winningLine.forEach(index => cells[index].classList.add('win'));

    scores[currentPlayer]++;
    updateScoresStorage();

    overlayTitle.textContent = `Pemain ${currentPlayer} Menang!`;
    overlayMsg.textContent = `Selamat kepada Pemain ${currentPlayer}`;
    overlay.classList.remove('hidden');
    return;
  }

  if (!board.includes('')) {
    isGameActive = false;
    scores.draw++;
    updateScoresStorage();

    overlayTitle.textContent = 'Permainan Seri!';
    overlayMsg.textContent = 'Tidak ada pemenang pada ronde ini';
    overlay.classList.remove('hidden');
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();
}

function updateStatus() {
  const playerClass = currentPlayer === 'X' ? 'player-x' : 'player-o';
  statusText.innerHTML = `Giliran Pemain: <strong class="${playerClass}">${currentPlayer}</strong>`;
}

function updateScoresStorage() {
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.draw;
  localStorage.setItem('ttt_score_x', scores.X);
  localStorage.setItem('ttt_score_o', scores.O);
  localStorage.setItem('ttt_score_draw', scores.draw);
}

function botMove() {
  if (!isGameActive) return;

  // AI Sederhana: Cari kotak kosong secara acak (bisa ditingkatkan ke Minimax jika mau)
  let emptyCells = [];
  board.forEach((val, idx) => {
    if (val === '') emptyCells.push(idx);
  });

  if (emptyCells.length > 0) {
    let randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    makeMove(randomIndex, 'O');
  }
}

function resetBoard() {
  board = ['', '', '', '', '', '', '', '', ''];
  isGameActive = true;
  currentPlayer = 'X';
  updateStatus();
  overlay.classList.add('hidden');

  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('x', 'o', 'win');
  });
}

function setGameMode(mode) {
  gameMode = mode;
  if (mode === 'pvp') {
    modePvPBtn.classList.add('active');
    modePvEBtn.classList.remove('active');
  } else {
    modePvEBtn.classList.add('active');
    modePvPBtn.classList.remove('active');
  }
  resetBoard();
}

// Event Listeners
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartBtn.addEventListener('click', resetBoard);
resetGameBtn.addEventListener('click', resetBoard);
modePvPBtn.addEventListener('click', () => setGameMode('pvp'));
modePvEBtn.addEventListener('click', () => setGameMode('pve'));

updateStatus();