(() => {
  const EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥥', '🍉', '🍋', '🥑', '🌽', '🥕'];
  const LEVELS = {
    easy:   { label: 'Mudah',  cols: 4, pairs: 6 },
    medium: { label: 'Sedang', cols: 4, pairs: 8 },
    hard:   { label: 'Sulit',  cols: 6, pairs: 12 },
  };
  const BEST_KEY = 'minigames.memory.best';
  const MISMATCH_MS = 850;

  const $ = id => document.getElementById(id);
  const el = {
    board: $('board'), moves: $('moves'), time: $('time'), pairs: $('pairs'),
    record: $('record'), win: $('win'), winText: $('winText'),
    restart: $('restart'), again: $('again'), levels: $('levels'),
  };

  let level = 'medium';
  let deck = [];
  let first = null;      // indeks kartu pertama yang sedang terbuka
  let lock = false;      // true saat dua kartu salah sedang ditampilkan
  let moves = 0;
  let matched = 0;
  let startTime = 0;
  let timer = null;
  let gen = 0;           // penanda papan ke-berapa, supaya timeout lama diabaikan
  let finished = false;

  // ---------- Util ----------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  const elapsed = () => (startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);

  function readBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (_) { return {}; }
  }
  function writeBest(obj) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(obj)); } catch (_) { /* abaikan */ }
  }

  // ---------- Timer ----------
  function startTimer() {
    startTime = Date.now();
    timer = setInterval(() => { el.time.textContent = fmt(elapsed()); }, 250);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  // ---------- Tampilan ----------
  function updateStats() {
    el.moves.textContent = moves;
    el.time.textContent = fmt(elapsed());
    el.pairs.textContent = matched + '/' + LEVELS[level].pairs;
  }

  function showRecord() {
    const best = readBest()[level];
    el.record.textContent = best
      ? `Rekor ${LEVELS[level].label}: ${best.moves} langkah (${fmt(best.secs)})`
      : `Belum ada rekor untuk level ${LEVELS[level].label}.`;
  }

  function setOpen(card, open) {
    card.open = open;
    card.el.classList.toggle('open', open);
    card.el.setAttribute('aria-label', `Kartu ${card.i + 1}, ${open ? card.s : 'tertutup'}`);
  }

  // ---------- Permainan ----------
  function build() {
    const cfg = LEVELS[level];
    el.board.style.setProperty('--cols', cfg.cols);
    el.board.textContent = '';

    const symbols = shuffle(EMOJIS).slice(0, cfg.pairs);
    deck = shuffle(symbols.concat(symbols)).map((s, i) => ({ s, i, open: false, done: false, el: null }));

    deck.forEach((card, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mcard';
      btn.setAttribute('aria-label', `Kartu ${i + 1}, tertutup`);

      const inner = document.createElement('span');
      inner.className = 'inner';
      const front = document.createElement('span');
      front.className = 'face front';
      front.textContent = '?';
      front.setAttribute('aria-hidden', 'true');
      const back = document.createElement('span');
      back.className = 'face back';
      back.textContent = card.s;
      back.setAttribute('aria-hidden', 'true');

      inner.appendChild(front);
      inner.appendChild(back);
      btn.appendChild(inner);
      btn.addEventListener('click', () => flip(i));

      card.el = btn;
      el.board.appendChild(btn);
    });
  }

  function newGame() {
    gen++;
    stopTimer();
    startTime = 0;
    first = null;
    lock = false;
    moves = 0;
    matched = 0;
    finished = false;
    el.win.classList.remove('show');
    build();
    updateStats();
    showRecord();
  }

  function flip(i) {
    const card = deck[i];
    if (finished || lock || card.open || card.done) return;

    setOpen(card, true);
    if (first === null) {
      first = i;
      if (!startTime) startTimer();
      return;
    }

    const a = deck[first];
    const b = card;
    first = null;
    moves++;

    if (a.s === b.s) {
      [a, b].forEach(c => {
        c.done = true;
        c.el.classList.add('done');
        c.el.setAttribute('aria-label', `Kartu ${c.i + 1}, ${c.s}, cocok`);
      });
      matched++;
      updateStats();
      if (matched === LEVELS[level].pairs) win();
    } else {
      updateStats();
      lock = true;
      a.el.classList.add('wrong');
      b.el.classList.add('wrong');
      const g = gen;
      setTimeout(() => {
        if (g !== gen) return;
        [a, b].forEach(c => { c.el.classList.remove('wrong'); setOpen(c, false); });
        lock = false;
      }, MISMATCH_MS);
    }
  }

  function win() {
    finished = true;
    stopTimer();
    const secs = elapsed();
    el.time.textContent = fmt(secs);

    const all = readBest();
    const best = all[level];
    const isRecord = !best || moves < best.moves || (moves === best.moves && secs < best.secs);
    if (isRecord) {
      all[level] = { moves, secs };
      writeBest(all);
    }

    el.winText.textContent = `${moves} langkah dalam ${fmt(secs)}` + (isRecord ? '. 🏅 Rekor baru!' : '.');
    showRecord();
    el.win.classList.add('show');
    el.again.focus();
  }

  // ---------- Input ----------
  el.restart.addEventListener('click', newGame);
  el.again.addEventListener('click', newGame);

  el.levels.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      level = btn.dataset.level;
      el.levels.querySelectorAll('button').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn)));
      newGame();
    });
  });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') newGame();
  });

  newGame();
})();
