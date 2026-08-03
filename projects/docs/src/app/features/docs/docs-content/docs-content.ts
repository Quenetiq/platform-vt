import { Component, OnInit, inject, signal, ElementRef, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { parseMarkdown, renderInline, type MdBlock, type MdHeading, type MdInline } from './markdown-parser';

@Component({
  selector: 'app-docs-content',
  standalone: true,
  templateUrl: './docs-content.html',
  styleUrl: './docs-content.scss',
})
export class DocsContent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);

  slug = input<string>('');

  readonly loading = signal(true);
  readonly contentHtml = signal('');
  readonly error = signal<string | null>(null);
  readonly pageTitle = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') ?? 'getting-started';
      void this.loadDoc(slug);
    });
  }

  private async loadDoc(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const res = await fetch(`/docs/${slug}.md`);
      if (!res.ok) {
        this.error.set(`Page "${slug}" not found.`);
        this.loading.set(false);
        return;
      }
      const raw = await res.text();
      const { frontmatter, body } = this.parseFrontmatter(raw);

      this.pageTitle.set(frontmatter['title'] || this.slugToTitle(slug));

      const parsed = parseMarkdown(body);
      this.contentHtml.set(this.renderBlocks(parsed));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      this.loading.set(false);
    }
  }

  private renderBlocks(blocks: MdBlock[]): string {
    let html = '';
    for (const block of blocks) {
      switch (block.type) {
        case 'heading':
          if (block.level === 1) continue;
          html += `<h${block.level} id="${block.id}" class="md-heading md-h${block.level}">`;
          html += `<span class="md-heading-text">${renderInline(block.children)}</span>`;
          html += `</h${block.level}>`;
          break;
        case 'paragraph':
          html += `<p class="md-p">${renderInline(block.children)}</p>`;
          break;
        case 'code':
          html += `<div class="md-code-block">`;
          if (block.language) {
            html += `<div class="md-code-lang">${escapeHtml(block.language)}</div>`;
          }
          html += `<pre class="md-pre"><code class="md-code">${escapeHtml(block.code)}</code></pre>`;
          html += `</div>`;
          break;
        case 'list':
          html += block.ordered ? '<ol class="md-ol">' : '<ul class="md-ul">';
          for (const item of block.items) {
            html += `<li>${renderInline(item.children)}</li>`;
          }
          html += block.ordered ? '</ol>' : '</ul>';
          break;
        case 'table':
          html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
          for (const h of block.headers) {
            html += `<th>${renderInline(h)}</th>`;
          }
          html += '</tr></thead><tbody>';
          for (const row of block.rows) {
            html += '<tr>';
            for (const cell of row) {
              html += `<td>${renderInline(cell)}</td>`;
            }
            html += '</tr>';
          }
          html += '</tbody></table></div>';
          break;
        case 'blockquote':
          html += '<blockquote class="md-blockquote">';
          for (const child of block.children) {
            if (child.type === 'paragraph') {
              html += `<p>${renderInline(child.children)}</p>`;
            }
          }
          html += '</blockquote>';
          break;
        case 'hr':
          html += '<hr class="md-hr" />';
          break;
      }
    }
    return html;
  }

  private parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { frontmatter: {}, body: raw };

    const fm: Record<string, string> = {};
    match[1].split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        fm[key] = value;
      }
    });

    return { frontmatter: fm, body: match[2] };
  }

  private slugToTitle(slug: string): string {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
