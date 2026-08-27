import { Component, inject, input, output, signal, effect, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputService } from '../../services/input.service';
import { RenderService } from '../../services/render.service';
import { fuzzyRank } from '../../utils/fuzzy';

/** A command shown in the palette. */
export interface PaletteCommand {
  /** Display title (searched with fuzzy matching). */
  title: string;
  /** Extra searchable keywords (separated by spaces). */
  keywords?: string;
  /** Shortcut hint shown on the right, e.g. `'Ctrl+S'`. */
  hint?: string;
  /** Executed when the command is activated. */
  action: () => void;
}

/**
 * The command-palette view: a search input with a fuzzy-ranked result list.
 *
 * Rendered inside an overlay by {@link CommandPaletteService}; usable
 * standalone as well. `down`/`up` move the selection, `return` activates,
 * `escape` emits `cancelled`.
 */
@Component({
  selector: 'vt-palette',
  template: '',
})
export class PaletteComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly destroyRef = inject(DestroyRef);

  readonly commands = input.required<PaletteCommand[]>();
  readonly placeholder = input('Search commands…');
  readonly selected = output<PaletteCommand>();
  readonly cancelled = output<void>();

  readonly query = signal('');
  readonly activeIndex = signal(0);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const query = this.query();
      const results = this.results();
      const active = this.activeIndex();
      const longest = Math.max(0, ...results.map((cmd) => cmd.title.length));

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('border', 'single');
      el.setAttribute('padding', '1');
      el.setAttribute('width', String(Math.min(60, Math.max(30, longest + 10))));

      const searchRow = el.querySelector<HTMLElement>('.vt-palette-search');
      let row = searchRow;
      if (!row) {
        row = document.createElement('span');
        row.className = 'vt-palette-search';
        row.setAttribute('display', 'flex');
        row.setAttribute('flex-direction', 'row');
        row.setAttribute('flex-shrink', '0');
        el.appendChild(row);
      }
      row.replaceChildren();
      const prompt = document.createElement('span');
      prompt.setAttribute('display', 'block');
      prompt.setAttribute('flex-shrink', '0');
      prompt.setAttribute('content', '\u203A ');
      prompt.textContent = '\u203A ';
      prompt.setAttribute('color', 'cyan');
      row.appendChild(prompt);
      const caret = document.createElement('span');
      caret.setAttribute('display', 'block');
      caret.setAttribute('flex-shrink', '0');
      caret.setAttribute('inverse', 'true');
      const caretChar = query.length > 0 ? query[query.length - 1]! : ' ';
      caret.setAttribute('content', caretChar);
      caret.textContent = caretChar;
      row.appendChild(caret);
      const after = document.createElement('span');
      after.setAttribute('display', 'block');
      after.setAttribute('flex-shrink', '0');
      after.setAttribute('content', query.length > 0 ? query.substring(0, query.length - 1) : this.placeholder());
      after.textContent = query.length > 0 ? query.substring(0, query.length - 1) : this.placeholder();
      if (query.length === 0) after.setAttribute('opacity', 'dim');
      row.appendChild(after);

      const list = el.querySelector<HTMLElement>('.vt-palette-list');
      if (results.length === 0) {
        list?.remove();
      } else {
        let listEl = list;
        if (!listEl) {
          listEl = document.createElement('span');
          listEl.className = 'vt-palette-list';
          listEl.setAttribute('display', 'flex');
          listEl.setAttribute('flex-direction', 'column');
          listEl.setAttribute('flex-shrink', '0');
          el.appendChild(listEl);
        }
        while (listEl.children.length < results.length) {
          const item = document.createElement('span');
          item.setAttribute('display', 'flex');
          item.setAttribute('flex-direction', 'row');
          item.setAttribute('flex-shrink', '0');
          item.setAttribute('min-height', '1');
          listEl.appendChild(item);
        }
        while (listEl.children.length > results.length) {
          listEl.lastElementChild?.remove();
        }
        for (let i = 0; i < results.length; i++) {
          const item = results[i]!;
          const itemEl = listEl.children[i] as HTMLElement;
          const text = item.hint
            ? `${item.title}${' '.repeat(Math.max(1, longest - item.title.length + 2))}${item.hint}`
            : item.title;
          itemEl.setAttribute('content', text);
          itemEl.textContent = text;
          if (i === active) {
            itemEl.setAttribute('color', 'bright-white');
            itemEl.setAttribute('inverse', 'true');
          } else {
            itemEl.removeAttribute('color');
            itemEl.removeAttribute('inverse');
            if (item.hint) itemEl.setAttribute('color', 'gray');
          }
        }
      }
      this.renderService.scheduleRender();
    });

    this.inputService.keyEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const results = this.results();
        switch (event.name) {
          case 'down':
            if (results.length > 0) {
              this.activeIndex.update((i) => (i >= results.length - 1 ? 0 : i + 1));
            }
            break;
          case 'up':
            if (results.length > 0) {
              this.activeIndex.update((i) => (i <= 0 ? results.length - 1 : i - 1));
            }
            break;
          case 'return':
          case 'tab':
            if (results.length > 0) {
              const command = results[Math.min(this.activeIndex(), results.length - 1)]!;
              this.selected.emit(command);
            }
            break;
          case 'escape':
            this.cancelled.emit();
            break;
          case 'backspace':
            this.query.update((q) => q.substring(0, q.length - 1));
            this.activeIndex.set(0);
            break;
          default:
            if (event.name.length === 1 && event.name.charCodeAt(0) >= 32 && !event.ctrl) {
              this.query.update((q) => q + event.name);
              this.activeIndex.set(0);
            }
            break;
        }
        this.renderService.scheduleRender();
      });
  }

  /** Commands matching the query, ranked by fuzzy relevance. */
  results(): PaletteCommand[] {
    const commands = this.commands();
    const query = this.query();
    if (query.length === 0) return commands.slice(0, 10);
    const ranked = fuzzyRank(query, commands.map((cmd) => `${cmd.title} ${cmd.keywords ?? ''}`), 10);
    return ranked
      .map((text) => commands.find((cmd) => `${cmd.title} ${cmd.keywords ?? ''}` === text))
      .filter((cmd): cmd is PaletteCommand => cmd !== undefined);
  }
}