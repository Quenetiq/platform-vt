import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WindowComponent } from './window.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { provideDragService } from '../../services/drag.service';
import { provideWheelService } from '../../services/wheel.service';

@Component({
  selector: 'vt-window-host',
  imports: [WindowComponent],
  template: `
    <vt-window
      title="Settings"
      [x]="2"
      [y]="3"
      [width]="30"
      [height]="10"
      (closed)="closed.set(true)"
      (boundsChange)="bounds.set($event)"
    >
      <span>content</span>
    </vt-window>
  `,
})
class WindowHostComponent {
  readonly closed = signal(false);
  readonly bounds = signal<unknown>(null);
}

function key(name: string, ctrl = false): VTKeyEvent {
  return { name, ctrl, meta: false, shift: false, sequence: '' };
}

describe('WindowComponent', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WindowHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideDragService(),
        provideWheelService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input = TestBed.inject(InputService);
  });

  it('renders an absolutely positioned, bordered window', () => {
    const fixture = TestBed.createComponent(WindowHostComponent);
    fixture.detectChanges();

    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-window')!;
    expect(el.getAttribute('position')).toBe('absolute');
    expect(el.getAttribute('left')).toBe('2');
    expect(el.getAttribute('top')).toBe('3');
    expect(el.getAttribute('width')).toBe('30');
    expect(el.getAttribute('height')).toBe('10');
    expect(el.getAttribute('border')).toBe('round');
    expect(el.querySelector('.vt-window-title')?.textContent).toContain('Settings');
  });

  it('resizes with ctrl+arrows while focused', () => {
    const fixture = TestBed.createComponent(WindowHostComponent);
    fixture.detectChanges();
    const focus = TestBed.inject(FocusService);
    const windowEl = (fixture.nativeElement as HTMLElement).querySelector('vt-window')!;
    focus.focus(windowEl.getAttribute('vt-click-id')!);

    input.simulateKey(key('right', true));
    input.simulateKey(key('down', true));

    const bounds = fixture.componentInstance.bounds() as { width: number; height: number };
    expect(bounds.width).toBe(31);
    expect(bounds.height).toBe(11);
  });

  it('can be moved and brought to the front', () => {
    const fixture = TestBed.createComponent(WindowHostComponent);
    fixture.detectChanges();
    const component = fixture.debugElement.children[0]!.componentInstance as WindowComponent;

    component.moveTo(5, 4);
    expect(component.bounds()).toMatchObject({ x: 5, y: 4 });

    component.bringToFront();
    const parent = (fixture.nativeElement as HTMLElement).querySelector('vt-window')!.parentElement!;
    expect(parent.lastElementChild?.tagName.toLowerCase()).toBe('vt-window');
  });

  it('emits closed from the close affordance API', () => {
    const fixture = TestBed.createComponent(WindowHostComponent);
    fixture.detectChanges();
    const component = fixture.debugElement.children[0]!.componentInstance as WindowComponent;

    component.close();
    expect(fixture.componentInstance.closed()).toBe(true);
  });
});
