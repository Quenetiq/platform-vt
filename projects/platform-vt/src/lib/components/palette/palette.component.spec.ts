import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PaletteComponent, type PaletteCommand } from './palette.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { cleanupDom } from '../../testing/cleanup-dom';
import type { VTKeyEvent } from '../../services/input.service';

@Component({
  selector: 'vt-palette-host',
  imports: [PaletteComponent],
  template: `<vt-palette [commands]="commands" (selected)="picked.set($event)"></vt-palette>`,
})
class PaletteHostComponent {
  readonly commands: PaletteCommand[] = [
    { title: 'Save', category: 'File', hint: 'Ctrl+S', action: (): void => undefined },
    { title: 'Open', category: 'File', action: (): void => undefined },
    { title: 'Copy', category: 'Edit', action: (): void => undefined },
    { title: 'No group', action: (): void => undefined },
  ];
  readonly picked = signal<PaletteCommand | null>(null);
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

describe('PaletteComponent categories', () => {
  let input: InputService;
  let fixture: ComponentFixture<PaletteHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaletteHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input = TestBed.inject(InputService);
    cleanupDom();
  });

  function mount(): void {
    fixture = TestBed.createComponent(PaletteHostComponent);
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.detectChanges();
  }

  async function renderedRows(): Promise<HTMLElement[]> {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    const list = (fixture.nativeElement as HTMLElement).querySelector('.vt-palette-list');
    return list ? (Array.from(list.children) as HTMLElement[]) : [];
  }

  it('renders category headers and groups commands', async () => {
    mount();
    const rows = await renderedRows();
    expect(rows.map((r) => r.getAttribute('content'))).toEqual([
      '\u2500 File',
      'Save      Ctrl+S',
      'Open',
      '\u2500 Edit',
      'Copy',
      'No group',
    ]);
    const header = rows[0]!;
    expect(header.getAttribute('opacity')).toBe('dim');
  });

  it('selection skips category headers', async () => {
    mount();
    await renderedRows();

    // Active starts at the first item (Save). down → Open (not the header).
    input.simulateKey(key('down'));
    input.simulateKey(key('return'));

    expect(fixture.componentInstance.picked()?.title).toBe('Open');
  });

  it('categories are searchable', async () => {
    mount();
    await renderedRows();

    for (const ch of ['e', 'd']) input.simulateKey(key(ch));
    await renderedRows();

    input.simulateKey(key('return'));
    expect(fixture.componentInstance.picked()?.title).toBe('Copy');
  });
});
