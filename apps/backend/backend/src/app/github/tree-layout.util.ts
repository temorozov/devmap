export interface LayoutNode {
  parentIndex: number | null;
}

export interface LayoutPosition {
  positionX: number;
  positionY: number;
}

const COLUMN_SPACING_X = 220;
const ROW_SPACING_Y = 200;
const ROOT_X = 1000;
const ROOT_Y = 1500;

/**
 * Tidy tree layout (Reingold–Tilford style, simplified).
 *
 * Leaves are placed left-to-right; each parent is centered over the span of its
 * children. Depth maps to the vertical axis and grows *upward* (smaller Y), so a
 * deep dependency chain (JavaScript → TypeScript → Angular) climbs the canvas
 * instead of widening it. Width is driven by the number of leaves, not the total
 * node count, which keeps dense maps compact.
 */
export function computeTreeLayout(nodes: LayoutNode[]): LayoutPosition[] {
  const childrenMap = new Map<number, number[]>();
  nodes.forEach((node, index) => {
    if (node.parentIndex !== null && node.parentIndex >= 0) {
      const siblings = childrenMap.get(node.parentIndex) ?? [];
      siblings.push(index);
      childrenMap.set(node.parentIndex, siblings);
    }
  });

  const positions: LayoutPosition[] = new Array(nodes.length);
  let nextLeafSlot = 0;

  // Returns the assigned X (in slot units) for the laid-out subtree root.
  const layout = (index: number, depth: number, visited: Set<number>): number => {
    if (visited.has(index)) {
      // Defensive: a prerequisite cycle — treat as a leaf to avoid infinite recursion.
      return nextLeafSlot++;
    }
    visited.add(index);

    const y = ROOT_Y - depth * ROW_SPACING_Y;
    const children = childrenMap.get(index) ?? [];

    let slot: number;
    if (children.length === 0) {
      slot = nextLeafSlot++;
    } else {
      const childSlots = children.map((child) => layout(child, depth + 1, visited));
      // Center the parent over the span of its outermost children.
      slot = (childSlots[0] + childSlots[childSlots.length - 1]) / 2;
    }

    positions[index] = { positionX: slot, positionY: y };
    return slot;
  };

  const roots = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.parentIndex === null || node.parentIndex < 0)
    .map(({ index }) => index);

  const visited = new Set<number>();
  roots.forEach((rootIndex) => layout(rootIndex, 0, visited));

  // Any node not reached above (orphan) gets its own leaf slot at the base.
  nodes.forEach((_, i) => {
    if (!positions[i]) {
      positions[i] = { positionX: nextLeafSlot++, positionY: ROOT_Y };
    }
  });

  // Convert slot units to pixels and center the whole layout around ROOT_X.
  const slots = positions.map((p) => p.positionX);
  const minSlot = Math.min(...slots);
  const maxSlot = Math.max(...slots);
  const midSlot = (minSlot + maxSlot) / 2;

  return positions.map((p) => ({
    positionX: ROOT_X + (p.positionX - midSlot) * COLUMN_SPACING_X,
    positionY: p.positionY,
  }));
}
