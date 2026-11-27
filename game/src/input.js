// input.js — the keyboard and mouse, read as one small state object the world steps from.
// Arrows and WASD both steer; Space, ArrowUp and W jump; ArrowDown and S duck (and slam a jump
// short); P or Esc pauses; M mutes; Enter starts and restarts. A mouse click or tap is the
// context action: start on the title screen, jump while running, restart on an end screen.
// jumpPressed is an edge: it is true only for the step in which the key went down, and the game
// loop clears it after each step with clearEdges().

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const DUCK_KEYS = new Set(['ArrowDown', 'KeyS']);

export function createInput() {
  const input = {
    left: false,
    right: false,
    duck: false,
    jumpPressed: false,
    actionPressed: false, // Enter or click: start / restart
    pausePressed: false,
    mutePressed: false,
  };

  const held = new Set();

  function refresh() {
    input.left = [...held].some((code) => LEFT_KEYS.has(code));
    input.right = [...held].some((code) => RIGHT_KEYS.has(code));
    input.duck = [...held].some((code) => DUCK_KEYS.has(code));
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (JUMP_KEYS.has(event.code) || DUCK_KEYS.has(event.code)) event.preventDefault();
      return;
    }
    held.add(event.code);
    if (JUMP_KEYS.has(event.code)) {
      input.jumpPressed = true;
      event.preventDefault();
    }
    if (DUCK_KEYS.has(event.code)) event.preventDefault();
    if (event.code === 'Enter') input.actionPressed = true;
    if (event.code === 'KeyP' || event.code === 'Escape') input.pausePressed = true;
    if (event.code === 'KeyM') input.mutePressed = true;
    refresh();
  });

  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    refresh();
  });

  window.addEventListener('blur', () => {
    held.clear();
    refresh();
  });

  window.addEventListener('pointerdown', () => {
    input.jumpPressed = true;
    input.actionPressed = true;
  });

  return input;
}

/** Drop the one-step edges after the world has had its step with them. */
export function clearEdges(input) {
  input.jumpPressed = false;
  input.actionPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
}
