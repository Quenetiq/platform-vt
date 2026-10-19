import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { HoverableDirective } from '../components/hoverable/hoverable.directive';
import { InputService } from './input.service';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';
import { provideHoverService, HoverService } from './hover.service';
import { cleanupDom } from '../testing/cleanup-dom';
import type { VTMouseEvent } from './sgr-mouse';

@Component({
  selector: 'vt-hover-test-app',
  imports: [HoverableDirective],
  template: `
    <div
      vt-hoverable
      (hovered)="recordEnter($event)"
      (unhovered)="recordLeave()"
      width="20"
      height="3"
      content="Hover me"
    ></div>
  `,
})
class HoverTestApp {
  readonly enters = signal<VTMouseEvent | null>(null);
  readonly leaves = signal<number>(0);

  recordEnter(event: VTMouseEvent): void {
    this.enters.set(event);
  }

  recordLeave(): void {
    this.leaves.update((n) => n + 1);
  }
}

/** A plain move event at the given 1-based terminal coordinate. */
function move(x: number, y: number): string {
  return `\x1b[<32;${x};${y}M`;
}

describe('hover dispatch (end-to-end)', () => {
  let fixture: ComponentFixture<HoverTestApp>;
  let input: InputService;
  let render: RenderService;
  let hover: HoverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HoverTestApp],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        provideHoverService(),
        provideZonelessChangeDetection(),
      ],
    });

    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(HoverTestApp);
    input = TestBed.inject(InputService);
    render = TestBed.inject(RenderService);
    hover = TestBed.inject(HoverService);

    cleanupDom();
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
  });

  it('fires hovered when the cursor enters the element', () => {
    render.flush();

    input.rawInput.next(move(6, 2));

    const enter = fixture.componentInstance.enters();
    expect(enter).not.toBeNull();
    expect(enter?.x).toBe(5);
    expect(enter?.y).toBe(1);
    expect(hover.hoveredId()).toMatch(/^vt-hoverable-/);
  });

  it('fires unhovered when the cursor leaves the element', () => {
    render.flush();

    input.rawInput.next(move(6, 2));
    input.rawInput.next(move(30, 10));

    expect(fixture.componentInstance.enters()).not.toBeNull();
    expect(fixture.componentInstance.leaves()).toBe(1);
    expect(hover.hoveredId()).toBeNull();
  });

  it('does not re-fire hovered while moving inside the element', () => {
    render.flush();

    input.rawInput.next(move(2, 1));
    input.rawInput.next(move(10, 2));
    input.rawInput.next(move(19, 3));

    expect(fixture.componentInstance.enters()).not.toBeNull();
    expect(fixture.componentInstance.leaves()).toBe(0);
  });

  it('ignores moves outside the element', () => {
    render.flush();

    input.rawInput.next(move(30, 10));

    expect(fixture.componentInstance.enters()).toBeNull();
    expect(fixture.componentInstance.leaves()).toBe(0);
  });

  it('re-evaluates hover after a render flush (content scroll under cursor)', () => {
    render.flush();
    input.rawInput.next(move(6, 2));
    expect(fixture.componentInstance.enters()).not.toBeNull();

    // Simulate the content scrolling away under a stationary cursor: the
    // element shrinks so the cursor position falls outside it, and the next
    // render pass re-evaluates the hover state.
    const host = (fixture.nativeElement as HTMLElement).querySelector('div')!;
    host.removeAttribute('height');
    host.setAttribute('content', 'x');
    render.flush();

    expect(fixture.componentInstance.leaves()).toBe(1);
    expect(hover.hoveredId()).toBeNull();
  });
});
