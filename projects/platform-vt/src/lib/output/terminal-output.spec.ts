import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TerminalOutput } from './terminal-output';
import type { LayoutNode } from '../layout/layout-node';
import type { VTNode } from '../renderer/vt-node';
import { createVTNode, appendVTChild, resetVTNodeId } from '../renderer/vt-node';

function layoutNode(vtNode: VTNode, x = 0, y = 0, width = 10, height = 1, children: LayoutNode[] = []): LayoutNode {
  return { vtNode, x, y, width, height, children };
}

let written: string[] = [];

beforeEach(() => {
  resetVTNodeId();
  written = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    written.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function lastWrite(): string {
  return written.join('');
}

describe('TerminalOutput', () => {
  const output = new TerminalOutput();

  it('clears the screen and moves the cursor by default', () => {
    const root = createVTNode('root');
    output.render(layoutNode(root), 80, 24);

    expect(written.length).toBeGreaterThan(0);
    const outputText = lastWrite();
    expect(outputText).toContain('\x1b[?25l');
    expect(outputText).toContain('\x1b[2J');
    expect(outputText).toContain('\x1b[1;1H');
    expect(outputText).toContain('\x1b[0m');
    expect(outputText).toContain('\x1b[?25h');
  });

  it('skips the screen clear when clear is false', () => {
    const root = createVTNode('root');
    output.render(layoutNode(root), 80, 24, { clear: false });

    const written = lastWrite();
    expect(written).not.toContain('\x1b[2J');
    expect(written).not.toContain('\x1b[?25l');
  });

  it('renders text nodes at their own position', () => {
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'hello';
    const b = createVTNode('text');
    b.textContent = 'world';
    appendVTChild(root, a);
    appendVTChild(root, b);

    output.render(
      layoutNode(root, 0, 0, 80, 24, [
        layoutNode(a, 2, 3, 5, 1),
        layoutNode(b, 8, 3, 5, 1),
      ]),
      80,
      24,
    );

    const written = lastWrite();
    expect(written).toContain('\x1b[4;3H');
    expect(written).toContain('hello');
    expect(written).toContain('\x1b[4;9H');
    expect(written).toContain('world');
  });

  it('inlines a single text child into the parent box', () => {
    const root = createVTNode('root');
    const text = createVTNode('text');
    text.textContent = 'hello';
    appendVTChild(root, text);

    output.render(layoutNode(root, 2, 3, 10, 1, [layoutNode(text, 0, 0, 5, 1)]), 80, 24);

    const written = lastWrite();
    expect(written).toContain('\x1b[4;3H');
    expect(written).toContain('hello');
  });

  it('truncates text wider than the node', () => {
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'abcdef';
    const b = createVTNode('text');
    b.textContent = 'xx';
    appendVTChild(root, a);
    appendVTChild(root, b);

    output.render(
      layoutNode(root, 0, 0, 80, 24, [
        layoutNode(a, 0, 0, 3, 1),
        layoutNode(b, 4, 0, 2, 1),
      ]),
      80,
      24,
    );

    const written = lastWrite();
    expect(written).toContain('abc');
    expect(written).not.toContain('def');
  });

  it('right-aligns text when textAlign is right', () => {
    const root = createVTNode('root');
    root.styles.set('textAlign', 'right');
    const text = createVTNode('text');
    text.textContent = 'hi';
    appendVTChild(root, text);

    output.render(layoutNode(root, 0, 0, 5, 1, [layoutNode(text, 0, 0, 5, 1)]), 80, 24);

    const written = lastWrite();
    expect(written).toContain('   hi');
  });

  it('skips nodes with display: none', () => {
    const root = createVTNode('root');
    const visible = createVTNode('text');
    visible.textContent = 'visible';
    const hidden = createVTNode('text');
    hidden.textContent = 'hidden';
    hidden.styles.set('display', 'none');
    appendVTChild(root, visible);
    appendVTChild(root, hidden);

    output.render(
      layoutNode(root, 0, 0, 80, 24, [
        layoutNode(visible, 0, 0, 7, 1),
        layoutNode(hidden, 8, 0, 6, 1),
      ]),
      80,
      24,
    );

    const written = lastWrite();
    expect(written).toContain('visible');
    expect(written).not.toContain('hidden');
  });

  it('skips nodes with zero width or height', () => {
    const root = createVTNode('root');
    const visible = createVTNode('text');
    visible.textContent = 'visible';
    const invisible = createVTNode('text');
    invisible.textContent = 'invisible';
    appendVTChild(root, visible);
    appendVTChild(root, invisible);

    output.render(
      layoutNode(root, 0, 0, 80, 24, [
        layoutNode(visible, 0, 0, 7, 1),
        layoutNode(invisible, 8, 0, 0, 0),
      ]),
      80,
      24,
    );

    const written = lastWrite();
    expect(written).toContain('visible');
    expect(written).not.toContain('invisible');
  });

  it('paints a background fill for elements with backgroundColor', () => {
    const root = createVTNode('root');
    const box = createVTNode('element', 'vt-box');
    box.styles.set('backgroundColor', '#ff0000');
    appendVTChild(root, box);

    output.render(layoutNode(root, 0, 0, 80, 24, [layoutNode(box, 0, 0, 4, 2)]), 80, 24);

    const written = lastWrite();
    expect(written).toContain('\x1b[48;2;255;0;0m');
    expect(written).toContain('    ');
  });

  it('paints a single border for bordered elements', () => {
    const root = createVTNode('root');
    const box = createVTNode('element', 'vt-box');
    box.styles.set('border', 'single');
    appendVTChild(root, box);

    output.render(layoutNode(root, 0, 0, 80, 24, [layoutNode(box, 0, 0, 5, 3)]), 80, 24);

    const written = lastWrite();
    expect(written).toContain('\u250c');
    expect(written).toContain('\u2510');
    expect(written).toContain('\u2514');
    expect(written).toContain('\u2518');
    expect(written).toContain('\u2502');
  });

  it('paints a left-only border for borderLeft', () => {
    const root = createVTNode('root');
    const box = createVTNode('element', 'vt-box');
    box.styles.set('borderLeft', 'single');
    appendVTChild(root, box);

    output.render(layoutNode(root, 0, 0, 80, 24, [layoutNode(box, 0, 0, 5, 3)]), 80, 24);

    const written = lastWrite();
    expect(written).not.toContain('\u250c');
    expect(written).toContain('\u2502');
  });

  it('applies color and bold styles to text', () => {
    const root = createVTNode('root');
    root.styles.set('color', '#00ff00');
    root.styles.set('fontWeight', 'bold');
    const text = createVTNode('text');
    text.textContent = 'styled';
    appendVTChild(root, text);

    output.render(layoutNode(root, 0, 0, 80, 24, [layoutNode(text, 0, 0, 10, 1)]), 80, 24);

    const written = lastWrite();
    expect(written).toContain('\x1b[1m');
    expect(written).toContain('\x1b[38;2;0;255;0m');
    expect(written).toContain('styled');
  });

  it('clips children of a scroll container to its viewport', () => {
    const root = createVTNode('root');
    const scroller = createVTNode('element', 'vt-scroll');
    scroller.styles.set('overflow', 'scroll');
    const above = createVTNode('text');
    above.textContent = 'above';
    const inside = createVTNode('text');
    inside.textContent = 'inside';
    const below = createVTNode('text');
    below.textContent = 'below';
    appendVTChild(root, scroller);
    appendVTChild(scroller, above);
    appendVTChild(scroller, inside);
    appendVTChild(scroller, below);

    const scrollerLayout = layoutNode(scroller, 0, 1, 10, 1, [
      layoutNode(above, 0, 0, 10, 1),
      layoutNode(inside, 0, 1, 10, 1),
      layoutNode(below, 0, 2, 10, 1),
    ]);

    output.render(layoutNode(root, 0, 0, 80, 24, [scrollerLayout]), 80, 24);

    const written = lastWrite();
    expect(written).toContain('inside');
    expect(written).not.toContain('above');
    expect(written).not.toContain('below');
  });
});