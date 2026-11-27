// render.js — everything PARDON RUN draws, and nothing else: it reads the world state and paints
// one frame. Three yards go by in parallax (a far silhouette line, a fence-and-hay middle line,
// the dirt itself), then the Pardon Gate when it nears, the corn, the hazards, the farmer and the
// turkey, the feather particles, and over it all the HUD and whichever screen is up. All art is
// canvas paths in an autumn palette — no image files, so the game loads nothing.

import {
  FARMER,
  GOAL_M,
  GOAL_PX,
  GROUND_HEIGHT,
  GROUND_Y,
  RUN,
  STAGES,
  TURKEY,
  VIEW,
} from './config.js';
import {
  KIND_BARREL,
  KIND_CORN,
  KIND_FENCE,
  KIND_KNIFE,
  KIND_OVEN,
  RESULT_CAUGHT_BATTERED,
  RESULT_ESCAPED,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

const DISPLAY_FONT = 'Georgia, "Times New Roman", serif';
const HUD_FONT = 'Verdana, Geneva, sans-serif';

// One sky per yard: dawn over the farmyard, amber over the barnyard, dusk over the kitchen yard.
const SKIES = [
  { top: '#8ec9e8', horizon: '#ffd98e', sun: '#fff3b0', far: '#c98d5f', mid: '#a06a35' },
  { top: '#7ec3ee', horizon: '#ffe3a3', sun: '#fff7c0', far: '#b87f4e', mid: '#96602c' },
  { top: '#7a6fb0', horizon: '#ff9d5c', sun: '#ffd166', far: '#8a5570', mid: '#7c4a26' },
];

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The turkey, facing right, origin at its box's top-left. Legs pump with runPhase. */
export function drawTurkey(ctx, state) {
  const turkey = state.turkey;
  const ducking = turkey.ducking;
  const airborne = !turkey.grounded;
  const x = turkey.x;
  const bottom = turkey.y + TURKEY.height;
  const squash = ducking ? 0.68 : 1;
  const bob = state.mode === 'title' ? Math.sin(state.time * 2.2) * 2 : 0;

  ctx.save();
  ctx.translate(x + TURKEY.width / 2, bottom + bob);
  ctx.scale(1, squash);
  ctx.translate(-TURKEY.width / 2, -TURKEY.height);
  if (turkey.invulnerable > 0 && state.mode === 'play' && Math.floor(state.time * 14) % 2 === 0) {
    ctx.globalAlpha = 0.45; // the blink of a turkey that just tripped
  }

  // Legs: two orange sticks trading places as it runs, tucked when it flies.
  ctx.strokeStyle = '#e07b26';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const stride = airborne ? 0.3 : Math.sin(state.distancePx * 0.055) * 9;
  for (const [hipX, phase] of [
    [30, stride],
    [52, -stride],
  ]) {
    const footY = airborne ? TURKEY.height - 6 : TURKEY.height - 1;
    ctx.beginPath();
    ctx.moveTo(hipX, TURKEY.height - 14);
    ctx.lineTo(hipX + phase * 0.5, (TURKEY.height - 14 + footY) / 2);
    ctx.lineTo(hipX + phase, footY);
    ctx.stroke();
  }

  // Tail: a fan of five feathers at the back, cream-tipped autumn brown.
  for (let index = 0; index < 5; index += 1) {
    const angle = (-58 + index * 24) * (Math.PI / 180);
    ctx.save();
    ctx.translate(14, 30);
    ctx.rotate(angle);
    ellipse(ctx, -13, 0, 15, 5.5, index % 2 === 0 ? '#8a4f24' : '#a8642f');
    ellipse(ctx, -24, 0, 4.5, 4.5, '#f3e2bb');
    ctx.restore();
  }

  // Body and wing.
  ellipse(ctx, 44, 34, 31, 20, '#b06a35');
  ellipse(ctx, 40, 29, 24, 14, '#c07c40');
  ctx.save();
  ctx.translate(42, 34);
  ctx.rotate(airborne ? Math.sin(state.time * 26) * 0.5 : 0.12);
  ellipse(ctx, 0, 0, 17, 10, '#8a4f24');
  ctx.restore();

  // Neck, head, beak, wattle and one determined eye.
  ctx.strokeStyle = '#c07c40';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(66, 30);
  ctx.lineTo(74, 16);
  ctx.stroke();
  ellipse(ctx, 77, 13, 11.5, 10.5, '#e8c188');
  ctx.beginPath(); // beak
  ctx.moveTo(86, 10);
  ctx.lineTo(99, 14);
  ctx.lineTo(86, 18);
  ctx.closePath();
  ctx.fillStyle = '#f39c2c';
  ctx.fill();
  ellipse(ctx, 84, 22, 4, 6, '#d63b2f'); // wattle
  ctx.strokeStyle = '#d63b2f'; // snood over the beak
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(88, 6);
  ctx.lineTo(93, 11);
  ctx.stroke();
  ellipse(ctx, 79, 11, 2.4, 2.4, '#1d130a');
  ellipse(ctx, 80, 10, 0.9, 0.9, '#ffffff');
  ctx.restore();
}

/** The farmer, chasing from the left at the gap the world keeps, carving fork in hand. */
export function drawFarmer(ctx, state) {
  // On the title screen he lurks closer than the chase gap, so both stars of the show are in frame.
  const gap = state.mode === 'title' ? Math.min(state.gap, 190) : Math.max(state.gap, 0);
  const x = state.turkey.x - gap - 58;
  const ground = GROUND_Y;
  const running = state.mode === 'play';
  const stride = running ? Math.sin(state.distancePx * 0.06) * 11 : 0;
  const reach = gap < 130 ? (130 - gap) / 130 : 0; // the nearer he gets, the longer the arm

  ctx.save();
  ctx.translate(x, ground);
  // Legs in boots, pumping.
  ctx.strokeStyle = '#2e3d5c';
  ctx.lineWidth = 8;
  for (const phase of [stride, -stride]) {
    ctx.beginPath();
    ctx.moveTo(30, -52);
    ctx.lineTo(30 + phase * 0.6, -26);
    ctx.lineTo(30 + phase, -2);
    ctx.stroke();
    ctx.strokeStyle = '#4a2f18';
    ctx.beginPath();
    ctx.moveTo(30 + phase, -2);
    ctx.lineTo(38 + phase, -2);
    ctx.stroke();
    ctx.strokeStyle = '#2e3d5c';
  }
  // Overalls and plaid shirt.
  roundRect(ctx, 12, -96, 38, 48, 6);
  ctx.fillStyle = '#3c5a8a';
  ctx.fill();
  roundRect(ctx, 8, -104, 46, 22, 6);
  ctx.fillStyle = '#c8452c';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (const lineX of [18, 30, 42]) {
    ctx.beginPath();
    ctx.moveTo(lineX, -104);
    ctx.lineTo(lineX, -82);
    ctx.stroke();
  }
  // Back arm pumping; front arm reaching with the carving fork.
  ctx.strokeStyle = '#c8452c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(14, -98);
  ctx.lineTo(2, -78 + stride * 0.4);
  ctx.stroke();
  const handX = 52 + reach * 30;
  const handY = -88 + reach * 8;
  ctx.beginPath();
  ctx.moveTo(48, -98);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  ctx.strokeStyle = '#d8dde3'; // the fork: handle and two prongs
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(handX + 16, handY - 4);
  ctx.moveTo(handX + 16, handY - 9);
  ctx.lineTo(handX + 24, handY - 8);
  ctx.moveTo(handX + 16, handY + 1);
  ctx.lineTo(handX + 24, handY + 2);
  ctx.stroke();
  // Head under a straw hat, jaw set.
  ellipse(ctx, 31, -114, 12, 12, '#e8b08a');
  ellipse(ctx, 31, -124, 21, 5, '#e8c95c');
  roundRect(ctx, 19, -133, 24, 9, 4);
  ctx.fillStyle = '#d9b84a';
  ctx.fill();
  ellipse(ctx, 36, -115, 2, 2.4, '#1d130a');
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, -107);
  ctx.lineTo(43, -107);
  ctx.stroke();
  if (reach > 0.4) {
    ctx.fillStyle = '#d63b2f';
    ctx.font = `bold 30px ${DISPLAY_FONT}`;
    ctx.fillText('!', 62 + reach * 30, -118);
  }
  ctx.restore();
}

function drawFence(ctx, obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, GROUND_Y);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(4, -48, 8, 48);
  ctx.fillRect(44, -48, 8, 48);
  ctx.fillStyle = '#a06a35';
  ctx.fillRect(0, -42, 56, 9);
  ctx.fillRect(0, -22, 56, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, -33, 56, 3);
  ctx.restore();
}

function drawBarrel(ctx, obstacle) {
  ctx.save();
  ctx.translate(obstacle.x + 26, GROUND_Y - 26);
  ctx.rotate(0); // bands shift with spin instead of rolling the whole barrel
  ellipse(ctx, 0, 0, 26, 26, '#a03d2a');
  ellipse(ctx, 0, 0, 19, 19, '#b84a32');
  ctx.strokeStyle = '#5f2317';
  ctx.lineWidth = 4;
  for (const offset of [-13, 13]) {
    ctx.beginPath();
    ctx.moveTo(offset + Math.sin(obstacle.spin) * 2, -24);
    ctx.lineTo(offset + Math.sin(obstacle.spin) * 2, 24);
    ctx.stroke();
  }
  ctx.fillStyle = '#d64533'; // cranberries peeking over the rim
  for (const [dotX, dotY] of [
    [-9, -22],
    [2, -25],
    [12, -21],
  ]) {
    ellipse(ctx, dotX, dotY, 4, 4, '#d64533');
  }
  ctx.restore();
}

function drawOven(ctx, obstacle, time) {
  ctx.save();
  ctx.translate(obstacle.x, GROUND_Y);
  roundRect(ctx, 0, -78, 102, 78, 8);
  ctx.fillStyle = '#3a3f4a';
  ctx.fill();
  roundRect(ctx, 16, -58, 70, 44, 6); // door with a glowing window: dinner's threat, lit
  ctx.fillStyle = '#22252c';
  ctx.fill();
  const glow = 0.75 + Math.sin(time * 9 + obstacle.x) * 0.25;
  roundRect(ctx, 24, -50, 54, 28, 4);
  ctx.fillStyle = `rgba(255, ${Math.floor(120 + glow * 60)}, 40, ${0.55 + glow * 0.3})`;
  ctx.fill();
  ctx.fillStyle = '#d8dde3';
  ctx.fillRect(8, -86, 10, 10); // chimney pipe base
  ctx.fillRect(4, -92, 18, 7);
  for (const knobX of [26, 46, 66]) ellipse(ctx, knobX + 6, -68, 3.5, 3.5, '#d8dde3');
  ctx.fillStyle = '#f3e2bb';
  ctx.font = `bold 11px ${HUD_FONT}`;
  ctx.fillText('HOT', 40, -6);
  ctx.restore();
}

function drawKnife(ctx, obstacle, time) {
  ctx.save();
  if (obstacle.phase === 'warn') {
    // The telegraph: a dashed line down the column and a glint at the top. Fair warning.
    ctx.strokeStyle = 'rgba(214,59,47,0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(obstacle.x, 8);
    ctx.lineTo(obstacle.x, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    const twinkle = 6 + Math.sin(time * 16) * 2.5;
    ctx.strokeStyle = '#fff6d8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(obstacle.x - twinkle, 16);
    ctx.lineTo(obstacle.x + twinkle, 16);
    ctx.moveTo(obstacle.x, 16 - twinkle);
    ctx.lineTo(obstacle.x, 16 + twinkle);
    ctx.stroke();
    ctx.fillStyle = '#d63b2f';
    ctx.font = `bold 22px ${DISPLAY_FONT}`;
    ctx.fillText('!', obstacle.x - 4, 48);
    ctx.restore();
    return;
  }
  ctx.translate(obstacle.x, obstacle.y);
  if (obstacle.phase === 'stuck') ctx.rotate(0.32);
  else ctx.rotate(Math.sin(obstacle.spin) * 0.14);
  // Blade down, handle up: a carving knife.
  ctx.beginPath();
  ctx.moveTo(-3, 58);
  ctx.lineTo(4, 58);
  ctx.lineTo(5, 18);
  ctx.quadraticCurveTo(5, 6, -4, 4);
  ctx.closePath();
  ctx.fillStyle = '#d8dde3';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-2, 22, 2.5, 30);
  roundRect(ctx, -4.5, -14, 9, 20, 3);
  ctx.fillStyle = '#5f3a1a';
  ctx.fill();
  ctx.restore();
}

function drawCorn(ctx, corn, time) {
  ctx.save();
  ctx.translate(corn.x, corn.y + Math.sin(time * 3 + corn.x * 0.05) * 2.5);
  ctx.rotate(-0.5);
  roundRect(ctx, -7, -14, 14, 28, 7);
  ctx.fillStyle = '#f7b733';
  ctx.fill();
  ctx.fillStyle = '#e09a1f';
  for (let row = -10; row <= 10; row += 6.5) {
    for (let col = -4; col <= 4; col += 4.5) ellipse(ctx, col, row, 1.4, 1.9, '#e09a1f');
  }
  ctx.strokeStyle = '#4e9b47'; // husk leaves
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.quadraticCurveTo(-11, 20, -13, 24);
  ctx.moveTo(4, 12);
  ctx.quadraticCurveTo(10, 19, 13, 22);
  ctx.stroke();
  ctx.restore();
}

function drawGate(ctx, state) {
  const gateX = state.turkey.x + (GOAL_PX - state.distancePx);
  if (gateX < -180 || gateX > VIEW.width + 60) return;
  ctx.save();
  ctx.translate(gateX, GROUND_Y);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-8, -190, 12, 190);
  ctx.fillRect(120, -190, 12, 190);
  // A golden arch and the word the whole run is for.
  ctx.strokeStyle = '#f7b733';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(58, -186, 62, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, -22, -238, 164, 40, 10);
  ctx.fillStyle = '#fff6d8';
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#7a4a00';
  ctx.font = `bold 25px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PARDON', 60, -209);
  ctx.restore();
}

function drawYard(ctx, state) {
  const art = SKIES[state.stageIndex];
  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gradient.addColorStop(0, art.top);
  gradient.addColorStop(1, art.horizon);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, GROUND_Y);

  ellipse(ctx, 1090, 96, 44, 44, art.sun); // sun
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; // clouds drift with time alone
  for (const [cloudX, cloudY, scale] of [
    [180, 84, 1],
    [560, 130, 0.7],
    [880, 66, 0.85],
  ]) {
    const drift = ((cloudX - state.time * 6) % (VIEW.width + 240)) - 120;
    ellipse(ctx, drift, cloudY, 44 * scale, 15 * scale, 'rgba(255,255,255,0.75)');
    ellipse(ctx, drift + 30 * scale, cloudY + 5 * scale, 32 * scale, 12 * scale, 'rgba(255,255,255,0.75)');
  }

  // Far line (parallax 0.18): the yard's buildings, one pattern per stage.
  ctx.fillStyle = art.far;
  const farOffset = -(state.distancePx * 0.18) % 940;
  for (let base = farOffset - 940; base < VIEW.width; base += 940) {
    if (state.stageIndex === 0) {
      ctx.fillRect(base + 80, GROUND_Y - 120, 190, 120); // barn
      ctx.beginPath();
      ctx.moveTo(base + 62, GROUND_Y - 120);
      ctx.lineTo(base + 175, GROUND_Y - 178);
      ctx.lineTo(base + 288, GROUND_Y - 120);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(base + 330, GROUND_Y - 168, 42, 168); // silo
      ellipse(ctx, base + 351, GROUND_Y - 168, 21, 12, art.far);
    } else if (state.stageIndex === 1) {
      ctx.fillRect(base + 120, GROUND_Y - 96, 150, 96); // low barn
      ctx.fillRect(base + 420, GROUND_Y - 190, 16, 190); // windmill post
      ctx.save();
      ctx.translate(base + 428, GROUND_Y - 196);
      ctx.rotate(state.time * 0.7);
      ctx.fillRect(-5, -52, 10, 104);
      ctx.fillRect(-52, -5, 104, 10);
      ctx.restore();
    } else {
      ctx.fillRect(base + 90, GROUND_Y - 140, 260, 140); // the farmhouse kitchen
      ctx.beginPath();
      ctx.moveTo(base + 74, GROUND_Y - 140);
      ctx.lineTo(base + 220, GROUND_Y - 196);
      ctx.lineTo(base + 366, GROUND_Y - 140);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(base + 290, GROUND_Y - 208, 26, 60); // chimney
      ctx.fillStyle = 'rgba(255,190,90,0.9)'; // lit windows: supper is being planned
      ctx.fillRect(base + 140, GROUND_Y - 96, 30, 34);
      ctx.fillRect(base + 220, GROUND_Y - 96, 30, 34);
      ctx.fillStyle = art.far;
    }
  }

  // Middle line (parallax 0.5): fence posts, hay and pumpkins.
  const midOffset = -(state.distancePx * 0.5) % 460;
  for (let base = midOffset - 460; base < VIEW.width; base += 460) {
    ctx.fillStyle = art.mid;
    ctx.fillRect(base + 20, GROUND_Y - 44, 7, 44);
    ctx.fillRect(base + 90, GROUND_Y - 44, 7, 44);
    ctx.fillRect(base + 8, GROUND_Y - 38, 100, 6);
    ellipse(ctx, base + 300, GROUND_Y - 20, 34, 20, '#d9a441'); // hay bale
    ellipse(ctx, base + 392, GROUND_Y - 13, 17, 13, '#e07b26'); // pumpkin
    ctx.strokeStyle = '#4e7a2e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(base + 392, GROUND_Y - 26);
    ctx.quadraticCurveTo(base + 396, GROUND_Y - 33, base + 402, GROUND_Y - 31);
    ctx.stroke();
    ctx.fillStyle = art.mid;
  }

  // The dirt itself, with a plank floor appearing in the kitchen yard.
  ctx.fillStyle = state.stageIndex === 2 ? '#8a5f36' : '#9c6b32';
  ctx.fillRect(0, GROUND_Y, VIEW.width, GROUND_HEIGHT);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  const dashOffset = -(state.distancePx % 90);
  for (let x = dashOffset; x < VIEW.width; x += 90) ctx.fillRect(x, GROUND_Y + 52, 46, 6);
  ctx.fillStyle = 'rgba(255,220,150,0.25)';
  ctx.fillRect(0, GROUND_Y, VIEW.width, 4);
  if (state.stageIndex === 2) {
    ctx.strokeStyle = 'rgba(60,35,10,0.35)';
    ctx.lineWidth = 2;
    const plankOffset = -(state.distancePx % 120);
    for (let x = plankOffset; x < VIEW.width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 6);
      ctx.lineTo(x, VIEW.height);
      ctx.stroke();
    }
  }
}

function drawHeart(ctx, x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-13, -4, -7, -15, 0, -8);
  ctx.bezierCurveTo(7, -15, 13, -4, 0, 8);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#e23b3b';
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,246,216,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state, best) {
  ctx.save();
  roundRect(ctx, 14, 12, 300, 66, 10);
  ctx.fillStyle = 'rgba(30,16,6,0.55)';
  ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.font = `bold 21px ${HUD_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${Math.floor(state.score)}`, 28, 40);
  ctx.font = `15px ${HUD_FONT}`;
  ctx.fillText(`${Math.floor(state.distanceM)} m of ${GOAL_M} m  ·  corn ${state.cornEaten}`, 28, 65);

  // Progress to the Pardon Gate, with the turkey's place on it.
  const barX = 420;
  const barWidth = 440;
  roundRect(ctx, barX - 10, 12, barWidth + 20, 40, 10);
  ctx.fillStyle = 'rgba(30,16,6,0.55)';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,246,216,0.3)';
  ctx.fillRect(barX, 30, barWidth, 7);
  ctx.fillStyle = '#f7b733';
  ctx.fillRect(barX, 30, barWidth * Math.min(1, state.distanceM / GOAL_M), 7);
  ellipse(ctx, barX + barWidth * Math.min(1, state.distanceM / GOAL_M), 33.5, 6, 6, '#fff6d8');
  ctx.fillStyle = '#fff6d8';
  ctx.font = `bold 12px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PARDON GATE', barX + barWidth, 22);

  for (let index = 0; index < RUN.startHearts; index += 1) {
    drawHeart(ctx, 1152 + index * 38, 36, index < state.hearts);
  }
  ctx.fillStyle = '#fff6d8';
  ctx.font = `13px ${HUD_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('HEARTS', 1128, 41);

  // The farmer meter: daylight between the turkey and the fork, draining.
  roundRect(ctx, 14, VIEW.height - 52, 268, 40, 10);
  ctx.fillStyle = 'rgba(30,16,6,0.55)';
  ctx.fill();
  ctx.fillStyle = '#fff6d8';
  ctx.font = `bold 13px ${HUD_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('FARMER', 26, VIEW.height - 27);
  const share = Math.max(0, state.gap / FARMER.maxGap);
  ctx.fillStyle = 'rgba(255,246,216,0.3)';
  ctx.fillRect(104, VIEW.height - 38, 164, 12);
  ctx.fillStyle = share > 0.45 ? '#7ec850' : share > 0.22 ? '#f7b733' : '#e23b3b';
  ctx.fillRect(104, VIEW.height - 38, 164 * share, 12);

  ctx.fillStyle = 'rgba(255,246,216,0.85)';
  ctx.font = `13px ${HUD_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${STAGES[state.stageIndex].name}  ·  P pause  ·  M sound`, VIEW.width - 18, VIEW.height - 24);
  if (best > 0) ctx.fillText(`best ${best}`, VIEW.width - 18, VIEW.height - 44);

  if (state.gap < 115 && state.mode === 'play') {
    ctx.fillStyle = `rgba(214,59,47,${0.65 + Math.sin(state.time * 10) * 0.3})`;
    ctx.font = `bold 24px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText("HE'S RIGHT BEHIND YOU!", VIEW.width / 2, 108);
  }

  if (state.banner !== null) {
    const left = state.banner.until - state.time;
    ctx.globalAlpha = Math.min(1, left / 0.5);
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 44px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(60,25,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.fillText(state.banner.text, VIEW.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function panel(ctx, width, height) {
  roundRect(ctx, VIEW.width / 2 - width / 2, VIEW.height / 2 - height / 2, width, height, 18);
  ctx.fillStyle = 'rgba(28,13,4,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(247,183,51,0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTitleScreen(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,16,2,0.34)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff6d8';
  ctx.font = `bold 96px ${DISPLAY_FONT}`;
  ctx.shadowColor = 'rgba(90,35,0,0.85)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 6;
  ctx.fillText('PARDON RUN', VIEW.width / 2, 178);
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffd98e';
  ctx.font = `italic 27px ${DISPLAY_FONT}`;
  ctx.fillText('One turkey. One farmer. 1,800 metres to the Pardon Gate.', VIEW.width / 2, 224);

  panel(ctx, 800, 182);
  ctx.fillStyle = '#fff6d8';
  ctx.font = `19px ${HUD_FONT}`;
  ctx.fillText('Thanksgiving is coming and you are the main course.', VIEW.width / 2, VIEW.height / 2 - 58);
  ctx.fillText('Outrun the farmer to the Pardon Gate and live to gobble another day.', VIEW.width / 2, VIEW.height / 2 - 32);
  ctx.font = `17px ${HUD_FONT}`;
  ctx.fillText('← →  move      ↑ / SPACE  jump (twice for a double jump)', VIEW.width / 2, VIEW.height / 2 + 4);
  ctx.fillText('↓  duck & dive      P  pause      M  sound on/off', VIEW.width / 2, VIEW.height / 2 + 30);
  ctx.fillText('Jump fences, barrels and ovens. Dodge the falling knives.', VIEW.width / 2, VIEW.height / 2 + 56);
  ctx.fillText('Corn pushes him back.', VIEW.width / 2, VIEW.height / 2 + 80);

  ctx.fillStyle = `rgba(255,246,216,${0.7 + Math.sin(state.time * 4) * 0.3})`;
  ctx.font = `bold 26px ${HUD_FONT}`;
  ctx.fillText('Press ENTER or click to run', VIEW.width / 2, VIEW.height / 2 + 138);
  if (best > 0) {
    ctx.fillStyle = '#ffd98e';
    ctx.font = `17px ${HUD_FONT}`;
    ctx.fillText(`Best escape so far: ${best} points`, VIEW.width / 2, VIEW.height / 2 + 170);
  }
  ctx.restore();
}

function drawOverScreen(ctx, state, best) {
  const escaped = state.result === RESULT_ESCAPED;
  ctx.save();
  ctx.fillStyle = escaped ? 'rgba(64,44,0,0.45)' : 'rgba(30,4,2,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = escaped ? '#ffe9a8' : '#ffb3a0';
  ctx.font = `bold 84px ${DISPLAY_FONT}`;
  ctx.fillText(escaped ? 'PARDONED!' : 'CAUGHT!', VIEW.width / 2, 218);
  ctx.fillStyle = '#fff6d8';
  ctx.font = `italic 25px ${DISPLAY_FONT}`;
  if (escaped) ctx.fillText('You crossed the Pardon Gate — no roast this year.', VIEW.width / 2, 264);
  else if (state.result === RESULT_CAUGHT_BATTERED)
    ctx.fillText('Too many tumbles — the turkey could run no more.', VIEW.width / 2, 264);
  else ctx.fillText('The farmer finally got his hands on you.', VIEW.width / 2, 264);

  panel(ctx, 470, 132);
  ctx.fillStyle = '#fff6d8';
  ctx.font = `20px ${HUD_FONT}`;
  ctx.fillText(`Score  ${Math.floor(state.score)}`, VIEW.width / 2, VIEW.height / 2 - 22);
  ctx.fillText(`Distance  ${Math.floor(state.distanceM)} m  ·  Corn  ${state.cornEaten}`, VIEW.width / 2, VIEW.height / 2 + 8);
  ctx.fillText(`Best  ${Math.max(best, Math.floor(state.score))}`, VIEW.width / 2, VIEW.height / 2 + 38);

  ctx.fillStyle = `rgba(255,246,216,${0.7 + Math.sin(state.time * 4) * 0.3})`;
  ctx.font = `bold 24px ${HUD_FONT}`;
  ctx.fillText('Press ENTER or click to run again', VIEW.width / 2, VIEW.height / 2 + 108);
  ctx.restore();
}

/** Paint one frame: the yard, the chase, and the screen that is up. */
export function drawFrame(ctx, state, screen, best) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawYard(ctx, state);
  drawGate(ctx, state);
  for (const corn of state.corns) if (corn.kind === KIND_CORN) drawCorn(ctx, corn, state.time);
  for (const obstacle of state.obstacles) {
    if (obstacle.kind === KIND_FENCE) drawFence(ctx, obstacle);
    else if (obstacle.kind === KIND_BARREL) drawBarrel(ctx, obstacle);
    else if (obstacle.kind === KIND_OVEN) drawOven(ctx, obstacle, state.time);
    else if (obstacle.kind === KIND_KNIFE) drawKnife(ctx, obstacle, state.time);
  }
  drawFarmer(ctx, state);
  drawTurkey(ctx, state);
  for (const particle of state.particles) {
    ctx.globalAlpha = 1 - particle.age / particle.life;
    ellipse(ctx, particle.x, particle.y, particle.size, particle.size * 0.6, '#f3e2bb');
  }
  ctx.globalAlpha = 1;
  for (const popup of state.popups) {
    ctx.globalAlpha = Math.max(0, 1 - popup.age / popup.life);
    ctx.font = `bold 21px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(60,25,0,0.8)';
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(214,59,47,${state.flash * 0.55})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  if (screen === SCREEN_TITLE) drawTitleScreen(ctx, state, best);
  else if (screen === SCREEN_OVER) drawOverScreen(ctx, state, best);
  else {
    drawHud(ctx, state, best);
    if (screen === SCREEN_PAUSE) {
      ctx.fillStyle = 'rgba(28,13,4,0.5)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = '#fff6d8';
      ctx.font = `bold 54px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
      ctx.font = `19px ${HUD_FONT}`;
      ctx.fillText('Press P to keep running', VIEW.width / 2, VIEW.height / 2 + 38);
    }
  }
}
