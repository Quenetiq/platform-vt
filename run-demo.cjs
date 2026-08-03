const fs = require('fs');
const path = require('path');

const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const distDir = path.join(__dirname, 'dist', 'demo', 'browser');
const mainFile = fs.readdirSync(distDir).find((f) => f.startsWith('main-'));
if (!mainFile) {
  console.error('main bundle not found in', distDir);
  process.exit(1);
}

import(path.join(distDir, mainFile)).catch((err) => {
  console.error(err);
  process.exit(1);
});
