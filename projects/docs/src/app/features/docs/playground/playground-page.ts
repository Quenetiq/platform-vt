import { Component } from '@angular/core';
import { TerminalPreview } from '../../../shared/ui/terminal-preview/terminal-preview';
import { SampleForm, SampleMarkdown } from '../../../shared/ui/terminal-preview/samples';

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [TerminalPreview],
  template: `
    <h1>Playground</h1>
    <p>Live terminal components rendered in the browser. Focus the preview with
    a click, then drive it with the buttons below (or Tab/arrows).</p>

    <h2>Form</h2>
    <app-terminal-preview #formPreview [sample]="FormSample" [rows]="7"></app-terminal-preview>
    <p>
      <button (click)="formPreview.press('a','b','return')">Type "ab" + Enter</button>
      <button (click)="formPreview.press('c','l','e','a','r','return')">Type "clear" + Enter</button>
    </p>

    <h2>Markdown</h2>
    <app-terminal-preview [sample]="MarkdownSample" [rows]="7"></app-terminal-preview>
  `,
  styles: `
    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin-top: 28px; }
    button {
      margin-right: 8px;
      padding: 6px 12px;
      border: 1px solid #30363d;
      border-radius: 6px;
      background: #21262d;
      color: #e5e5e5;
      cursor: pointer;
    }
  `,
})
export class PlaygroundPage {
  readonly FormSample = SampleForm;
  readonly MarkdownSample = SampleMarkdown;
}