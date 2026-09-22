import * as THREE from 'three';
import { DetectionSystem } from '../src/DetectionSystem.js';
import { SETTINGS } from '../src/config.js';

const assert = (name, condition, detail) => {
  if (!condition) {
    console.error('FAIL', name, detail ?? '');
    process.exitCode = 1;
  } else {
    console.log('ok', name);
  }
};

const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

const system = new DetectionSystem(SETTINGS);
const enemy = new THREE.Vector3(0, 0, 0);
const forward = new THREE.Vector3();

function place(x, z, fx, fz) {
  forward.set(fx, 0, fz).normalize();
  return system.evaluate(new THREE.Vector3(x, 0, z), enemy, forward);
}

let state = place(0, 5, 0, 1);
assert('front angle', near(state.angleDeg, 0), state.angleDeg);
assert('front dot', near(state.dot, 1), state.dot);
assert('front cross', state.crossLength < 0.01, state.crossLength);
assert('front side', state.side === 'CENTRO', state.side);
assert('front fov', state.inFov && state.visibility === 'DETECTADO', state.visibility);

state = place(5, 0, 0, 1);
assert('right angle', near(state.angleDeg, 90), state.angleDeg);
assert('right dot', near(state.dot, 0), state.dot);
assert('right cross', near(state.crossLength, 1), state.crossLength);
assert('right side', state.side === 'DERECHA', state.side);
assert('right cross.y', state.crossY > 0, state.crossY);
assert('right outside fov', state.visibility === 'FUERA', state.visibility);

state = place(-5, 0, 0, 1);
assert('left side', state.side === 'IZQUIERDA' && state.crossY < 0, state.side);

state = place(0, -5, 0, 1);
assert('behind', near(state.angleDeg, 180) && near(state.dot, -1), state.angleDeg);

state = place(Math.sin(Math.PI / 6) * 4, Math.cos(Math.PI / 6) * 4, 0, 1);
assert('30 deg', near(state.angleDeg, 30, 0.05), state.angleDeg);
assert('30 in fov', state.inFov, state.angleDeg);
assert('30 sin', near(state.crossLength, 0.5, 0.02), state.crossLength);

const group = new THREE.Group();
group.rotation.y = Math.PI / 2;
group.updateWorldMatrix(true, false);
const dir = new THREE.Vector3();
group.getWorldDirection(dir);
assert('yaw 90 forward +X', near(dir.x, 1) && near(dir.z, 0, 1e-3), dir.toArray());

const fov = THREE.MathUtils.degToRad(70);
const mesh = new THREE.Mesh(new THREE.CircleGeometry(10, 48, -Math.PI / 2 - fov / 2, fov));
mesh.rotation.x = -Math.PI / 2;
mesh.updateMatrix();
const mapTheta = (theta) => new THREE.Vector3(Math.cos(theta) * 10, Math.sin(theta) * 10, 0).applyMatrix4(mesh.matrix);
const mid = mapTheta(-Math.PI / 2);
const edgeA = mapTheta(-Math.PI / 2 - fov / 2);
const edgeB = mapTheta(-Math.PI / 2 + fov / 2);
assert('sector center aims +Z', near(mid.x, 0, 0.05) && near(mid.y, 0, 0.05) && near(mid.z, 10, 0.05), mid.toArray());
const angleA = Math.atan2(edgeA.x, edgeA.z);
const angleB = Math.atan2(edgeB.x, edgeB.z);
assert('sector edges at ±35°', near(Math.abs(angleA), fov / 2, 0.02) && near(Math.abs(angleB), fov / 2, 0.02), [angleA, angleB]);

const scene = new THREE.Scene();
const wall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, 1));
wall.position.set(1.6, 0.9, -1.3);
scene.add(wall);
scene.updateMatrixWorld(true);
system.setWalls([wall]);
state = place(1.6, -4, 0, -1);
assert('wall blocks', state.blocked && state.visibility === 'BLOQUEADO POR PARED', state);
state = place(0, 3, 0, 1);
assert('clear line', !state.blocked && state.visibility === 'DETECTADO', state.visibility);

if (process.exitCode) process.exit(process.exitCode);
console.log('all checks passed');
