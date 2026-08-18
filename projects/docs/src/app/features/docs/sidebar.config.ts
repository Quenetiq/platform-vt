import type { SidebarGroup } from './docs-metadata.model';

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Getting Started',
    items: [
      { title: 'Overview', slug: 'README', group: 'Getting Started' },
      { title: 'Getting Started', slug: 'getting-started', group: 'Getting Started' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { title: 'Layout System', slug: 'layout-system', group: 'Guides' },
      { title: 'Services', slug: 'services', group: 'Guides' },
      { title: 'Testing', slug: 'testing', group: 'Guides' },
      { title: 'Contributing', slug: 'contributing', group: 'Guides' },
    ],
  },
  {
    label: 'Components',
    items: [
      { title: 'Box', slug: 'components/box', group: 'Components' },
      { title: 'Text', slug: 'components/text', group: 'Components' },
      { title: 'Input', slug: 'components/input', group: 'Components' },
      { title: 'Button', slug: 'components/button', group: 'Components' },
      { title: 'Select', slug: 'components/select', group: 'Components' },
      { title: 'Checkbox', slug: 'components/checkbox', group: 'Components' },
      { title: 'List', slug: 'components/list', group: 'Components' },
      { title: 'Table', slug: 'components/table', group: 'Components' },
      { title: 'Progress', slug: 'components/progress', group: 'Components' },
      { title: 'Spinner', slug: 'components/spinner', group: 'Components' },
      { title: 'Separator', slug: 'components/separator', group: 'Components' },
      { title: 'Spacer', slug: 'components/spacer', group: 'Components' },
      { title: 'Newline', slug: 'components/newline', group: 'Components' },
      { title: 'ScrollView', slug: 'components/scroll', group: 'Components' },
      { title: 'Tooltip & Overlay', slug: 'components/tooltip', group: 'Components' },
    ],
  },
];
