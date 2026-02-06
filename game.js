const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Tu navegador no soporta canvas 2D.');
}

const scoreEl = document.querySelector('#score');
const timerEl = document.querySelector('#timer');
const carryEl = document.querySelector('#carry');
const msgEl = document.querySelector('#message');

const keys = new Set();
window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

const state = {
  score: 0,
  carry: 0,
  maxCarry: 5,
  timeLeft: 60,
  gameOver: false,
};

const world = {
  radius: 24,
  grill: { x: 0, z: -15, r: 2.8 },
  player: { x: 0, z: 8, vx: 0, vz: 0, angle: 0 },
  ingredients: [],
};

const ingredientColors = ['#e35d5b', '#6fcf50', '#e8d56d', '#c86a2a', '#9e5db3'];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function randomIngredient() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 11 + Math.random() * 10;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    y: 0,
    spin: Math.random() * Math.PI * 2,
    color: ingredientColors[Math.floor(Math.random() * ingredientColors.length)],
  };
}

for (let i = 0; i < 16; i += 1) {
  world.ingredients.push(randomIngredient());
}

function project(x, y, z, camera) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const dz = z - camera.z;

  const cosY = Math.cos(-camera.yaw);
  const sinY = Math.sin(-camera.yaw);
  const rx = dx * cosY - dz * sinY;
  const rz = dx * sinY + dz * cosY;

  const cosP = Math.cos(-camera.pitch);
  const sinP = Math.sin(-camera.pitch);
  const ry = dy * cosP - rz * sinP;
  const rz2 = dy * sinP + rz * cosP;

  if (rz2 <= 0.1) return null;

  const f = camera.focal / rz2;
  return {
    x: canvas.width * 0.5 + rx * f,
    y: canvas.height * 0.5 - ry * f,
    scale: f,
    depth: rz2,
  };
}

function clampToArena(entity) {
  const d = Math.hypot(entity.x, entity.z);
  if (d > world.radius) {
    const s = world.radius / d;
    entity.x *= s;
    entity.z *= s;
  }
}

function updateUI() {
  scoreEl.textContent = `Puntos: ${state.score}`;
  timerEl.textContent = `Tiempo: ${Math.max(0, state.timeLeft).toFixed(0)}`;
  carryEl.textContent = `Cargando: ${state.carry}/${state.maxCarry}`;
}

function finishGame() {
  state.gameOver = true;
  msgEl.textContent = `¡Tiempo! Resultado final: ${state.score}. Pulsa R para reiniciar.`;
}

function resetGame() {
  state.score = 0;
  state.carry = 0;
  state.timeLeft = 60;
  state.gameOver = false;
  world.player.x = 0;
  world.player.z = 8;
  world.player.vx = 0;
  world.player.vz = 0;
  world.player.angle = 0;
  world.ingredients = [];
  for (let i = 0; i < 16; i += 1) {
    world.ingredients.push(randomIngredient());
  }
  msgEl.textContent = 'Empieza a cocinar el mejor kebap de la ciudad.';
}

function updatePlayer(dt) {
  const dir = { x: 0, z: 0 };
  if (keys.has('w') || keys.has('arrowup')) dir.z -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dir.z += 1;
  if (keys.has('a') || keys.has('arrowleft')) dir.x -= 1;
  if (keys.has('d') || keys.has('arrowright')) dir.x += 1;

  const len = Math.hypot(dir.x, dir.z);
  if (len > 0) {
    dir.x /= len;
    dir.z /= len;
    const turbo = keys.has('shift') ? 1.85 : 1;
    const speed = 11 * turbo;
    world.player.vx = dir.x * speed;
    world.player.vz = dir.z * speed;
    world.player.angle = Math.atan2(dir.x, -dir.z);
  } else {
    world.player.vx *= 0.82;
    world.player.vz *= 0.82;
  }

  world.player.x += world.player.vx * dt;
  world.player.z += world.player.vz * dt;
  clampToArena(world.player);
}

function handleGameplay(dt) {
  updatePlayer(dt);

  for (const ingredient of world.ingredients) {
    ingredient.spin += dt * 1.5;
    if (Math.hypot(ingredient.x - world.player.x, ingredient.z - world.player.z) < 1.25 && state.carry < state.maxCarry) {
      state.carry += 1;
      state.score += 5;
      const next = randomIngredient();
      ingredient.x = next.x;
      ingredient.z = next.z;
      ingredient.color = next.color;
      msgEl.textContent = '¡Ingrediente recogido! Llévalo a la parrilla.';
    }
  }

  const distGrill = Math.hypot(world.player.x - world.grill.x, world.player.z - world.grill.z);
  if (distGrill < world.grill.r + 0.7 && state.carry > 0) {
    const bonus = state.carry * 12;
    state.score += bonus;
    state.carry = 0;
    msgEl.textContent = `Entrega perfecta: +${bonus} puntos.`;
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#1f120b');
  g.addColorStop(0.6, '#110804');
  g.addColorStop(1, '#080403');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawScene() {
  drawBackground();

  const camera = {
    x: world.player.x,
    y: 10,
    z: world.player.z + 12,
    yaw: 0,
    pitch: -0.55,
    focal: Math.min(canvas.width, canvas.height) * 0.95,
  };

  const renderables = [];

  for (let i = 0; i < 100; i += 1) {
    const a = (i / 100) * Math.PI * 2;
    const x = Math.cos(a) * world.radius;
    const z = Math.sin(a) * world.radius;
    const p = project(x, 0, z, camera);
    if (p) renderables.push({ type: 'arena', p, a });
  }

  const grillP = project(world.grill.x, 0.6, world.grill.z, camera);
  if (grillP) renderables.push({ type: 'grill', p: grillP });

  for (const ing of world.ingredients) {
    const p = project(ing.x, 0.5 + Math.sin(ing.spin) * 0.1, ing.z, camera);
    if (p) renderables.push({ type: 'ingredient', p, color: ing.color });
  }

  const playerP = project(world.player.x, 0.6, world.player.z, camera);
  if (playerP) renderables.push({ type: 'player', p: playerP });

  renderables.sort((a, b) => b.p.depth - a.p.depth);

  for (const r of renderables) {
    if (r.type === 'arena') {
      ctx.fillStyle = 'rgba(85, 49, 31, 0.35)';
      ctx.beginPath();
      ctx.arc(r.p.x, r.p.y + 14 * r.p.scale, Math.max(1, 1.2 * r.p.scale), 0, Math.PI * 2);
      ctx.fill();
    }

    if (r.type === 'grill') {
      const w = 80 * r.p.scale;
      const h = 46 * r.p.scale;
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(r.p.x - w / 2, r.p.y - h / 2, w, h);
      ctx.fillStyle = '#ff973d';
      ctx.fillRect(r.p.x - w * 0.35, r.p.y - h * 0.18, w * 0.7, h * 0.35);
    }

    if (r.type === 'ingredient') {
      const rad = Math.max(4, 17 * r.p.scale);
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.p.x, r.p.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(r.p.x - rad * 0.35, r.p.y - rad * 0.35, rad * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    if (r.type === 'player') {
      const w = Math.max(14, 60 * r.p.scale);
      const h = Math.max(12, 32 * r.p.scale);
      ctx.save();
      ctx.translate(r.p.x, r.p.y);
      ctx.rotate(world.player.angle);
      ctx.fillStyle = '#ff8a3d';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.9);
      ctx.lineTo(-h * 0.3, -h * 0.2);
      ctx.lineTo(h * 0.3, -h * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffe0b0';
    ctx.font = '700 44px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Fin de partida', canvas.width / 2, canvas.height / 2 - 16);
    ctx.font = '600 24px system-ui';
    ctx.fillText(`Puntuación: ${state.score}`, canvas.width / 2, canvas.height / 2 + 24);
    ctx.font = '500 18px system-ui';
    ctx.fillText('Pulsa R para volver a jugar', canvas.width / 2, canvas.height / 2 + 56);
  }
}

let timerAccumulator = 0;
let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!state.gameOver) {
    timerAccumulator += dt;
    if (timerAccumulator >= 1) {
      timerAccumulator -= 1;
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        finishGame();
      }
    }

    handleGameplay(dt);
  } else if (keys.has('r')) {
    resetGame();
    keys.delete('r');
  }

  updateUI();
  drawScene();
  requestAnimationFrame(loop);
}

updateUI();
msgEl.textContent = 'Si no se movía antes, ya está corregido: juega con WASD/flechas + Shift.';
requestAnimationFrame(loop);
