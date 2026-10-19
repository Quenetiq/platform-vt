import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ThemeService,
  parseOscColor,
  detectColorScheme,
  colorSchemeForBackground,
  DARK_THEME,
  LIGHT_THEME,
} from './theme.service';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';

describe('parseOscColor', () => {
  it('parses 4-digit X11 components', () => {
    expect(parseOscColor('\x1b]11;rgb:1e1e/1e1e/1e1e\x1b\\')).toBe('#1e1e1e');
    expect(parseOscColor('\x1b]10;rgb:ffff/0000/8000\x07')).toBe('#ff0080');
  });

  it('parses 1- and 2-digit components', () => {
    expect(parseOscColor('\x1b]11;rgb:f/0/8\x07')).toBe('#ff0088');
    expect(parseOscColor('\x1b]11;rgb:ff/00/80\x07')).toBe('#ff0080');
  });

  it('filters by color code', () => {
    const chunk = '\x1b]10;rgb:ffff/ffff/ffff\x07\x1b]11;rgb:0000/0000/0000\x07';
    expect(parseOscColor(chunk, 10)).toBe('#ffffff');
    expect(parseOscColor(chunk, 11)).toBe('#000000');
  });

  it('returns null for unrelated input', () => {
    expect(parseOscColor('hello')).toBeNull();
  });
});

describe('detectColorScheme', () => {
  it('uses TERM_BACKGROUND when present', () => {
    expect(detectColorScheme({ TERM_BACKGROUND: 'light' })).toBe('light');
    expect(detectColorScheme({ TERM_BACKGROUND: 'dark' })).toBe('dark');
  });

  it('parses COLORFGBG', () => {
    expect(detectColorScheme({ COLORFGBG: '15;0' })).toBe('dark');
    expect(detectColorScheme({ COLORFGBG: '0;15' })).toBe('light');
    expect(detectColorScheme({ COLORFGBG: '0;default;7' })).toBe('light');
  });

  it('defaults to dark', () => {
    expect(detectColorScheme({})).toBe('dark');
  });
});

describe('colorSchemeForBackground', () => {
  it('detects dark and light backgrounds', () => {
    expect(colorSchemeForBackground('#1e1e1e')).toBe('dark');
    expect(colorSchemeForBackground('#f5f5f5')).toBe('light');
  });
});

describe('ThemeService', () => {
  let theme: ThemeService;
  let input: InputService;
  let terminal: TerminalService;
  let write: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TerminalService, InputService, ThemeService, provideZonelessChangeDetection()],
    });
    theme = TestBed.inject(ThemeService);
    input = TestBed.inject(InputService);
    terminal = TestBed.inject(TerminalService);
    write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    theme.setScheme('dark');
  });

  it('uses the default palettes', () => {
    expect(theme.colors()).toBe(DARK_THEME);
    theme.toggle();
    expect(theme.colors()).toBe(LIGHT_THEME);
  });

  it('queries the terminal and updates the scheme', async () => {
    const pending = theme.query(100);
    expect(write).toHaveBeenCalledWith('\x1b]10;?\x07\x1b]11;?\x07');

    input.rawInput.next('\x1b]10;rgb:0000/0000/0000\x07');
    input.rawInput.next('\x1b]11;rgb:ffff/ffff/ffff\x1b\\');

    await expect(pending).resolves.toEqual({
      foreground: '#000000',
      background: '#ffffff',
    });
    expect(theme.scheme()).toBe('light');
    expect(theme.reportedBackground()).toBe('#ffffff');
  });

  it('resolves with nulls when the terminal does not answer', async () => {
    await expect(theme.query(5)).resolves.toEqual({ foreground: null, background: null });
  });
});
