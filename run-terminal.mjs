import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// Angular's dev-mode banner ("Angular is running in development mode.") is
// printed with console.log, which writes to stdout and would corrupt the
// terminal output with an extra line. Route log messages to stderr instead.
console.log = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The library renders through the DOM, so we run it inside jsdom while
// stdin/stdout stay wired to the real terminal.
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
// Node ≥21 defines globalThis.navigator as a getter-only property; redefine it
// to jsdom's navigator so Angular's browser platform initialises correctly.
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

const distDir = path.join(__dirname, 'dist', 'demo', 'browser');
const mainFile = fs.readdirSync(distDir).find((f) => /^main(-[A-Za-z0-9_-]+)?\.js$/.test(f));
if (!mainFile) {
  console.error('Demo bundle not found. Run `npm run build` first.');
  process.exit(1);
}

// Restore the terminal on the way out: disable mouse reporting, show the
// cursor, reset styling, restore default foreground/background (OSC 10/11)
// and leave raw mode.
const RESTORE = '\x1b[?1002l\x1b[?1006l\x1b[?25h\x1b[0m\x1b]110\x07\x1b]111\x07\x1b[2J\x1b[H';
let restored = false;
function restore(code) {
  if (restored) return;
  restored = true;
  try {
    process.stdout.write(RESTORE);
  } catch {
    // Ignore — the stream may already be closed.
  }
  try {
    process.stdin.setRawMode(false);
  } catch {
    // Ignore — stdin may not be a TTY or may be closed.
  }
  process.exit(code);
}

process.on('SIGINT', () => restore(0));
process.on('SIGTERM', () => restore(0));
process.on('uncaughtException', (err) => {
  console.error(err);
  restore(1);
});

// Quit on Ctrl+C. Once the app switches stdin to raw mode this arrives as a
// regular byte instead of a SIGINT, so we watch for it directly.
process.stdin.setEncoding('utf8');
process.stdin.resume();
process.stdin.on('data', (data) => {
  if (String(data).includes('\x03')) restore(0);
});

import(path.join(distDir, mainFile)).catch((err) => {
  console.error(err);
  restore(1);
});