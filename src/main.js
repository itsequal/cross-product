import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from './config.js';
import { InputManager } from './InputManager.js';
import { Game } from './Game.js';
import { HUD } from './HUD.js';

const app = document.querySelector('#app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181e);

const camera = new THREE.PerspectiveCamera(
  CAMERA.game.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  120,
);
camera.position.set(...CAMERA.game.position);
camera.lookAt(...CAMERA.game.target);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.enablePan = false;
controls.enabled = false;
controls.maxPolarAngle = Math.PI / 2 - 0.06;
controls.minDistance = 3;
controls.maxDistance = 40;
controls.target.set(...CAMERA.game.target);
controls.update();
controls.saveState();

const input = new InputManager();
const game = new Game({ scene, camera, controls, input });
const hud = new HUD();

const clock = new THREE.Clock();

function viewportRect() {
  camera.userData.viewportRect = renderer.domElement.getBoundingClientRect();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  viewportRect();
}

window.addEventListener('resize', onResize);
viewportRect();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const state = game.update(dt);
  if (game.mode === 'math') controls.update();
  game.visualizer.update(state, dt, camera, game.goalPoint);
  hud.update(state);
  renderer.render(scene, camera);
}

window.__debug = {
  game,
  get detection() {
    return game.detection.result;
  },
  dump() {
    const state = game.detection.result;
    console.table({
      distance: state.distance,
      dot: state.dot,
      crossX: state.crossX,
      crossY: state.crossY,
      crossZ: state.crossZ,
      crossLength: state.crossLength,
      angleDeg: state.angleDeg,
      side: state.side,
      visibility: state.visibility,
      blocked: state.blocked,
    });
  },
};

animate();
