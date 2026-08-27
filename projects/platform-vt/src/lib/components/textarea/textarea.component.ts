import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef, type OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

/**
 * A multiline text input rendered as a fixed-height text area.
 *
 * Supports arrow navigation, Home/End, backspace/delete, and multiline
 * editing. `return` inserts a newline; `ctrl-return` or `alt-enter`
 * submits. The caret is drawn as an inverted block at the cursor position
 * while focused.
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

  readonly valueChange = output<string>();
  readonly submitted = output<string>();

  private readonly id = `vt-textarea-${String(nextId++)}`;
  private readonly cursorRow = signal(0);
  private readonly cursorCol = signal(0);
  private localValue = signal('');
  private readonly isFocused = signal(false);

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
        this.cursorRow.set(Math.min(row, Math.max(0, lines.length - 1)));
        this.cursorCol.set(Math.max(0, event.x - node.x));
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
      const shownLines = lines.length === 0 ? (placeholder.length > 0 && !focused ? [placeholder] : ['']) : lines;
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

      const caretRow = Math.min(this.cursorRow(), Math.max(0, shownLines.length - 1));
      for (let i = 0; i < shownLines.length; i++) {
        const rowEl = el.children[i] as HTMLElement;
        const line = shownLines[i] ?? '';
        const isPlaceholder = line === placeholder && !focused;
        let children: { text: string; inverse?: boolean; color?: string }[];
        if (focused && i === caretRow) {
          const col = Math.min(this.cursorCol(), line.length);
          children = [
            { text: line.substring(0, col), color },
            { text: col < line.length ? line[col]! : ' ', inverse: true, color },
            { text: line.substring(col + (col < line.length ? 1 : 0)), color },
          ];
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

  private handleKey(event: { name: string; ctrl: boolean; meta: boolean; sequence: string }): void {
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
        if (col > 0) set(row, col - 1);
        else if (row > 0) set(row - 1, (lines[row - 1] ?? '').length);
        return;
      case 'right':
        if (col < (lines[row]?.length ?? 0)) set(row, col + 1);
        else if (row < lines.length - 1) set(row + 1, 0);
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
        if (event.name.length === 1 && event.name.charCodeAt(0) >= 32) {
          this.insertAt(event.name);
        }
        return;
    }
  }

  private insertAt(text: string): void {
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    const line = lines[row] ?? '';
    if (text === '\n') {
      if (this.localValue().length >= this.maxLength()) return;
      const next: string[] = [...lines];
      next[row] = line.substring(0, col);
      next.splice(row + 1, 0, line.substring(col));
      this.localValue.set(next.join('\n'));
      this.cursorRow.set(row + 1);
      this.cursorCol.set(0);
    } else {
      if (this.localValue().length >= this.maxLength()) return;
      const next: string[] = [...lines];
      next[row] = line.substring(0, col) + text + line.substring(col);
      this.localValue.set(next.join('\n'));
      this.cursorCol.set(col + 1);
    }
    this.valueChange.emit(this.localValue());
    this.renderService.scheduleRender();
  }

  private deleteBackward(): void {
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    if (col > 0) {
      const line = lines[row] ?? '';
      lines[row] = line.substring(0, col - 1) + line.substring(col);
      this.localValue.set(lines.join('\n'));
      this.cursorCol.set(col - 1);
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
    const lines = this.localValue().split('\n');
    const row = this.cursorRow();
    const col = this.cursorCol();
    const line = lines[row] ?? '';
    if (col < line.length) {
      lines[row] = line.substring(0, col) + line.substring(col + 1);
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