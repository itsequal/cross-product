/** Tunable simulation parameters. Angles in code are radians; degrees live only here and in the HUD. */
export const SETTINGS = {
  playerSpeed: 4,
  enemyRotationSpeed: 0.55,
  enemySweepRadians: 1.05,
  visionRange: 10,
  fovDegrees: 70,
  arenaSize: 20,
  playerRadius: 0.4,
  goalRadius: 1.15,
  /** Inside the cone, the outer 20% of angle or range is a warning, not a catch. */
  edgeRatio: 0.8,
  colors: {
    forward: 0x3ddc97,
    toPlayer: 0x4aa3ff,
    cross: 0xb07cff,
    angle: 0xf0c14a,
    fovOutside: 0x6fbf8b,
    fovEdge: 0xe2b340,
    fovDetected: 0xe24b4b,
    fovBlocked: 0x6a8caf,
    player: 0x4aa3ff,
    enemy: 0xe07a3d,
    goal: 0x3ecf8e,
    floor: 0x2a3138,
    wall: 0x546170,
    wallEdge: 0x9aabba,
  },
};

export const CAMERA = {
  game: {
    position: [0, 26, 20],
    target: [0, 0, 0],
    fov: 38,
  },
};

export const LEVEL = {
  playerStart: { x: -8, z: 7 },
  enemyStart: { x: 0, z: 0 },
  /** Center of the sweep. yaw 135° looks toward +X / -Z (the route to the goal). */
  enemyBaseYaw: Math.PI * 0.75,
  goal: { x: 8.4, z: -8.4 },
  walls: [
    { x: -3.2, z: 1.5, w: 1, d: 4.2, h: 1.8 },
    { x: 1.6, z: -1.3, w: 4.6, d: 1, h: 1.8 },
    { x: 4.3, z: 3.2, w: 1, d: 3.4, h: 1.8 },
  ],
};
