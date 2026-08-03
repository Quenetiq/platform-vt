import { Component } from '@angular/core';
import { BoxComponent, TextComponent, SeparatorComponent, NewlineComponent } from 'platform-vt';

@Component({
  selector: 'app-layout-page',
  imports: [BoxComponent, TextComponent, SeparatorComponent, NewlineComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">Layout Demo</vt-text>
      <vt-separator></vt-separator>

      <vt-text fontWeight="bold">Row Direction</vt-text>
      <vt-box flexDirection="row" [gap]="1" [padding]="1" border="single">
        <vt-text color="red">A</vt-text>
        <vt-text color="green">B</vt-text>
        <vt-text color="blue">C</vt-text>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Column Direction</vt-text>
      <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
        <vt-text color="red">Row 1</vt-text>
        <vt-text color="green">Row 2</vt-text>
        <vt-text color="blue">Row 3</vt-text>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Space Between</vt-text>
      <vt-box flexDirection="row" justifyContent="space-between" [width]="40" [padding]="1" border="single">
        <vt-text>Left</vt-text>
        <vt-text>Right</vt-text>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Center</vt-text>
      <vt-box justifyContent="center" alignItems="center" [width]="40" [height]="5" border="double">
        <vt-text color="yellow">Centered</vt-text>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Nested Layout</vt-text>
      <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
        <vt-text fontWeight="bold">Header</vt-text>
        <vt-box flexDirection="row" [gap]="1">
          <vt-box [width]="15" [padding]="1" border="single">
            <vt-text color="magenta">Sidebar</vt-text>
          </vt-box>
          <vt-box [flexGrow]="1" [padding]="1" border="single">
            <vt-text>Main content area</vt-text>
          </vt-box>
        </vt-box>
        <vt-text color="gray">Footer</vt-text>
      </vt-box>
    </vt-box>
  `,
  styles: [],
})
export class LayoutPageComponent {}
