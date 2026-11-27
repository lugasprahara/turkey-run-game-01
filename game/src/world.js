// world.js — PARDON RUN's rules: the state of one run and the fixed step that advances it.
// The turkey runs right across three yards toward the Pardon Gate, 1,800 metres away. The world
// scrolls past it; the player steers the turkey sideways, jumps and ducks. Fences, cranberry
// barrels and ovens are jumped; carving knives fall from the sky on a telegraphed column and are
// dodged sideways. Corn cobs are score and breathing room: each one pushes the chasing farmer
// back. Trip and the farmer surges; let him reach the turkey, or lose all three hearts, and the
// run ends on a platter. Rendering only reads this state; input only feeds it.

import {
  FARMER,
  GOAL_M,
  GROUND_Y,
  PX_PER_M,
  RUN,
  SCORE,
  STAGES,
  TURKEY,
  VIEW,
} from './config.js';
import { createRng } from './rng.js';

export const KIND_FENCE = 'fence';
export const KIND_BARREL = 'barrel';
export const KIND_KNIFE = 'knife';
export const KIND_OVEN = 'oven';
export const KIND_CORN = 'corn';

export const RESULT_CAUGHT_FARMER = 'caught-farmer';
export const RESULT_CAUGHT_BATTERED = 'caught-battered';
export const RESULT_ESCAPED = 'escaped';

// Obstacle footprints, by kind: width and height in px, standing on GROUND_Y.
const FOOTPRINTS = {
  [KIND_FENCE]: { width: 56, height: 48 },
  [KIND_BARREL]: { width: 52, height: 52 },
  [KIND_OVEN]: { width: 102, height: 78 },
  [KIND_KNIFE]: { width: 16, height: 58 },
};

const KNIFE_WARN_SECONDS = 0.78;
const KNIFE_FALL_SPEED = 1650;
const KNIFE_STUCK_SECONDS = 0.5;

export function stageIndexFor(distanceM) {
  for (let index = 0; index < STAGES.length; index += 1) {
    if (distanceM < STAGES[index].untilM) return index;
  }
  return STAGES.length - 1;
}

export function createWorld(seed) {
  const state = {
    rng: createRng(seed),
    mode: 'title', // 'title' | 'play' | 'over'
    result: null,
    time: 0,
    distancePx: 0,
    distanceM: 0,
    score: 0,
    cornEaten: 0,
    hearts: RUN.startHearts,
    gap: FARMER.startGap,
    speed: RUN.startSpeed,
    stageIndex: 0,
    turkey: {
      x: TURKEY.startX,
      y: GROUND_Y - TURKEY.height,
      vy: 0,
      jumps: 0,
      grounded: true,
      ducking: false,
      invulnerable: 0,
      stumbling: 0,
    },
    obstacles: [],
    corns: [],
    particles: [],
    popups: [], // floating score notes ({x, y, text, age, life}), drawn by the renderer
    events: [],
    banner: null, // { text, until } while a stage name is being announced
    flash: 0, // red edge flash right after a hit
    nextSpawnIn: 300, // px of travel before the first spawn
  };
  return state;
}

/** Back to the start line for a fresh run, keeping the world's rng stream moving. */
export function resetRun(state) {
  const fresh = createWorld(1);
  state.mode = 'play';
  state.result = null;
  state.time = 0;
  state.distancePx = 0;
  state.distanceM = 0;
  state.score = 0;
  state.cornEaten = 0;
  state.hearts = RUN.startHearts;
  state.gap = FARMER.startGap;
  state.speed = RUN.startSpeed;
  state.stageIndex = 0;
  state.turkey = fresh.turkey;
  state.obstacles = [];
  state.corns = [];
  state.particles = [];
  state.popups = [];
  state.events = [];
  state.banner = { text: STAGES[0].name, until: 2.2 };
  state.flash = 0;
  state.nextSpawnIn = 300;
}

function turkeyHeight(state) {
  return state.turkey.ducking ? TURKEY.duckHeight : TURKEY.height;
}

/** The turkey's collision box, a little kinder than its feathers. */
function turkeyBox(state) {
  const height = turkeyHeight(state);
  return {
    x: state.turkey.x + 10,
    y: GROUND_Y - height === state.turkey.y ? state.turkey.y + 4 : state.turkey.y + 2,
    width: TURKEY.width - 20,
    height: height - 4,
  };
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function spawnObstacle(state) {
  const stage = STAGES[state.stageIndex];
  const kind = state.rng.pick(stage.kinds);
  if (kind === KIND_KNIFE) {
    state.obstacles.push({
      kind,
      x: Math.min(VIEW.width - 30, state.turkey.x + state.rng.range(430, 640)),
      y: -80,
      phase: 'warn',
      timer: KNIFE_WARN_SECONDS,
      spin: 0,
    });
    return;
  }
  const print = FOOTPRINTS[kind];
  state.obstacles.push({
    kind,
    x: VIEW.width + 70,
    y: GROUND_Y - print.height,
    width: print.width,
    height: print.height,
    spin: state.rng.range(0, Math.PI * 2),
  });
}

function spawnCornRow(state) {
  const floating = state.stageIndex > 0 && state.rng.next() < 0.5;
  const centreY = floating ? GROUND_Y - 178 : GROUND_Y - 30;
  const startX = VIEW.width + 70;
  const count = state.rng.int(3, 5);
  for (let index = 0; index < count; index += 1) {
    state.corns.push({ kind: KIND_CORN, x: startX + index * 48, y: centreY, taken: false });
  }
}

function burstFeathers(state) {
  for (let index = 0; index < 9; index += 1) {
    state.particles.push({
      x: state.turkey.x + TURKEY.width / 2,
      y: state.turkey.y + 20,
      vx: state.rng.range(-160, 60),
      vy: state.rng.range(-260, -40),
      life: state.rng.range(0.4, 0.8),
      age: 0,
      size: state.rng.range(3, 6),
    });
  }
}

function endRun(state, result) {
  state.mode = 'over';
  state.result = result;
  state.events.push(result === RESULT_ESCAPED ? 'escaped' : 'caught');
}

function hitObstacle(state) {
  const turkey = state.turkey;
  turkey.invulnerable = RUN.invulnerableSeconds;
  turkey.stumbling = RUN.stumbleSeconds;
  state.hearts -= 1;
  state.gap = Math.max(0, state.gap - FARMER.stumbleSurge);
  state.flash = 0.35;
  burstFeathers(state);
  state.events.push('hit');
  if (state.hearts <= 0) endRun(state, RESULT_CAUGHT_BATTERED);
  else if (state.gap <= FARMER.catchGap) endRun(state, RESULT_CAUGHT_FARMER);
}

/**
 * Advance the world by dt seconds under `input` ({left, right, duck, jumpPressed}).
 * Events the step raises are pushed onto state.events for the caller to drain (sounds, mostly).
 */
export function stepWorld(state, dt, input) {
  state.time += dt;
  for (const particle of state.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 900 * dt;
  }
  state.particles = state.particles.filter((particle) => particle.age < particle.life);
  for (const popup of state.popups) {
    popup.age += dt;
    popup.y -= 44 * dt; // score notes float up and fade
  }
  state.popups = state.popups.filter((popup) => popup.age < popup.life);
  if (state.mode !== 'play') return;

  const turkey = state.turkey;
  if (turkey.invulnerable > 0) turkey.invulnerable -= dt;
  if (turkey.stumbling > 0) turkey.stumbling -= dt;
  if (state.flash > 0) state.flash -= dt;

  // Speed: the longer the run, the faster the yard scrolls; a stumble halves it briefly.
  const ramped = Math.min(RUN.maxSpeed, RUN.startSpeed + state.distanceM * RUN.speedPerMeter);
  state.speed = turkey.stumbling > 0 ? ramped * 0.45 : ramped;
  const travel = state.speed * dt;
  state.distancePx += travel;
  state.distanceM = state.distancePx / PX_PER_M;
  state.score += (travel / PX_PER_M) * SCORE.perMeter;

  // Stages: crossing into a new yard raises its banner.
  const stageIndex = stageIndexFor(state.distanceM);
  if (stageIndex !== state.stageIndex) {
    state.stageIndex = stageIndex;
    state.banner = { text: STAGES[stageIndex].name, until: state.time + 2.2 };
    state.events.push('stage');
  }
  if (state.banner !== null && state.time > state.banner.until) state.banner = null;

  // The farmer gains a little ground every second, faster as the run speeds up.
  const decay = FARMER.baseDecay + Math.max(0, ramped - RUN.startSpeed) * FARMER.decayPerExtraSpeed;
  state.gap -= decay * dt;
  if (state.gap <= FARMER.catchGap) {
    endRun(state, RESULT_CAUGHT_FARMER);
    return;
  }

  // Turkey, sideways.
  if (input.left) turkey.x -= TURKEY.moveSpeed * dt;
  if (input.right) turkey.x += TURKEY.moveSpeed * dt;
  turkey.x = Math.min(TURKEY.maxX, Math.max(TURKEY.minX, turkey.x));

  // Turkey, vertical: jump and double jump; ducking on the ground shrinks it, in the air it
  // slams the turkey down.
  turkey.ducking = input.duck && turkey.grounded;
  if (input.jumpPressed && turkey.jumps < TURKEY.maxJumps) {
    turkey.vy = turkey.jumps === 0 ? TURKEY.jumpVelocity : TURKEY.doubleJumpVelocity;
    turkey.jumps += 1;
    turkey.grounded = false;
    turkey.ducking = false;
    state.events.push(turkey.jumps === 1 ? 'jump' : 'doubleJump');
  }
  if (!turkey.grounded) {
    const gravity = TURKEY.gravity * (input.duck ? 2.3 : 1);
    turkey.vy += gravity * dt;
    turkey.y += turkey.vy * dt;
    const standingY = GROUND_Y - TURKEY.height;
    if (turkey.y >= standingY) {
      turkey.y = standingY;
      turkey.vy = 0;
      turkey.grounded = true;
      turkey.jumps = 0;
    }
  } else {
    turkey.y = GROUND_Y - turkeyHeight(state);
  }

  // Spawning: obstacles and corn rows arrive on travelled distance, never on top of each other.
  state.nextSpawnIn -= travel;
  if (state.nextSpawnIn <= 0) {
    if (state.rng.next() < 0.32) spawnCornRow(state);
    else spawnObstacle(state);
    const tightening = Math.max(0, 1 - state.distanceM / GOAL_M);
    state.nextSpawnIn = state.rng.range(330, 600) * (0.72 + 0.28 * tightening);
  }

  // Obstacles scroll with the world; knives run their warn -> fall -> stuck phases.
  const box = turkeyBox(state);
  for (const obstacle of state.obstacles) {
    if (obstacle.kind === KIND_KNIFE) {
      if (obstacle.phase === 'warn') {
        obstacle.x -= travel;
        obstacle.timer -= dt;
        if (obstacle.timer <= 0) {
          obstacle.phase = 'fall';
          obstacle.y = -70;
          state.events.push('knife');
        }
      } else if (obstacle.phase === 'fall') {
        obstacle.y += KNIFE_FALL_SPEED * dt;
        obstacle.spin += dt * 3;
        if (obstacle.y >= GROUND_Y - FOOTPRINTS[KIND_KNIFE].height) {
          obstacle.y = GROUND_Y - FOOTPRINTS[KIND_KNIFE].height;
          obstacle.phase = 'stuck';
          obstacle.timer = KNIFE_STUCK_SECONDS;
          // A knife that thunks into the dirt within a wing's breadth of the turkey — and
          // misses — was a close call: points, and a note that floats up where it landed.
          const centre = state.turkey.x + TURKEY.width / 2;
          if (turkey.invulnerable <= 0 && Math.abs(obstacle.x - centre) <= 120) {
            state.score += SCORE.perCloseCall;
            state.popups.push({ x: obstacle.x, y: GROUND_Y - 128, text: `CLOSE! +${SCORE.perCloseCall}`, age: 0, life: 0.9 });
            state.events.push('close');
          }
        }
      } else {
        obstacle.x -= travel;
        obstacle.timer -= dt;
      }
      const knifeBox =
        obstacle.phase === 'warn'
          ? null
          : { x: obstacle.x - 6, y: obstacle.y, width: FOOTPRINTS[KIND_KNIFE].width + 4, height: FOOTPRINTS[KIND_KNIFE].height };
      if (knifeBox !== null && turkey.invulnerable <= 0 && boxesOverlap(box, knifeBox)) hitObstacle(state);
    } else {
      obstacle.x -= travel;
      obstacle.spin += (travel / 26) * (obstacle.kind === KIND_BARREL ? 1 : 0);
      // The collision box is a few px kinder than the drawing on every side: a graze is a graze.
      const kindBox = { x: obstacle.x + 5, y: obstacle.y + 5, width: obstacle.width - 10, height: obstacle.height - 5 };
      if (turkey.invulnerable <= 0 && boxesOverlap(box, kindBox)) hitObstacle(state);
    }
  }
  state.obstacles = state.obstacles.filter(
    (obstacle) => obstacle.x > -140 && !(obstacle.kind === KIND_KNIFE && obstacle.phase === 'stuck' && obstacle.timer <= 0),
  );

  // Corn: scrolls, and feeds the turkey (and its lead) when touched.
  for (const corn of state.corns) {
    corn.x -= travel;
    if (!corn.taken && boxesOverlap(box, { x: corn.x - 14, y: corn.y - 14, width: 28, height: 28 })) {
      corn.taken = true;
      state.cornEaten += 1;
      state.score += SCORE.perCorn;
      state.gap = Math.min(FARMER.maxGap, state.gap + FARMER.cornRelief);
      state.events.push('corn');
    }
  }
  state.corns = state.corns.filter((corn) => !corn.taken && corn.x > -40);

  // Freedom.
  if (state.distanceM >= GOAL_M) endRun(state, RESULT_ESCAPED);
}
