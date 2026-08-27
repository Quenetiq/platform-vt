import { Injectable, inject, makeEnvironmentProviders, signal, type EnvironmentProviders } from '@angular/core';
import * as fs from 'node:fs';
import { TerminalService } from './terminal.service';

/**
 * Records everything written to the terminal and exports it as an
 * asciinema v2 file or a plain-text screenshot.
 *
 * The recorder intercepts `process.stdout.write` while active, so it captures
 * every ANSI frame the renderer emits (including overlays). Start recording
 * with {@link start}, stop with {@link stop}, and export with
 * {@link exportAsciinema} / {@link exportScreenshot}.
 *
 * @example
 * ```typescript
 * const recorder = inject(SessionRecorder);
 * recorder.start();
 * // ... run the app ...
 * recorder.stop();
 * recorder.exportAsciinema('session.cast');
 * ```
 */
@Injectable()
export class SessionRecorder {
  private readonly terminal = inject(TerminalService);

  /** Whether recording is active. */
  readonly recording = signal(false);

  private entries: { time: number; data: string }[] = [];
  private originalWrite: typeof process.stdout.write | null = null;

  /** Start recording (idempotent). */
  start(): void {
    if (this.recording()) return;
    if (typeof process === 'undefined' || !process.stdout) return;
    this.entries = [];
    this.originalWrite = process.stdout.write.bind(process.stdout);
    const entries = this.entries;
    const recorder = this;
    process.stdout.write = ((chunk: string | Uint8Array, ..._args: unknown[]) => {
      try {
        entries.push({ time: Date.now(), data: String(chunk) });
      } catch {
        // Ignore recording errors; output still flows.
      }
      return recorder.originalWrite!(chunk);
    }) as typeof process.stdout.write;
    this.recording.set(true);
  }

  /** Stop recording (idempotent). */
  stop(): void {
    if (!this.recording()) return;
    if (this.originalWrite && typeof process !== 'undefined' && process.stdout) {
      process.stdout.write = this.originalWrite;
    }
    this.originalWrite = null;
    this.recording.set(false);
  }

  /** Whether anything has been recorded since {@link start}. */
  hasData(): boolean {
    return this.entries.length > 0;
  }

  /**
   * Export the session as an asciinema v2 file.
   *
   * @param filePath - Destination path (e.g. `'session.cast'`).
   * @param opts - Optional title/command metadata.
   */
  exportAsciinema(filePath: string, opts: { title?: string; command?: string } = {}): void {
    const firstTime = this.entries.length > 0 ? this.entries[0]!.time : Date.now();
    const events: unknown[] = this.entries.map((entry) => [
      (entry.time - firstTime) / 1000,
      'o',
      entry.data,
    ]);
    const payload = {
      version: 2,
      width: this.terminal.columns(),
      height: this.terminal.rows(),
      timestamp: Math.floor(firstTime / 1000),
      title: opts.title ?? 'platform-vt session',
      command: opts.command ?? 'platform-vt',
      env: { TERM: process.env['TERM'] ?? 'xterm-256color' },
      events,
    };
    fs.writeFileSync(filePath, JSON.stringify(payload));
  }

  /**
   * Export a plain-text "screenshot": the raw ANSI output of the session.
   *
   * @param filePath - Destination path (e.g. `'screenshot.ansi'`).
   */
  exportScreenshot(filePath: string): void {
    const text = this.entries.map((entry) => entry.data).join('');
    fs.writeFileSync(filePath, text);
  }
}

/**
 * Provide the session recorder.
 */
export function provideSessionRecorder(): EnvironmentProviders {
  return makeEnvironmentProviders([SessionRecorder]);
}