(() => {
  const BEST_KEY = 'minigames.puzzle.best';

  const $ = id => document.getElementById(id);
  const el = {
    board: $('board'), moves: $('moves'), time: $('time'), best: $('best'),
    win: $('win'), winText: $('winText'), hint: $('hint'),
    restart: $('restart'), again: $('again'), sizes: $('sizes'),
  };

  let n = 4;             // ukuran papan (n x n)
  let grid = [];         // grid[posisi] = nomor ubin, 0 = kotak kosong
  let moves = 0;
  let solved = false;
  let startTime = 0;
  let timer = null;
  const tiles = new Map(); // nomor ubin -> elemen tombol

  // ---------- Util ----------
  const pad = v => String(v).padStart(2, '0');
  const fmt = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  const elapsed = () => (startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);

  function readBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (_) { return {}; }
  }
  function writeBest(obj) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(obj)); } catch (_) { /* abaikan */ }
  }

  function startTimer() {
    startTime = Date.now();
    timer = setInterval(() => { el.time.textContent = fmt(elapsed()); }, 250);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  // ---------- Logika papan ----------
  function solvedGrid() {
    const g = [];
    for (let i = 0; i < n * n - 1; i++) g.push(i + 1);
    g.push(0);
    return g;
  }

  function isSolved() {
    for (let i = 0; i < n * n - 1; i++) if (grid[i] !== i + 1) return false;
    return grid[n * n - 1] === 0;
  }

  function neighbors(idx) {
    const r = Math.floor(idx / n), c = idx % n, out = [];
    if (r > 0) out.push(idx - n);
    if (r < n - 1) out.push(idx + n);
    if (c > 0) out.push(idx - 1);
    if (c < n - 1) out.push(idx + 1);
    return out;
  }

  // Acak dengan melakukan gerakan sah dari kondisi selesai,
  // jadi hasilnya dijamin selalu bisa diselesaikan.
  function shuffleBoard() {
    do {
      grid = solvedGrid();
      let empty = n * n - 1;
      let prev = -1;
      for (let k = 0; k < n * n * 30; k++) {
        const options = neighbors(empty).filter(x => x !== prev);
        const pick = options[Math.floor(Math.random() * options.length)];
        grid[empty] = grid[pick];
        grid[pick] = 0;
        prev = empty;
        empty = pick;
      }
    } while (isSolved());
  }

  // Geser ubin di posisi idx. Kalau sebaris/sekolom dengan kotak kosong,
  // semua ubin di antaranya ikut bergeser.
  function moveByIndex(idx) {
    if (solved) return false;
    const e = grid.indexOf(0);
    if (idx === e) return false;

    const er = Math.floor(e / n), ec = e % n;
    const ir = Math.floor(idx / n), ic = idx % n;
    let step;
    if (er === ir) step = ic > ec ? 1 : -1;
    else if (ec === ic) step = ir > er ? n : -n;
    else return false;

    let cur = e, count = 0;
    while (cur !== idx) {
      const next = cur + step;
      grid[cur] = grid[next];
      grid[next] = 0;
      cur = next;
      count++;
    }

    moves += count;
    if (!startTime) startTimer();
    render();
    updateStats();
    if (isSolved()) finish();
    return true;
  }

  // ---------- Tampilan ----------
  function updateStats() {
    el.moves.textContent = moves;
    el.time.textContent = fmt(elapsed());
    const best = readBest()[n];
    el.best.textContent = best ? best.moves : '–';
  }

  function render() {
    grid.forEach((v, i) => {
      if (!v) return;
      const t = tiles.get(v);
      t.style.transform = `translate(${(i % n) * 100}%, ${Math.floor(i / n) * 100}%)`;
      t.dataset.pos = i;
      t.classList.toggle('ok', v === i + 1);
    });
  }

  function buildBoard() {
    el.board.textContent = '';
    el.board.style.setProperty('--n', n);
    tiles.clear();

    const total = n * n - 1;
    for (let v = 1; v <= total; v++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ptile';
      btn.dataset.value = v;
      btn.setAttribute('aria-label', `Ubin ${v}`);

      const face = document.createElement('span');
      face.className = 'face';
      face.textContent = v;
      face.style.setProperty('--h', 200 + Math.round((v / total) * 140));
      btn.appendChild(face);

      btn.addEventListener('click', () => moveByIndex(grid.indexOf(v)));
      tiles.set(v, btn);
      el.board.appendChild(btn);
    }

    // Tanpa animasi saat papan baru dibuat
    el.board.classList.add('no-anim');
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => el.board.classList.remove('no-anim')));
  }

  function newGame() {
    stopTimer();
    startTime = 0;
    moves = 0;
    solved = false;
    el.win.classList.remove('show');
    shuffleBoard();
    buildBoard();
    updateStats();
  }

  function finish() {
    solved = true;
    stopTimer();
    const secs = elapsed();
    el.time.textContent = fmt(secs);

    const all = readBest();
    const best = all[n];
    const isRecord = !best || moves < best.moves || (moves === best.moves && secs < best.secs);
    if (isRecord) {
      all[n] = { moves, secs };
      writeBest(all);
    }

    el.winText.textContent = `${moves} langkah dalam ${fmt(secs)}` + (isRecord ? '. 🏅 Rekor baru!' : '.');
    updateStats();
    el.win.classList.add('show');
    el.again.focus();
  }

  // ---------- Input ----------
  el.restart.addEventListener('click', newGame);
  el.again.addEventListener('click', newGame);

  el.sizes.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      n = Number(btn.dataset.size);
      el.sizes.querySelectorAll('button').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));
      newGame();
    });
  });

  // Ubin bergeser searah panah: [selisih baris, selisih kolom] dari kotak kosong
  // ke ubin yang akan dipindah. Panah kiri = ubin di kanan kotak kosong bergeser ke kiri.
  const KEYMAP = {
    arrowleft: [0, 1],  a: [0, 1],
    arrowright: [0, -1], d: [0, -1],
    arrowup: [1, 0],    w: [1, 0],
    arrowdown: [-1, 0], s: [-1, 0],
  };

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'r') { newGame(); return; }

    const d = KEYMAP[key];
    if (!d) return;
    e.preventDefault();

    const empty = grid.indexOf(0);
    const r = Math.floor(empty / n) + d[0];
    const c = (empty % n) + d[1];
    if (r < 0 || r >= n || c < 0 || c >= n) return;
    moveByIndex(r * n + c);
  });

  newGame();
})();
