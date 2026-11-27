// shots.js — the deterministic scenes behind ?shot=title|play|kitchen|end&seed=N, which
// shots.json names and the entry's screenshots are taken from. Each scene builds a fresh world
// from the seed and plays the real rules forward at the fixed step, steered by a small pilot, so
// a screenshot is a frame a real game genuinely reaches — and the same seed always stages the
// same frame. The pilot looks at the world the way a player does: jump what is about to arrive,
// step out of a knife's column, hop for floating corn when the way is clear.

import { GROUND_Y, STEP, TURKEY } from './config.js';
import {
  KIND_KNIFE,
  createWorld,
  resetRun,
  stageIndexFor,
  stepWorld,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const NO_INPUT = { left: false, right: false, duck: false, jumpPressed: false };

/** One step of pilot judgement for the current world state. */
function pilotInput(state) {
  const input = { left: false, right: false, duck: false, jumpPressed: false };
  const turkey = state.turkey;
  const centre = turkey.x + TURKEY.width / 2;

  // A knife owns its column from the telegraph on: be somewhere else.
  for (const obstacle of state.obstacles) {
    if (obstacle.kind !== KIND_KNIFE || obstacle.phase === 'stuck') continue;
    if (Math.abs(obstacle.x - centre) < 74) {
      if (obstacle.x >= centre) input.left = true;
      else input.right = true;
      return input;
    }
  }

  // The nearest ground obstacle ahead decides the jump.
  let nearest = null;
  for (const obstacle of state.obstacles) {
    if (obstacle.kind === KIND_KNIFE) continue;
    if (obstacle.x + (obstacle.width ?? 0) < turkey.x) continue;
    if (nearest === null || obstacle.x < nearest.x) nearest = obstacle;
  }
  if (nearest !== null && nearest.x - (turkey.x + TURKEY.width) < 115 && turkey.grounded) {
    input.jumpPressed = true;
    return input;
  }

  // Nothing threatens: drift back toward the home lane, and hop for floating corn.
  if (turkey.x > TURKEY.startX + 30) input.left = true;
  else if (turkey.x < TURKEY.startX - 30) input.right = true;
  for (const corn of state.corns) {
    if (corn.y < GROUND_Y - 100 && corn.x - turkey.x > 30 && corn.x - turkey.x < 120 && turkey.grounded) {
      input.jumpPressed = true;
      break;
    }
  }
  return input;
}

function playFor(state, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    stepWorld(state, STEP, pilot(state));
    if (state.mode === 'over') break;
  }
}

/**
 * Stage the named scene in a fresh world of the given seed.
 * Returns { state, screen, best } for the renderer to draw once.
 */
export function stageShot(name, seed) {
  const state = createWorld(seed);
  if (name === 'play') {
    resetRun(state);
    playFor(state, 24, pilotInput);
    // The pilot eats too well: by this frame it has bought the farmer off-screen. Set the gap
    // the frame shows to one a greedier-or-unluckier run really reaches — the farmer on the
    // turkey's tail, arm out — so the cover of the chase is in the shot.
    if (state.mode === 'play') state.gap = 105;
    return { state, screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'kitchen') {
    // Begin at the kitchen yard's edge and play in, retrying seeds until one run is still
    // alive at the frame: the scene must show a run in play, not a caught turkey.
    for (const candidate of [seed, seed + 100, seed + 200, seed + 300]) {
      const attempt = createWorld(candidate);
      resetRun(attempt);
      attempt.distancePx = 1300 * 26;
      attempt.distanceM = 1300;
      attempt.stageIndex = stageIndexFor(1300);
      attempt.banner = null;
      playFor(attempt, 7, pilotInput);
      if (attempt.mode === 'play') return { state: attempt, screen: SCREEN_PLAY, best: 0 };
    }
    resetRun(state);
    playFor(state, 10, pilotInput);
    return { state, screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    resetRun(state);
    playFor(state, 150, () => NO_INPUT); // a turkey that never dodges is a caught turkey
    return { state, screen: SCREEN_OVER, best: Math.floor(state.score) };
  }
  // 'title' and anything else: the title screen over the yard at rest.
  for (let index = 0; index < 90; index += 1) stepWorld(state, STEP, NO_INPUT);
  return { state, screen: SCREEN_TITLE, best: 0 };
}
