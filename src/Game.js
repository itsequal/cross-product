import * as THREE from 'three';
import { LEVEL, SETTINGS, CAMERA } from './config.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { DetectionSystem } from './DetectionSystem.js';
import { MathVisualizer } from './MathVisualizer.js';

function createWalls(scene) {
  const meshes = [];
  for (const spec of LEVEL.walls) {
    const geometry = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
    const material = new THREE.MeshStandardMaterial({
      color: SETTINGS.colors.wall,
      roughness: 0.82,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(spec.x, spec.h / 2, spec.z);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: SETTINGS.colors.wallEdge }),
    );
    mesh.add(edges);
    mesh.name = 'wall';
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

function createGoal(scene) {
  const group = new THREE.Group();
  group.name = 'goal';
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(SETTINGS.goalRadius * 0.72, 28),
    new THREE.MeshBasicMaterial({
      color: SETTINGS.colors.goal,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.03;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(SETTINGS.goalRadius, 0.07, 8, 40),
    new THREE.MeshBasicMaterial({ color: SETTINGS.colors.goal }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;

  group.add(disc, ring);
  group.position.set(LEVEL.goal.x, 0, LEVEL.goal.z);
  scene.add(group);
  return group;
}

function createArena(scene) {
  const hemi = new THREE.HemisphereLight(0xc9d7ea, 0x2a3038, 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff6ea, 1.2);
  sun.position.set(8, 16, 6);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(SETTINGS.arenaSize, SETTINGS.arenaSize),
    new THREE.MeshStandardMaterial({ color: SETTINGS.colors.floor, roughness: 0.96, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(SETTINGS.arenaSize, SETTINGS.arenaSize, 0x6a7b88, 0x323a42);
  grid.position.y = 0.012;
  scene.add(grid);

  const half = SETTINGS.arenaSize / 2;
  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-half, 0.03, -half),
      new THREE.Vector3(half, 0.03, -half),
      new THREE.Vector3(half, 0.03, half),
      new THREE.Vector3(-half, 0.03, half),
    ]),
    new THREE.LineBasicMaterial({ color: 0x93a2b0 }),
  );
  scene.add(border);
}

export class Game {
  constructor({ scene, camera, controls, input }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.input = input;
    this.mode = 'game';
    this.status = 'playing';
    this.showVectors = false;
    this.showCone = true;

    createArena(scene);
    this.player = new Player(SETTINGS, LEVEL);
    this.enemy = new Enemy(SETTINGS, LEVEL);
    scene.add(this.player.group, this.enemy.group);

    this.walls = createWalls(scene);
    this.goal = createGoal(scene);
    this.goalPoint = new THREE.Vector3(LEVEL.goal.x, 0.45, LEVEL.goal.z);

    this.detection = new DetectionSystem(SETTINGS);
    this.detection.setWalls(this.walls);
    this.visualizer = new MathVisualizer(scene, this.enemy.group);

    scene.updateMatrixWorld(true);
    this._refreshDetection();
    this._annotate();
  }

  update(dt) {
    for (const toggle of this.input.consumeToggles()) {
      if (toggle === 'math') this._setMode(this.mode === 'game' ? 'math' : 'game');
      else if (toggle === 'reset') this.reset();
      else if (toggle === 'vectors') this.showVectors = !this.showVectors;
      else if (toggle === 'cone') this.showCone = !this.showCone;
    }

    if (this.mode === 'game' && this.status === 'playing') {
      this.player.update(dt, this.input, LEVEL.walls);
      this.enemy.update(dt);
      this._refreshDetection();
      if (this.detection.result.visibility === 'DETECTADO') this.status = 'detected';
      else if (this._reachedGoal()) this.status = 'goal';
    }

    this.enemy.updateTint(this.detection.result.visibility, dt);
    this._annotate();
    return this.detection.result;
  }

  reset() {
    this.player.reset();
    this.enemy.reset();
    this.status = 'playing';
    this.scene.updateMatrixWorld(true);
    this._refreshDetection();
    if (this.mode !== 'game') this._setMode('game');
    this._annotate();
  }

  _refreshDetection() {
    this.detection.evaluate(
      this.player.position,
      this.enemy.position,
      this.enemy.getForward(),
    );
  }

  _reachedGoal() {
    const dx = this.player.position.x - LEVEL.goal.x;
    const dz = this.player.position.z - LEVEL.goal.z;
    const radius = SETTINGS.goalRadius;
    return dx * dx + dz * dz <= radius * radius;
  }

  _annotate() {
    const state = this.detection.result;
    state.mode = this.mode;
    state.status = this.status;
    state.showMath = this.mode === 'math';
    state.showVectors = this.mode === 'math' || this.showVectors;
    state.showCone = this.showCone;
  }

  _setMode(mode) {
    this.mode = mode;
    if (mode === 'math') {
      const enemy = this.enemy.position;
      this.controls.target.set(enemy.x, 0.5, enemy.z);
      this.camera.position.set(enemy.x + 5.4, 5.6, enemy.z + 6.6);
      this.controls.enabled = true;
      this.controls.update();
      return;
    }

    this.controls.enabled = false;
    const position = CAMERA.game.position;
    const target = CAMERA.game.target;
    this.camera.position.set(position[0], position[1], position[2]);
    this.controls.target.set(target[0], target[1], target[2]);
    this.camera.lookAt(target[0], target[1], target[2]);
  }
}
