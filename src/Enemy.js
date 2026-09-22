import * as THREE from 'three';

function makeShadow(radius) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

export class Enemy {
  constructor(settings, level) {
    this.settings = settings;
    this.level = level;
    this.elapsed = 0;
    this.group = new THREE.Group();
    this.group.name = 'enemy';
    this._forward = new THREE.Vector3();
    this._tint = new THREE.Color();

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: settings.colors.enemy,
      roughness: 0.42,
      metalness: 0.05,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 1.05, 18), this.bodyMat);
    body.position.y = 0.52;

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.46, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd7b0, roughness: 0.4 }),
    );
    // ConeGeometry points along +Y. +90° around X turns that into local +Z, the facing axis.
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.62, 0.55);

    this.group.add(makeShadow(0.48), body, nose);
    this.reset();
  }

  get position() {
    return this.group.position;
  }

  reset() {
    const start = this.level.enemyStart;
    this.elapsed = 0;
    this.group.position.set(start.x, 0, start.z);
    this.group.rotation.y = this.level.enemyBaseYaw;
    this.bodyMat.color.set(this.settings.colors.enemy);
  }

  update(dt) {
    this.elapsed += dt;
    const sweep = Math.sin(this.elapsed * this.settings.enemyRotationSpeed) * this.settings.enemySweepRadians;
    this.group.rotation.y = this.level.enemyBaseYaw + sweep;
  }

  /**
   * Unit forward on the XZ plane.
   * Object3D.getWorldDirection returns local +Z. Cameras override it to -Z; this mesh is not a camera.
   */
  getForward() {
    this.group.getWorldDirection(this._forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() < 1e-8) this._forward.set(0, 0, 1);
    else this._forward.normalize();
    return this._forward;
  }

  updateTint(visibility, dt) {
    const colors = this.settings.colors;
    const hex = visibility === 'DETECTADO'
      ? colors.fovDetected
      : visibility === 'CERCA DEL LÍMITE'
        ? colors.fovEdge
        : colors.enemy;
    this._tint.set(hex);
    const alpha = 1 - Math.exp(-8 * dt);
    this.bodyMat.color.lerp(this._tint, alpha);
  }
}
