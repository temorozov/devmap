import { Component, ElementRef, OnInit, ViewChild, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  treesService = inject(TreesService);
  nodesService = inject(NodesService);

  tree: Tree | null = null;
  nodes: SkillNode[] = [];
  loading = true;

  // View state
  viewBox: ViewBox = { x: 0, y: 0, w: 2000, h: 2000 };
  isDraggingCanvas = false;
  dragStart = { x: 0, y: 0 };

  // Node interaction state
  selectedNode: SkillNode | null = null;
  isDraggingNode = false;
  draggedNode: SkillNode | null = null;

  // Create / Edit state
  showProperties = false;
  editNodeData: Partial<SkillNode> = {};
  isLinking = false;
  linkSourceNode: SkillNode | null = null;

  @ViewChild('svgCanvas') svgCanvas!: ElementRef<SVGSVGElement>;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadTree(id);
      }
    });
  }

  loadTree(id: string) {
    this.treesService.getTree(id).subscribe({
      next: (tree) => {
        this.tree = tree;
        this.loading = false;
        if (tree.nodes) {
          this.nodes = tree.nodes;
        } else {
          // Fetch separately if not included
          this.nodesService.getNodesByTree(id).subscribe(nodes => this.nodes = nodes);
        }
      },
      error: () => {
        // Fallback for shared links testing logic
        this.treesService.getSharedTree(id).subscribe({
          next: (tree) => {
            this.tree = tree;
            this.loading = false;
            this.nodes = tree.nodes || [];
          },
          error: () => {
            this.router.navigate(['/dashboard']);
          }
        });
      }
    });
  }

  // --- Canvas Pan & Zoom ---

  onMouseDown(event: MouseEvent) {
    // If clicking on SVG itself (not a node), start canvas pan
    if ((event.target as HTMLElement).tagName.toLowerCase() === 'svg') {
      this.isDraggingCanvas = true;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.selectedNode = null;
      this.showProperties = false;
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDraggingCanvas) {
      const dx = (event.clientX - this.dragStart.x) * (this.viewBox.w / window.innerWidth);
      const dy = (event.clientY - this.dragStart.y) * (this.viewBox.h / window.innerHeight);

      this.viewBox.x -= dx;
      this.viewBox.y -= dy;

      this.dragStart = { x: event.clientX, y: event.clientY };
    } else if (this.isDraggingNode && this.draggedNode) {
      // Calculate new position based on SVG coordinates
      const pt = this.svgCanvas.nativeElement.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(this.svgCanvas.nativeElement.getScreenCTM()?.inverse());

      this.draggedNode.positionX = svgP.x - 60; // Offset by node half-width
      this.draggedNode.positionY = svgP.y - 40; // Offset by node half-height
    }
  }

  onMouseUp() {
    this.isDraggingCanvas = false;
    if (this.isDraggingNode && this.draggedNode) {
      this.isDraggingNode = false;
      // Save new position
      this.nodesService.updateNode(this.draggedNode.id, {
        positionX: this.draggedNode.positionX,
        positionY: this.draggedNode.positionY
      }).subscribe();
      this.draggedNode = null;
    }
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const wheel = event.deltaY < 0 ? 1 : -1;
    let zoom = Math.exp(wheel * zoomIntensity);

    // Limits
    if (this.viewBox.w * zoom > 10000 || this.viewBox.w * zoom < 500) return;

    // Mouse coordinates in SVG space
    const pt = this.svgCanvas.nativeElement.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(this.svgCanvas.nativeElement.getScreenCTM()?.inverse());

    this.viewBox.x = svgP.x - (svgP.x - this.viewBox.x) * zoom;
    this.viewBox.y = svgP.y - (svgP.y - this.viewBox.y) * zoom;
    this.viewBox.w *= zoom;
    this.viewBox.h *= zoom;
  }

  // --- Node Interactions ---

  onNodeMouseDown(event: MouseEvent, node: SkillNode) {
    event.stopPropagation();
    if (this.isLinking && this.linkSourceNode && this.linkSourceNode.id !== node.id) {
      // Complete link
      this.completeLink(node);
      return;
    }

    this.selectedNode = node;
    this.editNodeData = { ...node };
    this.showProperties = true;

    // Only allow drag if not editing progress slider directly inside node
    if ((event.target as HTMLElement).tagName.toLowerCase() !== 'input') {
      this.isDraggingNode = true;
      this.draggedNode = node;
    }
  }

  addNode() {
    // Add node in the center of the current view
    const newNode: Partial<SkillNode> = {
      treeId: this.tree?.id,
      title: 'New Skill',
      description: 'Describe this skill...',
      icon: 'star',
      progress: 0,
      positionX: this.viewBox.x + this.viewBox.w / 2 - 60,
      positionY: this.viewBox.y + this.viewBox.h / 2 - 40,
    };

    this.nodesService.createNode(newNode).subscribe(node => {
      this.nodes.push(node);
      this.selectedNode = node;
      this.editNodeData = { ...node };
      this.showProperties = true;
    });
  }

  startLinking(node: SkillNode) {
    this.isLinking = true;
    this.linkSourceNode = node;
  }

  completeLink(targetNode: SkillNode) {
    this.isLinking = false;
    const sourceNode = this.linkSourceNode;
    this.linkSourceNode = null;

    if (!sourceNode) return;

    // Set targetNode's parent to sourceNode
    targetNode.parentId = sourceNode.id;
    this.nodesService.updateNode(targetNode.id, { parentId: sourceNode.id }).subscribe();
  }

  cancelLinking() {
    this.isLinking = false;
    this.linkSourceNode = null;
  }

  saveNodeProperties() {
    if (!this.selectedNode) return;

    this.nodesService.updateNode(this.selectedNode.id, this.editNodeData).subscribe(updated => {
      const idx = this.nodes.findIndex(n => n.id === updated.id);
      if (idx !== -1) {
        this.nodes[idx] = updated;
        this.selectedNode = updated;
      }
    });
  }

  deleteNode() {
    if (!this.selectedNode) return;
    if (confirm('Delete this node?')) {
      this.nodesService.deleteNode(this.selectedNode.id).subscribe(() => {
        this.nodes = this.nodes.filter(n => n.id !== this.selectedNode?.id);
        // Also remove parentId references loosely in UI since DB cascades or sets null
        this.nodes.forEach(n => {
          if (n.parentId === this.selectedNode?.id) n.parentId = undefined;
        });
        this.selectedNode = null;
        this.showProperties = false;
      });
    }
  }

  // Helpers for drawing lines
  getParentNode(parentId: string): SkillNode | undefined {
    return this.nodes.find(n => n.id === parentId);
  }

  get viewBoxString(): string {
    return `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`;
  }
}
