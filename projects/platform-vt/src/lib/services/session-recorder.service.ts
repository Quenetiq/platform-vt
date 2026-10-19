import {
  DestroyRef,
  Injectable,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { nodeFs } from '../utils/node';
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
  private readonly destroyRef = inject(DestroyRef);

  /** Whether recording is active. */
  readonly recording = signal(false);

  /** Whether recording was stopped because {@link maxBytes} was reached. */
  readonly truncated = signal(false);

  /** Maximum amount of captured output (5 MB by default). */
  maxBytes = 5 * 1024 * 1024;

  private entries: { time: number; data: string }[] = [];
  private recordedBytes = 0;
  private originalWrite: typeof process.stdout.write | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Start recording (idempotent). */
  start(): void {
    if (this.recording()) return;
    if (typeof process === 'undefined' || !process.stdout) return;
    this.entries = [];
    this.recordedBytes = 0;
    this.truncated.set(false);
    this.originalWrite = process.stdout.write.bind(process.stdout);
    const entries = this.entries;
    const recorder = this;
    process.stdout.write = ((chunk: string | Uint8Array, ..._args: unknown[]) => {
      try {
        const data = String(chunk);
        if (recorder.recordedBytes + data.length <= recorder.maxBytes) {
          entries.push({ time: Date.now(), data });
          recorder.recordedBytes += data.length;
        } else {
          recorder.truncated.set(true);
        }
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
    const fs = nodeFs();
    if (!fs) return;
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
    // Recordings may contain sensitive terminal output; keep them private.
    fs.writeFileSync(filePath, JSON.stringify(payload), { mode: 0o600 });
  }

  /**
   * Export a plain-text "screenshot": the raw ANSI output of the session.
   *
   * @param filePath - Destination path (e.g. `'screenshot.ansi'`).
   */
  exportScreenshot(filePath: string): void {
    const fs = nodeFs();
    if (!fs) return;
    const text = this.entries.map((entry) => entry.data).join('');
    fs.writeFileSync(filePath, text, { mode: 0o600 });
  }
}

/**
 * Provide the session recorder.
 */
export function provideSessionRecorder(): EnvironmentProviders {
  return makeEnvironmentProviders([SessionRecorder]);
}
