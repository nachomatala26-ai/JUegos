import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

const canvas = document.querySelector("#game");
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2a160d, 15, 70);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 12, 16);

const hemisphere = new THREE.HemisphereLight(0xfff3d1, 0x361d11, 1.2);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xffd18c, 1.8);
sun.position.set(10, 18, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(26, 64),
  new THREE.MeshStandardMaterial({ color: 0x56311f, roughness: 0.95, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const lane = new THREE.Mesh(
  new THREE.RingGeometry(9, 10.4, 64),
  new THREE.MeshStandardMaterial({ color: 0x301a10, roughness: 1 })
);
lane.rotation.x = -Math.PI / 2;
lane.position.y = 0.01;
scene.add(lane);

function buildStand(position, color) {
  const stand = new THREE.Group();

  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.3, 2.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
  );
  counter.position.y = 0.65;
  counter.castShadow = true;
  counter.receiveShadow = true;
  stand.add(counter);

  const awning = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xf4d39f, roughness: 0.4 })
  );
  awning.rotation.z = Math.PI / 2;
  awning.position.set(0, 2.2, 0);
  awning.castShadow = true;
  stand.add(awning);

  stand.position.copy(position);
  scene.add(stand);
}

buildStand(new THREE.Vector3(-15, 0, -4), 0x784426);
buildStand(new THREE.Vector3(14, 0, 5), 0x66351f);

const grill = new THREE.Group();
const grillBody = new THREE.Mesh(
  new THREE.BoxGeometry(3, 1.1, 3),
  new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.8, metalness: 0.2 })
);
grillBody.position.y = 0.55;
grillBody.castShadow = true;
grillBody.receiveShadow = true;
grill.add(grillBody);

const skewer = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 3.6, 12),
  new THREE.MeshStandardMaterial({ color: 0xbababa, metalness: 0.7, roughness: 0.3 })
);
skewer.position.y = 2.1;
skewer.castShadow = true;
grill.add(skewer);

grill.position.set(0, 0, -15);
scene.add(grill);

const player = new THREE.Group();
const vehicle = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.8, 2.4),
  new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.55, metalness: 0.1 })
);
vehicle.position.y = 0.4;
vehicle.castShadow = true;
player.add(vehicle);

const topper = new THREE.Mesh(
  new THREE.ConeGeometry(0.6, 0.8, 12),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
);
topper.position.set(0, 1.1, 0);
topper.castShadow = true;
player.add(topper);

player.position.set(0, 0, 8);
scene.add(player);

const ingredientColors = [0xe35d5b, 0x6fcf50, 0xe8d56d, 0xc86a2a, 0x9e5db3];
const ingredients = [];

function spawnIngredient() {
  const index = Math.floor(Math.random() * ingredientColors.length);
  const ingredient = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 16),
    new THREE.MeshStandardMaterial({ color: ingredientColors[index], roughness: 0.5, metalness: 0.1 })
  );
  const angle = Math.random() * Math.PI * 2;
  const radius = 11 + Math.random() * 10;
  ingredient.position.set(Math.cos(angle) * radius, 0.55, Math.sin(angle) * radius);
  ingredient.castShadow = true;
  scene.add(ingredient);
  ingredients.push(ingredient);
}

for (let i = 0; i < 16; i += 1) {
  spawnIngredient();
}

const keys = new Set();
window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

const scoreEl = document.querySelector("#score");
const timerEl = document.querySelector("#timer");
const carryEl = document.querySelector("#carry");
const msgEl = document.querySelector("#message");

const gameState = {
  score: 0,
  carry: 0,
  maxCarry: 5,
  timeLeft: 60,
  gameOver: false,
};

let accumulator = 0;
const clock = new THREE.Clock();

function resetIngredient(ingredient) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 11 + Math.random() * 10;
  ingredient.position.set(Math.cos(angle) * radius, 0.55, Math.sin(angle) * radius);
}

function updateUI() {
  scoreEl.textContent = `Puntos: ${gameState.score}`;
  timerEl.textContent = `Tiempo: ${Math.max(0, gameState.timeLeft).toFixed(0)}`;
  carryEl.textContent = `Cargando: ${gameState.carry}/${gameState.maxCarry}`;
}

function finishGame() {
  gameState.gameOver = true;
  msgEl.textContent = `¡Tiempo! Resultado final: ${gameState.score}. Recarga para jugar otra vez.`;
}

function updatePlayer(delta) {
  const drive = new THREE.Vector2(0, 0);
  if (keys.has("w") || keys.has("arrowup")) drive.y += 1;
  if (keys.has("s") || keys.has("arrowdown")) drive.y -= 1;
  if (keys.has("a") || keys.has("arrowleft")) drive.x -= 1;
  if (keys.has("d") || keys.has("arrowright")) drive.x += 1;

  if (drive.lengthSq() > 0) {
    drive.normalize();
    const turbo = keys.has("shift") ? 1.8 : 1;
    const speed = 8.5 * turbo;
    player.position.x += drive.x * speed * delta;
    player.position.z -= drive.y * speed * delta;

    const targetAngle = Math.atan2(drive.x, -drive.y);
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetAngle, 10 * delta);
  }

  const maxRadius = 24;
  const horizontal = new THREE.Vector2(player.position.x, player.position.z);
  if (horizontal.length() > maxRadius) {
    horizontal.setLength(maxRadius);
    player.position.set(horizontal.x, player.position.y, horizontal.y);
  }

  for (const ingredient of ingredients) {
    ingredient.rotation.y += 1.2 * delta;
    if (ingredient.position.distanceTo(player.position) < 1.2 && gameState.carry < gameState.maxCarry) {
      gameState.carry += 1;
      gameState.score += 5;
      resetIngredient(ingredient);
      msgEl.textContent = "¡Ingrediente recogido! Llévalo a la parrilla.";
    }
  }

  const grillDistance = player.position.distanceTo(grill.position);
  if (grillDistance < 3.2 && gameState.carry > 0) {
    gameState.score += gameState.carry * 12;
    msgEl.textContent = `Entrega perfecta: +${gameState.carry * 12} puntos.`;
    gameState.carry = 0;
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!gameState.gameOver) {
    accumulator += delta;
    if (accumulator >= 1) {
      accumulator = 0;
      gameState.timeLeft -= 1;
      if (gameState.timeLeft <= 0) {
        finishGame();
      }
    }

    updatePlayer(delta);
    skewer.rotation.y += 2.8 * delta;

    const camTarget = new THREE.Vector3(player.position.x, 8.5, player.position.z + 12);
    camera.position.lerp(camTarget, 4 * delta);
    camera.lookAt(player.position.x, 0.5, player.position.z - 1.5);
  }

  updateUI();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateUI();
animate();
