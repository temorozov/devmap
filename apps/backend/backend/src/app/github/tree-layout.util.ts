export interface LayoutNode {
  parentIndex: number | null;
}

export interface LayoutPosition {
  positionX: number;
  positionY: number;
}

const NODE_SPACING_X = 250;
const NODE_SPACING_Y = -180;
const ROOT_X = 1000;
const ROOT_Y = 1500;

export function computeTreeLayout(nodes: LayoutNode[]): LayoutPosition[] {
  const childrenMap = new Map<number, number[]>();
  const depthMap = new Map<number, number>();

  nodes.forEach((node, index) => {
    if (node.parentIndex !== null && node.parentIndex >= 0) {
      const siblings = childrenMap.get(node.parentIndex) ?? [];
      siblings.push(index);
      childrenMap.set(node.parentIndex, siblings);
    }
  });

  const calcDepth = (index: number, depth: number) => {
    depthMap.set(index, depth);
    const children = childrenMap.get(index) ?? [];
    children.forEach((childIndex) => calcDepth(childIndex, depth + 1));
  };

  nodes.forEach((node, index) => {
    if (node.parentIndex === null || node.parentIndex < 0) {
      calcDepth(index, 0);
    }
  });

  const depthTotalWidth = new Map<number, number>();
  nodes.forEach((_, i) => {
    const depth = depthMap.get(i) ?? 0;
    depthTotalWidth.set(depth, (depthTotalWidth.get(depth) ?? 0) + 1);
  });

  const depthCounters = new Map<number, number>();
  return nodes.map((_, i) => {
    const depth = depthMap.get(i) ?? 0;
    const horizontalIndex = depthCounters.get(depth) ?? 0;
    depthCounters.set(depth, horizontalIndex + 1);

    const totalInDepth = depthTotalWidth.get(depth) ?? 1;
    const offsetX = (horizontalIndex - (totalInDepth - 1) / 2) * NODE_SPACING_X;

    return {
      positionX: ROOT_X + offsetX,
      positionY: ROOT_Y + depth * NODE_SPACING_Y,
    };
  });
}
