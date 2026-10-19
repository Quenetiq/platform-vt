import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  afterNextRender,
  type OnDestroy,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { UndoStack } from '../../utils/undo-stack';
import { createIdGenerator } from '../../cdk/dom';
import {
  countGraphemes,
  indexAtCellColumn,
  nextGraphemeIndex,
  prevGraphemeIndex,
} from '../../utils/graphemes';

/**
 * A single-line text input.
 *
 * `return` submits (and clears), arrows/Home/End move the cursor. With
 * `[mask]="true"` the value renders as `•` bullets (password fields);
 * `[reveal]="true"` shows the real characters even when masked, e.g. for a
 * show/hide-password toggle.
 *
 * @example
 * ```html
 * <vt-input [mask]="true" [reveal]="showPassword()" placeholder="Password"
 *   (valueChange)="password.set($event)" (submitted)="login()"></vt-input>
 * ```
 */
@Component({
  selector: 'vt-input',
  template:
    '@if (hasBefore()) {<span class="vt-input-before"></span>}<ng-content></ng-content><span class="vt-input-after"></span>',
})
export class InputComponent implements OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly renderService = inject(RenderService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input<string>('');
  readonly maxLength = input<number>(9999);
  /** Render the value as `•` bullets (password field). */
  readonly mask = input<boolean>(false);
  /** Show the real characters even when `mask` is on (reveal toggle). */
  readonly reveal = input<boolean>(false);
  /** Completion candidates; `tab`/`shift-tab` cycle the word under the cursor. */
  readonly completions = input<string[]>([]);
  /** Enable vim-style editing (normal/insert modes). */
  readonly vim = input<boolean>(false);
  readonly value = input<string>('');
  readonly autofocus = input<boolean>(false);
  readonly flexGrow = input<number>(1);

  readonly valueChange = output<string>();
  readonly submitted = output<string>();

  private readonly id = createIdGenerator('vt-input')();
  private readonly cursorPos = signal(0);
  private localValue = signal('');
  protected readonly hasBefore = computed(
    () => Math.min(this.cursorPos(), this.localValue().length) > 0,
  );

  /** Position in the completion cycle (-1 = before the first match). */
  private completionIndex = -1;

  /** Match list cached for the duration of a completion cycle. */
  private completionMatches: string[] | null = null;

  /** Where the word being completed starts in the value. */
  private completionStart = 0;

  /** Whether the buffer was edited since the last external value adoption. */
  private dirty = false;

  /** Generation counter so stale span-styling timers are ignored. */
  private styleGeneration = 0;

  /** Edit history; Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) step through it. */
  private readonly undoStack = new UndoStack();

  /** Whether an undo step is available (for status displays). */
  readonly canUndo = signal(false);

  /** Whether a redo step is available (for status displays). */
  readonly canRedo = signal(false);

  /** Current vim mode when `vim` is enabled (`'normal'` | `'insert'`). */
  readonly vimMode = signal<'normal' | 'insert'>('normal');

  constructor() {
    const self = this;
    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 0,
      onFocus: () => {
        // Adopt the external value only while the buffer is untouched.
        // Re-focuses (e.g. Tab cycling through a single focusable) must
        // not clobber edits with a stale input binding.
        if (!self.dirty && self.value() !== '') {
          self.localValue.set(self.value());
        }
        self.cursorPos.set(self.localValue().length);
        self.renderService.scheduleRender();
      },
      onBlur: () => {
        self.renderService.scheduleRender();
      },
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event, node) => {
        const col = event.x - node.x;
        this.cursorPos.set(indexAtCellColumn(this.localValue(), Math.max(0, col)));
        this.renderService.scheduleRender();
      },
    });

    const ref = afterNextRender(() => {
      ref.destroy();
      if (this.autofocus()) this.focusService.focus(this.id);
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.focusService.focusedId() === this.id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.handleKey(event);
      });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const generation = ++this.styleGeneration;
      const val = this.localValue();
      const masked =
        this.mask() && !this.reveal() ? '\u2022'.repeat(countGraphemes(val)) : val;
      const placeholder = this.placeholder();
      const grow = this.flexGrow();
      const pos = this.cursorPos();
      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('align-items', 'center');
      el.setAttribute('flex-grow', String(grow));
      el.setAttribute('min-height', '1');

      const display = masked.length > 0 ? masked : placeholder;
      const clamped = Math.min(pos, val.length);
      const before = display.substring(0, clamped);
      const after = display.substring(clamped);
      const themed = this.styleReader.get('vt-input');
      const color = String(themed['color'] ?? '');
      const themedBg = themed['backgroundColor'];
      if (typeof themedBg === 'string' && themedBg.length > 0) {
        el.setAttribute('background-color', themedBg);
      }

      const styleSpans = (): void => {
        if (generation !== this.styleGeneration) return;
        const beforeEl = el.querySelector<HTMLElement>('.vt-input-before');
        const afterEl = el.querySelector<HTMLElement>('.vt-input-after');
        for (const span of [beforeEl, afterEl]) {
          if (!span) continue;
          span.setAttribute('display', 'block');
          span.setAttribute('flex-shrink', '0');
          span.setAttribute('content', span === beforeEl ? before : after);
          span.setAttribute('color', color);
          span.textContent = span === beforeEl ? before : after;
        }
      };
      styleSpans();
      // The template's @if may create the before-span after this effect
      // runs (zoneless scheduling); retry once the DOM settles.
      if (this.hasBefore() && !el.querySelector('.vt-input-before')) {
        setTimeout(styleSpans, 0);
      }
      this.renderService.scheduleRender();
    });
  }

  private handleKey(event: {
    name: string;
    ctrl: boolean;
    shift: boolean;
    sequence: string;
  }): void {
    if (this.vim()) {
      if (this.vimMode() === 'normal') {
        if (this.handleVimKey(event)) return;
      } else if (event.name === 'escape') {
        this.vimMode.set('normal');
        this.renderService.scheduleRender();
        return;
      }
    }

    if (event.name !== 'tab' && event.name !== 'shift-tab') {
      this.completionIndex = -1;
      this.completionMatches = null;
    }
    if (event.name === 'z' && event.ctrl && !event.shift) {
      this.undo();
      return;
    }
    if (event.name === 'y' && event.ctrl && !event.shift) {
      this.redo();
      return;
    }
    if (event.name === 'z' && event.ctrl && event.shift) {
      this.redo();
      return;
    }
    switch (event.name) {
      case 'tab':
      case 'shift-tab':
        this.complete(event.name === 'tab' ? 1 : -1);
        return;
      case 'return':
        this.submitted.emit(this.localValue());
        this.localValue.set('');
        this.cursorPos.set(0);
        this.dirty = false;
        this.undoStack.clear();
        this.canUndo.set(false);
        this.canRedo.set(false);
        return;
      case 'backspace': {
        const current = this.localValue();
        const from = prevGraphemeIndex(current, this.cursorPos());
        if (from < this.cursorPos()) {
          this.undoStack.snapshot(current);
          this.localValue.set(current.substring(0, from) + current.substring(this.cursorPos()));
          this.cursorPos.set(from);
          this.dirty = true;
          this.valueChange.emit(this.localValue());
        }
        break;
      }
      case 'delete': {
        const current = this.localValue();
        const to = nextGraphemeIndex(current, this.cursorPos());
        if (to > this.cursorPos()) {
          this.undoStack.snapshot(current);
          this.localValue.set(current.substring(0, this.cursorPos()) + current.substring(to));
          this.dirty = true;
          this.valueChange.emit(this.localValue());
        }
        break;
      }
      case 'left':
        if (this.cursorPos() > 0) {
          this.cursorPos.set(prevGraphemeIndex(this.localValue(), this.cursorPos()));
        }
        break;
      case 'right':
        if (this.cursorPos() < this.localValue().length) {
          this.cursorPos.set(nextGraphemeIndex(this.localValue(), this.cursorPos()));
        }
        break;
      case 'home':
        this.cursorPos.set(0);
        break;
      case 'end':
        this.cursorPos.set(this.localValue().length);
        break;
      default:
        if (
          countGraphemes(event.name) === 1 &&
          (event.name.codePointAt(0) ?? 0) >= 32
        ) {
          const current = this.localValue();
          if (countGraphemes(current) < this.maxLength()) {
            this.undoStack.snapshot(current);
            this.localValue.set(
              current.substring(0, this.cursorPos()) +
                event.name +
                current.substring(this.cursorPos()),
            );
            this.cursorPos.set(this.cursorPos() + event.name.length);
            this.dirty = true;
            this.valueChange.emit(this.localValue());
          }
        }
        break;
    }
  }

  /**
   * Handle a key in vim normal mode.
   *
   * @returns Whether the key was consumed by normal-mode handling.
   */
  private handleVimKey(event: {
    name: string;
    ctrl: boolean;
    shift: boolean;
    sequence: string;
  }): boolean {
    const value = this.localValue();
    const pos = this.cursorPos();

    switch (event.name) {
      case 'h':
        if (pos > 0) this.cursorPos.set(prevGraphemeIndex(value, pos));
        break;
      case 'l':
        if (pos < value.length) this.cursorPos.set(nextGraphemeIndex(value, pos));
        break;
      case '0':
      case 'home':
        this.cursorPos.set(0);
        break;
      case '$':
      case 'end':
        this.cursorPos.set(value.length);
        break;
      case 'w':
        this.wordMove(1);
        break;
      case 'b':
        this.wordMove(-1);
        break;
      case 'x':
      case 'delete':
        if (pos < value.length) this.deleteAt(pos);
        break;
      case 'i':
        this.enterInsertMode(pos);
        break;
      case 'a':
        this.enterInsertMode(nextGraphemeIndex(value, pos));
        break;
      case 'I':
        this.enterInsertMode(0);
        break;
      case 'A':
        this.enterInsertMode(value.length);
        break;
      case 'u':
        this.undo();
        break;
      case 'tab':
      case 'shift-tab':
        // Tab completion stays available in normal mode.
        return false;
      default:
        break;
    }
    this.renderService.scheduleRender();
    return true;
  }

  private enterInsertMode(cursor: number): void {
    this.cursorPos.set(cursor);
    this.vimMode.set('insert');
    this.renderService.scheduleRender();
  }

  /** Move the cursor to the next/previous word boundary in normal mode. */
  private wordMove(direction: 1 | -1): void {
    const value = this.localValue();
    const pos = this.cursorPos();
    if (direction === 1) {
      let i = pos;
      while (i < value.length && value[i] !== ' ') i++;
      while (i < value.length && value[i] === ' ') i++;
      this.cursorPos.set(i);
    } else {
      let i = pos;
      while (i > 0 && value[i - 1] === ' ') i--;
      while (i > 0 && value[i - 1] !== ' ') i--;
      this.cursorPos.set(i);
    }
  }

  /** Delete the character at a position (vim `x`). */
  private deleteAt(position: number): void {
    this.undoStack.snapshot(this.localValue());
    const value = this.localValue();
    const end = nextGraphemeIndex(value, position);
    this.localValue.set(value.substring(0, position) + value.substring(end));
    this.cursorPos.set(position);
    this.dirty = true;
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  private undo(): void {
    const previous = this.undoStack.undo(this.localValue());
    if (previous === null) return;
    this.localValue.set(previous);
    this.cursorPos.set(previous.length);
    this.dirty = true;
    this.canUndo.set(this.undoStack.canUndo);
    this.canRedo.set(true);
    this.valueChange.emit(previous);
    this.renderService.scheduleRender();
  }

  private redo(): void {
    const next = this.undoStack.redo(this.localValue());
    if (next === null) return;
    this.localValue.set(next);
    this.cursorPos.set(next.length);
    this.dirty = true;
    this.canUndo.set(true);
    this.canRedo.set(this.undoStack.canRedo);
    this.valueChange.emit(next);
    this.renderService.scheduleRender();
  }

  /** Complete the word under the cursor from the `completions` list. */
  private complete(direction: 1 | -1): void {
    const candidates = this.completions();
    if (candidates.length === 0) return;

    // Cache the match list for the whole cycle: after the first completion
    // the word under the cursor is already a match, so recomputing from it
    // would stop the cycle. Editing (any non-Tab key) clears the cache.
    if (this.completionMatches === null) {
      const value = this.localValue();
      const pos = this.cursorPos();
      const start = value.lastIndexOf(' ', Math.max(0, pos - 1)) + 1;
      const word = value.substring(start, pos);
      this.completionStart = start;
      this.completionMatches = candidates.filter(
        (c) => c.startsWith(word) && c.length > word.length,
      );
    }

    const matches = this.completionMatches;
    if (matches.length === 0) {
      this.completionMatches = null;
      return;
    }

    this.completionIndex =
      (((this.completionIndex + direction) % matches.length) + matches.length) % matches.length;
    const completion = matches[this.completionIndex]!;
    const value = this.localValue();
    const pos = this.cursorPos();
    this.undoStack.snapshot(value);
    const next = value.substring(0, this.completionStart) + completion + value.substring(pos);
    this.localValue.set(next);
    this.cursorPos.set(this.completionStart + completion.length);
    this.dirty = true;
    this.valueChange.emit(next);
    this.renderService.scheduleRender();
  }

  ngOnDestroy(): void {
    this.focusService.unregister(this.id);
    this.clickService.unregister(this.id);
  }
}
