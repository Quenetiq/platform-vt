import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  afterNextRender,
  ElementRef,
  DestroyRef,
  type OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { UndoStack } from '../../utils/undo-stack';
import { createIdGenerator } from '../../cdk/dom';
import {
  countGraphemes,
  indexAtCellColumn,
  nextGraphemeIndex,
  prevGraphemeIndex,
} from '../../utils/graphemes';

/**
 * A multiline text input rendered as a fixed-height text area.
 *
 * Supports arrow navigation, Home/End, backspace/delete, and multiline
 * editing. `return` inserts a newline; `ctrl-return` or `alt-enter`
 * submits. The caret is drawn as an inverted block at the cursor position
 * while focused.
 *
 * With `[vim]="true"` the textarea starts in normal mode: `h`/`j`/`k`/`l`
 * move the cursor, `0`/`$` jump to the line start/end, `w`/`b` move by
 * words, `x` deletes a character, `dd` deletes a line, `i`/`a`/`I`/`A`
 * enter insert mode (at/before/line start/line end), `o`/`O` open a new
 * line below/above, and `escape` returns to normal mode. `vimMode` exposes
 * the current mode for status displays.
 *
 * @example
 * ```html
 * <vt-textarea [rows]="5" [value]="text()" (valueChange)="text.set($event)" (submitted)="save($event)"></vt-textarea>
 * ```
 */
@Component({
  selector: 'vt-textarea',
  template: '',
})
export class TextAreaComponent implements OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly rows = input<number>(5);
  readonly maxLength = input<number>(9999);
  readonly autofocus = input<boolean>(false);
  readonly flexGrow = input<number>(0);
  /** Enable vim-style editing (normal/insert modes). */
  readonly vim = input<boolean>(false);

  readonly valueChange = output<string>();
  readonly submitted = output<string>();

  /** Current vim mode when `vim` is enabled (`'normal'` | `'insert'`). */
  readonly vimMode = signal<'normal' | 'insert'>('normal');

  private readonly id = createIdGenerator('vt-textarea')();
  private readonly cursorRow = signal(0);
  private readonly cursorCol = signal(0);
  private localValue = signal('');
  private readonly isFocused = signal(false);

  /** Pending `d` press in vim normal mode (for the `dd` chord). */
  private pendingD = false;

  /** Extra (multi) cursors beyond the primary one, e.g. via Ctrl+Alt+Up/Down. */
  readonly extraCursors = signal<Array<{ row: number; col: number }>>([]);

  /** Maximum number of cursors (primary + extras). */
  readonly maxCursors = input<number>(8);

  /** Edit history; Ctrl+Z / Ctrl+Y (or `u` in vim normal mode) step through it. */
  private readonly undoStack = new UndoStack();

  /** Whether an undo step is available (for status displays). */
  readonly canUndo = signal(false);

  /** Whether a redo step is available (for status displays). */
  readonly canRedo = signal(false);

  constructor() {
    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 0,
      onFocus: () => {
        if (this.value() !== '') this.localValue.set(this.value());
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
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event, node) => {
        const row = Math.max(0, event.y - node.y);
        const lines = this.localValue().split('\n');
        const lineRow = Math.min(row, Math.max(0, lines.length - 1));
        this.cursorRow.set(lineRow);
        this.cursorCol.set(
          indexAtCellColumn(lines[lineRow] ?? '', Math.max(0, event.x - node.x)),
        );
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
      const lines = this.lines();
      const placeholder = this.placeholder();
      const rows = this.rows();
      const grow = this.flexGrow();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-grow', String(grow));
      el.setAttribute('height', String(rows));
      el.setAttribute('overflow', 'scroll');

      const themed = this.styleReader.get('vt-textarea');
      const color = String(themed['color'] ?? '');
      const themedBg = themed['backgroundColor'];
      if (typeof themedBg === 'string' && themedBg.length > 0) {
        el.setAttribute('background-color', themedBg);
      }

      const focused = this.isFocused();
      const shownLines =
        lines.length === 0 ? (placeholder.length > 0 && !focused ? [placeholder] : ['']) : lines;
      while (el.children.length < shownLines.length) {
        const span = document.createElement('vt-textarea-line');
        span.setAttribute('display', 'flex');
        span.setAttribute('flex-direction', 'row');
        span.setAttribute('flex-shrink', '0');
        span.setAttribute('min-height', '1');
        el.appendChild(span);
      }
      while (el.children.length > shownLines.length) {
        el.lastElementChild?.remove();
      }

      for (let i = 0; i < shownLines.length; i++) {
        const rowEl = el.children[i] as HTMLElement;
        const line = shownLines[i] ?? '';
        const isPlaceholder = line === placeholder && !focused;
        let children: { text: string; inverse?: boolean; color?: string }[];
        const carets = this.caretsOnRow(i, line.length, focused);
        if (carets.length > 0) {
          children = [];
          let prev = 0;
          for (const caret of carets) {
            if (caret.col < prev) continue;
            if (caret.col > prev) children.push({ text: line.substring(prev, caret.col), color });
            children.push({
              text: caret.col < line.length ? line[caret.col]! : ' ',
              inverse: true,
              color,
            });
            prev = caret.col + 1;
          }
          if (prev < line.length) children.push({ text: line.substring(prev), color });
          if (children.length === 0) children = [{ text: line, color: isPlaceholder ? '' : color }];
        } else {
          children = [{ text: line, color: isPlaceholder ? '' : color }];
        }

        while (rowEl.children.length < children.length) {
          const span = document.createElement('vt-textarea-part');
          span.setAttribute('display', 'block');
          span.setAttribute('flex-shrink', '0');
          rowEl.appendChild(span);
        }
        while (rowEl.children.length > children.length) {
          rowEl.lastElementChild?.remove();
        }

        for (let p = 0; p < children.length; p++) {
          const part = children[p]!;
          const span = rowEl.children[p] as HTMLElement;
          span.textContent = part.text;
          span.setAttribute('content', part.text);
          if (part.color) span.setAttribute('color', part.color);
          else span.removeAttribute('color');
          if (part.inverse) span.setAttribute('inverse', 'true');
          else span.removeAttribute('inverse');
        }
      }
      this.renderService.scheduleRender();
    });
  }

  private lines(): string[] {
    const value = this.localValue();
    if (value.length === 0 && !this.isFocused()) {
      return this.placeholder().length > 0 ? [] : [''];
    }
    return value.split('\n');
  }

  private handleKey(event: {
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    sequence: string;
  }): void {
    // Ctrl+Alt+Up/Down toggles an extra cursor on the row above/below.
    if (event.ctrl && event.meta && (event.name === 'up' || event.name === 'down')) {
      this.toggleExtraCursor(event.name === 'up' ? -1 : 1);
      return;
    }

    if (this.vim()) {
      if (this.vimMode() === 'normal') {
        if (this.handleNormalModeKey(event)) return;
      } else if (event.name === 'escape') {
        this.vimMode.set('normal');
        this.pendingD = false;
        this.renderService.scheduleRender();
        return;
      }
    }

    if (event.name === 'z' && event.ctrl && !event.shift) {
      this.undoEdit();
      return;
    }
    if (
      (event.name === 'y' && event.ctrl && !event.shift) ||
      (event.name === 'z' && event.ctrl && event.shift)
    ) {
      this.redoEdit();
      return;
    }

    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();

    const clampCol = (r: number): number => Math.min(this.cursorCol(), lines[r]?.length ?? 0);
    const set = (r: number, c: number): void => {
      const rr = Math.max(0, Math.min(r, lines.length - 1));
      this.cursorRow.set(rr);
      this.cursorCol.set(Math.max(0, Math.min(c, lines[rr]?.length ?? 0)));
      this.renderService.scheduleRender();
    };

    switch (event.name) {
      case 'return':
        if (event.ctrl || event.meta) {
          this.submitted.emit(this.localValue());
          return;
        }
        this.insertAt('\n');
        return;
      case 'backspace':
        this.deleteBackward();
        return;
      case 'delete':
        this.deleteForward();
        return;
      case 'left':
        if (col > 0) set(row, prevGraphemeIndex(lines[row] ?? '', col));
        else if (row > 0) set(row - 1, (lines[row - 1] ?? '').length);
        return;
      case 'right':
        if (col < (lines[row]?.length ?? 0)) {
          set(row, nextGraphemeIndex(lines[row] ?? '', col));
        } else if (row < lines.length - 1) set(row + 1, 0);
        return;
      case 'up':
        set(row - 1, clampCol(row - 1));
        return;
      case 'down':
        set(row + 1, clampCol(row + 1));
        return;
      case 'home':
        set(row, 0);
        return;
      case 'end':
        set(row, lines[row]?.length ?? 0);
        return;
      default:
        if (
          countGraphemes(event.name) === 1 &&
          (event.name.codePointAt(0) ?? 0) >= 32
        ) {
          this.insertAt(event.name);
        }
        return;
    }
  }

  /**
   * Handle a key in vim normal mode.
   *
   * @returns Whether the key was consumed by normal-mode handling.
   */
  private handleNormalModeKey(event: {
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    sequence: string;
  }): boolean {
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();

    const set = (r: number, c: number): void => {
      const rr = Math.max(0, Math.min(r, lines.length - 1));
      this.cursorRow.set(rr);
      this.cursorCol.set(Math.max(0, Math.min(c, lines[rr]?.length ?? 0)));
    };
    const enterInsert = (c: number): void => {
      this.cursorCol.set(Math.max(0, Math.min(c, lines[this.cursorRow()]?.length ?? 0)));
      this.vimMode.set('insert');
      this.renderService.scheduleRender();
    };

    switch (event.name) {
      case 'h':
        if (col > 0) set(row, prevGraphemeIndex(lines[row] ?? '', col));
        else if (row > 0) set(row - 1, (lines[row - 1] ?? '').length);
        break;
      case 'l':
        if (col < (lines[row]?.length ?? 0)) {
          set(row, nextGraphemeIndex(lines[row] ?? '', col));
        } else if (row < lines.length - 1) set(row + 1, 0);
        break;
      case 'j':
      case 'return':
        set(row + 1, col);
        break;
      case 'k':
        set(row - 1, col);
        break;
      case '0':
      case 'home':
        set(row, 0);
        break;
      case '$':
      case 'end':
        set(row, (lines[row] ?? '').length);
        break;
      case 'w':
        this.wordMove(1);
        break;
      case 'b':
        this.wordMove(-1);
        break;
      case 'x':
      case 'delete':
        this.deleteForward();
        break;
      case 'd':
        if (this.pendingD) {
          this.pendingD = false;
          this.deleteLine();
        } else {
          this.pendingD = true;
        }
        break;
      case 'u':
        this.undoEdit();
        break;
      case 'i':
        enterInsert(col);
        break;
      case 'a':
        enterInsert(nextGraphemeIndex(lines[row] ?? '', col));
        break;
      case 'I':
        enterInsert(0);
        break;
      case 'A':
        enterInsert((lines[row] ?? '').length);
        break;
      case 'o':
        this.openLineBelow();
        break;
      case 'O':
        this.openLineAbove();
        break;
      default:
        this.pendingD = false;
        break;
    }
    this.renderService.scheduleRender();
    return true;
  }

  /** Move the cursor to the next/previous word boundary in normal mode. */
  private wordMove(direction: 1 | -1): void {
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    const line = lines[row] ?? '';
    const length = line.length;
    const set = (r: number, c: number): void => {
      const rr = Math.max(0, Math.min(r, lines.length - 1));
      this.cursorRow.set(rr);
      this.cursorCol.set(Math.max(0, Math.min(c, lines[rr]?.length ?? 0)));
    };

    if (direction === 1) {
      let i = col;
      while (i < length && line[i] !== ' ') i++;
      while (i < length && line[i] === ' ') i++;
      if (i >= length && row < lines.length - 1) set(row + 1, 0);
      else set(row, i);
    } else {
      let i = col;
      while (i > 0 && line[i - 1] === ' ') i--;
      while (i > 0 && line[i - 1] !== ' ') i--;
      if (i <= 0 && row > 0) set(row - 1, (lines[row - 1] ?? '').length);
      else set(row, i);
    }
  }

  /** `dd` — delete the current line (or clear it when it is the only one). */
  private deleteLine(): void {
    this.undoStack.snapshot(this.localValue());
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    if (lines.length === 1) {
      this.localValue.set('');
      this.cursorRow.set(0);
      this.cursorCol.set(0);
    } else {
      lines.splice(row, 1);
      const rr = Math.min(row, lines.length - 1);
      this.localValue.set(lines.join('\n'));
      this.cursorRow.set(rr);
      this.cursorCol.set(Math.min(this.cursorCol(), lines[rr]?.length ?? 0));
    }
    this.valueChange.emit(this.localValue());
  }

  /** `o` — open a new line below the cursor and enter insert mode. */
  private openLineBelow(): void {
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    this.cursorCol.set((lines[row] ?? '').length);
    this.insertAt('\n');
    this.vimMode.set('insert');
  }

  /** `O` — open a new line above the cursor and enter insert mode. */
  private openLineAbove(): void {
    const row = this.cursorRow();
    this.cursorCol.set(0);
    this.insertAt('\n');
    this.cursorRow.set(Math.max(0, row));
    this.cursorCol.set(0);
    this.vimMode.set('insert');
  }

  private undoEdit(): void {
    const previous = this.undoStack.undo(this.localValue());
    if (previous === null) return;
    this.localValue.set(previous);
    const lines = previous.split('\n');
    this.cursorRow.set(lines.length - 1);
    this.cursorCol.set((lines[lines.length - 1] ?? '').length);
    this.canUndo.set(this.undoStack.canUndo);
    this.canRedo.set(true);
    this.valueChange.emit(previous);
    this.renderService.scheduleRender();
  }

  private redoEdit(): void {
    const next = this.undoStack.redo(this.localValue());
    if (next === null) return;
    this.localValue.set(next);
    const lines = next.split('\n');
    this.cursorRow.set(lines.length - 1);
    this.cursorCol.set((lines[lines.length - 1] ?? '').length);
    this.canUndo.set(true);
    this.canRedo.set(this.undoStack.canRedo);
    this.valueChange.emit(next);
    this.renderService.scheduleRender();
  }

  /** The primary cursor plus all extra cursors. */
  private allCursors(): Array<{ row: number; col: number }> {
    return [{ row: this.cursorRow(), col: this.cursorCol() }, ...this.extraCursors()];
  }

  /** Caret positions on a rendered row, sorted by column (primary first). */
  private caretsOnRow(row: number, lineLength: number, focused: boolean): Array<{ col: number }> {
    const carets: Array<{ col: number; primary: boolean }> = [];
    if (focused && row === this.cursorRow()) {
      carets.push({ col: Math.min(this.cursorCol(), lineLength), primary: true });
    }
    for (const extra of this.extraCursors()) {
      if (extra.row === row) carets.push({ col: Math.min(extra.col, lineLength), primary: false });
    }
    carets.sort((a, b) => a.col - b.col || Number(b.primary) - Number(a.primary));
    return carets.map((c) => ({ col: c.col }));
  }

  /** Toggle an extra cursor on the row above/below the primary one. */
  private toggleExtraCursor(direction: 1 | -1): void {
    const lines = this.localValue().split('\n');
    const row = this.cursorRow() + direction;
    if (row < 0 || row >= lines.length) return;

    const extras = this.extraCursors();
    const extraOnRow = extras.find((c) => c.row === row);
    if (extraOnRow) {
      this.extraCursors.set(extras.filter((c) => c !== extraOnRow));
      return;
    }
    if (extras.length >= this.maxCursors() - 1) return;
    this.extraCursors.set([
      ...extras,
      { row, col: Math.min(this.cursorCol(), lines[row]!.length) },
    ]);
    this.renderService.scheduleRender();
  }

  /** Insert a character at every cursor (right-to-left, bottom-to-top). */
  private multiInsert(char: string): void {
    const cursors = this.allCursors().sort((a, b) => a.row - b.row || a.col - b.col);
    const lines = this.localValue().split('\n');
    for (let i = cursors.length - 1; i >= 0; i--) {
      const { row, col } = cursors[i]!;
      const line = lines[row] ?? '';
      lines[row] = line.substring(0, col) + char + line.substring(col);
    }
    this.localValue.set(lines.join('\n'));
    this.cursorCol.set(this.cursorCol() + char.length);
    this.extraCursors.update((list) => list.map((c) => ({ ...c, col: c.col + char.length })));
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  /**
   * Backspace at every cursor.
   *
   * Only characters within a line are removed (a leading cursor is left
   * untouched; line merging stays a single-cursor operation).
   */
  private multiDeleteBackward(): void {
    const cursors = this.allCursors().sort((a, b) => a.row - b.row || a.col - b.col);
    const lines = this.localValue().split('\n');

    for (let i = cursors.length - 1; i >= 0; i--) {
      const { row, col } = cursors[i]!;
      if (col === 0) continue;
      const line = lines[row] ?? '';
      const from = prevGraphemeIndex(line, col);
      lines[row] = line.substring(0, from) + line.substring(col);
      const shift = col - from;
      // Cursors on the same row to the left of this one shift left.
      for (let k = i - 1; k >= 0; k--) {
        const other = cursors[k]!;
        if (other.row === row && other.col > col) other.col -= shift;
      }
    }

    this.localValue.set(lines.join('\n'));
    if (this.cursorCol() > 0) this.cursorCol.set(this.cursorCol() - 1);
    this.extraCursors.update((list) => list.map((c) => ({ ...c, col: Math.max(0, c.col - 1) })));
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  /**
   * Delete at every cursor.
   *
   * Only characters within a line are removed (an end-of-line cursor is left
   * untouched; line merging stays a single-cursor operation).
   */
  private multiDeleteForward(): void {
    const cursors = this.allCursors().sort((a, b) => a.row - b.row || a.col - b.col);
    const lines = this.localValue().split('\n');

    for (let i = cursors.length - 1; i >= 0; i--) {
      const { row, col } = cursors[i]!;
      const line = lines[row] ?? '';
      if (col >= line.length) continue;
      const to = nextGraphemeIndex(line, col);
      lines[row] = line.substring(0, col) + line.substring(to);
      const shift = to - col;
      for (let k = i - 1; k >= 0; k--) {
        const other = cursors[k]!;
        if (other.row === row && other.col > col) other.col -= shift;
      }
    }

    this.localValue.set(lines.join('\n'));
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  private insertAt(text: string): void {
    if (this.extraCursors().length > 0 && text !== '\n') {
      this.multiInsert(text);
      return;
    }
    this.undoStack.snapshot(this.localValue());
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    const line = lines[row] ?? '';
    if (text === '\n') {
      if (countGraphemes(this.localValue()) >= this.maxLength()) return;
      const next: string[] = [...lines];
      next[row] = line.substring(0, col);
      next.splice(row + 1, 0, line.substring(col));
      this.localValue.set(next.join('\n'));
      this.cursorRow.set(row + 1);
      this.cursorCol.set(0);
    } else {
      if (countGraphemes(this.localValue()) >= this.maxLength()) return;
      const next: string[] = [...lines];
      next[row] = line.substring(0, col) + text + line.substring(col);
      this.localValue.set(next.join('\n'));
      this.cursorCol.set(col + text.length);
    }
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  private deleteBackward(): void {
    if (this.extraCursors().length > 0) {
      this.multiDeleteBackward();
      return;
    }
    this.undoStack.snapshot(this.localValue());
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    if (col > 0) {
      const line = lines[row] ?? '';
      const from = prevGraphemeIndex(line, col);
      lines[row] = line.substring(0, from) + line.substring(col);
      this.localValue.set(lines.join('\n'));
      this.cursorCol.set(from);
    } else if (row > 0) {
      const prev = lines[row - 1] ?? '';
      const current = lines[row] ?? '';
      lines.splice(row, 1);
      lines[row - 1] = prev + current;
      this.localValue.set(lines.join('\n'));
      this.cursorRow.set(row - 1);
      this.cursorCol.set(prev.length);
    }
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  private deleteForward(): void {
    if (this.extraCursors().length > 0) {
      this.multiDeleteForward();
      return;
    }
    this.undoStack.snapshot(this.localValue());
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    const line = lines[row] ?? '';
    if (col < line.length) {
      const to = nextGraphemeIndex(line, col);
      lines[row] = line.substring(0, col) + line.substring(to);
      this.localValue.set(lines.join('\n'));
    } else if (row < lines.length - 1) {
      lines[row] = line + (lines[row + 1] ?? '');
      lines.splice(row + 1, 1);
      this.localValue.set(lines.join('\n'));
    }
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  ngOnDestroy(): void {
    this.focusService.unregister(this.id);
    this.clickService.unregister(this.id);
  }
}
