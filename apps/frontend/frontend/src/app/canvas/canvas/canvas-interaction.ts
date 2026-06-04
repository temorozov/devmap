import { SkillNode } from '../../nodes.service';
import { ViewBox } from './canvas-viewport';

/** Returns updated { zoomLevel, viewBox, newPinchDistance } after a pinch step, or null if zoom is clamped. */
export function computePinchStep(
  pointers: PointerEvent[],
  initialPinchDistance: number,
  currentZoom: number,
  viewBox: ViewBox,
): { zoomLevel: number; viewBox: ViewBox; newPinchDistance: number } | null {
  if (initialPinchDistance <= 0) return null;

  const currentDistance = Math.hypot(
    pointers[0].clientX - pointers[1].clientX,
    pointers[0].clientY - pointers[1].clientY,
  );

  const pinchScale = initialPinchDistance / currentDistance;
  const newZoom = currentZoom / pinchScale;

  if (newZoom < 0.15 || newZoom > 5) return null;

  const newW = window.innerWidth / newZoom;
  const newH = window.innerHeight / newZoom;
  const dw = newW - viewBox.w;
  const dh = newH - viewBox.h;

  return {
    zoomLevel: newZoom,
    newPinchDistance: currentDistance,
    viewBox: {
      x: viewBox.x - dw / 2,
      y: viewBox.y - dh / 2,
      w: newW,
      h: newH,
    },
  };
}

/** Returns the pan delta in SVG units for a pointer move. */
export function computePanDelta(
  clientX: number,
  clientY: number,
  dragStartScreen: { x: number; y: number },
  viewBox: ViewBox,
): { dx: number; dy: number } {
  return {
    dx: (clientX - dragStartScreen.x) * (viewBox.w / window.innerWidth),
    dy: (clientY - dragStartScreen.y) * (viewBox.h / window.innerHeight),
  };
}

/** Builds the rubber-band selection ViewBox from an anchor and current SVG point. */
export function computeSelectionBox(
  anchor: { x: number; y: number },
  current: { x: number; y: number },
): ViewBox {
  return {
    x: Math.min(anchor.x, current.x),
    y: Math.min(anchor.y, current.y),
    w: Math.abs(current.x - anchor.x),
    h: Math.abs(current.y - anchor.y),
  };
}

/** Returns the first node within `radius` SVG units of `svgPoint`, or null. */
export function findDropTarget(
  nodes: SkillNode[],
  svgPoint: { x: number; y: number },
  radius: number,
): SkillNode | null {
  for (const n of nodes) {
    if (Math.hypot(n.positionX - svgPoint.x, n.positionY - svgPoint.y) < radius) {
      return n;
    }
  }
  return null;
}

/** Returns the initial pinch distance between two pointers. */
export function computeInitialPinchDistance(pointers: PointerEvent[]): number {
  return Math.hypot(
    pointers[0].clientX - pointers[1].clientX,
    pointers[0].clientY - pointers[1].clientY,
  );
}
