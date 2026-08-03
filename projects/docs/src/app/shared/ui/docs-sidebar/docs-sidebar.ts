import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SIDEBAR_GROUPS } from '../../../features/docs/sidebar.config';

@Component({
  selector: 'app-docs-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.scss',
})
export class DocsSidebar {
  protected readonly groups = SIDEBAR_GROUPS;
  protected readonly openGroups = signal<Record<string, boolean>>(
    Object.fromEntries(SIDEBAR_GROUPS.map((g) => [g.label, true])),
  );

  toggleGroup(label: string): void {
    this.openGroups.update((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }
}
