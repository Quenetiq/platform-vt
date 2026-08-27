import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalOutput } from './terminal-output';
import type { LayoutNode } from '../layout/layout-node';
import type { VTNode } from '../renderer/vt-node';
import { createVTNode, appendVTChild, resetVTNodeId } from '../renderer/vt-node';

function layoutNode(vtNode: VTNode, x = 0, y = 0, width = 10, height = 1, children: LayoutNode[] = []): LayoutNode {
  return { vtNode, x, y, width, height, children };
}

function renderGolden(output: TerminalOutput, layout: LayoutNode): string {
  output.render(layout, 60, 10);
  return output.flushToBuffer();
}

/**
 * Golden snapshot of the rendered ANSI output.
 *
 * The golden file lives next to this spec; regenerate it with
 * `UPDATE_SNAPSHOTS=1` or by deleting `render.golden` and re-running.
 */
describe('render golden snapshots', () => {
  beforeEach(() => resetVTNodeId());

  it('matches the golden file', async () => {
    const output = new TerminalOutput();

    const root = createVTNode('element', 'vt-box');
    root.styles.set('display', 'flex');
    root.styles.set('flexDirection', 'column');
    root.styles.set('gap', 1);
    root.styles.set('padding', 1);
    root.styles.set('border', 'single');

    const title = createVTNode('element', 'vt-box');
    title.styles.set('display', 'flex');
    title.styles.set('flexDirection', 'row');
    title.styles.set('flexShrink', 0);
    const titleText = createVTNode('text');
    titleText.textContent = 'Golden snapshot 世界';
    appendVTChild(title, titleText);

    const body = createVTNode('element', 'vt-box');
    body.styles.set('display', 'flex');
    body.styles.set('flexDirection', 'column');
    body.styles.set('flexShrink', 0);
    const row1 = createVTNode('text');
    row1.textContent = 'row one';
    row1.styles.set('color', 'green');
    const row2 = createVTNode('text');
    row2.textContent = 'row two';
    row2.styles.set('fontWeight', 'bold');
    appendVTChild(body, row1);
    appendVTChild(body, row2);

    appendVTChild(root, title);
    appendVTChild(root, body);

    const frame = renderGolden(
      output,
      layoutNode(root, 0, 0, 60, 10, [
        layoutNode(title, 1, 1, 30, 1, [layoutNode(titleText, 0, 0, 30, 1)]),
        layoutNode(body, 1, 3, 30, 2, [
          layoutNode(row1, 0, 0, 10, 1),
          layoutNode(row2, 0, 1, 10, 1),
        ]),
      ]),
    );

    // toMatchFileSnapshot resolves relative to this spec file.
await expect(frame).toMatchFileSnapshot('./snapshots/render.golden');
  });
});