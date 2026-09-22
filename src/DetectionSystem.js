import { MathUtils, Raycaster, Vector3 } from 'three';

const DISTANCE_EPSILON = 1e-4;
const SIDE_EPSILON = 0.02;
const PARALLEL_EPSILON = 0.01;
/** Keep a ray hit from counting when the player is pressed against the far face of a wall. */
const LOS_SLACK = 0.2;

/**
 * Pure detection math. Rendering code must not live here.
 *
 * Both vectors are unit length and flattened onto XZ, so:
 *   |F × P| = sin(θ)
 *   F · P  = cos(θ)
 *   θ = atan2(|F × P|, F · P)   in [0, π]
 *
 * The cross product does NOT decide the field of view. It supplies the side
 * (sign) and sin(θ). The dot product supplies alignment. The FOV test compares
 * θ with half the vision angle, because θ is measured from the forward axis.
 *
 * Side convention (right-handed, +Y up), verified against +Z × +X = +Y:
 *   cross.y > 0 → player is to the RIGHT of Forward
 *   cross.y < 0 → player is to the LEFT of Forward
 * When looking along Forward, +X is right if Forward is +Z.
 */
export class DetectionSystem {
  constructor(settings) {
    this.settings = settings;
    this._toPlayer = new Vector3();
    this._forward = new Vector3();
    this._cross = new Vector3();
    this._origin = new Vector3();
    this._raycaster = new Raycaster();
    this._walls = [];
    this.result = {
      forward: new Vector3(),
      toPlayerDir: new Vector3(),
      enemyPosition: new Vector3(),
      distance: 0,
      dot: 1,
      crossX: 0,
      crossY: 0,
      crossZ: 0,
      crossLength: 0,
      angleRad: 0,
      angleDeg: 0,
      side: 'CENTRO',
      parallel: true,
      inRange: false,
      inFov: false,
      blocked: false,
      visibility: 'FUERA',
      fovDeg: settings.fovDegrees,
      halfFovDeg: settings.fovDegrees / 2,
      mode: 'game',
      status: 'playing',
      showMath: false,
      showVectors: false,
      showCone: true,
    };
  }

  setWalls(meshes) {
    this._walls = meshes;
  }

  evaluate(playerPosition, enemyPosition, forward) {
    const state = this.result;
    const halfFov = MathUtils.degToRad(this.settings.fovDegrees) / 2;

    this._forward.copy(forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() < 1e-8) this._forward.set(0, 0, 1);
    else this._forward.normalize();

    this._toPlayer.subVectors(playerPosition, enemyPosition);
    this._toPlayer.y = 0;
    const distance = this._toPlayer.length();

    state.enemyPosition.copy(enemyPosition);
    state.forward.copy(this._forward);
    state.distance = distance;
    state.fovDeg = this.settings.fovDegrees;
    state.halfFovDeg = this.settings.fovDegrees / 2;

    if (distance < DISTANCE_EPSILON) {
      this._toPlayer.copy(this._forward);
      state.toPlayerDir.copy(this._forward);
      state.dot = 1;
      state.crossX = 0;
      state.crossY = 0;
      state.crossZ = 0;
      state.crossLength = 0;
      state.angleRad = 0;
      state.angleDeg = 0;
      state.side = 'CENTRO';
      state.parallel = true;
      state.inRange = true;
      state.inFov = true;
      state.blocked = false;
      state.visibility = 'DETECTADO';
      return state;
    }

    this._toPlayer.multiplyScalar(1 / distance);
    state.toPlayerDir.copy(this._toPlayer);

    this._cross.crossVectors(this._forward, this._toPlayer);
    const dot = this._forward.dot(this._toPlayer);
    const crossLength = this._cross.length();
    const angle = Math.atan2(crossLength, dot);

    state.dot = dot;
    state.crossX = this._cross.x;
    state.crossY = this._cross.y;
    state.crossZ = this._cross.z;
    state.crossLength = crossLength;
    state.angleRad = angle;
    state.angleDeg = MathUtils.radToDeg(angle);
    state.parallel = crossLength < PARALLEL_EPSILON;

    if (Math.abs(this._cross.y) < SIDE_EPSILON) state.side = 'CENTRO';
    else if (this._cross.y > 0) state.side = 'DERECHA';
    else state.side = 'IZQUIERDA';

    const inRange = distance <= this.settings.visionRange;
    const inFov = angle <= halfFov;
    const blocked = inRange && inFov && this._lineBlocked(enemyPosition, this._toPlayer, distance);
    const inside = inRange && inFov && !blocked;
    const nearEdge = angle > halfFov * this.settings.edgeRatio
      || distance > this.settings.visionRange * this.settings.edgeRatio;

    state.inRange = inRange;
    state.inFov = inFov;
    state.blocked = blocked;

    if (!inRange || !inFov) state.visibility = 'FUERA';
    else if (blocked) state.visibility = 'BLOQUEADO POR PARED';
    else if (inside && nearEdge) state.visibility = 'CERCA DEL LÍMITE';
    else state.visibility = 'DETECTADO';

    return state;
  }

  _lineBlocked(enemyPosition, direction, distance) {
    if (this._walls.length === 0) return false;
    this._origin.set(enemyPosition.x, 1, enemyPosition.z);
    this._raycaster.set(this._origin, direction);
    this._raycaster.far = distance;
    const hits = this._raycaster.intersectObjects(this._walls, false);
    return hits.length > 0 && hits[0].distance < distance - LOS_SLACK;
  }
}
