import { SkillNode } from '../../nodes.service';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ViewportSafeArea {
  width: number;
  height: number;
  safeTop: number;
  safeLeft: number;
  availableWidth: number;
  availableHeight: number;
}

export function findRootNode(nodes: SkillNode[]): SkillNode | undefined {
  if (!nodes.length) return undefined;
  const nodeIds = new Set(nodes.map(n => n.id));
  return nodes.find(n => !n.parentId || !nodeIds.has(n.parentId)) ?? nodes[0];
}

export function getSvgPoint(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const inverse = svgEl.getScreenCTM()?.inverse();
  return inverse ? pt.matrixTransform(inverse) : pt;
}

export function getViewportSafeArea(svgEl: Element | null): ViewportSafeArea {
  const width = (svgEl as HTMLElement)?.clientWidth || window.innerWidth;
  const height = (svgEl as HTMLElement)?.clientHeight || window.innerHeight;
  const isCompact = width <= 992;
  const safeTop = isCompact ? 126 : 112;
  const safeBottom = isCompact ? 108 : 36;
  const safeLeft = isCompact ? 12 : 360;
  const safeRight = isCompact ? 12 : 24;
  return {
    width,
    height,
    safeTop,
    safeLeft,
    availableWidth: Math.max(1, width - safeLeft - safeRight),
    availableHeight: Math.max(1, height - safeTop - safeBottom),
  };
}

export function computeCenterOnNode(
  svgEl: Element | null,
  node: SkillNode,
): { viewBox: ViewBox; zoomLevel: number } {
  const vp = getViewportSafeArea(svgEl);
  const zoomLevel = 1;
  const viewBox: ViewBox = {
    w: vp.width / zoomLevel,
    h: vp.height / zoomLevel,
    x: node.positionX - (vp.safeLeft + vp.availableWidth / 2) / zoomLevel,
    y: node.positionY - (vp.safeTop + vp.availableHeight / 2) / zoomLevel,
  };
  return { viewBox, zoomLevel };
}

export function computeCenterOnNodes(
  svgEl: Element | null,
  nodes: SkillNode[],
): { viewBox: ViewBox; zoomLevel: number } {
  const nodeRadius = 80;
  const minX = Math.min(...nodes.map(n => n.positionX - nodeRadius));
  const maxX = Math.max(...nodes.map(n => n.positionX + nodeRadius));
  const minY = Math.min(...nodes.map(n => n.positionY - nodeRadius));
  const maxY = Math.max(...nodes.map(n => n.positionY + nodeRadius));

  const vp = getViewportSafeArea(svgEl);
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const zoomToFit = Math.min(vp.availableWidth / contentWidth, vp.availableHeight / contentHeight);
  const zoomLevel = Math.min(5, Math.max(0.15, Math.min(1, zoomToFit)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const viewBox: ViewBox = {
    w: vp.width / zoomLevel,
    h: vp.height / zoomLevel,
    x: centerX - (vp.safeLeft + vp.availableWidth / 2) / zoomLevel,
    y: centerY - (vp.safeTop + vp.availableHeight / 2) / zoomLevel,
  };
  return { viewBox, zoomLevel };
}
