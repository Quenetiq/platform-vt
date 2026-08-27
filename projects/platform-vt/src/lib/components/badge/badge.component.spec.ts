import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BadgeComponent, type BadgeVariant } from './badge.component';
import { StatusBarComponent } from '../statusbar/statusbar.component';
import { PaginatorComponent } from '../paginator/paginator.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { provideClickService } from '../../services/click.service';

@Component({
  selector: 'vt-badge-host',
  imports: [BadgeComponent],
  template: `<vt-badge [label]="label()" [variant]="variant()"></vt-badge>`,
})
class BadgeHostComponent {
  readonly label = signal('Deployed');
  readonly variant = signal<BadgeVariant>('success');
}

describe('BadgeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BadgeHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('renders label with the variant color and dot', () => {
    const fixture = TestBed.createComponent(BadgeHostComponent);
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-badge')!;
    expect(el.getAttribute('content')).toBe('\u25CF Deployed');
    expect(el.getAttribute('color')).toBe('green');
  });

  it('supports the neutral variant and no dot', () => {
    const fixture = TestBed.createComponent(BadgeHostComponent);
    fixture.componentInstance.variant.set('neutral');
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-badge')!;
    expect(el.getAttribute('color')).toBe('gray');
  });
});

@Component({
  selector: 'vt-status-host',
  imports: [StatusBarComponent],
  template: `<vt-statusbar left="info" right="hint"></vt-statusbar>`,
})
class StatusHostComponent {}

describe('StatusBarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatusHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('pins to the bottom row and fills the terminal width', () => {
    TestBed.inject(TerminalService).columns.set(20);
    TestBed.inject(TerminalService).rows.set(10);
    const fixture = TestBed.createComponent(StatusHostComponent);
    fixture.detectChanges();

    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-statusbar')!;
    expect(el.getAttribute('position')).toBe('absolute');
    expect(el.getAttribute('top')).toBe('9');
    expect(el.getAttribute('width')).toBe('20');
    expect(el.getAttribute('content')).toBe('info            hint');
  });
});

@Component({
  selector: 'vt-page-host',
  imports: [PaginatorComponent],
  template: `<vt-paginator [page]="page()" [total]="12" (pageChange)="page.set($event)"></vt-paginator>`,
})
class PageHostComponent {
  readonly page = signal(1);
}

describe('PaginatorComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PageHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('renders page numbers with ellipses for long ranges', () => {
    const fixture = TestBed.createComponent(PageHostComponent);
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-paginator')!;
    expect(el.getAttribute('content')).toContain('1');
    expect(el.getAttribute('content')).toContain('\u2026');
    expect(el.getAttribute('content')).toContain('12');
    expect(el.getAttribute('content')).toContain('(1/12)');
  });

  it('emits page changes on arrow keys while focused', () => {
    const fixture = TestBed.createComponent(PageHostComponent);
    fixture.detectChanges();
    const focus = TestBed.inject(FocusService);
    const input = TestBed.inject(InputService);
    const render = TestBed.inject(RenderService);

    // Focus the paginator (autofocus-less: focus explicitly by id is
    // private; simulate via focusInput which focuses the first focusable).
    focus.focusInput();
    render.scheduleRender();

    input.simulateKey({ name: 'right', ctrl: false, meta: false, shift: false, sequence: '' });
    render.scheduleRender();
    expect(fixture.componentInstance.page()).toBe(2);

    input.simulateKey({ name: 'end', ctrl: false, meta: false, shift: false, sequence: '' });
    render.scheduleRender();
    expect(fixture.componentInstance.page()).toBe(12);
  });
});