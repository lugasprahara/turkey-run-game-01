// PARDON RUN — hand-in program for the turkey-run-game-01 bounty (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop browser opens offline, no
// build step and no network. This program's one job is to hand that game in the way the bounty
// asks: copy game/ and screenshots/ into the output directory (MAKEFUN_OUTPUT_DIR locally,
// /output inside the grader) and write dossier.json there with buildDossier from the vendored
// make.fun library, using the scorer's own caps so a local run refuses exactly what the scorer
// would refuse. Run it with:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Play the game first with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`PARDON RUN handed in: game/ + screenshots/ + dossier.json -> ${outputDir}`);
