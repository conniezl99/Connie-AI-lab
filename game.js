const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const pelletsEl = document.getElementById('pellets');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');

const CELL = 28;
const SPEED = 2;
const GHOST_SPEED = 1.5;

const MAZE = [
  '####################',
  '#........##........#',
  '#.####.#.##.#.####.#',
  '#o####.#.##.#.####o#',
  '#..................#',
  '#.####.######.####.#',
  '#......#....#......#',
  '######.#.##.#.######',
  '#......#.GG.#......#',
  '#.####.######.####.#',
  '#........P.........#',
  '#o####.#.##.#.####o#',
  '#...##.#.##.#.##...#',
  '#..................#',
  '####################',
];

const walls = [];
const pellets = new Set();
let powerPellets = new Set();
let player;
let ghosts;
let score;
let lives;
let frightenedUntil;
let animationId;
let gameOver;

function keyFromGrid(x, y) {
  return `${x},${y}`;
}

function toGrid(pos) {
  return Math.floor((pos + CELL / 2) / CELL);
}

function parseMaze() {
  walls.length = 0;
  pellets.clear();
  powerPellets = new Set();

  for (let y = 0; y < MAZE.length; y += 1) {
    for (let x = 0; x < MAZE[y].length; x += 1) {
      const char = MAZE[y][x];
      if (char === '#') walls.push({ x, y });
      if (char === '.') pellets.add(keyFromGrid(x, y));
      if (char === 'o') powerPellets.add(keyFromGrid(x, y));
      if (char === 'P') {
        player = {
          x: x * CELL + CELL / 2,
          y: y * CELL + CELL / 2,
          dirX: 0,
          dirY: 0,
          nextX: 0,
          nextY: 0,
          radius: CELL * 0.38,
          mouth: 0,
        };
      }
      if (char === 'G') {
        ghosts.push({
          x: x * CELL + CELL / 2,
          y: y * CELL + CELL / 2,
          dirX: Math.random() > 0.5 ? 1 : -1,
          dirY: 0,
          radius: CELL * 0.36,
          color: ['#ff4b64', '#44d9ff', '#ff9f43', '#db6bff'][ghosts.length % 4],
          homeX: x,
          homeY: y,
        });
      }
    }
  }
}

function collidesWithWall(x, y, radius) {
  const left = Math.floor((x - radius) / CELL);
  const right = Math.floor((x + radius) / CELL);
  const top = Math.floor((y - radius) / CELL);
  const bottom = Math.floor((y + radius) / CELL);

  for (let gy = top; gy <= bottom; gy += 1) {
    for (let gx = left; gx <= right; gx += 1) {
      if (MAZE[gy]?.[gx] === '#') return true;
    }
  }
  return false;
}

function updatePlayer() {
  const canTurn = !collidesWithWall(
    player.x + player.nextX * SPEED,
    player.y + player.nextY * SPEED,
    player.radius,
  );
  if (canTurn) {
    player.dirX = player.nextX;
    player.dirY = player.nextY;
  }

  const nx = player.x + player.dirX * SPEED;
  const ny = player.y + player.dirY * SPEED;
  if (!collidesWithWall(nx, ny, player.radius)) {
    player.x = nx;
    player.y = ny;
  }

  player.mouth += 0.15;

  const gx = toGrid(player.x);
  const gy = toGrid(player.y);
  const key = keyFromGrid(gx, gy);

  if (pellets.delete(key)) score += 10;
  if (powerPellets.delete(key)) {
    score += 50;
    frightenedUntil = performance.now() + 6500;
  }

  pelletsEl.textContent = String(pellets.size + powerPellets.size);
  scoreEl.textContent = String(score);
}

function moveGhost(ghost) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const canContinue = !collidesWithWall(
    ghost.x + ghost.dirX * GHOST_SPEED,
    ghost.y + ghost.dirY * GHOST_SPEED,
    ghost.radius,
  );

  if (!canContinue || Math.random() < 0.04) {
    const valid = dirs.filter(([dx, dy]) => !collidesWithWall(ghost.x + dx * GHOST_SPEED, ghost.y + dy * GHOST_SPEED, ghost.radius));
    if (valid.length) {
      const [dx, dy] = valid[Math.floor(Math.random() * valid.length)];
      ghost.dirX = dx;
      ghost.dirY = dy;
    }
  }

  ghost.x += ghost.dirX * GHOST_SPEED;
  ghost.y += ghost.dirY * GHOST_SPEED;
}

function updateGhosts(now) {
  const frightened = now < frightenedUntil;

  ghosts.forEach((ghost) => {
    moveGhost(ghost);
    const dist = Math.hypot(ghost.x - player.x, ghost.y - player.y);

    if (dist < ghost.radius + player.radius - 3) {
      if (frightened) {
        score += 200;
        ghost.x = ghost.homeX * CELL + CELL / 2;
        ghost.y = ghost.homeY * CELL + CELL / 2;
      } else {
        lives -= 1;
        livesEl.textContent = String(lives);
        player.x = 10 * CELL + CELL / 2;
        player.y = 10 * CELL + CELL / 2;
        player.dirX = 0;
        player.dirY = 0;
        messageEl.textContent = lives > 0 ? 'Ouch! Keep going.' : 'Game over! Press restart.';
        if (lives <= 0) gameOver = true;
      }
    }
  });
}

function drawMaze() {
  ctx.fillStyle = '#10184a';
  walls.forEach(({ x, y }) => {
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  });

  ctx.fillStyle = '#ffdf7a';
  pellets.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.beginPath();
    ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#fff';
  powerPellets.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.beginPath();
    ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  const angle = Math.abs(Math.sin(player.mouth)) * 0.35;
  const facing = Math.atan2(player.dirY || 0, player.dirX || 1);
  ctx.fillStyle = '#ffd447';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, player.radius, facing + angle, facing - angle + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

function drawGhosts(now) {
  const frightened = now < frightenedUntil;
  ghosts.forEach((ghost) => {
    ctx.fillStyle = frightened ? '#2d6cff' : ghost.color;
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, ghost.radius, Math.PI, 0);
    ctx.lineTo(ghost.x + ghost.radius, ghost.y + ghost.radius);
    ctx.lineTo(ghost.x - ghost.radius, ghost.y + ghost.radius);
    ctx.closePath();
    ctx.fill();
  });
}

function loop(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMaze();

  if (!gameOver) {
    updatePlayer();
    updateGhosts(now);
  }

  drawPlayer();
  drawGhosts(now);

  if (!gameOver && pellets.size + powerPellets.size === 0) {
    gameOver = true;
    messageEl.textContent = 'You win! Press restart to play again.';
  }

  animationId = requestAnimationFrame(loop);
}

function startGame() {
  ghosts = [];
  score = 0;
  lives = 3;
  frightenedUntil = 0;
  gameOver = false;
  parseMaze();
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  pelletsEl.textContent = String(pellets.size + powerPellets.size);
  messageEl.textContent = 'Collect all pellets and avoid ghosts.';

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const keyMap = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
  };
  const next = keyMap[event.key];
  if (!next) return;
  [player.nextX, player.nextY] = next;
});

restartBtn.addEventListener('click', startGame);
startGame();
