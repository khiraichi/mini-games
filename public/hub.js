// ============================================================
// DAFTAR GAME
// Cara menambah game baru:
//   1. Buat folder baru di public/games/<nama-game>/ (isi: index.html dkk)
//   2. Tambahkan satu objek ke array GAMES di bawah ini
//   3. Selesai, kartunya otomatis muncul di halaman depan
//
// status: 'ready' = bisa dimainkan, 'soon' = tampil abu-abu "Segera hadir"
// color : [warna awal, warna akhir] untuk latar gambar kartu
// ============================================================
const GAMES = [
  {
    title: 'Mini Tennis',
    desc: 'Tenis tampak atas lawan komputer. Menangkan 3 game untuk memenangkan match.',
    url: 'games/tennis/',
    emoji: '🎾',
    tags: ['Mouse', 'Keyboard', 'Sentuh'],
    color: ['#2563eb', '#1d4ed8'],
    status: 'ready',
  },
  {
    title: 'Memory Match',
    desc: 'Cocokkan pasangan kartu dengan langkah sesedikit mungkin.',
    url: 'games/memory/',
    emoji: '🃏',
    tags: ['Mouse', 'Keyboard', 'Sentuh'],
    color: ['#9333ea', '#7e22ce'],
    status: 'ready',
  },
  {
    title: 'Puzzle Geser',
    desc: 'Geser ubin angka sampai berurutan. Pilih papan 3×3, 4×4, atau 5×5.',
    url: 'games/puzzle/',
    emoji: '🧩',
    tags: ['Mouse', 'Keyboard', 'Sentuh'],
    color: ['#f59e0b', '#d97706'],
    status: 'ready',
  },
  {
    title: 'Snake',
    desc: 'Makan sebanyak mungkin tanpa menabrak dinding atau ekormu sendiri.',
    url: 'games/snake/',
    emoji: '🐍',
    tags: ['Keyboard'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
  {
    title: 'Tetris',
    desc: 'Susun balok jatuh, buat garis penuh, dan raih skor tertinggi.',
    url: 'games/tetris/',
    emoji: '🧱',
    tags: ['Keyboard'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
  {
    title: 'Tic Tac Toe',
    desc: 'Adu strategi 3x3 klasik, mainkan bersama teman atau lawan bot!',
    url: 'games/tictactoe/',
    emoji: '❌',
    tags: ['Sentuh'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
  {
    title: 'Flappy Bird',
    desc: 'Terbangkan burung melewati rintangan pipa tanpa jatuh dan raih rekor tertinggi!',
    url: 'games/flappy/',
    emoji: '🐦',
    tags: ['Keyboard', 'Sentuh'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
  {
    title: '2048',
    desc: 'Geser dan gabungkan ubin angka yang sama untuk mencapai angka 2048!',
    url: 'games/2048/',
    emoji: '🔢',
    tags: ['Keyboard'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
  {
    title: 'Dino Chrome',
    desc: 'Lari dan lompat menghindari kaktus serta burung ala T-Rex offline Google!',
    url: 'games/dino/',
    emoji: '🦖',
    tags: ['Sentuh'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
  {
    title: 'Whack-a-Mole',
    desc: 'Pukul tikus tanah yang muncul dari lubang secepat mungkin dalam 30 detik!',
    url: 'games/whack/',
    emoji: '🔨',
    tags: ['Sentuh'],
    color: ['#16a34a', '#15803d'],
    status: 'ready',
  },
];

(function renderGames() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  GAMES.forEach(game => {
    const ready = game.status === 'ready';
    const card = el(ready ? 'a' : 'div', 'card' + (ready ? '' : ' soon'));
    if (ready) card.setAttribute('href', game.url);

    const thumb = el('div', 'thumb', game.emoji);
    thumb.style.setProperty('--c1', game.color[0]);
    thumb.style.setProperty('--c2', game.color[1]);
    thumb.setAttribute('aria-hidden', 'true');
    card.appendChild(thumb);

    if (!ready) card.appendChild(el('span', 'badge', 'Segera hadir'));

    const body = el('div', 'card-body');
    body.appendChild(el('h3', '', game.title));
    body.appendChild(el('p', 'desc', game.desc));

    const tags = el('div', 'tags');
    game.tags.forEach(t => tags.appendChild(el('span', 'tag', t)));
    body.appendChild(tags);

    body.appendChild(el('span', 'cta', ready ? 'Main sekarang →' : 'Segera hadir'));
    card.appendChild(body);

    grid.appendChild(card);
  });
})();
