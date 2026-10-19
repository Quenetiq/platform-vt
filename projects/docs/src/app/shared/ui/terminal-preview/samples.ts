import { Component, signal, type Type } from '@angular/core';
import {
  BoxComponent,
  BreadcrumbComponent,
  ButtonComponent,
  DatePickerComponent,
  GaugeComponent,
  GridComponent,
  HeatmapComponent,
  InputComponent,
  LogViewerComponent,
  MarkdownComponent,
  SelectComponent,
  SeparatorComponent,
  TableComponent,
  TextComponent,
  WindowComponent,
  type LogEntry,
} from '@quenetiq/platform-vt';

/** Live sample shown on the docs page for a component slug. */
@Component({
  selector: 'app-sample-form',
  standalone: true,
  imports: [BoxComponent, TextComponent, SeparatorComponent, InputComponent, ButtonComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="round">
      <vt-text [content]="'Login'" color="cyan" fontWeight="bold"></vt-text>
      <vt-separator></vt-separator>
      <vt-box flexDirection="row" [gap]="1">
        <vt-input placeholder="name" [value]="name()" (valueChange)="name.set($event)"></vt-input>
        <vt-button label="Go" (clicked)="go()"></vt-button>
      </vt-box>
      @if (greeting()) {
        <vt-text [content]="'Hello, ' + greeting() + '!'" color="green"></vt-text>
      }
    </vt-box>
  `,
})
export class SampleForm {
  readonly name = signal('');
  readonly greeting = signal('');

  go(): void {
    this.greeting.set(this.name() || 'stranger');
  }
}

@Component({
  selector: 'app-sample-markdown',
  standalone: true,
  imports: [MarkdownComponent],
  template: `<vt-markdown [content]="content"></vt-markdown>`,
})
export class SampleMarkdown {
  readonly content = [
    '# Heading',
    '',
    'Text with **bold** and `code`.',
    '',
    '```ts',
    'const x = 42;',
    '```',
  ].join('\n');
}

@Component({
  selector: 'app-sample-table',
  standalone: true,
  imports: [TableComponent],
  template: `
    <vt-table
      [columns]="columns"
      [rows]="rows"
      [viewportRows]="4"
      [sortable]="true"
      (selectedChange)="selected.set($event)"
    ></vt-table>
  `,
})
export class SampleTable {
  readonly columns = ['Name', 'Size', 'Status'];
  readonly rows = [
    ['readme.md', '2 KB', 'ok'],
    ['src/', '—', 'ok'],
    ['dist/', '18 MB', 'built'],
    ['tmp/', '—', 'stale'],
  ];
  readonly selected = signal(-1);
}

@Component({
  selector: 'app-sample-log-viewer',
  standalone: true,
  imports: [LogViewerComponent],
  template: `
    <vt-log-viewer
      [lines]="lines"
      [height]="6"
      [showTimestamps]="true"
      [levels]="['info', 'warn', 'error']"
    ></vt-log-viewer>
  `,
})
export class SampleLogViewer {
  readonly lines: LogEntry[] = [
    { text: 'Starting build', level: 'info', timestamp: '12:00:00' },
    { text: 'Resolving dependencies', level: 'info', timestamp: '12:00:01' },
    { text: 'Cache miss for platform-vt', level: 'warn', timestamp: '12:00:02' },
    { text: 'Compiling library', level: 'info', timestamp: '12:00:04' },
    { text: 'Type error in app.ts:42', level: 'error', timestamp: '12:00:07' },
    { text: 'Build failed', level: 'error', timestamp: '12:00:07' },
  ];
}

@Component({
  selector: 'app-sample-gauge',
  standalone: true,
  imports: [BoxComponent, GaugeComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1">
      <vt-gauge label="CPU" [value]="63" color="green"></vt-gauge>
      <vt-gauge label="RAM" [value]="81" color="yellow"></vt-gauge>
      <vt-gauge label="Disk" [value]="94" color="red"></vt-gauge>
    </vt-box>
  `,
})
export class SampleGauge {}

@Component({
  selector: 'app-sample-heatmap',
  standalone: true,
  imports: [HeatmapComponent],
  template: `
    <vt-heatmap
      [data]="data"
      [rowLabels]="['Mon', 'Tue', 'Wed']"
      [columnLabels]="['00', '06', '12', '18']"
    ></vt-heatmap>
  `,
})
export class SampleHeatmap {
  readonly data = [
    [0, 2, 5, 8],
    [1, 6, 9, 4],
    [0, 1, 3, 2],
  ];
}

@Component({
  selector: 'app-sample-breadcrumb',
  standalone: true,
  imports: [BreadcrumbComponent],
  template: `
    <vt-breadcrumb
      [items]="['Home', 'Projects', 'platform-vt']"
      (itemClick)="current.set($event)"
    ></vt-breadcrumb>
  `,
})
export class SampleBreadcrumb {
  readonly current = signal(0);
}

@Component({
  selector: 'app-sample-grid',
  standalone: true,
  imports: [GridComponent, BoxComponent, TextComponent],
  template: `
    <vt-grid [columns]="2" [gap]="1">
      <vt-box border="round" [padding]="1"><vt-text content="Card 1"></vt-text></vt-box>
      <vt-box border="round" [padding]="1"><vt-text content="Card 2"></vt-text></vt-box>
      <vt-box border="round" [padding]="1"><vt-text content="Card 3"></vt-text></vt-box>
      <vt-box border="round" [padding]="1"><vt-text content="Card 4"></vt-text></vt-box>
    </vt-grid>
  `,
})
export class SampleGrid {}

@Component({
  selector: 'app-sample-window',
  standalone: true,
  imports: [WindowComponent, TextComponent],
  template: `
    <vt-window title="Settings" [x]="1" [y]="1" [width]="26" [height]="6">
      <vt-text content="Drag the title bar."></vt-text>
      <vt-text content="Ctrl+arrows resize."></vt-text>
    </vt-window>
  `,
})
export class SampleWindow {}

@Component({
  selector: 'app-sample-select',
  standalone: true,
  imports: [SelectComponent],
  template: `
    <vt-select
      [options]="['Small', 'Medium', 'Large']"
      [dropdown]="true"
      [filterable]="true"
      (valueChange)="size.set($event)"
    ></vt-select>
  `,
})
export class SampleSelect {
  readonly size = signal(1);
}

@Component({
  selector: 'app-sample-datepicker',
  standalone: true,
  imports: [DatePickerComponent],
  template: `
    <vt-datepicker
      [value]="date()"
      (valueChange)="date.set($event)"
    ></vt-datepicker>
  `,
})
export class SampleDatePicker {
  readonly date = signal<string | null>('2026-03-15');
}

/** Docs slugs that carry a live terminal preview. */
export const DOC_SAMPLES: Record<string, () => Type<unknown>> = {
  'components/select': () => SampleSelect,
  'components/datepicker': () => SampleDatePicker,
  'components/input': () => SampleForm,
  'components/button': () => SampleForm,
  'components/markdown': () => SampleMarkdown,
  'components/table': () => SampleTable,
  'components/log-viewer': () => SampleLogViewer,
  'components/gauge': () => SampleGauge,
  'components/heatmap': () => SampleHeatmap,
  'components/breadcrumb': () => SampleBreadcrumb,
  'components/grid': () => SampleGrid,
  'components/window': () => SampleWindow,
};