// main.js — PARDON RUN's wiring: the canvas, the clock, the input, the sound, and the screens.
// The world (world.js) holds the rules, the renderer (render.js) paints what the world says, and
// this file runs the loop between them at a fixed step, turns world events into sound effects,
// and moves between title, play, pause and the end screens. With ?shot=<scene>&seed=<n> in the
// address it instead stages one deterministic frame from shots.js and stops — that is how the
// entry's screenshots are taken.

import { STEP, VIEW } from './config.js';
import { createWorld, resetRun, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, drawFrame } from './render.js';
import { clearEdges, createInput } from './input.js';
import { isMuted, sfx, toggleMuted, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const BEST_KEY = 'pardon-run-best';
let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  best = 0; // storage can be refused (private windows, hosted frames); the game plays on
}

function saveBest(score) {
  best = Math.max(best, Math.floor(score));
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // A best that cannot be saved is forgotten at the door; nothing else changes.
  }
}

const EVENT_SOUNDS = {
  jump: sfx.jump,
  doubleJump: sfx.doubleJump,
  corn: sfx.corn,
  hit: sfx.hit,
  knife: sfx.knife,
  close: sfx.close,
  stage: sfx.stage,
  caught: sfx.caught,
  escaped: sfx.escaped,
};

function drainEvents(state) {
  for (const event of state.events) EVENT_SOUNDS[event]?.();
  state.events.length = 0;
}

function announce(text) {
  if (status !== null) status.textContent = text;
}

// Screenshot mode: stage the one frame and stop; the page is then a still of the real game.
const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  const { state, screen, best: shotBest } = stageShot(params.get('shot') ?? 'title', Number(params.get('seed') ?? 1));
  drawFrame(ctx, state, screen, shotBest);
  announce('PARDON RUN screenshot scene');
} else {
  const input = createInput();
  const state = createWorld((Date.now() % 90000) + 7);
  let screen = SCREEN_TITLE;
  let paused = false;
  let last = performance.now();
  let accumulator = 0;

  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('pointerdown', unlockAudio);

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25; // a stalled tab must not teleport the turkey

    if (input.mutePressed) {
      toggleMuted();
      announce(isMuted() ? 'Sound off' : 'Sound on');
    }

    if (screen === SCREEN_TITLE) {
      stepWorld(state, Math.min(elapsed, 0.05), { left: false, right: false, duck: false, jumpPressed: false });
      if (input.actionPressed || input.jumpPressed) {
        resetRun(state);
        screen = SCREEN_PLAY;
        paused = false;
        announce('The run begins: reach the Pardon Gate');
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.pausePressed) {
        paused = !paused;
        announce(paused ? 'Paused' : 'Running again');
      }
      if (!paused) {
        accumulator += elapsed;
        let first = true;
        while (accumulator >= STEP) {
          stepWorld(state, STEP, {
            left: input.left,
            right: input.right,
            duck: input.duck,
            jumpPressed: first ? input.jumpPressed : false,
          });
          accumulator -= STEP;
          first = false;
          if (state.mode === 'over') break;
        }
        drainEvents(state);
        if (state.mode === 'over') {
          saveBest(state.score);
          screen = SCREEN_OVER;
          announce(state.result === 'escaped' ? 'Pardoned! You escaped' : 'Caught! The run is over');
        }
      }
    } else if (screen === SCREEN_OVER) {
      stepWorld(state, Math.min(elapsed, 0.05), { left: false, right: false, duck: false, jumpPressed: false });
      if (input.actionPressed) {
        resetRun(state);
        screen = SCREEN_PLAY;
        paused = false;
        announce('Another run begins');
      }
    }

    drawFrame(ctx, state, paused && screen === SCREEN_PLAY ? SCREEN_PAUSE : screen, best);
    clearEdges(input);
  }
  requestAnimationFrame(frame);
}
