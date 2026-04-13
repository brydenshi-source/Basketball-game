const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreboardEl = document.getElementById('scoreboard');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const W = canvas.width;
const H = canvas.height;
const ISLAND = { x: W / 2, y: H / 2, r: 130, controlRadius: 170 };

const TEAM_DATA = {
  crimson: {
    label: 'Crimson Corsairs',
    color: '#ff5d5d',
    shipColor: '#902222',
    roster: ['LeBron James', 'Stephen Curry', 'Kevin Durant', 'Jayson Tatum'],
    shipStart: { x: 120, y: H / 2 - 120 },
    disembarkSpot: { x: ISLAND.x - 170, y: ISLAND.y - 30 }
  },
  cobalt: {
    label: 'Cobalt Cutlasses',
    color: '#5db6ff',
    shipColor: '#1a4e8a',
    roster: ['Giannis Antetokounmpo', 'Luka Doncic', 'Nikola Jokic', 'Anthony Edwards'],
    shipStart: { x: W - 120, y: H / 2 + 120 },
    disembarkSpot: { x: ISLAND.x + 170, y: ISLAND.y + 30 }
  }
};

const state = {
  running: false,
  gameOver: false,
  winner: null,
  timeMs: 0,
  controlSeconds: { crimson: 0, cobalt: 0 },
  ships: {},
  players: []
};

function createShip(teamId) {
  const team = TEAM_DATA[teamId];
  return {
    teamId,
    x: team.shipStart.x,
    y: team.shipStart.y,
    hp: 250,
    speed: 38,
    arrived: false,
    width: 110,
    height: 50
  };
}

function createPlayer(name, teamId, index) {
  const ship = state.ships[teamId];
  return {
    name,
    teamId,
    x: ship.x + (index % 2 ? 10 : -10),
    y: ship.y + index * 12 - 18,
    hp: 100,
    alive: true,
    onShip: true,
    speed: 46 + Math.random() * 16,
    range: 28,
    damage: 13 + Math.random() * 5,
    cooldown: 0
  };
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.winner = null;
  state.timeMs = 0;
  state.controlSeconds = { crimson: 0, cobalt: 0 };
  state.ships = {
    crimson: createShip('crimson'),
    cobalt: createShip('cobalt')
  };
  state.players = Object.entries(TEAM_DATA).flatMap(([teamId, team]) =>
    team.roster.map((name, i) => createPlayer(name, teamId, i))
  );
  statusEl.innerHTML = 'Press <strong>Start Battle</strong> to launch the ships.';
  updateScoreboard();
}

function startGame() {
  if (state.gameOver) {
    resetGame();
  }
  state.running = true;
  statusEl.textContent = 'Ships are moving to the island. Prepare to board and battle!';
}

function moveToward(obj, targetX, targetY, dt, speedOverride) {
  const dx = targetX - obj.x;
  const dy = targetY - obj.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = speedOverride ?? obj.speed;
  const step = Math.min(dist, speed * dt);
  obj.x += (dx / dist) * step;
  obj.y += (dy / dist) * step;
}

function updateShips(dt) {
  for (const [teamId, ship] of Object.entries(state.ships)) {
    if (ship.arrived || ship.hp <= 0) continue;
    const target = TEAM_DATA[teamId].disembarkSpot;
    moveToward(ship, target.x, target.y, dt);
    if (Math.hypot(ship.x - target.x, ship.y - target.y) < 10) {
      ship.arrived = true;
    }
  }
}

function getLivingPlayers(teamId) {
  return state.players.filter((p) => p.teamId === teamId && p.alive);
}

function updatePlayers(dt) {
  for (const p of state.players) {
    if (!p.alive) continue;
    p.cooldown = Math.max(0, p.cooldown - dt);
    const teamShip = state.ships[p.teamId];

    if (p.onShip) {
      p.x = teamShip.x + (Math.random() - 0.5) * 16;
      p.y = teamShip.y + (Math.random() - 0.5) * 16;
      if (teamShip.arrived) {
        p.onShip = false;
      }
      continue;
    }

    const enemies = state.players.filter((e) => e.alive && e.teamId !== p.teamId);
    if (enemies.length === 0) continue;
    enemies.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const target = enemies[0];
    const dist = Math.hypot(target.x - p.x, target.y - p.y);

    if (dist > p.range) {
      const contesting = Math.hypot(ISLAND.x - p.x, ISLAND.y - p.y) > ISLAND.controlRadius * 0.7;
      if (contesting) {
        moveToward(p, ISLAND.x + (Math.random() - 0.5) * 80, ISLAND.y + (Math.random() - 0.5) * 80, dt);
      } else {
        moveToward(p, target.x, target.y, dt);
      }
    } else if (p.cooldown <= 0) {
      target.hp -= p.damage;
      p.cooldown = 0.7 + Math.random() * 0.4;
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
      }
    }
  }
}

function updateIslandControl(dt) {
  const inZone = (p) => p.alive && !p.onShip && Math.hypot(p.x - ISLAND.x, p.y - ISLAND.y) <= ISLAND.controlRadius;
  const crimson = state.players.filter((p) => p.teamId === 'crimson' && inZone(p)).length;
  const cobalt = state.players.filter((p) => p.teamId === 'cobalt' && inZone(p)).length;

  if (crimson > cobalt) {
    state.controlSeconds.crimson += dt;
  } else if (cobalt > crimson) {
    state.controlSeconds.cobalt += dt;
  }
}

function evaluateWinCondition() {
  const crimsonAlive = getLivingPlayers('crimson').length;
  const cobaltAlive = getLivingPlayers('cobalt').length;

  if (crimsonAlive === 0 || cobaltAlive === 0) {
    state.gameOver = true;
    state.running = false;
    state.winner = crimsonAlive > 0 ? 'crimson' : 'cobalt';
    return;
  }

  if (state.controlSeconds.crimson >= 20 || state.controlSeconds.cobalt >= 20) {
    state.gameOver = true;
    state.running = false;
    state.winner = state.controlSeconds.crimson > state.controlSeconds.cobalt ? 'crimson' : 'cobalt';
  }
}

function update(dt) {
  if (!state.running || state.gameOver) return;
  state.timeMs += dt * 1000;
  updateShips(dt);
  updatePlayers(dt);
  updateIslandControl(dt);
  evaluateWinCondition();

  if (state.gameOver) {
    const winTeam = TEAM_DATA[state.winner];
    statusEl.textContent = `${winTeam.label} win the island battle!`; 
  }

  updateScoreboard();
}

function drawBackground() {
  ctx.fillStyle = '#0d4f77';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 45; i++) {
    ctx.beginPath();
    const x = (i * 97) % W;
    const y = (i * 67) % H;
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#b38b4d';
  ctx.beginPath();
  ctx.arc(ISLAND.x, ISLAND.y, ISLAND.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(ISLAND.x, ISLAND.y, ISLAND.controlRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawShip(ship) {
  const team = TEAM_DATA[ship.teamId];
  if (ship.hp <= 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.fillStyle = team.shipColor;
  ctx.fillRect(-ship.width / 2, -ship.height / 2, ship.width, ship.height);
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.moveTo(0, -ship.height / 2);
  ctx.lineTo(20, -ship.height / 2 - 30);
  ctx.lineTo(20, -ship.height / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer(p) {
  if (!p.alive) return;
  const team = TEAM_DATA[p.teamId];

  ctx.fillStyle = team.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.name.split(' ')[0], p.x, p.y - 16);

  const barW = 26;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(p.x - barW / 2, p.y + 12, barW, 4);
  ctx.fillStyle = '#7dff7d';
  ctx.fillRect(p.x - barW / 2, p.y + 12, (p.hp / 100) * barW, 4);
}

function draw() {
  drawBackground();
  Object.values(state.ships).forEach(drawShip);
  state.players.forEach(drawPlayer);
}

function updateScoreboard() {
  const crimsonAlive = getLivingPlayers('crimson').length;
  const cobaltAlive = getLivingPlayers('cobalt').length;
  const t = Math.floor(state.timeMs / 1000);

  scoreboardEl.innerHTML = [
    `<strong>Time:</strong> ${t}s`,
    `<span style="color:${TEAM_DATA.crimson.color}">${TEAM_DATA.crimson.label}</span> alive: ${crimsonAlive}/4`,
    `<span style="color:${TEAM_DATA.cobalt.color}">${TEAM_DATA.cobalt.label}</span> alive: ${cobaltAlive}/4`,
    `Island control - ${TEAM_DATA.crimson.label}: ${state.controlSeconds.crimson.toFixed(1)}s`,
    `Island control - ${TEAM_DATA.cobalt.label}: ${state.controlSeconds.cobalt.toFixed(1)}s`
  ].join(' · ');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(frame);
