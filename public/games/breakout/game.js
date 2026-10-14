(() => {
  const W = 480, H = 560;
  const COLS = 8, ROWS = 6, ROW_H = 22, GAP = 6, MX = 24, TOP = 56;
  const BW = (W - MX * 2 - GAP * (COLS - 1)) / COLS;
  const BALL_R = 8;
  const PADDLE_Y = H - 44, PADDLE_H = 14;
  const MAX_ANGLE = 1.15;            // sudut pantul maksimum dari vertikal (rad)
  const START_LIVES = 3;
  const BEST_KEY = 'minigames.breakout.best';
  const OVER_DELAY = 450;            // jeda sebelum layar game over muncul (ms)

  const MODES = {
    easy:   { label: 'Santai', speed: 300, paddle: 112 },
    normal: { label: 'Normal', speed: 360, paddle: 92 },
    hard:   { label: 'Sulit',  speed: 430, paddle: 74 },
  };

  // '#' = 1 pukulan, '2' = 2 pukulan, '.' = kosong
  const PATTERNS = [
    ['########', '########', '########', '########', '########', '########'],
    ['#.#.#.#.', '.#.#.#.#', '2.2.2.2.', '.2.2.2.2', '#.#.#.#.', '.#.#.#.#'],
    ['...##...', '..####..', '.######.', '########', '.######.', '..####..'],
    ['22222222', '2......2', '2.####.2', '2.####.2', '2......2', '22222222'],
  ];
  const ROW_HUES = [0, 24, 46, 140, 200, 265];

  const $ = id => document.getElementById(id);
  const el = {
    canvas: $('board'), score: $('score'), level: $('level'), lives: $('lives'), record: $('record'),
    overlay: $('overlay'), ovEmoji: $('ovEmoji'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovBtn: $('ovBtn'),
    modes: $('modes'), restart: $('restart'), sound: $('sound'),
  };

  // Kanvas tajam di layar retina
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  el.canvas.width = W * DPR;
  el.canvas.height = H * DPR;
  const ctx = el.canvas.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // ---------- State ----------
  let mode = 'normal';
  let status = 'menu';        // menu | ready | running | paused | cleared | over
  let overlayReady = true;
  let bricks = [];
  let paddle = { x: W / 2, w: MODES.normal.paddle };
  let ball = { x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, speed: MODES.normal.speed, trail: [] };
  let lives = START_LIVES;
  let score = 0;
  let level = 1;
  let keys = { left: false, right: false };
  let particles = [];
  let muted = false;
  let gen = 0;
  let last = performance.now();
  let frozen = false;         // hanya diubah oleh hook tes (?debug)
  let timescale = 1;
  let autoplay = false;

  // ---------- Suara (WebAudio, tanpa file) ----------
  let audio;
  function beep(freq, dur = 0.06, type = 'square', vol = 0.05) {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur);
    } catch (_) { /* abaikan jika audio tidak tersedia */ }
  }

  // ---------- Penyimpanan rekor ----------
  function readBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (_) { return {}; }
  }
  function writeBest(obj) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(obj)); } catch (_) { /* abaikan */ }
  }
  // Menyimpan skor kalau lebih tinggi dari rekor. Mengembalikan true jika rekor baru.
  function saveBest() {
    const all = readBest();
    const prev = all[mode] || 0;
    if (score > prev) { all[mode] = score; writeBest(all); return true; }
    return false;
  }

  // ---------- Util ----------
  const levelSpeed = () => Math.min(MODES[mode].speed * 1.6, MODES[mode].speed + (level - 1) * 25);
  const clampPaddle = x => Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, x));

  function buildLevel(lv) {
    const pat = PATTERNS[(lv - 1) % PATTERNS.length];
    const extraHp = Math.floor((lv - 1) / PATTERNS.length);
    bricks = [];
    pat.forEach((row, r) => {
      for (let c = 0; c < COLS; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        const hp = Math.min(3, (ch === '2' ? 2 : 1) + extraHp);
        bricks.push({ r, c, x: MX + c * (BW + GAP), y: TOP + r * (ROW_H + GAP), hp, maxHp: hp });
      }
    });
  }

  function resetBall() {
    ball.x = paddle.x;
    ball.y = PADDLE_Y - BALL_R;
    ball.vx = ball.vy = 0;
    ball.speed = levelSpeed();
    ball.trail.length = 0;
  }

  // ---------- Tampilan statistik & overlay ----------
  function updateStats() {
    el.score.textContent = score;
    el.level.textContent = level;
    el.lives.textContent = lives > 0 ? '❤️'.repeat(lives) : '–';
    const best = readBest()[mode] || 0;
    el.record.textContent = best
      ? `Rekor ${MODES[mode].label}: ${best} poin`
      : `Belum ada rekor untuk tingkat ${MODES[mode].label}.`;
  }

  function showOverlay(emoji, title, text, btn) {
    el.ovEmoji.textContent = emoji;
    el.ovTitle.textContent = title;
    el.ovText.textContent = text;
    el.ovBtn.textContent = btn;
    el.overlay.classList.add('show');
    overlayReady = true;
  }
  function hideOverlay() { el.overlay.classList.remove('show'); }

  // ---------- Alur permainan ----------
  function newGame() {
    gen++;
    paddle.w = MODES[mode].paddle;
    paddle.x = W / 2;
    lives = START_LIVES;
    score = 0;
    level = 1;
    particles = [];
    buildLevel(level);
    resetBall();
    status = 'ready';
    hideOverlay();
    updateStats();
  }

  function launch() {
    if (status !== 'ready') return;
    const a = (Math.random() - 0.5) * 0.7;
    ball.vx = Math.sin(a) * ball.speed;
    ball.vy = -Math.cos(a) * ball.speed;
    status = 'running';
    beep(440, 0.05, 'triangle');
  }

  function pause() {
    if (status !== 'running') return;
    status = 'paused';
    showOverlay('⏸️', 'Jeda', 'Tekan Spasi atau P untuk lanjut.', 'Lanjut');
  }
  function resume() {
    if (status !== 'paused') return;
    status = 'running';
    last = performance.now();
    hideOverlay();
  }

  function levelClear() {
    status = 'cleared';
    const bonus = lives * 50;
    score += bonus;
    saveBest();
    updateStats();
    beep(880, 0.25, 'triangle', 0.08);
    showOverlay('🎉', `Level ${level} selesai!`,
      bonus ? `Bonus nyawa +${bonus}. Skor ${score}.` : `Skor ${score}.`, 'Lanjut');
  }

  function nextLevel() {
    if (status !== 'cleared') return;
    level++;
    buildLevel(level);
    resetBall();
    status = 'ready';
    hideOverlay();
    updateStats();
  }

  function loseLife() {
    lives--;
    beep(160, 0.3, 'sawtooth', 0.07);
    updateStats();
    if (lives > 0) {
      resetBall();
      status = 'ready';
      return;
    }
    status = 'over';
    overlayReady = false;
    const isRecord = saveBest();
    updateStats();
    const g = gen;
    setTimeout(() => {
      if (g !== gen) return;
      showOverlay('💥', 'Game over',
        `Skor ${score}, sampai level ${level}` + (isRecord ? '. 🏅 Rekor baru!' : '.'), 'Main lagi');
    }, OVER_DELAY);
  }

  function action() {
    if (status === 'menu') newGame();
    else if (status === 'ready') launch();
    else if (status === 'running') pause();
    else if (status === 'paused') resume();
    else if (status === 'cleared') nextLevel();
    else if (status === 'over' && overlayReady) newGame();
  }

  // ---------- Fisika ----------
  function spawnParticles(b) {
    const hue = ROW_HUES[b.r];
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 140;
      particles.push({
        x: b.x + BW / 2, y: b.y + ROW_H / 2,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.5 + Math.random() * 0.25, max: 0.75, hue,
      });
    }
  }

  function damage(i) {
    const b = bricks[i];
    b.hp--;
    if (b.hp > 0) { beep(300, 0.05, 'square', 0.05); return; }
    score += (ROWS - b.r) * 10 * b.maxHp;
    spawnParticles(b);
    bricks.splice(i, 1);
    beep(520 + (ROWS - b.r) * 40, 0.07, 'square', 0.06);
    updateStats();
    if (bricks.length === 0) levelClear();
  }

  function hitBricks() {
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      const cx = Math.max(b.x, Math.min(ball.x, b.x + BW));
      const cy = Math.max(b.y, Math.min(ball.y, b.y + ROW_H));
      const dx = ball.x - cx, dy = ball.y - cy;
      if (dx * dx + dy * dy >= BALL_R * BALL_R) continue;

      if (dx === 0 && dy === 0) {
        // pusat bola sudah di dalam balok: dorong keluar lewat sisi terdekat
        const l = ball.x - b.x, r = b.x + BW - ball.x, t = ball.y - b.y, bt = b.y + ROW_H - ball.y;
        const m = Math.min(l, r, t, bt);
        if (m === l) { ball.x = b.x - BALL_R; ball.vx = -Math.abs(ball.vx); }
        else if (m === r) { ball.x = b.x + BW + BALL_R; ball.vx = Math.abs(ball.vx); }
        else if (m === t) { ball.y = b.y - BALL_R; ball.vy = -Math.abs(ball.vy); }
        else { ball.y = b.y + ROW_H + BALL_R; ball.vy = Math.abs(ball.vy); }
      } else if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
        ball.x = cx + (dx > 0 ? 1 : -1) * BALL_R;
      } else {
        ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
        ball.y = cy + (dy > 0 ? 1 : -1) * BALL_R;
      }
      damage(i);
      return;
    }
  }

  function hitPaddle() {
    if (ball.vy <= 0) return;
    if (ball.y + BALL_R < PADDLE_Y || ball.y - BALL_R > PADDLE_Y + PADDLE_H) return;
    if (Math.abs(ball.x - paddle.x) > paddle.w / 2 + BALL_R * 0.6) return;

    const off = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
    ball.speed = Math.min(levelSpeed() * 1.35, ball.speed * 1.012);
    const a = off * MAX_ANGLE;
    ball.vx = Math.sin(a) * ball.speed;
    ball.vy = -Math.cos(a) * ball.speed;
    ball.y = PADDLE_Y - BALL_R;
    beep(360, 0.05, 'triangle', 0.06);
  }

  function subStep(h) {
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); beep(280, 0.03, 'sine', 0.04); }
    else if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); beep(280, 0.03, 'sine', 0.04); }
    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); beep(280, 0.03, 'sine', 0.04); }

    hitPaddle();
    if (status !== 'running') return;
    hitBricks();
    if (status !== 'running') return;

    if (ball.y - BALL_R > H) loseLife();
  }

  function advance(dt) {
    const n = Math.max(1, Math.ceil((ball.speed * dt) / 3)); // langkah kecil agar bola tidak menembus balok
    const h = dt / n;
    for (let i = 0; i < n && status === 'running'; i++) subStep(h);
    if (status === 'running') {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();
    }
  }

  function update(dt) {
    // Paddle via keyboard
    if (keys.left) paddle.x -= 520 * dt;
    if (keys.right) paddle.x += 520 * dt;
    if (autoplay && status === 'running') paddle.x = ball.x + (Math.random() - 0.5) * paddle.w * 0.7;
    paddle.x = clampPaddle(paddle.x);

    if (status === 'ready') {
      ball.x = paddle.x;
      ball.y = PADDLE_Y - BALL_R;
    } else if (status === 'running') {
      advance(dt);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // ---------- Input ----------
  function setPaddleFromClient(clientX) {
    const rect = el.canvas.getBoundingClientRect();
    paddle.x = clampPaddle(((clientX - rect.left) / rect.width) * W);
  }

  el.canvas.addEventListener('mousemove', e => setPaddleFromClient(e.clientX));
  el.canvas.addEventListener('click', e => {
    setPaddleFromClient(e.clientX);
    if (status === 'ready') launch();
  });

  let touch = null;
  el.canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY, moved: 0 };
    setPaddleFromClient(t.clientX);
  }, { passive: false });
  el.canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (touch) touch.moved = Math.max(touch.moved, Math.abs(t.clientX - touch.x) + Math.abs(t.clientY - touch.y));
    setPaddleFromClient(t.clientX);
  }, { passive: false });
  el.canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (touch && touch.moved < 12 && status === 'ready') launch(); // ketukan = luncurkan
    touch = null;
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();

    if (key === 'arrowleft' || key === 'a') { e.preventDefault(); keys.left = true; return; }
    if (key === 'arrowright' || key === 'd') { e.preventDefault(); keys.right = true; return; }

    if (key === ' ') {
      if (e.target && e.target.closest && e.target.closest('button')) return; // biarkan tombol bekerja sendiri
      e.preventDefault();
      action();
      return;
    }
    if (key === 'p') { if (status === 'running') pause(); else if (status === 'paused') resume(); return; }
    if (key === 'r') { newGame(); return; }
    if (key === 'm') toggleSound();
  });
  window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') keys.left = false;
    if (key === 'arrowright' || key === 'd') keys.right = false;
  });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });

  function toggleSound() {
    muted = !muted;
    el.sound.textContent = muted ? '🔇' : '🔊';
    el.sound.setAttribute('aria-pressed', String(!muted));
  }

  el.ovBtn.addEventListener('click', action);
  el.restart.addEventListener('click', () => { newGame(); el.restart.blur(); });
  el.sound.addEventListener('click', () => { toggleSound(); el.sound.blur(); });

  el.modes.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      el.modes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      newGame();
      btn.blur();
    });
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---------- Menggambar ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#111c3a');
    g.addColorStop(1, '#0a1020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(148, 163, 184, .06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }

  function drawBricks() {
    bricks.forEach(b => {
      const hue = ROW_HUES[b.r];
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + ROW_H);
      g.addColorStop(0, `hsl(${hue} 80% 62%)`);
      g.addColorStop(1, `hsl(${hue} 75% 44%)`);
      ctx.fillStyle = g;
      roundRect(b.x, b.y, BW, ROW_H, 5);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, .25)';
      roundRect(b.x + 3, b.y + 2, BW - 6, 4, 2);
      ctx.fill();

      if (b.maxHp > 1) {
        // balok kuat: garis tebal, memudar menjadi tipis setelah terkena pukulan
        ctx.lineWidth = b.hp > 1 ? 3 : 1.5;
        ctx.strokeStyle = b.hp >= 3 ? '#fde047' : 'rgba(255, 255, 255, .9)';
        roundRect(b.x + 1.5, b.y + 1.5, BW - 3, ROW_H - 3, 4);
        ctx.stroke();
      }
    });
  }

  function drawPaddle() {
    const x = paddle.x - paddle.w / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, .3)';
    roundRect(x + 2, PADDLE_Y + 5, paddle.w, PADDLE_H, 7);
    ctx.fill();
    const g = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
    g.addColorStop(0, '#f8fafc');
    g.addColorStop(1, '#94a3b8');
    ctx.fillStyle = g;
    roundRect(x, PADDLE_Y, paddle.w, PADDLE_H, 7);
    ctx.fill();
  }

  function drawBall(now) {
    ball.trail.forEach((p, i) => {
      const f = i / ball.trail.length;
      ctx.fillStyle = `rgba(253, 224, 71, ${f * 0.3})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, BALL_R * f, 0, Math.PI * 2);
      ctx.fill();
    });
    const glow = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, BALL_R * 2.6);
    glow.addColorStop(0, 'rgba(253, 224, 71, .5)');
    glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, .7)';
    ctx.beginPath();
    ctx.arc(ball.x - 2.5, ball.y - 2.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = `hsl(${p.hue} 80% 60%)`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
  }

  function drawHint(now) {
    if (status !== 'ready') return;
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 250);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Klik, ketuk, atau tekan Spasi untuk meluncurkan', W / 2, PADDLE_Y - 40);
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    drawBackground();
    drawBricks();
    drawParticles();
    drawPaddle();
    drawBall(now);
    drawHint(now);
  }

  // ---------- Loop ----------
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!frozen && status !== 'paused') update(dt * timescale);
    draw(now);
    requestAnimationFrame(frame);
  }

  // ---------- Hook tes (hanya aktif jika URL berisi ?debug) ----------
  if (location.search.indexOf('debug') !== -1) {
    window.__bo = {
      state: () => ({
        status, score, level, lives, mode,
        ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, speed: ball.speed },
        paddle: { x: paddle.x, w: paddle.w },
        bricks: bricks.map(b => ({ r: b.r, c: b.c, hp: b.hp, maxHp: b.maxHp })),
        particles: particles.length,
      }),
      consts: { W, H, BW, ROW_H, GAP, MX, TOP, BALL_R, PADDLE_Y, PADDLE_H },
      freeze: f => { frozen = !!f; },
      step: dt => { if (status === 'running') advance(dt); },
      setBall: (x, y, vx, vy) => { ball.x = x; ball.y = y; ball.vx = vx; ball.vy = vy; },
      setPaddle: x => { paddle.x = clampPaddle(x); },
      setLives: n => { lives = n; updateStats(); },
      keepOnly: (r, c) => { bricks = bricks.filter(b => b.r === r && b.c === c); },
      timescale: k => { timescale = k; },
      autoplay: f => { autoplay = !!f; },
    };
  }

  buildLevel(level);
  resetBall();
  updateStats();
  requestAnimationFrame(frame);
})();
