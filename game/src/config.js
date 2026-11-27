// config.js — every fixed number PARDON RUN plays by, in one place: the field, the turkey, the
// farmer, the three stages of the run and the score. Rendering and rules both read from here, so
// tuning the game means changing this file only.

// The canvas is a fixed 1280x720 stage; index.html scales it to the window.
export const VIEW = { width: 1280, height: 720 };

// The dirt line the whole run happens on: everything stands on GROUND_Y.
export const GROUND_Y = 612;
export const GROUND_HEIGHT = VIEW.height - GROUND_Y;

// How many scrolled pixels make one metre of the run, and how far freedom is.
export const PX_PER_M = 26;
export const GOAL_M = 1800;
export const GOAL_PX = GOAL_M * PX_PER_M;

export const TURKEY = {
  width: 82,
  height: 58,
  duckHeight: 38,
  startX: 250,
  minX: 120,
  maxX: 470,
  moveSpeed: 370, // sideways, px/s
  gravity: 2900,
  jumpVelocity: -1180,
  doubleJumpVelocity: -1020,
  maxJumps: 2,
};

export const FARMER = {
  startGap: 350, // px of daylight between the farmer's hands and the turkey's tail
  maxGap: 430,
  catchGap: 26, // at or under this, the farmer has the turkey
  cornRelief: 26, // gap bought back by one corn cob
  stumbleSurge: 78, // gap the farmer gains when the turkey trips
  // The chase tightens as the run speeds up: the gap decays at this many px/s, plus a share of
  // however far the current speed is past the opening speed.
  baseDecay: 5.5,
  decayPerExtraSpeed: 0.021,
};

export const RUN = {
  startSpeed: 335, // world scroll, px/s
  maxSpeed: 655,
  speedPerMeter: 0.16, // added per metre run
  startHearts: 3,
  invulnerableSeconds: 1.25,
  stumbleSeconds: 0.55,
};

// The run crosses three yards, each harder than the last. `kinds` is what the spawner may drop
// there; `knife` only appears from the barnyard on, and `oven` only in the kitchen yard.
export const STAGES = [
  { name: 'DAWN FARMYARD', untilM: 600, kinds: ['fence', 'barrel'] },
  { name: 'THE BARNYARD', untilM: 1200, kinds: ['fence', 'barrel', 'knife', 'barrel'] },
  { name: 'KITCHEN YARD', untilM: GOAL_M, kinds: ['barrel', 'knife', 'oven', 'fence', 'knife'] },
];

export const SCORE = {
  perMeter: 1,
  perCorn: 50,
  perCloseCall: 25, // a carving knife that lands within a wing's breadth and misses
};

export const STEP = 1 / 60; // the fixed step the screenshot scenes and the pilot run on
