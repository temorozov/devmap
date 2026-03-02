import { Component, ElementRef, OnInit, ViewChild, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { ActivityCalendarComponent } from '../activity-calendar/activity-calendar.component';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, ActivityCalendarComponent],
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
  hasMovedNode = false;
  hoveredNode: SkillNode | null = null;
  mousePosition = { x: 0, y: 0 };

  availableIcons = [
    { name: 'fitness_center', label: 'Gym' },
    { name: 'code', label: 'Code' },
    { name: 'sports_esports', label: 'Chess/Game' },
    { name: 'menu_book', label: 'Book' },
    { name: 'lightbulb', label: 'Idea' },
    { name: 'brush', label: 'Art' },
    { name: 'star', label: 'Star' }
  ];

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
    // If we reach here, we didn't click on a node (because node clicks stop propagation)
    this.isDraggingCanvas = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.selectedNode = null;
    this.showProperties = false;
  }

  onCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    const pt = this.svgCanvas.nativeElement.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(this.svgCanvas.nativeElement.getScreenCTM()?.inverse());

    if (this.isLinking) {
      this.mousePosition = { x: svgP.x, y: svgP.y };
    } else if (this.isDraggingCanvas) {
      const dx = (event.clientX - this.dragStart.x) * (this.viewBox.w / window.innerWidth);
      const dy = (event.clientY - this.dragStart.y) * (this.viewBox.h / window.innerHeight);

      this.viewBox.x -= dx;
      this.viewBox.y -= dy;

      this.dragStart = { x: event.clientX, y: event.clientY };
    } else if (this.isDraggingNode && this.draggedNode) {
      this.hasMovedNode = true;
      // Calculate new position based on SVG coordinates
      this.draggedNode.positionX = svgP.x; // Now centered, no offset needed since circle cx is 0 inside group
      this.draggedNode.positionY = svgP.y;
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
    if (this.isLinking) {
      this.cancelLinking();
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

    // Prevent default browser drag/selection behaviors which can lock the UI
    // and prevent right-click context menus from appearing, especially after double-clicks (like double downgrading).
    if ((event.target as HTMLElement).tagName.toLowerCase() !== 'input') {
      event.preventDefault();
    }

    // Only allow drag if left clicking and not editing progress slider directly inside node
    if (event.button === 0 && (event.target as HTMLElement).tagName.toLowerCase() !== 'input') {
      this.isDraggingNode = true;
      this.hasMovedNode = false;
      this.draggedNode = node;
    }
  }

  onNodeClick(event: MouseEvent, node: SkillNode) {
    if (this.hasMovedNode) return;
    event.stopPropagation();

    const maxLvl = node.maxLevel || 5;
    let currLvl = node.level || 0;

    if (event.shiftKey) {
      currLvl = Math.max(0, currLvl - 1);
    } else {
      currLvl = Math.min(maxLvl, currLvl + 1);
    }

    if (node.level !== currLvl) {
      node.level = currLvl;
      node.progress = (currLvl / maxLvl) * 100;
      this.nodesService.updateNode(node.id, { level: currLvl, progress: node.progress }).subscribe();
      if (this.selectedNode?.id === node.id) {
        this.editNodeData.level = currLvl;
      }
    }
  }

  onNodeContextMenu(event: MouseEvent, node: SkillNode) {
    event.preventDefault(); // Prevent default browser context menu
    event.stopPropagation();

    // Disable any active dragging state since right click cancels dragging logically anyway
    this.isDraggingNode = false;
    this.hasMovedNode = false;

    // Open properties instead of downgrading
    this.selectedNode = node;
    this.editNodeData = { ...node };
    this.showProperties = true;
  }

  addNode() {
    // Add node in the center of the current view
    const newNode: Partial<SkillNode> = {
      treeId: this.tree?.id,
      title: 'New Skill',
      description: 'Describe this skill...',
      icon: 'code',
      level: 0,
      maxLevel: 5,
      progress: 0,
      positionX: this.viewBox.x + this.viewBox.w / 2,
      positionY: this.viewBox.y + this.viewBox.h / 2 - 100, // Appears higher, promoting upward growth
    };

    this.nodesService.createNode(newNode).subscribe(node => {
      this.nodes.push(node);
      this.selectedNode = node;
      this.editNodeData = { ...node };
      this.showProperties = true;
    });
  }

  startLinking(event: MouseEvent, node: SkillNode) {
    // Only left click
    if (event.button !== 0) return;
    this.isLinking = true;
    this.linkSourceNode = node;

    // Set initial mouse position
    const pt = this.svgCanvas.nativeElement.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(this.svgCanvas.nativeElement.getScreenCTM()?.inverse());
    this.mousePosition = { x: svgP.x, y: svgP.y };
  }

  onNodeMouseUp(event: MouseEvent, node: SkillNode) {
    if (this.isLinking && this.linkSourceNode && this.linkSourceNode.id !== node.id) {
      event.stopPropagation();
      this.completeLink(node);
    }
  }

  completeLink(targetNode: SkillNode) {
    this.isLinking = false;
    const sourceNode = this.linkSourceNode;
    this.linkSourceNode = null;

    if (!sourceNode || sourceNode.id === targetNode.id) return;

    // Check cycle: if the target is already a parent of the source node
    if (sourceNode.parentId === targetNode.id) {
      alert("Нельзя привязать навык к своему родителю!");
      return;
    }

    // Set targetNode's parent to sourceNode
    targetNode.parentId = sourceNode.id;
    this.nodesService.updateNode(targetNode.id, { parentId: sourceNode.id }).subscribe();
  }

  cancelLinking() {
    this.isLinking = false;
    this.linkSourceNode = null;
  }

  saveTimeout: any;

  saveNodeProperties() {
    if (!this.selectedNode || !this.editNodeData) return;

    // Recalculate progress if maxLevel changed
    const maxLvl = this.editNodeData.maxLevel || 5;
    let lvl = this.editNodeData.level || 0;
    if (lvl > maxLvl) lvl = maxLvl;
    this.editNodeData.level = lvl;
    this.editNodeData.progress = (lvl / maxLvl) * 100;

    // Apply locally to selected node for immediate visual update
    Object.assign(this.selectedNode, this.editNodeData);

    const idx = this.nodes.findIndex(n => n.id === this.selectedNode?.id);
    if (idx !== -1) {
      this.nodes[idx] = this.selectedNode;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      if (!this.selectedNode) return;
      this.nodesService.updateNode(this.selectedNode.id, this.editNodeData).subscribe(updated => {
        // Optionally sync any backend-specific generated fields
      });
    }, 500);
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

  get totalProgress(): number {
    if (!this.nodes || this.nodes.length === 0) return 0;
    let totalLevel = 0;
    let totalMaxLevel = 0;
    for (const node of this.nodes) {
      totalLevel += node.level || 0;
      totalMaxLevel += node.maxLevel || 5;
    }
    return totalMaxLevel === 0 ? 0 : Math.round((totalLevel / totalMaxLevel) * 100);
  }
}

