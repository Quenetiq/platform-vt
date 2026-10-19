import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { RenderService } from '../../services/render.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { ClickService } from '../../services/click.service';
import { WheelService } from '../../services/wheel.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { LINE_ATTRS, createIdGenerator, setCellText, syncChildren } from '../../cdk/dom';

/** Severity of a log line. */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/** A single log line. */
export interface LogEntry {
  /** Line text. */
  text: string;
  /** Severity (defaults to `'info'`). */
  level?: LogLevel;
  /** Optional timestamp shown when `showTimestamps` is enabled. */
  timestamp?: string;
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: 'gray',
  info: '',
  success: 'green',
  warn: 'yellow',
  error: 'red',
};

const LEVEL_GLYPH: Record<LogLevel, string> = {
  debug: '\u00B7',
  info: ' ',
  success: '\u2714',
  warn: '\u26A0',
  error: '\u2716',
};

/**
 * A virtualized, auto-following log viewer.
 *
 * Renders exactly `height` lines (the rest is virtualized), filters by text
 * and severity, and optionally pins to the newest entry. Scrolling up
 * unpins the view; scrolling back to the bottom re-pins it. Mouse wheel
 * scrolling is enabled when `WheelService` is provided.
 *
 * @example
 * ```html
 * <vt-log-viewer [lines]="logs()" [height]="12" [follow]="true"
 *   [levels]="['warn', 'error']" [showTimestamps]="true"></vt-log-viewer>
 * ```
 */
@Component({
  selector: 'vt-log-viewer',
  template: '',
})
export class LogViewerComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly wheelService = inject(WheelService, { optional: true });
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  /** Log entries, oldest first. */
  readonly lines = input<LogEntry[]>([]);
  /** Number of visible rows (virtualization window). */
  readonly height = input<number>(10);
  /** Whether the view may pin to the newest entry. */
  readonly follow = input<boolean>(true);
  /** Case-insensitive text filter. */
  readonly filter = input<string>('');
  /** Show only these severity levels (empty = all). */
  readonly levels = input<LogLevel[]>([]);
  /** Prefix each line with its timestamp. */
  readonly showTimestamps = input<boolean>(false);
  /** Text shown when the filtered log is empty. */
  readonly emptyText = input<string>('No log entries');

  /** Emits the current scroll offset when it changes. */
  readonly scrollChange = output<number>();

  /** Index of the first visible row. */
  readonly offset = signal(0);
  /** Whether the view is pinned to the newest entry. */
  readonly pinned = signal(true);
  /** Whether the viewer currently has focus. */
  readonly isFocused = signal(false);

  /** Entries after filtering by level and text. */
  readonly filtered = computed<LogEntry[]>(() => {
    const levels = this.levels();
    const needle = this.filter().trim().toLowerCase();
    return this.lines().filter((entry) => {
      const level = entry.level ?? 'info';
      if (levels.length > 0 && !levels.includes(level)) return false;
      return needle.length === 0 || entry.text.toLowerCase().includes(needle);
    });
  });

  /** Largest valid scroll offset. */
  readonly maxOffset = computed(() =>
    Math.max(0, this.filtered().length - Math.max(1, this.height())),
  );

  private readonly id = createIdGenerator('vt-log-viewer')();

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const entries = this.filtered();
      const rows = Math.max(1, this.height());
      const max = this.maxOffset();
      const following = this.follow() && this.pinned();
      const offset = following ? max : Math.min(this.offset(), max);
      if (offset !== this.offset()) {
        this.offset.set(offset);
        this.scrollChange.emit(offset);
      }

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('height', String(rows));
      el.setAttribute('min-height', String(rows));

      const visible = entries.slice(offset, offset + rows);
      const spans = syncChildren(el, rows, 'vt-log-line', LINE_ATTRS);
      const themed = this.styleReader.get('vt-log-viewer')['color'] ?? '';

      for (let i = 0; i < rows; i++) {
        const row = spans[i]!;
        const entry = visible[i];
        if (!entry) {
          setCellText(row, '');
          row.removeAttribute('color');
          continue;
        }
        const level = entry.level ?? 'info';
        const timestamp =
          this.showTimestamps() && entry.timestamp ? `[${entry.timestamp}] ` : '';
        const text = `${timestamp}${LEVEL_GLYPH[level]} ${entry.text}`;
        setCellText(row, text);
        const color = LEVEL_COLOR[level] || String(themed);
        if (color.length > 0) row.setAttribute('color', color);
        else row.removeAttribute('color');
      }

      if (entries.length === 0) {
        setCellText(spans[0]!, this.emptyText());
        spans[0]!.setAttribute('color', 'gray');
      }

      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => {
        this.isFocused.set(true);
        this.renderService.scheduleRender();
      },
      onBlur: () => {
        this.isFocused.set(false);
        this.renderService.scheduleRender();
      },
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      onClick: () => this.focusService.focus(this.id),
    });

    if (this.wheelService) {
      this.wheelService.register({
        id: `${this.id}-wheel`,
        element: this.elementRef.nativeElement,
        onWheel: (event) => this.scrollBy(event.scrollDirection === 'up' ? -1 : 1),
      });
    }

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const page = Math.max(1, this.height());
        if (event.name === 'up') this.scrollBy(-1);
        else if (event.name === 'down') this.scrollBy(1);
        else if (event.name === 'page-up') this.scrollBy(-page);
        else if (event.name === 'page-down') this.scrollBy(page);
        else if (event.name === 'home') this.scrollTo(0);
        else if (event.name === 'end') this.scrollToBottom();
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
      this.wheelService?.unregister(`${this.id}-wheel`);
    });
  }

  /** Scroll by `delta` rows (negative = up). */
  scrollBy(delta: number): void {
    this.scrollTo(this.offset() + delta);
  }

  /** Scroll to an absolute row offset. */
  scrollTo(offset: number): void {
    const next = Math.max(0, Math.min(this.maxOffset(), Math.round(offset)));
    this.pinned.set(next >= this.maxOffset() && this.follow());
    if (next !== this.offset()) {
      this.offset.set(next);
      this.scrollChange.emit(next);
    }
    this.renderService.scheduleRender();
  }

  /** Pin to the newest entry and scroll to the bottom. */
  scrollToBottom(): void {
    this.pinned.set(true);
    this.scrollTo(this.maxOffset());
  }

  /** Give the viewer keyboard focus. */
  focus(): void {
    this.focusService.focus(this.id);
  }
}
