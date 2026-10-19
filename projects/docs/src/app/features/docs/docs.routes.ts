import { Routes } from '@angular/router';

export const docsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./docs-page').then((m) => m.DocsPage),
    children: [
      { path: '', redirectTo: 'getting-started', pathMatch: 'full' },
      {
        path: 'playground',
        loadComponent: () => import('./playground/playground-page').then((m) => m.PlaygroundPage),
      },
      {
        path: ':slug',
        loadComponent: () => import('./docs-content/docs-content').then((m) => m.DocsContent),
      },
    ],
  },
];
