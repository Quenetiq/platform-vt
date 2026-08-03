import { Injectable, signal } from '@angular/core';

/**
 * Provides terminal dimension information as reactive signals.
 *
 * Automatically updates on terminal resize. Reads initial dimensions
 * from `process.stdout` in Node.js environments.
 *
 * @example
 * ```typescript
 * const terminal = inject(TerminalService);
 * console.log(terminal.columns(), terminal.rows());
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TerminalService {
  /** Current terminal width in columns. Updates on resize. */
  readonly columns = signal(80);

  /** Current terminal height in rows. Updates on resize. */
  readonly rows = signal(24);

  constructor() {
    if (typeof process !== 'undefined') {
      this.applySize();

      process.stdout.on('resize', () => {
        this.applySize();
      });
    }
  }

  private applySize(): void {
    const columns = process.stdout.columns;
    const rows = process.stdout.rows;
    this.columns.set(columns > 0 ? columns : 80);
    this.rows.set(rows > 0 ? rows : 24);
  }

  /** Write raw data directly to stdout. */
  write(data: string): void {
    if (typeof process !== 'undefined') {
      process.stdout.write(data);
    }
  }

  /** Clear the entire terminal screen. */
  clear(): void {
    this.write('\x1b[2J\x1b[H');
  }
}
