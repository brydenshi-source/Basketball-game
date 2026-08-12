const controlPoints = [
  { id: 'A', name: 'A-Base', type: 'base' },
  { id: 'P1', name: 'Cargo Port', type: 'point' },
  { id: 'P2', name: 'Financial Plaza', type: 'point' },
  { id: 'P3', name: 'Central Highrise', type: 'point' },
  { id: 'P4', name: 'Shopping Avenue', type: 'point' },
  { id: 'P5', name: 'Subway Terminal', type: 'point' },
  { id: 'P6', name: 'Neon District', type: 'point' },
  { id: 'B', name: 'B-Base', type: 'base' },
];

const classes = [
  ['Rifle', 'High, steady damage for mid-range street fights.'],
  ['SMG', 'Blazing fire rate for clearing tight skyscraper interiors.'],
  ['Sniper', 'Instant headshot kills across the boulevard with zero drop.'],
  ['Rocket Launcher', 'Straight-flying explosives for shattering fortifications.'],
];

const turrets = [
  ['Manual Anti-Infantry Turret', 'A fortified bunker twin-laser that melts foot soldiers when a defender mans it.'],
  ['Manual Anti-Vehicle Turret', 'A heavy missile pod that locks down incoming armor when a defender mans it.'],
  ['Armored Car Roof Turret', 'A mobile heavy turret operated by a passenger while the driver pushes the frontline.'],
];

const html = String.raw;

function renderRoute() {
  return controlPoints.map((point, index) => html`
    <div class="node ${point.type}">
      <strong>${point.id}</strong>
      <span>${point.name}</span>
    </div>
    ${index < controlPoints.length - 1 ? '<div class="connector" aria-hidden="true"></div>' : ''}
  `).join('');
}

function renderCards(items, className = 'miniCard') {
  return items.map(([name, description]) => html`
    <article class="${className}">
      <h3>${name}</h3>
      <p>${description}</p>
    </article>
  `).join('');
}

function App() {
  return html`
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">12v12 Urban Tug-of-War Shooter</p>
        <h1>Frontline Push</h1>
        <p class="lede">
          Pinpoint hitscan accuracy, heavy vehicle pressure, manual turret defenses,
          and an unforgiving five-minute stick system decide which squad owns Neo-Metropolis.
        </p>
        <div class="heroActions" aria-label="Core feature highlights">
          <span>Zero recoil</span>
          <span>Zero bullet drop</span>
          <span>Fair monetization</span>
        </div>
      </section>

      <section class="mapCard" aria-labelledby="map-title">
        <div>
          <p class="eyebrow">Main Highway</p>
          <h2 id="map-title">Neo-Metropolis Frontline</h2>
        </div>
        <div class="route" aria-label="Control point route from A-Base to B-Base">
          ${renderRoute()}
        </div>
      </section>

      <section class="grid two">
        <article class="panel">
          <h2>Core Mechanics & Weapons</h2>
          <p>
            Every infantry weapon is laser-accurate hitscan: crosshairs never bloom,
            recoil never kicks upward, and shots land exactly where skill places them.
          </p>
          <div class="cards">${renderCards(classes)}</div>
        </article>

        <article class="panel accent">
          <h2>The Stick System</h2>
          <ol class="steps">
            <li>Attackers get 5 minutes to fully capture the next control point.</li>
            <li>If they fail, roles instantly flip and the defenders go on the stick.</li>
            <li>The new attackers push back with their own 5-minute window.</li>
            <li>Victory triggers when a team captures every point and ejects the enemy from their final sector.</li>
          </ol>
        </article>
      </section>

      <section class="grid three">
        ${turrets.map(([name, description]) => html`
          <article class="panel turret">
            <h2>${name}</h2>
            <p>${description}</p>
            <p class="rule">Overheat: continuous fire beyond 5 seconds locks the turret for 3 seconds.</p>
          </article>
        `).join('')}
      </section>

      <section class="panel vote">
        <div>
          <p class="eyebrow">Post-Match Flow</p>
          <h2>End-of-Match Map Vote</h2>
          <p>
            After victory or defeat, all 24 players enter a lobby vote featuring three new urban locations.
            The winning map loads instantly for the next round.
          </p>
        </div>
        <div class="voteOptions" aria-label="Example map vote options">
          <span>Industrial Docks</span>
          <span>Downtown Core</span>
          <span>Neon Overpass</span>
        </div>
      </section>
    </main>
  `;
}

document.getElementById('root').innerHTML = App();
