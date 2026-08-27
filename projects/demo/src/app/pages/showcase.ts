import { Component, computed, inject, signal } from '@angular/core';
import {
  BoxComponent,
  TextComponent,
  SeparatorComponent,
  NewlineComponent,
  SpacerComponent,
  TabsComponent,
  AutocompleteComponent,
  TextAreaComponent,
  RadioComponent,
  RadioGroupComponent,
  ToggleComponent,
  SliderComponent,
  TableComponent,
  PaginatorComponent,
  BadgeComponent,
  SparklineComponent,
  TreeComponent,
  SplitViewComponent,
  StatusBarComponent,
  ButtonComponent,
  DialogService,
  CommandPaletteService,
  type TableSort,
  type TreeNode,
} from '@quenetiq/platform-vt';

const FILES: string[][] = [
  ['src/main.ts', 'typescript', '1.2k', 'changed'],
  ['src/app.ts', 'typescript', '3.4k', 'changed'],
  ['src/styles.vt', 'stylesheet', '0.8k', 'new'],
  ['lib/output/sixel.ts', 'typescript', '6.1k', 'new'],
  ['lib/screen-buffer.ts', 'typescript', '5.7k', 'changed'],
  ['lib/screen-buffer.spec.ts', 'typescript', '2.2k', 'new'],
  ['README.md', 'markdown', '9.8k', 'untracked'],
  ['package.json', 'json', '1.5k', 'untracked'],
];

const TREE: TreeNode[] = [
  {
    label: 'projects',
    children: [
      { label: 'demo', children: [{ label: 'src', children: [{ label: 'main.ts' }, { label: 'app.ts' }] }] },
      { label: 'platform-vt', children: [{ label: 'src', children: [{ label: 'lib' }] }] },
    ],
  },
  { label: 'docs', children: [{ label: 'FEATURES.md' }, { label: 'PLAN.md' }] },
  { label: 'package.json' },
];

/**
 * A live showcase of the component library: tabs, autocomplete, textarea,
 * forms controls, sortable table, palette, dialogs, split view and more —
 * everything rendered interactively in the terminal.
 *
 * Run it standalone:
 * ```typescript
 * import { bootstrapTerminal } from '@quenetiq/platform-vt';
 * import { ShowcasePage } from './pages/showcase';
 * bootstrapTerminal(ShowcasePage, { useAltScreen: true });
 * ```
 * Press Ctrl+P for the command palette, Tab to move between controls.
 */
@Component({
  selector: 'app-showcase-page',
  imports: [
    BoxComponent,
    TextComponent,
    SeparatorComponent,
    NewlineComponent,
    SpacerComponent,
    TabsComponent,
    AutocompleteComponent,
    TextAreaComponent,
    RadioComponent,
    RadioGroupComponent,
    ToggleComponent,
    SliderComponent,
    TableComponent,
    PaginatorComponent,
    BadgeComponent,
    SparklineComponent,
    TreeComponent,
    SplitViewComponent,
    StatusBarComponent,
    ButtonComponent,
  ],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" [flexGrow]="1">
      <vt-text color="cyan" fontWeight="bold" content="Component Showcase — Tab to navigate, Ctrl+P for palette"></vt-text>
      <vt-separator></vt-separator>

      <vt-tabs [tabs]="['Forms', 'Data', 'Layout']" [active]="tab()" (activeChange)="tab.set($event)"></vt-tabs>

      @if (tab() === 0) {
        <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
          <vt-text fontWeight="bold" content="Autocomplete (type 'a' or 'b')"></vt-text>
          <vt-autocomplete
            [options]="['apple', 'apricot', 'banana', 'blueberry', 'cherry']"
            placeholder="Fruit…"
            (selected)="fruit.set($event)"
          ></vt-autocomplete>
          <vt-text color="green" [content]="'Chosen: ' + fruit()"></vt-text>

          <vt-newline></vt-newline>
          <vt-text fontWeight="bold" content="Multiline textarea (Ctrl+Enter submits)"></vt-text>
          <vt-textarea [rows]="3" placeholder="Logs…" (valueChange)="log.set($event)"></vt-textarea>

          <vt-newline></vt-newline>
          <vt-text fontWeight="bold" content="Radio group + toggle + slider"></vt-text>
          <vt-radio-group [value]="size()" (valueChange)="size.set($event)">
            <vt-radio [checked]="size() === 's'" value="s" label="Small"></vt-radio>
            <vt-radio [checked]="size() === 'm'" value="m" label="Medium"></vt-radio>
            <vt-radio [checked]="size() === 'l'" value="l" label="Large"></vt-radio>
          </vt-radio-group>
          <vt-toggle label="Verbose" (checkedChange)="verbose.set($event)"></vt-toggle>
          <vt-slider label="Volume" [value]="volume()" (valueChange)="volume.set($event)" [width]="30"></vt-slider>

          <vt-newline></vt-newline>
          <vt-box flexDirection="row" [gap]="1">
            <vt-badge label="Deployed" variant="success"></vt-badge>
            <vt-badge label="2 warnings" variant="warning"></vt-badge>
            <vt-badge label="Failed" variant="danger"></vt-badge>
            <vt-badge label="Beta" variant="info"></vt-badge>
          </vt-box>

          <vt-newline></vt-newline>
          <vt-text fontWeight="bold" content="Dialogs"></vt-text>
          <vt-box flexDirection="row" [gap]="1">
            <vt-button label="Confirm…" (clicked)="askConfirm()"></vt-button>
            <vt-button label="Prompt…" (clicked)="askPrompt()"></vt-button>
          </vt-box>
          <vt-text color="green" [content]="'Last dialog: ' + lastDialog()"></vt-text>
        </vt-box>
      }

      @if (tab() === 1) {
        <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
          <vt-text fontWeight="bold" content="Sortable table (click a header, arrows select)"></vt-text>
          <vt-table
            [columns]="['File', 'Lang', 'Size', 'Status']"
            [rows]="files()"
            [sort]="sort()"
            (sortChange)="sort.set($event)"
            [sortable]="true"
            [viewportRows]="5"
            (selectedChange)="row.set($event)"
          ></vt-table>
          <vt-text color="green" [content]="'Row: ' + row()"></vt-text>

          <vt-newline></vt-newline>
          <vt-text fontWeight="bold" content="Sparkline"></vt-text>
          <vt-box flexDirection="row" [gap]="2">
            <vt-sparkline [data]="sparkData()" type="bar" [width]="30"></vt-sparkline>
            <vt-sparkline [data]="sparkData()" type="line" [width]="20"></vt-sparkline>
          </vt-box>

          <vt-newline></vt-newline>
          <vt-text fontWeight="bold" content="Tree"></vt-text>
          <vt-tree [nodes]="tree()" (selected)="node.set($event.label)"></vt-tree>
          <vt-text color="green" [content]="'Node: ' + node()"></vt-text>
        </vt-box>
      }

      @if (tab() === 2) {
        <vt-split-view direction="row" [ratio]="ratio()" (ratioChange)="ratio.set($event)" [flexGrow]="1">
          <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
            <vt-text fontWeight="bold" content="Left pane"></vt-text>
            <vt-text [content]="'Drag the divider or Ctrl+←/→'"></vt-text>
            <vt-box flexDirection="column" [gap]="1">
              @for (line of leftLines(); track $index) {
                <vt-text color="cyan" [content]="line"></vt-text>
              }
            </vt-box>
          </vt-box>
          <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
            <vt-text fontWeight="bold" content="Right pane"></vt-text>
            <vt-text [content]="'textarea echo:'"></vt-text>
            <vt-text [content]="log() || '— nothing yet —'" [wrap]="'wrap'"></vt-text>
          </vt-box>
        </vt-split-view>
      }

      <vt-spacer></vt-spacer>
      <vt-paginator [page]="page()" [total]="12" (pageChange)="page.set($event)"></vt-paginator>
    </vt-box>

    <vt-statusbar
      [left]="'ⓘ showcase v1.0'"
      [center]="'Tab: next · Ctrl+P: palette · Esc: close'"
      [right]="'page ' + page()"
    ></vt-statusbar>
  `,
})
export class ShowcasePage {
  private readonly dialogs = inject(DialogService);
  private readonly palette = inject(CommandPaletteService);

  readonly tab = signal(0);
  readonly fruit = signal('—');
  readonly log = signal('');
  readonly size = signal('m');
  readonly verbose = signal(false);
  readonly volume = signal(55);
  readonly sort = signal<TableSort | null>(null);
  readonly row = signal(-1);
  readonly node = signal('—');
  readonly page = signal(1);
  readonly ratio = signal(0.45);
  readonly lastDialog = signal('—');

  readonly files = signal(FILES);
  readonly sparkData = signal([3, 7, 2, 9, 5, 8, 6, 4, 10, 7, 5, 9, 3, 6, 8, 7, 5, 4, 9, 6, 5, 7, 8, 3, 6, 9, 4, 7, 5, 8]);
  readonly tree = signal(TREE);
  readonly leftLines = computed(() => [
    `ratio: ${this.ratio().toFixed(2)}`,
    `size: ${this.size()}`,
    `volume: ${this.volume()}`,
    `verbose: ${this.verbose() ? 'yes' : 'no'}`,
    `fruit: ${this.fruit()}`,
  ]);

  constructor() {
    this.palette.register({
      title: 'Toggle verbose',
      keywords: 'verbose debug',
      hint: 'Enter',
      action: () => this.verbose.update((v) => !v),
    });
    this.palette.register({
      title: 'Reset volume',
      keywords: 'volume reset',
      action: () => this.volume.set(55),
    });
  }

  async askConfirm(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Delete files?',
      message: 'This will remove 2 changed files. Continue?',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    });
    this.lastDialog.set(ok ? 'confirmed ✔' : 'cancelled ✘');
  }

  async askPrompt(): Promise<void> {
    const name = await this.dialogs.prompt({
      title: 'New file',
      message: 'File name:',
      defaultValue: 'src/lib/new.ts',
      validator: (value) => (value.trim().length === 0 ? 'Name is required' : null),
    });
    this.lastDialog.set(name ? `prompt: ${name}` : 'cancelled ✘');
  }
}