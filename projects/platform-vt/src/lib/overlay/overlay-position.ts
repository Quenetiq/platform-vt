import type { LayoutRect } from '../renderer/vt-node';

/**
 * Where to place an overlay relative to its anchor rectangle.
 */
export type OverlayPlacement = 'bottom' | 'top' | 'right' | 'left';

/**
 * An anchor an overlay is positioned against.
 *
 * The rectangle is resolved lazily (a function) so the position stays fresh
 * when the anchor element moves or the terminal resizes.
 */
export interface OverlayAnchor {
  /** Resolves the anchor's current layout rectangle, or null when unavailable. */
  rect: () => LayoutRect | null;
  /** Which side of the anchor the overlay appears on. */
  placement: OverlayPlacement;
  /** Horizontal offset in columns, applied after placement. */
  offsetX: number;
  /** Vertical offset in rows, applied after placement. */
  offsetY: number;
}

/** Known dimensions of the overlay panel and the terminal viewport. */
export interface OverlayViewport {
  /** Panel width in columns (0 when not yet laid out). */
  width: number;
  /** Panel height in rows (0 when not yet laid out). */
  height: number;
  /** Terminal width in columns. */
  columns: number;
  /** Terminal height in rows. */
  rows: number;
}

/**
 * Compute the final overlay position: placement → flip → clamp.
 *
 * Placement positions the overlay next to the anchor using the panel's own
 * size (so `'top'`/`'left'` sit flush against the anchor instead of
 * overlapping it). When the panel would overflow the viewport edge, the
 * placement is flipped to the opposite side. As a last resort the position
 * is clamped into the viewport.
 *
 * Mirrors Ink's behavior: the overlay is repositioned on every render pass,
 * when both the anchor and the panel size are known.
 *
 * @param anchor - The anchor the overlay is positioned against.
 * @param viewport - Panel and terminal dimensions.
 * @returns The final position, or null when the anchor rect is unavailable.
 */
export function computeOverlayPosition(
  anchor: OverlayAnchor,
  viewport: OverlayViewport,
): { x: number; y: number } | null {
  const rect = anchor.rect();
  if (!rect) return null;

  let placement = anchor.placement;

  // Flip when the panel would overflow the opposite viewport edge.
  if (viewport.width > 0 && viewport.height > 0) {
    if (placement === 'bottom' && rect.y + rect.height + viewport.height + anchor.offsetY > viewport.rows) {
      placement = 'top';
    } else if (placement === 'top' && rect.y - viewport.height - anchor.offsetY < 0) {
      placement = 'bottom';
    } else if (placement === 'right' && rect.x + rect.width + viewport.width + anchor.offsetX > viewport.columns) {
      placement = 'left';
    } else if (placement === 'left' && rect.x - viewport.width - anchor.offsetX < 0) {
      placement = 'right';
    }
  }

  let x: number;
  let y: number;
  switch (placement) {
    case 'bottom':
      x = rect.x + anchor.offsetX;
      y = rect.y + rect.height + anchor.offsetY;
      break;
    case 'top':
      x = rect.x + anchor.offsetX;
      y = rect.y - viewport.height - anchor.offsetY;
      break;
    case 'right':
      x = rect.x + rect.width + anchor.offsetX;
      y = rect.y + anchor.offsetY;
      break;
    case 'left':
      x = rect.x - viewport.width - anchor.offsetX;
      y = rect.y + anchor.offsetY;
      break;
  }

  const maxX = viewport.columns - viewport.width;
  const maxY = viewport.rows - viewport.height;
  x = clamp(Math.floor(x), 0, maxX > 0 ? maxX : 0);
  y = clamp(Math.floor(y), 0, maxY > 0 ? maxY : 0);

  return { x, y };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}