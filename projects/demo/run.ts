import { JSDOM } from 'jsdom';
import '@angular/compiler';
import { bootstrapTerminal, InputService } from '@quenetiq/platform-vt';
import { App } from './src/app/app';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as any).document = dom.window.document;
(globalThis as any).window = dom.window as unknown as Window & typeof globalThis;
(globalThis as any).Node = dom.window.Node;

if (typeof process !== 'undefined' && process.stdout) {
  process.stdout.columns ??= 80;
  process.stdout.rows ??= 24;
}

// Preserve original stdin reference before JSDOM can override
const originalStdin = process.stdin;

bootstrapTerminal(App).then(async (app) => {
  const inputService = app.injector.get(InputService);

  // Set raw mode only if available (real TTY)
  try {
    if (typeof (originalStdin as any).setRawMode === 'function') {
      (originalStdin as any).setRawMode(true);
    }
  } catch {}

  const { firstValueFrom, filter } = await import('rxjs');

  await firstValueFrom(
    inputService.keyEvents.pipe(filter((e: any) => e.name === 'ctrl-c')),
  );

  try {
    if (typeof (originalStdin as any).setRawMode === 'function') {
      (originalStdin as any).setRawMode(false);
    }
  } catch {}
  originalStdin.pause();
});
