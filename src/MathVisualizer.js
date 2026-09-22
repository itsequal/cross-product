import * as THREE from 'three';
import { SETTINGS } from './config.js';

const ARC_SEGMENTS = 28;

function disableFrustumCull(object) {
  object.traverse((child) => {
    child.frustumCulled = false;
  });
}

/**
 * CircleGeometry lives in XY and its angle starts at +X.
 * After rotation.x = -π/2, local -Y maps to world/parent +Z (the facing axis).
 * The sector is therefore centered on theta = -π/2.
 */
function fovThetaStart(fovRadians) {
  return -Math.PI / 2 - fovRadians / 2;
}

function makeArrow(color) {
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(),
    1,
    color,
    0.4,
    0.24,
  );
  disableFrustumCull(arrow);
  return arrow;
}

function placeLabel(element, worldPosition, camera, rect, scratch) {
  scratch.copy(worldPosition).applyMatrix4(camera.matrixWorldInverse);
  const inFront = scratch.z < 0;
  if (!inFront) {
    element.hidden = true;
    return;
  }
  scratch.copy(worldPosition).project(camera);
  element.hidden = false;
  element.style.left = `${rect.left + (scratch.x * 0.5 + 0.5) * rect.width}px`;
  element.style.top = `${rect.top + (-scratch.y * 0.5 + 0.5) * rect.height}px`;
}

export class MathVisualizer {
  constructor(scene, enemyGroup) {
    this.enemyGroup = enemyGroup;
    this._dir = new THREE.Vector3();
    this._origin = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._cam = new THREE.Vector3();
    this._fovColor = new THREE.Color(SETTINGS.colors.fovOutside);
    this._fovTarget = new THREE.Color(SETTINGS.colors.fovOutside);

    this.arrowForward = makeArrow(SETTINGS.colors.forward);
    this.arrowToPlayer = makeArrow(SETTINGS.colors.toPlayer);
    this.arrowCross = makeArrow(SETTINGS.colors.cross);
    scene.add(this.arrowForward, this.arrowToPlayer, this.arrowCross);

    const fovRad = THREE.MathUtils.degToRad(SETTINGS.fovDegrees);
    this.fovMaterial = new THREE.MeshBasicMaterial({
      color: SETTINGS.colors.fovOutside,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.fovMesh = new THREE.Mesh(
      new THREE.CircleGeometry(SETTINGS.visionRange, 48, fovThetaStart(fovRad), fovRad),
      this.fovMaterial,
    );
    this.fovMesh.rotation.x = -Math.PI / 2;
    this.fovMesh.position.y = 0.035;
    this.fovMesh.renderOrder = 2;

    const outlinePoints = [new THREE.Vector3()];
    const start = fovThetaStart(fovRad);
    for (let i = 0; i <= 28; i += 1) {
      const theta = start + (fovRad * i) / 28;
      outlinePoints.push(new THREE.Vector3(
        Math.cos(theta) * SETTINGS.visionRange,
        Math.sin(theta) * SETTINGS.visionRange,
        0,
      ));
    }
    outlinePoints.push(new THREE.Vector3());
    this.fovOutline = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(outlinePoints),
      new THREE.LineBasicMaterial({ color: 0xd5efe0 }),
    );
    this.fovOutline.rotation.x = -Math.PI / 2;
    this.fovOutline.position.y = 0.05;
    this.fovOutline.renderOrder = 3;
    enemyGroup.add(this.fovMesh, this.fovOutline);

    const arcPositions = new Float32Array((ARC_SEGMENTS + 1) * 3);
    const arcGeometry = new THREE.BufferGeometry();
    arcGeometry.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
    this.arc = new THREE.Line(
      arcGeometry,
      new THREE.LineBasicMaterial({ color: SETTINGS.colors.angle }),
    );
    this.arc.frustumCulled = false;
    this.arc.visible = false;
    scene.add(this.arc);
    this._arcMid = new THREE.Vector3();
    this._halfEdge = new THREE.Vector3();

    this.thetaLabel = document.getElementById('label-theta');
    this.halfLabel = document.getElementById('label-half');
    this.goalLabel = document.getElementById('label-goal');
  }

  update(state, dt, camera, goalPosition) {
    camera.updateMatrixWorld();
    const rect = camera.userData.viewportRect;

    const vectorsOn = state.showVectors;
    this._origin.set(state.enemyPosition.x, 1.2, state.enemyPosition.z);

    this._setArrow(this.arrowForward, this._origin, state.forward, 2.6, vectorsOn);

    const toPlayerLength = Math.min(state.distance, SETTINGS.visionRange);
    this._setArrow(
      this.arrowToPlayer,
      this._origin,
      state.toPlayerDir,
      toPlayerLength,
      vectorsOn && state.distance > 0.05,
    );

    const crossVisible = vectorsOn && !state.parallel;
    this._dir.set(0, Math.sign(state.crossY) || 1, 0);
    this._setArrow(this.arrowCross, this._origin, this._dir, state.crossLength * 3.2, crossVisible);

    this._updateFov(state, dt);
    this._updateArc(state);

    const showMath = state.showMath;
    this.thetaLabel.hidden = !showMath;
    this.halfLabel.hidden = !showMath;
    if (showMath && rect) {
      const inside = state.angleDeg <= state.halfFovDeg + 0.05;
      const relation = inside ? '≤' : '>';
      this.thetaLabel.textContent = `θ = ${state.angleDeg.toFixed(1)}° ${relation} ${state.halfFovDeg.toFixed(0)}°`;
      placeLabel(this.thetaLabel, this._arcMid, camera, rect, this._cam);

      const yaw = Math.atan2(state.forward.x, state.forward.z);
      const edge = yaw + THREE.MathUtils.degToRad(state.halfFovDeg);
      this._halfEdge.set(
        state.enemyPosition.x + Math.sin(edge) * 3.1,
        0.45,
        state.enemyPosition.z + Math.cos(edge) * 3.1,
      );
      this.halfLabel.textContent = `½ FOV ${state.halfFovDeg.toFixed(0)}°`;
      placeLabel(this.halfLabel, this._halfEdge, camera, rect, this._cam);
    }

    if (rect) {
      this.goalLabel.hidden = false;
      placeLabel(this.goalLabel, goalPosition, camera, rect, this._cam);
    }
  }

  _setArrow(arrow, origin, direction, length, visible) {
    const show = visible && length > 0.02 && direction.lengthSq() > 1e-8;
    arrow.visible = show;
    if (!show) return;
    arrow.position.copy(origin);
    this._dir.copy(direction).normalize();
    arrow.setDirection(this._dir);
    const head = Math.min(0.42, length * 0.28);
    arrow.setLength(length, head, head * 0.62);
  }

  _updateFov(state, dt) {
    const colors = SETTINGS.colors;
    const hex = state.visibility === 'DETECTADO'
      ? colors.fovDetected
      : state.visibility === 'CERCA DEL LÍMITE'
        ? colors.fovEdge
        : state.visibility === 'BLOQUEADO POR PARED'
          ? colors.fovBlocked
          : colors.fovOutside;
    this._fovTarget.set(hex);
    const alpha = 1 - Math.exp(-8 * dt);
    this._fovColor.lerp(this._fovTarget, alpha);
    this.fovMaterial.color.copy(this._fovColor);
    this.fovMaterial.opacity = state.visibility === 'DETECTADO' ? 0.42 : 0.3;
    const show = state.showCone;
    this.fovMesh.visible = show;
    this.fovOutline.visible = show;
  }

  _updateArc(state) {
    const show = state.showMath && state.distance > 0.08;
    this.arc.visible = show;
    if (!show) return;

    const start = Math.atan2(state.forward.x, state.forward.z);
    const end = Math.atan2(state.toPlayerDir.x, state.toPlayerDir.z);
    let delta = end - start;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    const radius = 1.7;
    const attribute = this.arc.geometry.getAttribute('position');
    const ex = state.enemyPosition.x;
    const ez = state.enemyPosition.z;
    for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
      const theta = start + delta * (i / ARC_SEGMENTS);
      attribute.setXYZ(
        i,
        ex + Math.sin(theta) * radius,
        0.22,
        ez + Math.cos(theta) * radius,
      );
    }
    attribute.needsUpdate = true;
    const mid = start + delta * 0.5;
    this._arcMid.set(
      ex + Math.sin(mid) * (radius + 0.35),
      0.55,
      ez + Math.cos(mid) * (radius + 0.35),
    );
  }
}
