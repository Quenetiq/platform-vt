import { describe, it, expect } from 'vitest';
import { cursor, erase, fg, bg, txt, reset } from './ansi';

describe('cursor', () => {
  it('moveTo generates correct escape', () => {
    expect(cursor.moveTo(0, 0)).toBe('\x1b[1;1H');
    expect(cursor.moveTo(5, 10)).toBe('\x1b[11;6H');
  });

  it('hide/show generate correct escapes', () => {
    expect(cursor.hide()).toBe('\x1b[?25l');
    expect(cursor.show()).toBe('\x1b[?25h');
  });

  it('save/restore generate correct escapes', () => {
    expect(cursor.save()).toBe('\x1b[s');
    expect(cursor.restore()).toBe('\x1b[u');
  });

  it('moveUp/moveDown/moveRight/moveLeft', () => {
    expect(cursor.moveUp(3)).toBe('\x1b[3A');
    expect(cursor.moveDown(1)).toBe('\x1b[1B');
    expect(cursor.moveRight(5)).toBe('\x1b[5C');
    expect(cursor.moveLeft(2)).toBe('\x1b[2D');
  });

  it('defaults n to 1', () => {
    expect(cursor.moveUp()).toBe('\x1b[1A');
    expect(cursor.moveDown()).toBe('\x1b[1B');
  });
});

describe('erase', () => {
  it('screen', () => {
    expect(erase.screen()).toBe('\x1b[2J');
  });

  it('line', () => {
    expect(erase.line()).toBe('\x1b[2K');
  });

  it('below', () => {
    expect(erase.below()).toBe('\x1b[J');
  });
});

describe('fg', () => {
  it('wraps string with foreground color', () => {
    expect(fg.red('hello')).toBe('\x1b[31mhello\x1b[39m');
    expect(fg.green('test')).toBe('\x1b[32mtest\x1b[39m');
  });

  it('rgb generates 24-bit color', () => {
    expect(fg.rgb(255, 128, 0, 'orange')).toBe('\x1b[38;2;255;128;0morange\x1b[39m');
  });
});

describe('bg', () => {
  it('wraps string with background color', () => {
    expect(bg.blue('hello')).toBe('\x1b[44mhello\x1b[49m');
  });

  it('rgb generates 24-bit background', () => {
    expect(bg.rgb(0, 0, 255, 'blue')).toBe('\x1b[48;2;0;0;255mblue\x1b[49m');
  });
});

describe('txt', () => {
  it('bold', () => {
    expect(txt.bold('hi')).toBe('\x1b[1mhi\x1b[22m');
  });

  it('italic', () => {
    expect(txt.italic('hi')).toBe('\x1b[3mhi\x1b[23m');
  });

  it('underline', () => {
    expect(txt.underline('hi')).toBe('\x1b[4mhi\x1b[24m');
  });

  it('dim', () => {
    expect(txt.dim('hi')).toBe('\x1b[2mhi\x1b[22m');
  });
});

describe('reset', () => {
  it('generates reset escape', () => {
    expect(reset()).toBe('\x1b[0m');
  });
});
