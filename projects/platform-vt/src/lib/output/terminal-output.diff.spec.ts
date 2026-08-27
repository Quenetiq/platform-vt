import { describe, it, expect } from 'vitest';
import { TerminalOutput } from './terminal-output';
import type { LayoutNode } from '../layout/layout-node';
import type { VTNode } from '../renderer/vt-node';
import { createVTNode, appendVTChild, resetVTNodeId } from '../renderer/vt-node';

function layoutNode(vtNode: VTNode, x = 0, y = 0, width = 10, height = 1, children: LayoutNode[] = []): LayoutNode {
  return { vtNode, x, y, width, height, children };
}

function renderOnce(output: TerminalOutput, layout: LayoutNode): string {
  output.render(layout, 80, 24);
  return output.flushToBuffer();
}

describe('TerminalOutput diff rendering', () => {
  beforeEach(() => resetVTNodeId());

  it('emits everything on the first frame', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'hello';
    appendVTChild(root, a);
    const s = renderOnce(
      output,
      layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 5, 1)]),
    );
    expect(s).toContain('\x1b[2J');
    expect(s).toContain('hello');
  });

  it('emits nothing when the frame is unchanged', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'stable';
    appendVTChild(root, a);
    const layout = layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 6, 1)]);

    renderOnce(output, layout);
    const second = renderOnce(output, layout);

    // Only cursor hide/reset/show — no cell output.
    expect(second).toBe('\x1b[?25l\x1b[0m\x1b[?25h');
  });

  it('repaints only the changed cell', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'counter';
    appendVTChild(root, a);
    const layout = layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 7, 1)]);

    renderOnce(output, layout);

    a.textContent = 'counter!';
    const s = renderOnce(output, layout);
    // Exactly one cell changed: move to column 8, row 1 and print '!'.
    expect(s).toContain('\x1b[1;8H!');
  });

  it('repaints the whole line when a wide char is replaced', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = '界界';
    appendVTChild(root, a);
    const layout = layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 4, 1)]);

    const first = renderOnce(output, layout);
    expect(first).toContain('界界');

    a.textContent = 'ab';
    const s = renderOnce(output, layout);
    // 'ab' overwrites the wide chars; the leftover halves are cleared in the
    // same segment ('ab  ').
    expect(s).toContain('ab  ');
    expect(s).not.toContain('界');
  });

  it('renders the selection region with reverse video', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'select me';
    appendVTChild(root, a);
    const layout = layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 9, 1)]);

    output.render(layout, 80, 24, { selection: { x1: 2, y1: 0, x2: 6, y2: 0 } });
    const s = output.flushToBuffer();
    // The selected cells are emitted with reverse video.
    expect(s).toContain('\x1b[7m');
    expect(s).toContain('lect');
  });

  it('extracts text from a region (with wide chars)', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'ab界c';
    appendVTChild(root, a);
    output.render(layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 5, 1)]), 80, 24);
    const text = output.text({ x1: 0, y1: 0, x2: 4, y2: 0 });
    expect(text).toBe('ab界c');
  });

  it('extracts multiline text joined with newlines', () => {
    const output = new TerminalOutput();
    const root = createVTNode('root');
    const a = createVTNode('text');
    a.textContent = 'line one\nline two';
    appendVTChild(root, a);
    output.render(layoutNode(root, 0, 0, 80, 24, [layoutNode(a, 0, 0, 9, 2)]), 80, 24);
    const text = output.text({ x1: 0, y1: 0, x2: 9, y2: 1 });
    expect(text).toBe('line one\nline two');
  });
});