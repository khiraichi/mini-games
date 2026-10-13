(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;   // 480
  const H = canvas.height;  // 720

  const el = {
    gYou: document.getElementById('gYou'),
    gCpu: document.getElementById('gCpu'),
    pYou: document.getElementById('pYou'),
    pCpu: document.getElementById('pCpu'),
  };

  // ---------- Pengaturan ----------
  const GAMES_TO_WIN = 3;          // pertama menang 3 game = menang match
  const BASE_SPEED = 380;          // kecepatan awal bola (px/detik)
  const MAX_SPEED = 850;
  const SPEEDUP = 1.06;            // bola makin cepat tiap pukulan
  const BALL_R = 9;
  const RACKET_W = 96;
  const RACKET_H = 12;

  // ---------- State ----------
  const you = { x: W / 2, y: H - 70, w: RACKET_W };
  const cpu = { x: W / 2, y: 70, w: RACKET_W, targetX: W / 2, error: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BASE_SPEED, trail: [] };

  const score = { pts: [0, 0], games: [0, 0] };
  let mode = 'menu';       // menu | serve | play | over
  let serveTimer = 0;
  let serveDir = 1;        // 1 = bola ke arah pemain, -1 = ke arah komputer
  let message = '';
  let subMessage = '';
  let keys = { left: false, right: false };
  let muted = false;
  let flash = 0;

  // ---------- Suara (WebAudio, tanpa file) ----------
  let audio;
  function beep(freq, dur = 0.08, type = 'square', vol = 0.06) {
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

  // ---------- Skor ala tenis ----------
  const LABEL = ['0', '15', '30', '40'];
  function pointText(me, other) {
    const a = score.pts[me], b = score.pts[other];
    if (a >= 3 && b >= 3) {
      if (a === b) return 'Deuce';
      return a > b ? 'Adv' : '-';
    }
    return LABEL[Math.min(a, 3)];
  }
  function updateScoreboard() {
    el.pYou.textContent = pointText(0, 1);
    el.pCpu.textContent = pointText(1, 0);
    el.gYou.textContent = score.games[0];
    el.gCpu.textContent = score.games[1];
  }

  function awardPoint(who) { // 0 = kamu, 1 = komputer
    score.pts[who]++;
    const a = score.pts[who], b = score.pts[1 - who];
    let gameWon = false;
    if (a >= 4 && a - b >= 2) {
      score.games[who]++;
      score.pts = [0, 0];
      gameWon = true;
    }
    updateScoreboard();
    beep(who === 0 ? 880 : 220, 0.25, 'triangle', 0.08);
    flash = 1;

    if (score.games[who] >= GAMES_TO_WIN) {
      mode = 'over';
      message = who === 0 ? '🏆 Kamu Menang!' : 'Komputer Menang';
      subMessage = 'Klik / Spasi untuk main lagi';
      return;
    }

    message = gameWon
      ? (who === 0 ? 'Game untukmu!' : 'Game untuk komputer')
      : (who === 0 ? 'Poin!' : 'Poin lawan');
    subMessage = '';
    serveDir = who === 0 ? -1 : 1; // pemenang poin servis ke... lawan yang menerima
    resetBall();
  }

  // ---------- Bola ----------
  function resetBall() {
    mode = 'serve';
    serveTimer = 1.1;
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = ball.vy = 0;
    ball.speed = BASE_SPEED;
    ball.trail.length = 0;
    cpu.error = (Math.random() - 0.5) * 80;
  }

  function launch() {
    const angle = (Math.random() - 0.5) * 0.9; // sudut acak
    ball.vx = Math.sin(angle) * ball.speed;
    ball.vy = Math.cos(angle) * ball.speed * serveDir;
    mode = 'play';
    message = '';
  }

  function newMatch() {
    score.pts = [0, 0];
    score.games = [0, 0];
    updateScoreboard();
    serveDir = Math.random() < 0.5 ? 1 : -1;
    message = 'Siap?';
    subMessage = '';
    resetBall();
  }

  function hitRacket(r, dirY) {
    // offset -1..1 dari pusat raket menentukan sudut pantulan
    const off = Math.max(-1, Math.min(1, (ball.x - r.x) / (r.w / 2)));
    ball.speed = Math.min(MAX_SPEED, ball.speed * SPEEDUP);
    const vx = off * ball.speed * 0.85;
    const vy = Math.sqrt(Math.max(ball.speed * ball.speed - vx * vx, 1));
    ball.vx = vx;
    ball.vy = vy * dirY;
    beep(dirY < 0 ? 520 : 400, 0.07, 'square', 0.07);
  }

  // ---------- Update ----------
  function update(dt) {
    // Gerak pemain via keyboard
    const kbSpeed = 520;
    if (keys.left) you.x -= kbSpeed * dt;
    if (keys.right) you.x += kbSpeed * dt;
    you.x = Math.max(you.w / 2, Math.min(W - you.w / 2, you.x));

    // AI selalu bergerak (juga saat serve) supaya terlihat hidup
    updateAI(dt);

    if (flash > 0) flash = Math.max(0, flash - dt * 2.5);

    if (mode === 'serve') {
      serveTimer -= dt;
      if (serveTimer <= 0) launch();
      return;
    }
    if (mode !== 'play') return;

    // Jejak bola
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Pantul dinding samping
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); beep(300, 0.04, 'sine', 0.04); }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); beep(300, 0.04, 'sine', 0.04); }

    // Tabrakan raket pemain (bawah)
    if (ball.vy > 0 &&
        ball.y + BALL_R >= you.y && ball.y - BALL_R <= you.y + RACKET_H &&
        Math.abs(ball.x - you.x) <= you.w / 2 + BALL_R) {
      ball.y = you.y - BALL_R;
      hitRacket(you, -1);
    }
    // Tabrakan raket komputer (atas)
    if (ball.vy < 0 &&
        ball.y - BALL_R <= cpu.y + RACKET_H && ball.y + BALL_R >= cpu.y &&
        Math.abs(ball.x - cpu.x) <= cpu.w / 2 + BALL_R) {
      ball.y = cpu.y + RACKET_H + BALL_R;
      hitRacket(cpu, 1);
      cpu.error = (Math.random() - 0.5) * 90; // meleset sedikit di pukulan berikutnya
    }

    // Bola keluar lapangan = poin
    if (ball.y < -BALL_R * 2) awardPoint(0);
    else if (ball.y > H + BALL_R * 2) awardPoint(1);
  }

  function updateAI(dt) {
    // Makin tinggi skor pemain, komputer sedikit lebih cepat
    const level = 250 + (score.games[0] + score.games[1]) * 25;
    const comingToCpu = mode === 'play' && ball.vy < 0;
    cpu.targetX = comingToCpu ? ball.x + cpu.error : W / 2;
    const diff = cpu.targetX - cpu.x;
    const step = level * dt;
    cpu.x += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
    cpu.x = Math.max(cpu.w / 2, Math.min(W - cpu.w / 2, cpu.x));
  }

  // ---------- Gambar ----------
  function drawCourt() {
    // Latar luar
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, W, H);
    // Lapangan
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(20, 20, W - 40, H - 40);

    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, W - 40, H - 40);          // garis luar
    ctx.beginPath();
    ctx.moveTo(60, 20); ctx.lineTo(60, H - 20);       // alley kiri
    ctx.moveTo(W - 60, 20); ctx.lineTo(W - 60, H - 20); // alley kanan
    ctx.moveTo(60, H / 2 - 170); ctx.lineTo(W - 60, H / 2 - 170); // garis servis atas
    ctx.moveTo(60, H / 2 + 170); ctx.lineTo(W - 60, H / 2 + 170); // garis servis bawah
    ctx.moveTo(W / 2, H / 2 - 170); ctx.lineTo(W / 2, H / 2 + 170); // garis tengah
    ctx.stroke();

    // Net
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(10, H / 2 - 3, W - 20, 6);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (let x = 14; x < W - 10; x += 8) ctx.fillRect(x, H / 2 - 3, 4, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6, H / 2 - 7, 6, 14);
    ctx.fillRect(W - 12, H / 2 - 7, 6, 14);

    // Efek kilat saat poin
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.25})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawRacket(r, color) {
    const x = r.x - r.w / 2;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x + 3, r.y + 6, r.w, RACKET_H);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, r.y, r.w, RACKET_H, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x + 8, r.y + 2, r.w - 16, 2);
  }

  function drawBall() {
    // Jejak
    ball.trail.forEach((p, i) => {
      ctx.fillStyle = `rgba(253,224,71,${(i / ball.trail.length) * 0.35})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, BALL_R * (i / ball.trail.length), 0, Math.PI * 2);
      ctx.fill();
    });
    // Bayangan
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(ball.x + 4, ball.y + 7, BALL_R, BALL_R * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bola
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R - 2, -0.9, 0.9);
    ctx.stroke();
  }

  function drawOverlay() {
    if (mode === 'menu') {
      panel('🎾 Mini Tennis', `Menang ${GAMES_TO_WIN} game untuk menang`, 'Klik / Spasi untuk mulai');
    } else if (mode === 'over') {
      panel(message, '', subMessage);
    } else if (mode === 'serve' && message) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(message, W / 2, H / 2 - 40);
      ctx.shadowBlur = 0;
    }
  }

  function panel(title, line1, line2) {
    ctx.fillStyle = 'rgba(15,23,42,.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText(title, W / 2, H / 2 - 30);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px system-ui, sans-serif';
    if (line1) ctx.fillText(line1, W / 2, H / 2 + 12);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 20px system-ui, sans-serif';
    if (line2) ctx.fillText(line2, W / 2, H / 2 + 56);
  }

  function draw() {
    drawCourt();
    drawRacket(cpu, '#f87171');
    drawRacket(you, '#f8fafc');
    if (mode !== 'menu') drawBall();
    drawOverlay();
  }

  // ---------- Input ----------
  function setXFromEvent(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    you.x = Math.max(you.w / 2, Math.min(W - you.w / 2, x));
  }

  function startIfNeeded() {
    if (mode === 'menu' || mode === 'over') newMatch();
  }

  canvas.addEventListener('mousemove', e => setXFromEvent(e.clientX));
  canvas.addEventListener('mousedown', e => { setXFromEvent(e.clientX); startIfNeeded(); });
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    setXFromEvent(e.touches[0].clientX);
    startIfNeeded();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    setXFromEvent(e.touches[0].clientX);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === ' ') { e.preventDefault(); startIfNeeded(); }
    if (e.key === 'm' || e.key === 'M') muted = !muted;
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.033); // batasi supaya stabil saat tab lag
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  updateScoreboard();
  requestAnimationFrame(frame);
})();
