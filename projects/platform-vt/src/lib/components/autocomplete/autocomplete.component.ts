import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef, computed, type OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

/**
 * A text input with live suggestions.
 *
 * Typing filters the {@link options} (prefix match, case-insensitive); the
 * matching suggestions render below the input. `down`/`up` move through the
 * list, `tab` or `return` accepts the highlighted suggestion, `escape`
 * closes the list. The accepted value is emitted via `valueChange`.
 *
 * @example
 * ```html
 * <vt-autocomplete
 *   [options]="['apple', 'apricot', 'banana']"
 *   [value]="fruit()"
 *   (valueChange)="fruit.set($event)"
 *   (selected)="fruit.set($event)"
 * ></vt-autocomplete>
 * ```
 */
@Component({
  selector: 'vt-autocomplete',
  template: '',
})
export class AutocompleteComponent implements OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input<string[]>([]);
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly autofocus = input<boolean>(false);
  readonly maxSuggestions = input<number>(5);

  readonly valueChange = output<string>();
  /** Emits the completed option when one is picked from the list. */
  readonly selected = output<string>();

  private readonly id = `vt-autocomplete-${String(nextId++)}`;
  private readonly cursorPos = signal(0);
  private localValue = signal('');
  private readonly activeSuggestion = signal(0);
  private readonly listOpen = signal(false);
  private readonly isFocused = signal(false);

  /** Suggestions matching the current text. */
  readonly suggestions = computed(() => {
    const query = this.localValue();
    const options = this.options();
    if (query.length === 0) return options.slice(0, this.maxSuggestions());
    const lower = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().startsWith(lower)).slice(0, this.maxSuggestions());
  });

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 0,
      onFocus: () => {
        if (this.value() !== '') this.localValue.set(this.value());
        this.cursorPos.set(this.localValue().length);
        this.listOpen.set(this.suggestions().length > 0);
        this.renderService.scheduleRender();
      },
      onBlur: () => {
        this.listOpen.set(false);
        this.renderService.scheduleRender();
      },
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event, node) => {
        const textLen = this.localValue().length;
        const col = event.x - node.x;
        this.cursorPos.set(Math.min(Math.max(col, 0), textLen));
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
      const val = this.localValue();
      const placeholder = this.placeholder();
      const pos = this.cursorPos();
      const themed = this.styleReader.get('vt-autocomplete')['color'] ?? '';

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');

      const display = val.length > 0 ? val : placeholder;
      const clamped = Math.min(pos, val.length);
      const before = display.substring(0, clamped);
      const after = display.substring(clamped);
      el.setAttribute('content', val.length > 0 ? before : '');
      el.setAttribute('color', String(themed));
      el.textContent = '';

      // The input line is a row of spans: [before][caret][after].
      let inputRow = el.querySelector<HTMLElement>('.vt-ac-input');
      if (!inputRow) {
        inputRow = document.createElement('span');
        inputRow.className = 'vt-ac-input';
        inputRow.setAttribute('display', 'flex');
        inputRow.setAttribute('flex-direction', 'row');
        inputRow.setAttribute('flex-shrink', '0');
        el.appendChild(inputRow);
      }
      inputRow.replaceChildren();
      for (const part of [
        { text: before, inverse: false },
        { text: this.isFocused() ? (display[clamped] ?? ' ') : '', inverse: true },
        { text: after, inverse: false },
      ]) {
        const span = document.createElement('span');
        span.setAttribute('display', 'block');
        span.setAttribute('flex-shrink', '0');
        span.setAttribute('content', part.text);
        span.textContent = part.text;
        if (part.inverse) span.setAttribute('inverse', 'true');
        inputRow.appendChild(span);
      }

      // Suggestion list below the input.
      const open = this.listOpen() && this.isFocused();
      const suggestions = open ? this.suggestions() : [];
      const listEl = el.querySelector<HTMLElement>('.vt-ac-list');
      if (suggestions.length === 0) {
        listEl?.remove();
      } else {
        let list = listEl;
        if (!list) {
          list = document.createElement('span');
          list.className = 'vt-ac-list';
          list.setAttribute('display', 'flex');
          list.setAttribute('flex-direction', 'column');
          list.setAttribute('flex-shrink', '0');
          el.appendChild(list);
        }
        while (list.children.length < suggestions.length) {
          const item = document.createElement('span');
          item.setAttribute('display', 'block');
          item.setAttribute('flex-shrink', '0');
          list.appendChild(item);
        }
        while (list.children.length > suggestions.length) {
          list.lastElementChild?.remove();
        }
        const active = this.activeSuggestion();
        for (let i = 0; i < suggestions.length; i++) {
          const item = list.children[i] as HTMLElement;
          const text = suggestions[i] ?? '';
          item.setAttribute('content', text);
          item.textContent = text;
          if (i === active) {
            item.setAttribute('color', 'bright-white');
            item.setAttribute('inverse', 'true');
          } else {
            item.setAttribute('color', String(themed));
            item.removeAttribute('inverse');
          }
        }
      }

      this.renderService.scheduleRender();
    });
  }

  private handleKey(event: { name: string; ctrl: boolean; sequence: string }): void {
    const suggestions = this.suggestions();
    switch (event.name) {
      case 'return':
        if (suggestions.length > 0 && this.listOpen()) {
          const chosen = suggestions[this.activeSuggestion()] ?? suggestions[0]!;
          this.accept(chosen);
        } else {
          this.valueChange.emit(this.localValue());
        }
        return;
      case 'tab':
        if (suggestions.length > 0) {
          this.accept(suggestions[0]!);
        }
        return;
      case 'escape':
        this.listOpen.set(false);
        return;
      case 'up':
        if (suggestions.length > 0 && this.listOpen()) {
          this.activeSuggestion.update((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        }
        return;
      case 'down':
        if (suggestions.length > 0 && this.listOpen()) {
          this.activeSuggestion.update((i) => (i >= suggestions.length - 1 ? 0 : i + 1));
        }
        return;
      case 'backspace':
        if (this.cursorPos() > 0) {
          const current = this.localValue();
          this.localValue.set(current.substring(0, this.cursorPos() - 1) + current.substring(this.cursorPos()));
          this.cursorPos.set(this.cursorPos() - 1);
          this.activeSuggestion.set(0);
          this.listOpen.set(true);
        }
        break;
      case 'left':
        if (this.cursorPos() > 0) this.cursorPos.set(this.cursorPos() - 1);
        return;
      case 'right':
        if (this.cursorPos() < this.localValue().length) this.cursorPos.set(this.cursorPos() + 1);
        return;
      default:
        if (event.name.length === 1 && event.name.charCodeAt(0) >= 32) {
          const current = this.localValue();
          this.localValue.set(current.substring(0, this.cursorPos()) + event.name + current.substring(this.cursorPos()));
          this.cursorPos.set(this.cursorPos() + 1);
          this.activeSuggestion.set(0);
          this.listOpen.set(true);
          this.valueChange.emit(this.localValue());
        }
        return;
    }
  }

  private accept(value: string): void {
    this.localValue.set(value);
    this.cursorPos.set(value.length);
    this.listOpen.set(false);
    this.valueChange.emit(value);
    this.selected.emit(value);
    this.renderService.scheduleRender();
  }

  ngOnDestroy(): void {
    this.focusService.unregister(this.id);
    this.clickService.unregister(this.id);
  }
}