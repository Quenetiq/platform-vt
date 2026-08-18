import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { BoxComponent } from '../components/box/box.component';
import { TextComponent } from '../components/text/text.component';
import { RenderService } from '../services/render.service';
import { TerminalService } from '../services/terminal.service';
import { OverlayService, provideOverlay } from './overlay.service';
import { OverlayContainer } from './overlay-container';

@Component({
  selector: 'vt-test-app',
  imports: [BoxComponent, TextComponent],
  template: `
    <vt-box id="anchor" [padding]="1" border="single">
      <vt-text content="anchor content"></vt-text>
    </vt-box>
  `,
})
class OverlayTestApp {}

@Component({
  selector: 'vt-test-tooltip',
  imports: [BoxComponent, TextComponent],
  template: `
    <vt-box [padding]="1" border="single" backgroundColor="yellow">
      <vt-text content="tooltip"></vt-text>
    </vt-box>
  `,
})
class TestTooltip {}

describe('overlay (CDK)', () => {
  let fixture: ComponentFixture<OverlayTestApp>;
  let render: RenderService;
  let overlay: OverlayService;
  let container: OverlayContainer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayTestApp, TestTooltip],
      providers: [
        TerminalService,
        RenderService,
        provideOverlay(),
        provideZonelessChangeDetection(),
      ],
    });

    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(OverlayTestApp);
    render = TestBed.inject(RenderService);
    overlay = TestBed.inject(OverlayService);
    container = TestBed.inject(OverlayContainer);

    (fixture.nativeElement as HTMLElement).id = 'vt-root';
  });

  it('creates a panel in the overlay layer', () => {
    const ref = overlay.create();
    const panel = ref.hostElement;

    expect(panel.parentElement).toBe(container.getContainerElement());
    expect(panel.getAttribute('position')).toBe('absolute');
    expect(container.getContainerElement().parentElement).toBe(fixture.nativeElement);
    ref.dispose();
  });

  it('attaches a component onto the panel and paints it on top', () => {
    render.flush();
    // jsdom quirk: querySelector('#anchor') misses custom-element ids, but
    // getElementById is reliable.
    const anchor = document.getElementById('anchor');
    expect(anchor).not.toBeNull();
    const anchorRect = render.getElementRect(anchor!);
    expect(anchorRect).not.toBeNull();

    const ref = overlay.create();
    const componentRef = ref.attach(TestTooltip);
    ref.setPosition(10, 5);
    render.flush();

    expect(componentRef.instance).toBeInstanceOf(TestTooltip);
    expect(ref.hasAttached()).toBe(true);
    expect(ref.hostElement.children.length).toBe(1);

    const panelRect = render.getElementRect(ref.hostElement);
    expect(panelRect).not.toBeNull();
    expect(panelRect!.x).toBe(10);
    expect(panelRect!.y).toBe(5);
    // Natural content size: 1 padding + 7 content + 1 padding = 9 columns.
    expect(panelRect!.width).toBe(9);
    expect(panelRect!.height).toBe(3);
    ref.dispose();
  });

  it('positions the overlay relative to an anchor rectangle', () => {
    render.flush();
    const anchorRect = render.getElementRect(document.getElementById('anchor')!);
    expect(anchorRect).not.toBeNull();

    const ref = overlay.create();
    ref.setPositionFromRect(anchorRect!, 'bottom', 0, 1);
    render.flush();

    const panelRect = render.getElementRect(ref.hostElement);
    expect(panelRect!.x).toBe(anchorRect!.x);
    expect(panelRect!.y).toBe(anchorRect!.y + anchorRect!.height + 1);
    ref.dispose();
  });

  it('detach removes the component but keeps the panel', () => {
    const ref = overlay.create();
    ref.attach(TestTooltip);
    render.flush();
    expect(ref.hasAttached()).toBe(true);

    ref.detach();
    render.flush();

    expect(ref.hasAttached()).toBe(false);
    expect(ref.hostElement.children.length).toBe(0);
    expect(ref.hostElement.isConnected).toBe(true);
  });

  it('dispose removes the panel from the overlay layer', () => {
    const ref = overlay.create();
    ref.attach(TestTooltip);
    ref.dispose();

    expect(ref.hostElement.isConnected).toBe(false);
  });

  it('refuses to attach twice or to a disposed overlay', () => {
    const ref = overlay.create();
    ref.attach(TestTooltip);
    expect(() => ref.attach(TestTooltip)).toThrow(/already has content/);
    ref.dispose();
    expect(() => ref.attach(TestTooltip)).toThrow(/disposed/);
  });

  it('getElementRect resolves elements inside the overlay layer', () => {
    render.flush();
    const ref = overlay.create();
    ref.attach(TestTooltip);
    ref.setPosition(2, 3);
    render.flush();

    const tipEl = ref.hostElement.querySelector('vt-text');
    const rect = render.getElementRect(tipEl!);
    expect(rect).not.toBeNull();
    // Tooltip text sits inside 1-cell padding at (3, 4).
    expect(rect!.x).toBe(3);
    expect(rect!.y).toBe(4);
    ref.dispose();
  });
});