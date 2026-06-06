import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkillTier = 'core' | 'familiar' | 'exposure';

export interface SkillGraphNode {
  id: string;
  label: string;
  tier: SkillTier;
  /** Number of repos a skill is verified in — drives node size. */
  repos: number;
  /** Optional sub-label shown in the hover card (e.g. "backend"). */
  group?: string;
  /** Ids of skills this one builds on (prerequisite edges). */
  deps?: string[];
}

interface SimNode extends SkillGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Pinned position while dragging. */
  fx: number | null;
  fy: number | null;
  seed: number;
}

interface SimEdge {
  source: SimNode;
  target: SimNode;
}

const TIER_RANK: Record<SkillTier, number> = { core: 0, familiar: 1, exposure: 2 };

/**
 * Self-contained, animated force-directed skill graph. Nodes are sized by repo
 * count and coloured by proficiency tier; edges are prerequisite links rendered
 * as soft curves. Drag to pan, scroll to zoom, drag a node to reposition it.
 */
@Component({
  selector: 'app-skill-graph',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skill-graph.component.html',
  styleUrl: './skill-graph.component.scss',
})
export class SkillGraphComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() nodes: SkillGraphNode[] = [];
  /** Show the legend / hint chrome (off when embedded as decoration). */
  @Input() chrome = true;
  /** Gentle continuous drift so the graph feels alive at rest. */
  @Input() ambient = true;

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLElement>;

  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  sim: SimNode[] = [];
  edges: SimEdge[] = [];

  width = 800;
  height = 520;
  // viewBox in world units
  vb = { x: -470, y: -320, w: 940, h: 640 };

  hovered: SimNode | null = null;
  hoverScreen = { x: 0, y: 0 };

  private rafId = 0;
  private alpha = 1;
  private frame = 0;
  private resizeObs: ResizeObserver | null = null;
  /** Signature of the current node set; guards against unstable @Input arrays. */
  private sig = '';
  /** Topology signature (ids + edges) — distinguishes a recolour from a rebuild. */
  private topo = '';

  // pointer interaction
  private dragNode: SimNode | null = null;
  private panning = false;
  private moved = false;
  private last = { x: 0, y: 0 };
  private downId = -1;

  ngAfterViewInit(): void {
    this.measure();
    this.sig = this.signatureOf(this.nodes);
    this.topo = this.topologyOf(this.nodes);
    this.build();
    this.resizeObs = new ResizeObserver(() => this.measure());
    this.resizeObs.observe(this.hostRef.nativeElement);
    this.zone.runOutsideAngular(() => this.tick());
  }

  ngOnChanges(): void {
    if (!this.hostRef) return;
    // Only rebuild when the node set actually changes. Callers often pass a
    // getter that returns a fresh array each CD cycle; rebuilding on every
    // reference change would re-randomise positions forever (violent shaking).
    const next = this.signatureOf(this.nodes);
    if (next === this.sig) return;
    this.sig = next;
    // Same nodes & edges, only tier/size changed (e.g. a level edit): patch the
    // existing nodes in place so positions don't re-randomise ("explode").
    const nextTopo = this.topologyOf(this.nodes);
    if (nextTopo === this.topo) {
      this.patch();
    } else {
      this.topo = nextTopo;
      this.build();
    }
  }

  private signatureOf(nodes: SkillGraphNode[]): string {
    return nodes
      .map((n) => `${n.id}:${n.tier}:${n.repos}:${(n.deps ?? []).join('.')}`)
      .join('|');
  }

  /** Identity of the graph shape — node ids and their edges, order-independent. */
  private topologyOf(nodes: SkillGraphNode[]): string {
    return nodes
      .map((n) => `${n.id}:${(n.deps ?? []).join('.')}`)
      .sort()
      .join('|');
  }

  /** Recolour / resize nodes without disturbing their current positions. */
  private patch(): void {
    const byId = new Map(this.nodes.map((n) => [n.id, n]));
    for (const s of this.sim) {
      const n = byId.get(s.id);
      if (!n) continue;
      s.tier = n.tier;
      s.repos = n.repos;
      s.r = this.radiusFor(n.repos);
    }
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObs?.disconnect();
  }

  private measure(): void {
    const el = this.hostRef.nativeElement;
    this.width = el.clientWidth || 800;
    this.height = el.clientHeight || 520;
    const aspect = this.width / this.height;
    // keep world height stable, derive width from aspect
    const h = this.vb.h;
    const cx = this.vb.x + this.vb.w / 2;
    const cy = this.vb.y + this.vb.h / 2;
    this.vb.w = h * aspect;
    this.vb.h = h;
    this.vb.x = cx - this.vb.w / 2;
    this.vb.y = cy - this.vb.h / 2;
  }

  private build(): void {
    const map = new Map<string, SimNode>();
    const ring = Math.min(this.width, this.height) * 0.32 || 200;

    this.sim = this.nodes.map((n, i) => {
      const angle = (i / Math.max(1, this.nodes.length)) * Math.PI * 2;
      const rank = TIER_RANK[n.tier];
      // core skills start nearer the centre, exposure further out
      const radius = ring * (0.45 + rank * 0.28) * (0.85 + Math.random() * 0.3);
      const node: SimNode = {
        ...n,
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        r: this.radiusFor(n.repos),
        fx: null,
        fy: null,
        seed: Math.random() * Math.PI * 2,
      };
      map.set(n.id, node);
      return node;
    });

    this.edges = [];
    for (const n of this.sim) {
      for (const dep of n.deps ?? []) {
        const src = map.get(dep);
        if (src) this.edges.push({ source: src, target: n });
      }
    }
    this.alpha = 1;
    this.cdr.markForCheck();
  }

  private radiusFor(repos: number): number {
    const r = 10 + Math.sqrt(Math.max(0, repos)) * 3.4;
    return Math.max(10, Math.min(24, r));
  }

  // ---- simulation ----
  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);
    this.frame++;
    this.step();
    // repaint Angular bindings ~30fps for the SVG transforms
    if (this.frame % 2 === 0) {
      this.zone.run(() => this.cdr.markForCheck());
    }
  };

  private step(): void {
    const n = this.sim;
    if (!n.length) return;
    const active = this.alpha > 0.005 || this.dragNode;
    if (active) {
      // charge repulsion
      for (let i = 0; i < n.length; i++) {
        const a = n[i];
        for (let j = i + 1; j < n.length; j++) {
          const b = n[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { d2 = 0.01; dx = Math.random(); dy = Math.random(); }
          const minDist = a.r + b.r + 26;
          const force = (5200 + (d2 < minDist * minDist ? 9000 : 0)) / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * force;
          const fy = (dy / d) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      // spring on edges
      for (const e of this.edges) {
        const a = e.source, b = e.target;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const target = 96 + a.r + b.r;
        const k = (d - target) * 0.012;
        const fx = (dx / d) * k, fy = (dy / d) * k;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      // centering gravity
      for (const a of n) {
        a.vx -= a.x * 0.0028;
        a.vy -= a.y * 0.0028;
      }
      this.alpha *= 0.985;
    }

    // ambient drift keeps it alive once settled
    for (const a of n) {
      if (a === this.dragNode && a.fx != null && a.fy != null) {
        a.x = a.fx; a.y = a.fy; a.vx = 0; a.vy = 0;
        continue;
      }
      if (this.ambient && !active) {
        a.vx += Math.cos(this.frame * 0.006 + a.seed) * 0.018;
        a.vy += Math.sin(this.frame * 0.006 + a.seed * 1.3) * 0.018;
      }
      a.vx *= 0.86;
      a.vy *= 0.86;
      a.x += a.vx;
      a.y += a.vy;
    }
  }

  // ---- geometry helpers for the template ----
  edgePath(e: SimEdge): string {
    const a = e.source, b = e.target;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // perpendicular bow for an organic curve
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(38, len * 0.16);
    const cx = mx + (-dy / len) * bow;
    const cy = my + (dx / len) * bow;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }

  isEdgeLit(e: SimEdge): boolean {
    return !!this.hovered && (e.source.id === this.hovered.id || e.target.id === this.hovered.id);
  }

  get viewBoxStr(): string {
    return `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vb.h}`;
  }

  trackById = (_: number, n: SimNode) => n.id;
  trackEdge = (_: number, e: SimEdge) => e.source.id + '>' + e.target.id;

  // ---- interaction ----
  private toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.hostRef.nativeElement.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    return { x: this.vb.x + px * this.vb.w, y: this.vb.y + py * this.vb.h };
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    const rect = this.hostRef.nativeElement.getBoundingClientRect();
    return {
      x: ((x - this.vb.x) / this.vb.w) * rect.width,
      y: ((y - this.vb.y) / this.vb.h) * rect.height,
    };
  }

  onNodeEnter(node: SimNode): void {
    this.hovered = node;
    const s = this.toScreen(node.x, node.y);
    this.hoverScreen = s;
    this.cdr.markForCheck();
  }

  onNodeLeave(): void {
    if (!this.dragNode) {
      this.hovered = null;
      this.cdr.markForCheck();
    }
  }

  onPointerDownNode(ev: PointerEvent, node: SimNode): void {
    ev.stopPropagation();
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    this.downId = ev.pointerId;
    this.dragNode = node;
    this.moved = false;
    node.fx = node.x;
    node.fy = node.y;
    this.last = this.toWorld(ev.clientX, ev.clientY);
  }

  onPointerDown(ev: PointerEvent): void {
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
    this.downId = ev.pointerId;
    this.panning = true;
    this.moved = false;
    this.last = { x: ev.clientX, y: ev.clientY };
  }

  onPointerMove(ev: PointerEvent): void {
    if (this.dragNode) {
      const w = this.toWorld(ev.clientX, ev.clientY);
      this.dragNode.fx = w.x;
      this.dragNode.fy = w.y;
      this.dragNode.x = w.x;
      this.dragNode.y = w.y;
      this.alpha = Math.max(this.alpha, 0.4);
      this.moved = true;
      this.hovered = this.dragNode;
      this.hoverScreen = this.toScreen(w.x, w.y);
      this.cdr.markForCheck();
    } else if (this.panning) {
      const dx = ev.clientX - this.last.x;
      const dy = ev.clientY - this.last.y;
      if (Math.hypot(dx, dy) > 2) this.moved = true;
      const rect = this.hostRef.nativeElement.getBoundingClientRect();
      this.vb.x -= (dx / rect.width) * this.vb.w;
      this.vb.y -= (dy / rect.height) * this.vb.h;
      this.last = { x: ev.clientX, y: ev.clientY };
      this.cdr.markForCheck();
    }
  }

  onPointerUp(): void {
    if (this.dragNode) {
      // release the pin so it rejoins the flow
      this.dragNode.fx = null;
      this.dragNode.fy = null;
      this.dragNode = null;
      this.alpha = Math.max(this.alpha, 0.25);
    }
    this.panning = false;
  }

  @HostListener('wheel', ['$event'])
  onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const scale = Math.exp((ev.deltaY < 0 ? 1 : -1) * 0.12);
    const newW = Math.min(2600, Math.max(260, this.vb.w / scale));
    const ratio = newW / this.vb.w;
    const w = this.toWorld(ev.clientX, ev.clientY);
    this.vb.x = w.x - (w.x - this.vb.x) * ratio;
    this.vb.y = w.y - (w.y - this.vb.y) * ratio;
    this.vb.w = newW;
    this.vb.h *= ratio;
    this.cdr.markForCheck();
  }
}
