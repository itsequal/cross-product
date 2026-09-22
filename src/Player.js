import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Push a circle out of axis-aligned walls. Two passes handle touching corners. */
function resolveWallCollision(position, radius, walls) {
  for (let pass = 0; pass < 2; pass += 1) {
    for (const wall of walls) {
      const minX = wall.x - wall.w / 2 - radius;
      const maxX = wall.x + wall.w / 2 + radius;
      const minZ = wall.z - wall.d / 2 - radius;
      const maxZ = wall.z + wall.d / 2 + radius;
      if (position.x <= minX || position.x >= maxX || position.z <= minZ || position.z >= maxZ) {
        continue;
      }
      const penLeft = position.x - minX;
      const penRight = maxX - position.x;
      const penBack = position.z - minZ;
      const penFront = maxZ - position.z;
      const minPen = Math.min(penLeft, penRight, penBack, penFront);
      if (minPen === penLeft) position.x = minX;
      else if (minPen === penRight) position.x = maxX;
      else if (minPen === penBack) position.z = minZ;
      else position.z = maxZ;
    }
  }
}

function makeShadow(radius) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

export class Player {
  constructor(settings, level) {
    this.settings = settings;
    this.level = level;
    this.radius = settings.playerRadius;
    this.group = new THREE.Group();
    this.group.name = 'player';

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 0.95, 18),
      new THREE.MeshStandardMaterial({ color: settings.colors.player, roughness: 0.45, metalness: 0.04 }),
    );
    body.position.y = 0.48;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xd7ecff, roughness: 0.4 }),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.58, 0.5);

    this.group.add(makeShadow(0.42), body, nose);
    this.reset();
  }

  get position() {
    return this.group.position;
  }

  reset() {
    const start = this.level.playerStart;
    this.group.position.set(start.x, 0, start.z);
    this.group.rotation.y = Math.atan2(1, -1);
  }

  update(dt, input, walls) {
    const axis = input.axis();
    const length = Math.hypot(axis.x, axis.z);
    if (length < 1e-6) return;

    const step = this.settings.playerSpeed * dt;
    this.group.position.x += (axis.x / length) * step;
    this.group.position.z += (axis.z / length) * step;
    this.group.rotation.y = Math.atan2(axis.x, axis.z);

    resolveWallCollision(this.group.position, this.radius, walls);
    const limit = this.settings.arenaSize / 2 - this.radius;
    this.group.position.x = clamp(this.group.position.x, -limit, limit);
    this.group.position.z = clamp(this.group.position.z, -limit, limit);
  }
}
