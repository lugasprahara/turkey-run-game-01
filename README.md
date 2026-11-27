# turkey-run-game-01

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/lugasprahara/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/lugasprahara/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**PARDON RUN** — a side-scrolling turkey escape game for the desktop browser, plain static files with no build step and no network. Thanksgiving is coming and you are the main course: sprint 1,800 metres across the Dawn Farmyard, the Barnyard and the Kitchen Yard to reach the Pardon Gate while the farmer — carving fork in hand — chases you the whole way. Jump fences, cranberry barrels and lit ovens, dodge the carving knives that drop out of the sky on a telegraphed column, duck and double-jump, and grab corn cobs: each one scores and pushes the farmer back. Trip and he surges; let him reach you, or lose all three hearts, and the run ends on a platter. Title screen, HUD with score, distance, hearts and a farmer-gap meter, stage banners, pause, caught and pardoned end screens with restart — all drawn in code with an autumn palette, plus WebAudio sound effects made from raw oscillators. Controls: ← → move, ↑ / Space jump (twice for a double jump), ↓ duck and dive, P pause, M sound, Enter or click to start and restart.

## Run it

```sh
node serve.ts   # serves game/ at http://localhost:8080 — open it in a desktop browser and play
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand the entry in: writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=aes5np1n&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
