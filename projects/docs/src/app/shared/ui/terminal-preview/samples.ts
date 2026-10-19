import { Component, signal, type Type } from '@angular/core';
import { BoxComponent, TextComponent, SeparatorComponent, InputComponent, ButtonComponent, MarkdownComponent, TableComponent } from '@quenetiq/platform-vt';

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

/** Docs slugs that carry a live terminal preview. */
export const DOC_SAMPLES: Record<string, () => Type<unknown>> = {
  'components/input': () => SampleForm,
  'components/button': () => SampleForm,
  'components/markdown': () => SampleMarkdown,
  'components/table': () => SampleTable,
};