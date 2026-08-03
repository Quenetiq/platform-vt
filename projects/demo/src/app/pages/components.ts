import { Component, signal } from '@angular/core';
import {
  BoxComponent,
  TextComponent,
  SeparatorComponent,
  NewlineComponent,
  CheckboxComponent,
  SelectComponent,
  ListComponent,
  SpinnerComponent,
  ProgressComponent,
  TableComponent,
} from 'platform-vt';

@Component({
  selector: 'app-components-page',
  imports: [
    BoxComponent,
    TextComponent,
    SeparatorComponent,
    NewlineComponent,
    CheckboxComponent,
    SelectComponent,
    ListComponent,
    SpinnerComponent,
    ProgressComponent,
    TableComponent,
  ],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">Components Demo</vt-text>
      <vt-separator></vt-separator>

      <vt-text fontWeight="bold">Text Styles</vt-text>
      <vt-box flexDirection="row" [gap]="1">
        <vt-text color="red">Red</vt-text>
        <vt-text color="green">Green</vt-text>
        <vt-text color="blue">Blue</vt-text>
        <vt-text color="yellow" fontWeight="bold">Bold</vt-text>
        <vt-text color="magenta" fontStyle="italic">Italic</vt-text>
        <vt-text color="cyan" textDecoration="underline">Underline</vt-text>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Spinner</vt-text>
      <vt-spinner type="dots" label="Loading data..."></vt-spinner>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Progress Bar</vt-text>
      <vt-progress [value]="progressValue()" [width]="35"></vt-progress>
      <vt-progress [value]="85" [width]="35"></vt-progress>
      <vt-progress [value]="30" [width]="35"></vt-progress>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Table</vt-text>
      <vt-table
        [columns]="['Name', 'Role', 'Status']"
        [rows]="[
          ['Alice', 'Admin', 'Active'],
          ['Bob', 'Editor', 'Away'],
          ['Charlie', 'Viewer', 'Offline']
        ]">
      </vt-table>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">List</vt-text>
      <vt-list
        [items]="['Design', 'Develop', 'Test', 'Deploy']"
        (activated)="listSelection.set($event)">
      </vt-list>
      @if (listSelection() !== null) {
        <vt-text color="green">Activated: item {{ listSelection()! + 1 }}</vt-text>
      }

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Checkbox</vt-text>
      <vt-box flexDirection="column" [gap]="1">
        <vt-checkbox label="Feature A" (checkedChange)="featureA.set($event)"></vt-checkbox>
        <vt-checkbox label="Feature B" (checkedChange)="featureB.set($event)"></vt-checkbox>
        <vt-checkbox label="Feature C" (checkedChange)="featureC.set($event)"></vt-checkbox>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Select</vt-text>
      <vt-select
        [options]="['Option 1', 'Option 2', 'Option 3']"
        (valueChange)="selectedOption.set($event)">
      </vt-select>
      @if (selectedOption() !== null) {
        <vt-text color="green">Selected: Option {{ selectedOption()! + 1 }}</vt-text>
      }
    </vt-box>
  `,
  styles: [],
})
export class ComponentsPageComponent {
  protected readonly progressValue = signal(0);
  protected readonly listSelection = signal<number | null>(null);
  protected readonly featureA = signal(true);
  protected readonly featureB = signal(false);
  protected readonly featureC = signal(false);
  protected readonly selectedOption = signal<number | null>(null);

  constructor() {
    let progress = 0;
    setInterval(() => {
      progress = (progress + 1) % 101;
      this.progressValue.set(progress);
    }, 100);
  }
}
