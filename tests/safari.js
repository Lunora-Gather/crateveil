import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { levels } from '../src/levels.js';
import { solve } from './solve.js';

if (process.platform !== 'darwin') {
  console.error('Run this test on macOS with Safari installed.');
  process.exit(1);
}

const solutions = levels.map(level => ({ id: level.id, name: level.name, moves: solve(level) }));
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Crateveil Safari test</title>
<style>body { margin: 0; background: #10131f; color: #f5f1de; font: 16px system-ui }
pre { margin: 0; padding: 1rem; white-space: pre-wrap } iframe { border: 0; display: block; margin: 0 auto }</style>
<pre id="report">Crateveil Safari regression suite</pre>
<iframe title="Crateveil" width="1120" height="780"></iframe>
<script type="module" src="/safari-flow.js"></script>`;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};
const directory = new URL('../dist/', import.meta.url);
const browserTests = new URL('./safari-flow.js', import.meta.url);
const missing = new Set();
let origin;
let complete;
const result = new Promise(resolve => { complete = resolve; });

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, origin).pathname;
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (request.method === 'POST' && pathname === '/result' && request.headers.origin === origin) {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const { message, success } = JSON.parse(Buffer.concat(chunks));
      console.log(message);
      response.writeHead(204).end();
      if (typeof success === 'boolean') complete(success);
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405).end();
    } else if (pathname === '/') {
      response.writeHead(200, { 'Content-Type': types['.html'] }).end(page);
    } else if (pathname === '/solutions.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(solutions));
    } else if (pathname === '/safari-flow.js') {
      response.writeHead(200, { 'Content-Type': types['.js'] }).end(await readFile(browserTests));
    } else if (/^\/crateveil\/(?:assets\/[\w.-]+|manifest\.webmanifest|favicon\.svg)?$/.test(pathname)) {
      const relative = pathname.slice('/crateveil/'.length) || 'index.html';
      if (relative.split('/').some(segment => segment === '.' || segment === '..')) {
        response.writeHead(404).end();
        return;
      }
      const file = await readFile(new URL(relative, directory));
      if (relative === 'index.html') {
        response.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
      }
      response.writeHead(200, { 'Content-Type': types[extname(relative)] }).end(file);
    } else {
      response.writeHead(404).end();
    }
  } catch (error) {
    missing.add(pathname);
    console.error(pathname, error.message);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});

try {
  await readFile(new URL('index.html', directory));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  execFileSync('/usr/bin/open', ['-b', 'com.apple.Safari', origin]);
  const timeout = setTimeout(() => {
    console.error('Safari did not finish the test in two minutes.');
    complete(false);
  }, 120_000);
  const passed = await result;
  clearTimeout(timeout);
  process.exitCode = passed && !missing.size ? 0 : 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.close();
}
