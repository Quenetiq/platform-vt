/**
 * Render pipeline benchmark: layout + cell paint + diff for growing trees.
 *
 * Run with: npx tsx benchmarks/render-bench.ts
 */
import { createVTNode, appendVTChild } from '../projects/platform-vt/src/lib/renderer/vt-node';
import { FlexLayout } from '../projects/platform-vt/src/lib/layout/flex-layout';
import { TerminalOutput } from '../projects/platform-vt/src/lib/output/terminal-output';
import type { VTNode } from '../projects/platform-vt/src/lib/renderer/vt-node';

function buildTree(textRows: number, cols: number): VTNode {
  const root = createVTNode('element', 'vt-box');
  root.styles.set('display', 'flex');
  root.styles.set('flexDirection', 'column');
  root.styles.set('gap', 0);
  for (let r = 0; r < textRows; r++) {
    const row = createVTNode('element', 'vt-box');
    row.styles.set('display', 'flex');
    row.styles.set('flexDirection', 'row');
    row.styles.set('flexShrink', 0);
    for (let c = 0; c < cols; c++) {
      const text = createVTNode('text');
      text.textContent = `c${r}x${c}`;
      appendVTChild(row, text);
    }
    appendVTChild(root, row);
  }
  return root;
}

const WIDTH = 120;
const HEIGHT = 40;
const layout = new FlexLayout();
const output = new TerminalOutput();

for (const rows of [10, 50, 200, 1000]) {
  const tree = buildTree(rows, 8);

  const t0 = performance.now();
  const treeLayout = layout.calculate(tree, WIDTH, HEIGHT);
  const t1 = performance.now();

  output.render(treeLayout, WIDTH, HEIGHT);
  const t2 = performance.now();
  output.flushToBuffer();
  const t3 = performance.now();

  // Second identical frame: diff should be nearly free.
  output.render(treeLayout, WIDTH, HEIGHT);
  const t4 = performance.now();
  output.flushToBuffer();
  const t5 = performance.now();

  console.log(
    `${rows.toString().padStart(5)} rows ` +
      `| layout ${(t1 - t0).toFixed(2).padStart(7)}ms ` +
      `| paint ${(t2 - t1).toFixed(2).padStart(7)}ms ` +
      `| diff ${(t3 - t2).toFixed(2).padStart(7)}ms ` +
      `| unchanged-frame diff ${(t5 - t4).toFixed(3).padStart(7)}ms`,
  );
}