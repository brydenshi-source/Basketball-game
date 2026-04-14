const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreboardEl = document.getElementById('scoreboard');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  island: { x: canvas.width / 2, y: canvas.height / 2, r: 150, zoneR: 210 }
};

const TEAM_DATA = {
  crimson: {
    name: 'Crimson Corsairs',
    color: '#ff6767',
    shipColor: '#8c2222',
    spawn: { x: 160, y: 120, heading: 0.15 },
    controls: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'KeyF', deploy: 'KeyQ' },
    roster: ['LeBron James', 'Stephen Curry', 'Kevin Durant', 'Jayson Tatum', 'Jimmy Butler']
  },
  cobalt: {
    name: 'Cobalt Cutlasses',
    color: '#5fb9ff',
    shipColor: '#1e4f8c',
    spawn: { x: WORLD.width - 160, y: WORLD.height - 120, heading: Math.PI + 0.15 },
    controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'KeyL', deploy: 'Slash' },
    roster: ['Giannis Antetokounmpo', 'Luka Doncic', 'Nikola Jokic', 'Anthony Edwards', 'Devin Booker']
  }
};

const state = {
  running: false,
  gameOver: false,
  winner: null,
  time: 0,
  control: { crimson: 0, cobalt: 0 },
  ships: {},
  players: [],
  cannonballs: [],
  keys: new Set(),
  lastFire: { crimson: 0, cobalt: 0 },
  lastDeploy: { crimson: 0, cobalt: 0 }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createShip(teamId) {
  const t = TEAM_DATA[teamId];
  return {
    teamId,
    x: t.spawn.x,
    y: t.spawn.y,
    heading: t.spawn.heading,
    speed: 0,
    hp: 320,
    maxHp: 320,
    radius: 42
  };
}

function createPlayers(teamId) {
  const ship = state.ships[teamId];
  return TEAM_DATA[teamId].roster.map((name, i) => ({
    id: `${teamId}-${i}`,
    name,
    teamId,
    alive: true,
    onShip: true,
    x: ship.x,
    y: ship.y,
    hp: 100,
    maxHp: 100,
    speed: 68 + Math.random() * 18,
    damage: 12 + Math.random() * 6,
    range: 29,
    cooldown: 0
  }));
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.winner = null;
  state.time = 0;
  state.control = { crimson: 0, cobalt: 0 };
  state.cannonballs = [];
  state.keys.clear();
  state.lastFire = { crimson: 0, cobalt: 0 };
  state.lastDeploy = { crimson: 0, cobalt: 0 };

  state.ships = {
    crimson: createShip('crimson'),
    cobalt: createShip('cobalt')
  };

  state.players = [...createPlayers('crimson'), ...createPlayers('cobalt')];
  statusEl.innerHTML = 'Press <strong>Start Battle</strong>, then steer ships and deploy players to attack the island.';
  updateScoreboard();
}

function startGame() {
  if (state.gameOver) {
    resetGame();
  }
  state.running = true;
  statusEl.textContent = 'Battle started. Board the island and fight!';
}

function spawnCannonball(teamId) {
  const ship = state.ships[teamId];
  if (!ship || ship.hp <= 0) return;

  state.cannonballs.push({
    teamId,
    x: ship.x + Math.cos(ship.heading) * (ship.radius + 18),
    y: ship.y + Math.sin(ship.heading) * (ship.radius + 18),
    vx: Math.cos(ship.heading) * 350,
    vy: Math.sin(ship.heading) * 350,
    ttl: 2.2,
    damage: 34
  });
}

function deployPlayer(teamId) {
  const ship = state.ships[teamId];
  const candidates = state.players.filter((p) => p.teamId === teamId && p.alive && p.onShip);
  if (!ship || candidates.length === 0) return;

  const p = candidates[0];
  const offset = ship.radius + 24;
  p.onShip = false;
  p.x = ship.x + Math.cos(ship.heading) * offset;
  p.y = ship.y + Math.sin(ship.heading) * offset;
}

function handleShipInput(teamId, dt) {
  const ship = state.ships[teamId];
  if (!ship || ship.hp <= 0) return;

  const c = TEAM_DATA[teamId].controls;
  const turnSpeed = 1.8;
  const accel = 110;
  const drag = 0.93;
  const maxSpeed = 170;

  if (state.keys.has(c.left)) ship.heading -= turnSpeed * dt;
  if (state.keys.has(c.right)) ship.heading += turnSpeed * dt;
  if (state.keys.has(c.up)) ship.speed = clamp(ship.speed + accel * dt, -65, maxSpeed);
  if (state.keys.has(c.down)) ship.speed = clamp(ship.speed - accel * dt, -65, maxSpeed);

  ship.speed *= drag;
  ship.x += Math.cos(ship.heading) * ship.speed * dt;
  ship.y += Math.sin(ship.heading) * ship.speed * dt;

  ship.x = clamp(ship.x, ship.radius, WORLD.width - ship.radius);
  ship.y = clamp(ship.y, ship.radius, WORLD.height - ship.radius);

  const now = state.time;
  if (state.keys.has(c.fire) && now - state.lastFire[teamId] > 0.9) {
    spawnCannonball(teamId);
    state.lastFire[teamId] = now;
  }
  if (state.keys.has(c.deploy) && now - state.lastDeploy[teamId] > 0.35) {
    deployPlayer(teamId);
    state.lastDeploy[teamId] = now;
  }
}

function updateCannonballs(dt) {
  for (const ball of state.cannonballs) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.ttl -= dt;

    if (distance(ball, WORLD.island) < WORLD.island.r) {
      ball.ttl = -1;
      continue;
    }

    const enemyShip = state.ships[ball.teamId === 'crimson' ? 'cobalt' : 'crimson'];
    if (enemyShip && enemyShip.hp > 0 && distance(ball, enemyShip) < enemyShip.radius) {
      enemyShip.hp = Math.max(0, enemyShip.hp - ball.damage);
      ball.ttl = -1;
    }

    for (const p of state.players) {
      if (!p.alive || p.teamId === ball.teamId || p.onShip) continue;
      if (distance(ball, p) < 11) {
        p.hp -= 42;
        if (p.hp <= 0) {
          p.alive = false;
          p.hp = 0;
        }
        ball.ttl = -1;
        break;
      }
    }
  }

  state.cannonballs = state.cannonballs.filter((b) => b.ttl > 0 && b.x >= 0 && b.x <= WORLD.width && b.y >= 0 && b.y <= WORLD.height);
}

function updatePlayers(dt) {
  for (const p of state.players) {
    if (!p.alive) continue;

    p.cooldown = Math.max(0, p.cooldown - dt);

    if (p.onShip) {
      const ship = state.ships[p.teamId];
      p.x = ship.x + (Math.random() - 0.5) * 16;
      p.y = ship.y + (Math.random() - 0.5) * 16;
      continue;
    }

    const enemies = state.players.filter((e) => e.alive && !e.onShip && e.teamId !== p.teamId);
    if (enemies.length === 0) {
      const fallback = WORLD.island;
      const dx = fallback.x - p.x;
      const dy = fallback.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d) * p.speed * dt;
      p.y += (dy / d) * p.speed * dt;
      continue;
    }

    enemies.sort((a, b) => distance(p, a) - distance(p, b));
    const target = enemies[0];
    const d = distance(p, target);

    if (d > p.range) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const mag = Math.hypot(dx, dy) || 1;
      p.x += (dx / mag) * p.speed * dt;
      p.y += (dy / mag) * p.speed * dt;
    } else if (p.cooldown <= 0) {
      target.hp -= p.damage;
      p.cooldown = 0.62 + Math.random() * 0.45;
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
      }
    }

    p.x = clamp(p.x, 0, WORLD.width);
    p.y = clamp(p.y, 0, WORLD.height);
  }
}

function updateIslandControl(dt) {
  const inZone = (p) => p.alive && !p.onShip && distance(p, WORLD.island) <= WORLD.island.zoneR;
  const crimson = state.players.filter((p) => p.teamId === 'crimson' && inZone(p)).length;
  const cobalt = state.players.filter((p) => p.teamId === 'cobalt' && inZone(p)).length;

  if (crimson > cobalt) state.control.crimson += dt;
  else if (cobalt > crimson) state.control.cobalt += dt;
}

function evaluateVictory() {
  const alive = {
    crimson: state.players.filter((p) => p.teamId === 'crimson' && p.alive).length,
    cobalt: state.players.filter((p) => p.teamId === 'cobalt' && p.alive).length
  };

  if (alive.crimson === 0 || alive.cobalt === 0) {
    state.gameOver = true;
    state.running = false;
    state.winner = alive.crimson > 0 ? 'crimson' : 'cobalt';
    return;
  }

  if (state.control.crimson >= 25 || state.control.cobalt >= 25) {
    state.gameOver = true;
    state.running = false;
    state.winner = state.control.crimson > state.control.cobalt ? 'crimson' : 'cobalt';
    return;
  }

  if (state.ships.crimson.hp <= 0 && state.ships.cobalt.hp <= 0) {
    state.gameOver = true;
    state.running = false;
    state.winner = state.control.crimson >= state.control.cobalt ? 'crimson' : 'cobalt';
  }
}

function update(dt) {
  if (!state.running || state.gameOver) return;

  state.time += dt;
  handleShipInput('crimson', dt);
  handleShipInput('cobalt', dt);
  updateCannonballs(dt);
  updatePlayers(dt);
  updateIslandControl(dt);
  evaluateVictory();
  updateScoreboard();

  if (state.gameOver) {
    statusEl.textContent = `${TEAM_DATA[state.winner].name} win the island war! Press Reset to play again.`;
  }
}

function drawWater() {
  ctx.fillStyle = '#0c4f76';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < WORLD.height; i += 36) {
    ctx.beginPath();
    ctx.moveTo(0, i + Math.sin((state.time * 1.5) + i * 0.04) * 4);
    ctx.lineTo(WORLD.width, i + Math.cos((state.time * 1.2) + i * 0.04) * 4);
    ctx.stroke();
  }
}

function drawIsland() {
  ctx.fillStyle = '#b18442';
  ctx.beginPath();
  ctx.arc(WORLD.island.x, WORLD.island.y, WORLD.island.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3d8a43';
  ctx.beginPath();
  ctx.arc(WORLD.island.x, WORLD.island.y, WORLD.island.r * 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.setLineDash([11, 7]);
  ctx.beginPath();
  ctx.arc(WORLD.island.x, WORLD.island.y, WORLD.island.zoneR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawShip(ship) {
  if (ship.hp <= 0) return;
  const team = TEAM_DATA[ship.teamId];

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.heading);

  ctx.fillStyle = team.shipColor;
  ctx.beginPath();
  ctx.moveTo(48, 0);
  ctx.lineTo(12, 28);
  ctx.lineTo(-42, 22);
  ctx.lineTo(-42, -22);
  ctx.lineTo(12, -28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f3f3f3';
  ctx.fillRect(-6, -34, 5, 34);
  ctx.beginPath();
  ctx.moveTo(-1, -34);
  ctx.lineTo(26, -16);
  ctx.lineTo(-1, -4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  const hpW = 86;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(ship.x - hpW / 2, ship.y - 56, hpW, 6);
  ctx.fillStyle = '#7cff7c';
  ctx.fillRect(ship.x - hpW / 2, ship.y - 56, (ship.hp / ship.maxHp) * hpW, 6);
}

function drawPlayer(p) {
  if (!p.alive) return;
  const team = TEAM_DATA[p.teamId];

  ctx.fillStyle = team.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '12px sans-serif';
  ctx.fillText(p.name.split(' ')[0], p.x, p.y - 15);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(p.x - 14, p.y + 12, 28, 4);
  ctx.fillStyle = '#80ff80';
  ctx.fillRect(p.x - 14, p.y + 12, (p.hp / p.maxHp) * 28, 4);
}

function drawCannonball(b) {
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  drawWater();
  drawIsland();
  Object.values(state.ships).forEach(drawShip);
  state.players.forEach(drawPlayer);
  state.cannonballs.forEach(drawCannonball);
}

function updateScoreboard() {
  const aliveCrimson = state.players.filter((p) => p.teamId === 'crimson' && p.alive).length;
  const aliveCobalt = state.players.filter((p) => p.teamId === 'cobalt' && p.alive).length;
  const onShipCrimson = state.players.filter((p) => p.teamId === 'crimson' && p.alive && p.onShip).length;
  const onShipCobalt = state.players.filter((p) => p.teamId === 'cobalt' && p.alive && p.onShip).length;

  scoreboardEl.innerHTML = [
    `<strong>Time:</strong> ${state.time.toFixed(1)}s`,
    `<span style="color:${TEAM_DATA.crimson.color}">${TEAM_DATA.crimson.name}</span> players: ${aliveCrimson} (${onShipCrimson} on ship)`,
    `<span style="color:${TEAM_DATA.cobalt.color}">${TEAM_DATA.cobalt.name}</span> players: ${aliveCobalt} (${onShipCobalt} on ship)`,
    `${TEAM_DATA.crimson.name} ship HP: ${Math.round(state.ships.crimson.hp)}`,
    `${TEAM_DATA.cobalt.name} ship HP: ${Math.round(state.ships.cobalt.hp)}`,
    `Island control: ${TEAM_DATA.crimson.name} ${state.control.crimson.toFixed(1)}s / ${TEAM_DATA.cobalt.name} ${state.control.cobalt.toFixed(1)}s`
  ].join(' · ');
}

document.addEventListener('keydown', (e) => {
  state.keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'].includes(e.code)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  state.keys.delete(e.code);
});

let previous = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(gameLoop);
