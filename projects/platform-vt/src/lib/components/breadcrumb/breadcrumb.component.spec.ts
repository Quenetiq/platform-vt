import { describe, it, expect, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreadcrumbComponent } from './breadcrumb.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';

@Component({
  selector: 'vt-breadcrumb-host',
  imports: [BreadcrumbComponent],
  template: `
    <vt-breadcrumb [items]="['Home', 'Projects', 'platform-vt']"
      (itemClick)="clicked.set($event)"></vt-breadcrumb>
  `,
})
class BreadcrumbHostComponent {
  readonly clicked = signal(-1);
}

describe('BreadcrumbComponent', () => {
  it('renders segments and emits the clicked index', () => {
    TestBed.configureTestingModule({
      imports: [BreadcrumbHostComponent],
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

    const fixture = TestBed.createComponent(BreadcrumbHostComponent);
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('vt-breadcrumb')!;
    expect(host.textContent).toContain('Home');
    expect(host.textContent).toContain('platform-vt');
    expect(host.querySelectorAll('vt-breadcrumb-item')).toHaveLength(3);

    const component = fixture.debugElement.children[0]!.componentInstance as BreadcrumbComponent;
    component.select(1);
    expect(fixture.componentInstance.clicked()).toBe(1);
  });
});
