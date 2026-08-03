import { Component, input, output, signal, computed, inject, effect, afterNextRender, type OnDestroy, ElementRef, DestroyRef } from '@angular/core';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

let nextId = 0;

@Component({
  selector: 'vt-input',
  template: '@if (hasBefore()) {<span class="vt-input-before"></span>}<ng-content></ng-content><span class="vt-input-after"></span>',
})
export class InputComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly renderService = inject(RenderService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly placeholder = input<string>('');
  readonly maxLength = input<number>(9999);
  readonly mask = input<boolean>(false);
  readonly value = input<string>('');
  readonly autofocus = input<boolean>(false);
  readonly flexGrow = input<number>(1);

  readonly valueChange = output<string>();
  readonly submitted = output<string>();

  private readonly id = `vt-input-${String(nextId++)}`;
  private readonly cursorPos = signal(0);
  private localValue = signal('');
  protected readonly hasBefore = computed(() => Math.min(this.cursorPos(), this.localValue().length) > 0);

  constructor() {
    const self = this;
    this.focusService.register({
      id: this.id,
      priority: 0,
      onFocus: () => {
        if (self.value() !== '') self.localValue.set(self.value());
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
      const masked = this.mask() ? '\u2022'.repeat(val.length) : val;
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
      this.renderService.scheduleRender();
    });
  }

  private handleKey(event: { name: string; sequence: string }): void {
    switch (event.name) {
      case 'return':
        this.submitted.emit(this.localValue());
        this.localValue.set('');
        this.cursorPos.set(0);
        return;
      case 'backspace':
        if (this.cursorPos() > 0) {
          const current = this.localValue();
          this.localValue.set(current.substring(0, this.cursorPos() - 1) + current.substring(this.cursorPos()));
          this.cursorPos.set(this.cursorPos() - 1);
        }
        break;
      case 'delete':
        if (this.cursorPos() < this.localValue().length) {
          const current = this.localValue();
          this.localValue.set(current.substring(0, this.cursorPos()) + current.substring(this.cursorPos() + 1));
        }
        break;
      case 'left':
        if (this.cursorPos() > 0) this.cursorPos.set(this.cursorPos() - 1);
        break;
      case 'right':
        if (this.cursorPos() < this.localValue().length) this.cursorPos.set(this.cursorPos() + 1);
        break;
      case 'home':
        this.cursorPos.set(0);
        break;
      case 'end':
        this.cursorPos.set(this.localValue().length);
        break;
      default:
        if (event.name.length === 1 && event.name.charCodeAt(0) >= 32) {
          if (this.localValue().length < this.maxLength()) {
            const current = this.localValue();
            this.localValue.set(current.substring(0, this.cursorPos()) + event.name + current.substring(this.cursorPos()));
            this.cursorPos.set(this.cursorPos() + 1);
            this.valueChange.emit(this.localValue());
          }
        }
        break;
    }
  }

  ngOnDestroy(): void {
    this.focusService.unregister(this.id);
    this.clickService.unregister(this.id);
  }
}
