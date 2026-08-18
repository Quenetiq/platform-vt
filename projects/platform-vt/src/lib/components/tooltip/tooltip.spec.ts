import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { BoxComponent } from '../../components/box/box.component';
import { TextComponent } from '../../components/text/text.component';
import { InputService } from '../../services/input.service';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { provideOverlay } from '../../overlay/overlay.service';
import { TooltipDirective } from './tooltip.directive';

@Component({
  selector: 'vt-tooltip-app',
  imports: [BoxComponent, TextComponent, TooltipDirective],
  template: `
    <vt-box alignItems="flex-start">
      <vt-box
        id="host"
        vtTooltip="tip text"
        [position]="'bottom'"
        [offset]="0"
        content="hover me"
      ></vt-box>
    </vt-box>
  `,
})
class TooltipTestApp {}

/** Build an SGR move event at 0-based (x, y). */
function moveAt(x: number, y: number): string {
  return `\x1b[<35;${x + 1};${y + 1}M`;
}

describe('tooltip (hover overlay)', () => {
  let fixture: ComponentFixture<TooltipTestApp>;
  let input: InputService;
  let render: RenderService;

  beforeEach(() => {
    // TestBed in this setup does not remove fixtures from the DOM between
    // tests, so stale `#vt-root` elements would otherwise be picked up by
    // the render pipeline. Start each test from a clean DOM.
    document.body.innerHTML = '';

    TestBed.configureTestingModule({
      imports: [TooltipTestApp],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        provideOverlay(),
        provideZonelessChangeDetection(),
      ],
    });

    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(TooltipTestApp);
    // Apply input bindings (zoneless TestBed renders the view but does not
    // run a change-detection pass for directive property bindings).
    fixture.detectChanges();
    input = TestBed.inject(InputService);
    render = TestBed.inject(RenderService);

    (fixture.nativeElement as HTMLElement).id = 'vt-root';
  });

  it('shows a tooltip while hovering the host and hides on leave', () => {
    render.flush();
    // The host is the first leaf of the root box at (0, 0).
    const host = document.getElementById('host');
    expect(host).not.toBeNull();
    expect(render.getElementRect(host!)).not.toBeNull();

    // Hover over the host.
    input.rawInput.next(moveAt(3, 0));
    render.flush();

    const tooltipHost = document.querySelector('vt-tooltip');
    expect(tooltipHost).not.toBeNull();
    expect(tooltipHost!.textContent).toContain('tip text');

    // The tooltip sits just below the host (offset 0): host is 1 row tall.
    const tipRect = render.getElementRect(tooltipHost!);
    expect(tipRect).not.toBeNull();
    expect(tipRect!.x).toBe(0);
    expect(tipRect!.y).toBe(1);

    // Move away — the tooltip disappears.
    input.rawInput.next(moveAt(50, 20));
    render.flush();

    expect(document.querySelector('vt-tooltip')).toBeNull();
  });

  it('does not show a tooltip when the cursor is not over the host', () => {
    render.flush();
    input.rawInput.next(moveAt(50, 20));
    render.flush();

    expect(document.querySelector('vt-tooltip')).toBeNull();
  });

  it('hides the tooltip when moving off the host', () => {
    render.flush();
    input.rawInput.next(moveAt(3, 0));
    render.flush();
    expect(document.querySelector('vt-tooltip')).not.toBeNull();

    // A move outside the host region hides the tooltip.
    input.rawInput.next(moveAt(50, 20));
    render.flush();
    expect(document.querySelector('vt-tooltip')).toBeNull();
  });
});