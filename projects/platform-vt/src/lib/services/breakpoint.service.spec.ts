import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BreakpointService, provideBreakpoints } from './breakpoint.service';
import { TerminalService } from './terminal.service';

describe('BreakpointService', () => {
  let service: BreakpointService;
  let terminal: TerminalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TerminalService, provideBreakpoints({ sm: 30, md: 60, lg: 100, xl: 140 })],
    });
    service = TestBed.inject(BreakpointService);
    terminal = TestBed.inject(TerminalService);
  });

  it('derives the breakpoint from the terminal width', () => {
    terminal.columns.set(20);
    expect(service.breakpoint()).toBe('xs');
    terminal.columns.set(30);
    expect(service.breakpoint()).toBe('sm');
    terminal.columns.set(75);
    expect(service.breakpoint()).toBe('md');
    terminal.columns.set(120);
    expect(service.breakpoint()).toBe('lg');
    terminal.columns.set(200);
    expect(service.breakpoint()).toBe('xl');
  });

  it('supports atLeast and matches', () => {
    terminal.columns.set(75);
    expect(service.atLeast('sm')).toBe(true);
    expect(service.atLeast('lg')).toBe(false);
    expect(service.matches('sm', 'md')).toBe(true);
    expect(service.matches('lg', 'xl')).toBe(false);
    expect(service.isMd()).toBe(true);
    expect(service.isLg()).toBe(false);
  });
});
