// serve.ts — a small local static server for game/, Node 22 standard library only.
//
//   node serve.ts            serves game/ at http://localhost:8080
//   node serve.ts --port N   serves on another port
//
// It exists so the game can be played and screenshotted locally with no build step. It maps a
// short table of file extensions to content types, serves index.html for directory paths, and
// refuses anything that resolves outside game/. It is a development convenience only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const argv = process.argv.slice(2);
const portFlag = argv.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(argv[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((request, response) => {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = resolve(join(gameRoot, '.' + pathname));
  if (target !== gameRoot && !target.startsWith(gameRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let length: number;
  try {
    const stats = statSync(target);
    if (!stats.isFile()) throw new Error('not a file');
    length = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': length,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`PARDON RUN game/ is being served at http://localhost:${port}`);
});
