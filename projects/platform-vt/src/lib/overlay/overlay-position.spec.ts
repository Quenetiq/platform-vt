import { describe, it, expect } from 'vitest';
import { computeOverlayPosition, type OverlayAnchor } from './overlay-position';

function anchor(
  rect: { x: number; y: number; width: number; height: number },
  placement: OverlayAnchor['placement'],
  offsetX = 0,
  offsetY = 0,
): OverlayAnchor {
  return { rect: () => rect, placement, offsetX, offsetY };
}

const PANEL = { width: 9, height: 3 };
const VIEWPORT = { columns: 80, rows: 24 };

describe('computeOverlayPosition', () => {
  it('returns null when the anchor rect is unavailable', () => {
    const result = computeOverlayPosition(
      { rect: () => null, placement: 'bottom', offsetX: 0, offsetY: 0 },
      { ...PANEL, ...VIEWPORT },
    );
    expect(result).toBeNull();
  });

  it('places the panel below the anchor', () => {
    const result = computeOverlayPosition(anchor({ x: 5, y: 2, width: 10, height: 3 }, 'bottom'), {
      ...PANEL,
      ...VIEWPORT,
    });
    expect(result).toEqual({ x: 5, y: 5 });
  });

  it('places the panel above the anchor without overlapping it', () => {
    const result = computeOverlayPosition(anchor({ x: 5, y: 10, width: 10, height: 3 }, 'top'), {
      ...PANEL,
      ...VIEWPORT,
    });
    // Panel bottom edge = anchor top edge (no overlap).
    expect(result).toEqual({ x: 5, y: 7 });
  });

  it('places the panel to the right of the anchor', () => {
    const result = computeOverlayPosition(anchor({ x: 5, y: 2, width: 10, height: 3 }, 'right'), {
      ...PANEL,
      ...VIEWPORT,
    });
    expect(result).toEqual({ x: 15, y: 2 });
  });

  it('places the panel to the left of the anchor without overlapping it', () => {
    const result = computeOverlayPosition(anchor({ x: 30, y: 2, width: 10, height: 3 }, 'left'), {
      ...PANEL,
      ...VIEWPORT,
    });
    expect(result).toEqual({ x: 21, y: 2 });
  });

  it('applies offsets after placement', () => {
    const result = computeOverlayPosition(
      anchor({ x: 5, y: 2, width: 10, height: 3 }, 'bottom', 2, 3),
      { ...PANEL, ...VIEWPORT },
    );
    expect(result).toEqual({ x: 7, y: 8 });
  });

  it('flips bottom to top when the panel would overflow the bottom edge', () => {
    const result = computeOverlayPosition(
      anchor({ x: 5, y: 20, width: 10, height: 3 }, 'bottom'),
      { ...PANEL, ...VIEWPORT },
    );
    // bottom: y = 23 → panel bottom 26 > 24 → flip to top: y = 20 - 3 = 17.
    expect(result).toEqual({ x: 5, y: 17 });
  });

  it('flips top to bottom when the panel would overflow the top edge', () => {
    const result = computeOverlayPosition(anchor({ x: 5, y: 0, width: 10, height: 3 }, 'top'), {
      ...PANEL,
      ...VIEWPORT,
    });
    // top: y = -3 → flip to bottom: y = 0 + 3 = 3.
    expect(result).toEqual({ x: 5, y: 3 });
  });

  it('flips right to left when the panel would overflow the right edge', () => {
    const result = computeOverlayPosition(
      anchor({ x: 74, y: 2, width: 10, height: 3 }, 'right'),
      { ...PANEL, ...VIEWPORT },
    );
    // right: x = 84 → panel right 93 > 80 → flip to left: x = 74 - 9 = 65.
    expect(result).toEqual({ x: 65, y: 2 });
  });

  it('flips left to right when the panel would overflow the left edge', () => {
    const result = computeOverlayPosition(anchor({ x: 0, y: 2, width: 10, height: 3 }, 'left'), {
      ...PANEL,
      ...VIEWPORT,
    });
    // left: x = -9 → flip to right: x = 0 + 10 = 10.
    expect(result).toEqual({ x: 10, y: 2 });
  });

  it('clamps a fixed position that still overflows after flipping', () => {
    // Anchor touches both edges; neither flip helps, so clamp wins.
    const result = computeOverlayPosition(
      anchor({ x: 0, y: 22, width: 80, height: 2 }, 'bottom'),
      { ...PANEL, ...VIEWPORT },
    );
    // bottom: y = 24 → overflow → flip top: y = 22 - 3 = 19 → fits.
    expect(result).toEqual({ x: 0, y: 19 });
  });

  it('clamps into the viewport when the panel is larger than the viewport', () => {
    const result = computeOverlayPosition(
      anchor({ x: 0, y: 0, width: 10, height: 1 }, 'bottom', 0, 10),
      { width: 100, height: 30, columns: 80, rows: 24 },
    );
    // y = 11 → bottom 41 > 24 → flip top → y = 0 - 30 - 10 = -40 → clamp to 0.
    // x clamped to 0.
    expect(result).toEqual({ x: 0, y: 0 });
  });
});