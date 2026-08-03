import { Routes } from '@angular/router';

export const docsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./docs-page').then((m) => m.DocsPage),
    children: [
      { path: '', redirectTo: 'getting-started', pathMatch: 'full' },
      {
        path: ':slug',
        loadComponent: () =>
          import('./docs-content/docs-content').then((m) => m.DocsContent),
      },
    ],
  },
];
