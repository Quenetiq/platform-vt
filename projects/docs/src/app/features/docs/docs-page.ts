import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { DocsSidebar } from '../../shared/ui/docs-sidebar/docs-sidebar';

@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, DocsSidebar],
  templateUrl: './docs-page.html',
  styleUrl: './docs-page.scss',
})
export class DocsPage {}
