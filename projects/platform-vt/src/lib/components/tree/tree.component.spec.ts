import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TreeComponent, type TreeNode, type TreeNodeLoader } from './tree.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';

const TREE: TreeNode[] = [
  {
    label: 'src',
    children: [{ label: 'main.ts' }, { label: 'app.ts' }],
  },
  { label: 'README.md' },
];

@Component({
  selector: 'vt-tree-host',
  imports: [TreeComponent],
  template: `
    <vt-tree
      [nodes]="nodes"
      [filter]="filter()"
      [checkboxes]="checkboxes"
      [loadChildren]="loader"
      (selected)="selected.set($event)"
      (selectionChange)="checked.set($event)"
    ></vt-tree>
  `,
})
class TreeHostComponent {
  nodes: TreeNode[] = TREE;
  checkboxes = false;
  loader: TreeNodeLoader | null = null;
  readonly filter = signal('');
  readonly selected = signal<TreeNode | null>(null);
  readonly checked = signal<TreeNode[]>([]);
}

function key(name: string, ctrl = false, meta = false): VTKeyEvent {
  return { name, ctrl, meta, shift: false, sequence: '' };
}

function focusTree(fixture: ComponentFixture<TreeHostComponent>): void {
  const focus = TestBed.inject(FocusService);
  const el = (fixture.nativeElement as HTMLElement).querySelector('vt-tree')!;
  focus.clearFocus();
  focus.focus(el.getAttribute('vt-click-id')!);
}

function rows(fixture: ComponentFixture<TreeHostComponent>): string[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('vt-tree-row')).map(
    (row) => row.textContent ?? '',
  );
}

describe('TreeComponent', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TreeHostComponent],
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
    input = TestBed.inject(InputService);
  });

  it('renders expanded children and emits the active node', () => {
    const fixture = TestBed.createComponent(TreeHostComponent);
    fixture.detectChanges();
    focusTree(fixture);

    expect(rows(fixture)).toHaveLength(4);
    input.simulateKey(key('down'));
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.label).toBe('main.ts');
  });

  it('collapses and expands with the keyboard', () => {
    const fixture = TestBed.createComponent(TreeHostComponent);
    fixture.detectChanges();
    focusTree(fixture);

    input.simulateKey(key('left'));
    fixture.detectChanges();
    expect(rows(fixture)).toHaveLength(2);

    input.simulateKey(key('right'));
    fixture.detectChanges();
    expect(rows(fixture)).toHaveLength(4);
  });

  it('toggles checkboxes and tracks selected nodes', () => {
    const fixture = TestBed.createComponent(TreeHostComponent);
    fixture.componentInstance.checkboxes = true;
    fixture.detectChanges();
    focusTree(fixture);

    expect(rows(fixture)[0]).toContain('[ ]');
    input.simulateKey(key(' '));
    fixture.detectChanges();
    expect(rows(fixture)[0]).toContain('[x]');
    expect(fixture.componentInstance.checked().map((node) => node.label)).toEqual(['src']);

    input.simulateKey(key(' '));
    expect(fixture.componentInstance.checked()).toEqual([]);
  });

  it('filters to matching nodes and their ancestors', () => {
    const fixture = TestBed.createComponent(TreeHostComponent);
    fixture.detectChanges();

    fixture.componentInstance.filter.set('app');
    fixture.detectChanges();

    expect(rows(fixture).map((row) => row.trim())).toEqual(
      expect.arrayContaining([expect.stringContaining('src'), expect.stringContaining('app.ts')]),
    );
    expect(rows(fixture).some((row) => row.includes('README'))).toBe(false);
    expect(rows(fixture).some((row) => row.includes('main.ts'))).toBe(false);
  });

  it('loads children lazily on expand', async () => {
    const fixture = TestBed.createComponent(TreeHostComponent);
    fixture.componentInstance.nodes = [{ label: 'remote' }];
    fixture.componentInstance.loader = (): Promise<TreeNode[]> =>
      Promise.resolve([{ label: 'child-1' }, { label: 'child-2' }]);
    fixture.detectChanges();
    focusTree(fixture);

    expect(rows(fixture)).toHaveLength(1);
    input.simulateKey(key('right'));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(3);
    expect(rows(fixture)[1]).toContain('child-1');
  });
});
