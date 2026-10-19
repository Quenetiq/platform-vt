import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MenuComponent, type MenuItem } from './menu.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { provideOverlay } from '../../overlay/overlay.service';
import { cleanupDom } from '../../testing/cleanup-dom';
import type { VTKeyEvent } from '../../services/input.service';

@Component({
  selector: 'vt-menu-host',
  imports: [MenuComponent],
  template: `
    <vt-menu
      [items]="items"
      (selected)="selected.set($event)"
      (cancelled)="cancelled.set(true)"
    ></vt-menu>
  `,
})
class MenuHostComponent {
  readonly items: MenuItem[] = [
    { label: 'Copy', hint: 'Ctrl+C' },
    {
      label: 'Edit',
      children: [
        { label: 'Undo' },
        { label: 'Redo' },
        { label: 'More', children: [{ label: 'Deep item' }] },
      ],
    },
    { label: 'Delete', disabled: true },
  ];
  readonly selected = signal<number[] | null>(null);
  readonly cancelled = signal(false);
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

describe('MenuComponent with nested submenus', () => {
  let input: InputService;
  let render: RenderService;
  let fixture: ComponentFixture<MenuHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MenuHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideOverlay(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input = TestBed.inject(InputService);
    render = TestBed.inject(RenderService);
    cleanupDom();
  });

  function mount(): void {
    fixture = TestBed.createComponent(MenuHostComponent);
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.detectChanges();
    render.flush();
  }

  function press(...names: string[]): void {
    for (const name of names) {
      input.simulateKey(key(name));
    }
    fixture.detectChanges();
  }

  it('emits the path when a root item is activated', () => {
    mount();
    press('return');
    expect(fixture.componentInstance.selected()).toEqual([0]);
  });

  it('opens a submenu with right and activates a child with return', () => {
    mount();
    press('down', 'right', 'down', 'return');

    // [1] = Edit, [1, 1] = Redo
    expect(fixture.componentInstance.selected()).toEqual([1, 1]);
  });

  it('opens deeper levels and emits the full path', () => {
    mount();
    press('down', 'right', 'down', 'down', 'right', 'return');

    expect(fixture.componentInstance.selected()).toEqual([1, 2, 0]);
  });

  it('left navigates back to the parent level', () => {
    mount();
    press('down', 'right', 'left', 'up', 'return');

    // Back at the root, Copy is selected → return activates [0].
    expect(fixture.componentInstance.selected()).toEqual([0]);
  });

  it('escape at a submenu closes the level, escape at root cancels', () => {
    mount();
    press('down', 'right', 'escape', 'escape');

    expect(fixture.componentInstance.selected()).toBeNull();
    expect(fixture.componentInstance.cancelled()).toBe(true);
  });

  it('skip disabled items when opening a submenu', () => {
    mount();
    press('down', 'right', 'return');

    // Submenu starts on the first enabled child.
    expect(fixture.componentInstance.selected()).toEqual([1, 0]);
  });

  it('renders a column per level with submenu indicators', () => {
    mount();
    press('down', 'right');

    const menu = (fixture.nativeElement as HTMLElement).querySelector('vt-menu')!;
    const columns = Array.from(menu.children) as HTMLElement[];
    expect(columns.length).toBe(2);

    const rootRows = Array.from(columns[0]!.children) as HTMLElement[];
    expect(rootRows[1]!.getAttribute('content')).toContain('\u203A');
  });

  it('opens a submenu on click and activates a leaf by path', () => {
    mount();

    const menu = (fixture.nativeElement as HTMLElement).querySelector('vt-menu')!;
    const editRow = (menu.children[0] as HTMLElement).children[1] as HTMLElement;
    const rowNode = render.getElementLayout(editRow);
    expect(rowNode).not.toBeNull();

    const x = rowNode!.x + 1;
    const y = rowNode!.y;
    input.rawInput.next(`\x1b[<0;${x + 1};${y + 1}M`);
    input.rawInput.next(`\x1b[<0;${x + 1};${y + 1}m`);
    fixture.detectChanges();
    render.flush();

    const submenu = (menu.children[1] as HTMLElement).children[1] as HTMLElement;
    const subNode = render.getElementLayout(submenu);
    expect(subNode).not.toBeNull();

    const sx = subNode!.x + 1;
    const sy = subNode!.y;
    input.rawInput.next(`\x1b[<0;${sx + 1};${sy + 1}M`);
    input.rawInput.next(`\x1b[<0;${sx + 1};${sy + 1}m`);

    expect(fixture.componentInstance.selected()).toEqual([1, 1]);
  });
});
