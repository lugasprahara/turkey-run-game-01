// rng.js — a tiny seeded random number generator (mulberry32). The world draws every random
// choice from one of these, so a run — and every screenshot scene — is exactly reproducible from
// its seed: same seed, same fences, same knives, same frame.

export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return {
    /** Next float in [0, 1). */
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Next float in [min, max). */
    range(min, max) {
      return min + this.next() * (max - min);
    },
    /** Next integer in [min, max], both ends included. */
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    /** One element of a non-empty array. */
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
  };
}
