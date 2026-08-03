import { describe, it, expect } from 'vitest';
import {
  parseSgrMouse,
  extractSgrSequences,
  stripSgrSequences,
  trackClick,
  INITIAL_CLICK_TRACKER,
  type VTMouseEvent,
} from './sgr-mouse';

describe('parseSgrMouse', () => {
  it('parses a left-button press at 1-based coordinates to 0-based', () => {
    const event = parseSgrMouse('\x1b[<0;5;3M');
    expect(event).toEqual({
      x: 4,
      y: 2,
      type: 'down',
      button: 'left',
      scrollDirection: undefined,
      shift: false,
      meta: false,
      ctrl: false,
      raw: '\x1b[<0;5;3M',
    });
  });

  it('parses a right-button release', () => {
    const event = parseSgrMouse('\x1b[<2;10;4m');
    expect(event?.type).toBe('up');
    expect(event?.button).toBe('right');
    expect(event?.x).toBe(9);
    expect(event?.y).toBe(3);
  });

  it('parses middle-button press', () => {
    const event = parseSgrMouse('\x1b[<1;2;2M');
    expect(event?.button).toBe('middle');
    expect(event?.type).toBe('down');
  });

  it('parses drag as a move event', () => {
    const event = parseSgrMouse('\x1b[<32;5;5M');
    expect(event?.type).toBe('move');
    expect(event?.button).toBe('left');
  });

  it('parses wheel scroll direction', () => {
    const up = parseSgrMouse('\x1b[<64;1;1M');
    expect(up?.type).toBe('scroll');
    expect(up?.scrollDirection).toBe('up');

    const down = parseSgrMouse('\x1b[<65;1;1M');
    expect(down?.type).toBe('scroll');
    expect(down?.scrollDirection).toBe('down');
  });

  it('parses modifier keys', () => {
    const event = parseSgrMouse('\x1b[<28;3;3M'); // 4 + 8 + 16
    expect(event?.shift).toBe(true);
    expect(event?.meta).toBe(true);
    expect(event?.ctrl).toBe(true);
  });

  it('returns null for non-mouse sequences', () => {
    expect(parseSgrMouse('\x1b[A')).toBeNull();
    expect(parseSgrMouse('a')).toBeNull();
    expect(parseSgrMouse('\x1b[<0;1;1')).toBeNull();
  });
});

describe('extractSgrSequences / stripSgrSequences', () => {
  it('extracts mouse sequences from a mixed chunk', () => {
    const chunk = '\x1b[<0;1;1Ma\x1b[<0;2;1m';
    expect(extractSgrSequences(chunk)).toEqual(['\x1b[<0;1;1M', '\x1b[<0;2;1m']);
    expect(stripSgrSequences(chunk)).toBe('a');
  });

  it('leaves keyboard-only chunks untouched', () => {
    expect(extractSgrSequences('hello')).toEqual([]);
    expect(stripSgrSequences('hello')).toBe('hello');
  });
});

describe('trackClick', () => {
  const parse = (sequence: string): VTMouseEvent => {
    const event = parseSgrMouse(sequence);
    if (event === null) throw new Error(`expected a mouse event for ${sequence}`);
    return event;
  };

  const down = parse('\x1b[<0;5;5M');
  const up = parse('\x1b[<0;5;5m');

  it('emits a click after press + nearby release', () => {
    const first = trackClick(INITIAL_CLICK_TRACKER, down);
    expect(first.click).toBeNull();

    const second = trackClick(first.state, up);
    expect(second.click).toEqual({
      x: 4,
      y: 4,
      button: 'left',
      shift: false,
      meta: false,
      ctrl: false,
    });
  });

  it('does not emit a click when released far from the press', () => {
    const moved = parse('\x1b[<0;20;20m');
    const first = trackClick(INITIAL_CLICK_TRACKER, down);
    const second = trackClick(first.state, moved);
    expect(second.click).toBeNull();
  });

  it('does not emit a click when a different button is released', () => {
    const other = parse('\x1b[<2;5;5m');
    const first = trackClick(INITIAL_CLICK_TRACKER, down);
    const second = trackClick(first.state, other);
    expect(second.click).toBeNull();
  });

  it('ignores release without a preceding press', () => {
    const result = trackClick(INITIAL_CLICK_TRACKER, up);
    expect(result.click).toBeNull();
    expect(result.state.down).toBeNull();
  });
});
