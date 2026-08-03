/**
 * Pure parser for the terminal SGR mouse protocol.
 *
 * When a terminal is told to report mouse events (`\x1b[?1002h` button-event
 * tracking + `\x1b[?1006h` SGR extended coordinates), it emits sequences of
 * the form `ESC [ < b ; x ; y M` (button press) and `ESC [ < b ; x ; y m`
 * (button release), where `b` encodes the button and modifier keys:
 *
 * - bits 0-1  — button (0 left, 1 middle, 2 right, 3 none)
 * - bit  2    — shift
 * - bit  3    — meta / alt
 * - bit  4    — ctrl
 * - bit  5    — motion (drag)
 * - bit  6    — wheel (0 scroll up, 1 scroll down)
 *
 * Coordinates are 1-based; this module converts them to 0-based.
 */

/** Mouse buttons reported by the terminal. */
export type VTMouseButton = 'left' | 'middle' | 'right' | 'none';

/** Kind of mouse event. */
export type VTMouseEventType = 'down' | 'up' | 'move' | 'scroll';

/** A raw mouse event parsed from the terminal. Coordinates are 0-based. */
export interface VTMouseEvent {
  /** Column (0-based). */
  x: number;
  /** Row (0-based). */
  y: number;
  /** Event kind: press, release, drag/motion, or wheel. */
  type: VTMouseEventType;
  /** Button involved, or `'none'` for wheel events. */
  button: VTMouseButton;
  /** Wheel direction, only set for `type === 'scroll'`. */
  scrollDirection?: 'up' | 'down';
  /** Whether Shift was held. */
  shift: boolean;
  /** Whether Meta/Alt was held. */
  meta: boolean;
  /** Whether Ctrl was held. */
  ctrl: boolean;
  /** The raw escape sequence that produced this event. */
  raw: string;
}

/** A completed press+release pair, in the style of a browser `click`. */
export interface VTClickEvent {
  /** Column (0-based). */
  x: number;
  /** Row (0-based). */
  y: number;
  /** Button that was clicked. */
  button: Exclude<VTMouseButton, 'none'>;
  /** Whether Shift was held. */
  shift: boolean;
  /** Whether Meta/Alt was held. */
  meta: boolean;
  /** Whether Ctrl was held. */
  ctrl: boolean;
}

/** Max distance (in cells) between press and release to still count as a click. */
export const CLICK_SLOP = 2;

const SGR_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;
const SGR_MOUSE_GLOBAL_RE = /\x1b\[<\d+;\d+;\d+[Mm]/g;

/**
 * Parse a single SGR mouse escape sequence into a {@link VTMouseEvent}.
 *
 * @param sequence - The raw escape sequence, e.g. `'\x1b[<0;5;3M'`.
 * @returns The parsed event, or `null` if the sequence is not a mouse event.
 */
export function parseSgrMouse(sequence: string): VTMouseEvent | null {
  const match = SGR_MOUSE_RE.exec(sequence);
  if (!match) return null;

  const code = Number(match[1]);
  const x = Number(match[2]) - 1;
  const y = Number(match[3]) - 1;
  const release = match[4] === 'm';

  const shift = (code & 4) !== 0;
  const meta = (code & 8) !== 0;
  const ctrl = (code & 16) !== 0;

  let type: VTMouseEventType;
  let button: VTMouseButton;
  let scrollDirection: 'up' | 'down' | undefined;

  if ((code & 64) !== 0) {
    type = 'scroll';
    scrollDirection = (code & 1) !== 0 ? 'down' : 'up';
    button = 'none';
  } else if ((code & 32) !== 0) {
    type = 'move';
    button = mouseButton(code);
  } else if (release) {
    type = 'up';
    button = mouseButton(code);
  } else {
    type = 'down';
    button = mouseButton(code);
  }

  return { x, y, type, button, scrollDirection, shift, meta, ctrl, raw: sequence };
}

/**
 * Extract every complete SGR mouse sequence from a stdin chunk.
 *
 * A single chunk may interleave mouse and keyboard data (e.g. while typing),
 * so all complete sequences are returned and left out of key parsing.
 *
 * @param data - Raw stdin chunk.
 * @returns All mouse escape sequences found in the chunk.
 */
export function extractSgrSequences(data: string): string[] {
  const sequences = data.match(SGR_MOUSE_GLOBAL_RE);
  return sequences ?? [];
}

/**
 * Remove all complete SGR mouse sequences from a stdin chunk.
 *
 * @param data - Raw stdin chunk.
 * @returns The chunk without mouse escape sequences.
 */
export function stripSgrSequences(data: string): string {
  return data.replace(SGR_MOUSE_GLOBAL_RE, '');
}

function mouseButton(code: number): VTMouseButton {
  const bits = code & 3;
  if (bits === 1) return 'middle';
  if (bits === 2) return 'right';
  if (bits === 3) return 'none';
  return 'left';
}

/** State kept between mouse events for click detection. */
export interface ClickTracker {
  /** The most recent press, or null. */
  down: VTMouseEvent | null;
}

/** Empty {@link ClickTracker} state. */
export const INITIAL_CLICK_TRACKER: ClickTracker = { down: null };

/**
 * Update click tracking state with a raw mouse event.
 *
 * Returns the next tracker state and, when a press is followed by a release
 * of the same button near the press position, a {@link VTClickEvent}.
 *
 * @param state - Current tracker state.
 * @param event - The incoming raw mouse event.
 * @returns The next state and any completed click.
 */
export function trackClick(
  state: ClickTracker,
  event: VTMouseEvent,
): { state: ClickTracker; click: VTClickEvent | null } {
  if (event.type === 'down' && event.button !== 'none') {
    return { state: { down: event }, click: null };
  }

  if (event.type === 'up' && event.button !== 'none') {
    const down = state.down;
    if (
      down?.button === event.button &&
      Math.abs(down.x - event.x) <= CLICK_SLOP &&
      Math.abs(down.y - event.y) <= CLICK_SLOP
    ) {
      return {
        state: { down: null },
        click: {
          x: event.x,
          y: event.y,
          button: event.button,
          shift: event.shift,
          meta: event.meta,
          ctrl: event.ctrl,
        },
      };
    }

    return { state: { down: null }, click: null };
  }

  return { state, click: null };
}
