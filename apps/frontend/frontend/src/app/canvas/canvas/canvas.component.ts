import { Component, ElementRef, OnInit, ViewChild, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { BehaviorSubject, Subject, takeUntil, take } from 'rxjs';
import { ActivityCalendarComponent } from '../activity-calendar/activity-calendar.component';
import { LinkifyPipe } from '../../shared/pipes/linkify.pipe';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, ActivityCalendarComponent, LinkifyPipe],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  treesService = inject(TreesService);
  nodesService = inject(NodesService);
  authService = inject(AuthService);
  dialogService = inject(DialogService);

  isGuest$ = this.authService.isGuest$;

  tree: Tree | null = null;
  nodes: SkillNode[] = [];
  loading = true;

  // View state
  zoomLevel = 1; // 1 = 1 SVG unit per CSS pixel
  viewBox: ViewBox = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };

  // --- Interaction State Machine ---
  interactionState: 'idle' | 'panning' | 'selecting' | 'dragging-node' | 'pinching' | 'linking' = 'idle';

  // Pointer tracking
  activePointers = new Map<number, PointerEvent>();
  dragThresholdPassed = false;

  // Interaction Data
  dragStartScreen = { x: 0, y: 0 };
  dragStartSvg: { x: number, y: number } | null = null;
  selectedNodes: Set<string> = new Set();
  draggedNode: SkillNode | null = null;
  initialNodePositions = new Map<string, { x: number, y: number }>();
  selectionStart: { x: number, y: number } | null = null;
  selectionBox: ViewBox | null = null;
  linkSourceNode: SkillNode | null = null;
  mousePosition = { x: 0, y: 0 };

  // Pinch Zoom Data
  initialPinchDistance = 0;
  initialViewBox = { x: 0, y: 0, w: 0, h: 0 };

  // Double Tap Data
  lastTapTime = 0;
  lastTapNodeId: string | null = null;
  animationFrameId: number | null = null;

  // Create / Edit state
  showProperties = false;
  editNodeData: Partial<SkillNode> = {};
  editingDescription = false;
  selectedNode: SkillNode | null = null;
  hoveredNode: SkillNode | null = null;

  closeProperties() {
    this.showProperties = false;
    this.editingDescription = false;
    this.selectedNode = null;
  }

  startEditDescription(event: MouseEvent) {
    if ((event.target as HTMLElement).tagName.toLowerCase() === 'a') {
      return;
    }
    this.editingDescription = true;
    setTimeout(() => {
      const ta = document.querySelector('.desc-textarea') as HTMLTextAreaElement;
      if (ta) ta.focus();
    }, 0);
  }

  // AI Generation State
  showAiPrompt = false;
  aiPrompt = '';
  isGenerating = false;

  // Tree Title Edit State
  isEditingTreeTitle = false;
  editTreeTitleData = '';

  startEditingTreeTitle() {
    if (!this.tree) return;
    this.editTreeTitleData = this.tree.title;
    this.isEditingTreeTitle = true;
    setTimeout(() => {
      const input = document.querySelector('.title-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  saveTreeTitle() {
    if (!this.isEditingTreeTitle || !this.tree) return;
    const newTitle = this.editTreeTitleData.trim();
    if (newTitle && newTitle !== this.tree.title) {
      this.tree.title = newTitle;
      this.treesService.updateTree(this.tree.id, newTitle).subscribe({
        error: (err) => console.error('Failed to update tree title', err)
      });
    }
    this.isEditingTreeTitle = false;
  }

  cancelEditingTreeTitle() {
    this.isEditingTreeTitle = false;
  }

  openAiPrompt() {
    this.isGuest$.pipe(take(1)).subscribe(isGuest => {
      if (isGuest) {
        this.dialogService.alert('AI features are not available for guests.');
        return;
      }
      this.showAiPrompt = true;
      this.aiPrompt = '';
    });
  }

  generateWithAi() {
    this.isGuest$.pipe(take(1)).subscribe(isGuest => {
      if (isGuest) return;
      if (!this.tree || !this.aiPrompt.trim()) return;
      this.isGenerating = true;
      
      this.treesService.generateTree(this.tree.id, this.aiPrompt).subscribe({
        next: (newNodes) => {
          // Create a new array reference to trigger change detection
          this.nodes = [...this.nodes, ...newNodes];
          this.isGenerating = false;
          this.showAiPrompt = false;
        },
        error: (err) => {
          console.error('Error generating tree', err);
          this.dialogService.alert('Failed to generate tree. Error: ' + JSON.stringify(err.error || err.message));
          this.isGenerating = false;
        }
      });
    });
  }

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

  // --- Pointer Events Engine ---

  private getSvgPoint(clientX: number, clientY: number): { x: number, y: number } {
    const pt = this.svgCanvas.nativeElement.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const inverse = this.svgCanvas.nativeElement.getScreenCTM()?.inverse();
    return inverse ? pt.matrixTransform(inverse) : pt;
  }

  onCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  onCanvasPointerDown(event: PointerEvent) {
    if (this.showProperties || this.editingDescription) {
      this.closeProperties();
      return;
    }
    
    (event.target as Element).setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, event);
    this.dragThresholdPassed = false;
    this.selectedNode = null;

    if (this.activePointers.size === 1) {
      if (event.shiftKey) {
        this.interactionState = 'selecting';
        const svgP = this.getSvgPoint(event.clientX, event.clientY);
        this.selectionStart = { x: svgP.x, y: svgP.y };
        this.selectionBox = { x: svgP.x, y: svgP.y, w: 0, h: 0 };
        if (!event.ctrlKey && !event.metaKey) this.selectedNodes.clear();
      } else {
        this.interactionState = 'panning';
        this.dragStartScreen = { x: event.clientX, y: event.clientY };
      }
    } else if (this.activePointers.size === 2) {
      this.interactionState = 'pinching';
      const pointers = Array.from(this.activePointers.values());
      this.initialPinchDistance = Math.hypot(
        pointers[0].clientX - pointers[1].clientX,
        pointers[0].clientY - pointers[1].clientY
      );
      this.initialViewBox = { ...this.viewBox };
    }
  }

  onNodePointerDown(event: PointerEvent, node: SkillNode) {
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, event);
    this.dragThresholdPassed = false;
    
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if ((event.target as HTMLElement).tagName.toLowerCase() === 'input') return;

    this.interactionState = 'dragging-node';
    this.draggedNode = node;
    const svgP = this.getSvgPoint(event.clientX, event.clientY);
    this.dragStartSvg = { x: svgP.x, y: svgP.y };
    this.dragStartScreen = { x: event.clientX, y: event.clientY };

    const isMultiSelect = event.ctrlKey || event.metaKey;
    if (!this.selectedNodes.has(node.id)) {
      if (!isMultiSelect) this.selectedNodes.clear();
      this.selectedNodes.add(node.id);
    } else if (isMultiSelect) {
      this.selectedNodes.delete(node.id);
      this.interactionState = 'idle';
      this.draggedNode = null;
      return;
    }

    this.initialNodePositions.clear();
    this.nodes.forEach(n => {
      if (this.selectedNodes.has(n.id)) {
        this.initialNodePositions.set(n.id, { x: n.positionX, y: n.positionY });
      }
    });

    const now = Date.now();
    if (this.lastTapNodeId === node.id && now - this.lastTapTime < 300) {
      this.centerOnNode(node);
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.lastTapNodeId = node.id;
    }
  }

  startLinkingPointer(event: PointerEvent, node: SkillNode) {
    event.stopPropagation();
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    
    (event.target as Element).setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, event);
    this.dragThresholdPassed = false;

    this.interactionState = 'linking';
    this.linkSourceNode = node;
    const svgP = this.getSvgPoint(event.clientX, event.clientY);
    this.mousePosition = { x: svgP.x, y: svgP.y };
  }

  onPointerMove(event: PointerEvent) {
    if (!this.activePointers.has(event.pointerId)) return;
    this.activePointers.set(event.pointerId, event);

    if (!this.dragThresholdPassed && this.interactionState !== 'pinching') {
      const dist = Math.hypot(event.clientX - this.dragStartScreen.x, event.clientY - this.dragStartScreen.y);
      if (dist > 5) this.dragThresholdPassed = true;
    }

    if (this.interactionState === 'pinching' && this.activePointers.size === 2) {
      event.preventDefault();
      const pointers = Array.from(this.activePointers.values());
      const currentDistance = Math.hypot(
        pointers[0].clientX - pointers[1].clientX,
        pointers[0].clientY - pointers[1].clientY
      );
      
      if (this.initialPinchDistance > 0) {
        const pinchScale = this.initialPinchDistance / currentDistance;
        const newZoom = this.zoomLevel / pinchScale;
        
        // Clamp zoom level
        if (newZoom >= 0.15 && newZoom <= 5) {
          this.zoomLevel = newZoom;
          const newW = window.innerWidth / this.zoomLevel;
          const newH = window.innerHeight / this.zoomLevel;

          const dw = newW - this.viewBox.w;
          const dh = newH - this.viewBox.h;
          this.viewBox.x -= dw / 2;
          this.viewBox.y -= dh / 2;
          this.viewBox.w = newW;
          this.viewBox.h = newH;
        }
        
        this.initialPinchDistance = currentDistance;
      }
    } else if (this.interactionState === 'panning') {
      event.preventDefault();
      const dx = (event.clientX - this.dragStartScreen.x) * (this.viewBox.w / window.innerWidth);
      const dy = (event.clientY - this.dragStartScreen.y) * (this.viewBox.h / window.innerHeight);
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this.dragStartScreen = { x: event.clientX, y: event.clientY };
    } else if (this.interactionState === 'selecting' && this.selectionStart && this.selectionBox) {
      event.preventDefault();
      const svgP = this.getSvgPoint(event.clientX, event.clientY);
      this.selectionBox.x = Math.min(this.selectionStart.x, svgP.x);
      this.selectionBox.y = Math.min(this.selectionStart.y, svgP.y);
      this.selectionBox.w = Math.abs(svgP.x - this.selectionStart.x);
      this.selectionBox.h = Math.abs(svgP.y - this.selectionStart.y);

      if (!event.ctrlKey && !event.metaKey) this.selectedNodes.clear();
      
      this.nodes.forEach(node => {
        if (
          node.positionX >= this.selectionBox!.x &&
          node.positionX <= this.selectionBox!.x + this.selectionBox!.w &&
          node.positionY >= this.selectionBox!.y &&
          node.positionY <= this.selectionBox!.y + this.selectionBox!.h
        ) {
          this.selectedNodes.add(node.id);
        }
      });
    } else if (this.interactionState === 'dragging-node' && this.draggedNode && this.dragStartSvg) {
      event.preventDefault();
      const svgP = this.getSvgPoint(event.clientX, event.clientY);
      const dx = svgP.x - this.dragStartSvg.x;
      const dy = svgP.y - this.dragStartSvg.y;

      this.nodes.forEach(n => {
        if (this.selectedNodes.has(n.id)) {
          const initialPos = this.initialNodePositions.get(n.id);
          if (initialPos) {
            n.positionX = initialPos.x + dx;
            n.positionY = initialPos.y + dy;
          }
        }
      });
    } else if (this.interactionState === 'linking') {
      event.preventDefault();
      const svgP = this.getSvgPoint(event.clientX, event.clientY);
      this.mousePosition = { x: svgP.x, y: svgP.y };
    }
  }

  onPointerUp(event: PointerEvent) {
    if (!this.activePointers.has(event.pointerId)) return;
    (event.target as Element).releasePointerCapture(event.pointerId);
    this.activePointers.delete(event.pointerId);

    if (this.interactionState === 'pinching') {
      if (this.activePointers.size < 2) {
        if (this.activePointers.size === 1) {
          this.interactionState = 'panning';
          const remainingPointer = Array.from(this.activePointers.values())[0];
          this.dragStartScreen = { x: remainingPointer.clientX, y: remainingPointer.clientY };
        } else {
          this.interactionState = 'idle';
        }
      }
      return;
    }

    if (this.interactionState === 'dragging-node') {
      if (this.dragThresholdPassed) {
        this.nodes.forEach(n => {
          if (this.selectedNodes.has(n.id)) {
            this.nodesService.updateNode(n.id, {
              positionX: n.positionX,
              positionY: n.positionY
            }).subscribe();
          }
        });
      } else if (this.draggedNode && (event.pointerType === 'mouse' ? event.button === 0 : true)) {
        this.onNodeTap(event, this.draggedNode);
      }
      this.draggedNode = null;
      this.dragStartSvg = null;
      this.initialNodePositions.clear();
    } else if (this.interactionState === 'selecting') {
      this.selectionBox = null;
      this.selectionStart = null;
    } else if (this.interactionState === 'linking' && this.linkSourceNode) {
      const svgP = this.getSvgPoint(event.clientX, event.clientY);
      let targetNode = null;
      for (const n of this.nodes) {
        if (n.id === this.linkSourceNode.id) continue;
        const dist = Math.hypot(n.positionX - svgP.x, n.positionY - svgP.y);
        if (dist < 50) {
          targetNode = n;
          break;
        }
      }
      if (targetNode) {
        this.completeLink(targetNode);
      } else {
        this.cancelLinking();
      }
    }

    if (this.activePointers.size === 0) {
      this.interactionState = 'idle';
    }
  }

  onPointerCancel(event: PointerEvent) {
    this.onPointerUp(event);
  }

  onNodeContextMenu(event: MouseEvent, node: SkillNode) {
    event.preventDefault();
    event.stopPropagation();
    this.interactionState = 'idle';
    this.activePointers.clear();
    this.selectedNode = node;
    this.editNodeData = { ...node };
    this.showProperties = true;
    this.editingDescription = false;
  }

  onNodeTap(event: PointerEvent | MouseEvent, node: SkillNode) {
    const maxLvl = node.maxLevel || 5;
    let currLvl = node.level || 0;

    if (event.shiftKey) {
      currLvl = Math.max(0, currLvl - 1);
    } else {
      currLvl = Math.min(maxLvl, currLvl + 1);
    }

    this.selectedNode = node;
    this.editNodeData = { ...node };

    if (node.level !== currLvl) {
      node.level = currLvl;
      node.progress = (currLvl / maxLvl) * 100;
      this.nodesService.updateNode(node.id, { level: currLvl, progress: node.progress }).subscribe();
      this.editNodeData.level = currLvl;
    }
  }

  centerOnNode(node: SkillNode) {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const startX = this.viewBox.x;
    const startY = this.viewBox.y;
    const targetX = node.positionX - this.viewBox.w / 2;
    const targetY = node.positionY - this.viewBox.h / 2;
    
    const duration = 250;
    const startTime = performance.now();

    const animate = (time: number) => {
      let progress = (time - startTime) / duration;
      if (progress > 1) progress = 1;
      const ease = 1 - Math.pow(1 - progress, 3);
      this.viewBox.x = startX + (targetX - startX) * ease;
      this.viewBox.y = startY + (targetY - startY) * ease;
      
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  @HostListener('window:resize')
  onWindowResize() {
    // Keep the center point and zoom level stable; just adjust viewBox to match new window size
    const cx = this.viewBox.x + this.viewBox.w / 2;
    const cy = this.viewBox.y + this.viewBox.h / 2;
    this.viewBox.w = window.innerWidth / this.zoomLevel;
    this.viewBox.h = window.innerHeight / this.zoomLevel;
    this.viewBox.x = cx - this.viewBox.w / 2;
    this.viewBox.y = cy - this.viewBox.h / 2;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const wheel = event.deltaY < 0 ? 1 : -1;
    const zoomFactor = Math.exp(wheel * zoomIntensity);

    const newZoom = this.zoomLevel * zoomFactor;
    // Clamp zoom level
    if (newZoom < 0.15 || newZoom > 5) return;

    const svgP = this.getSvgPoint(event.clientX, event.clientY);

    this.zoomLevel = newZoom;
    const newW = window.innerWidth / this.zoomLevel;
    const newH = window.innerHeight / this.zoomLevel;

    // Zoom toward pointer position
    this.viewBox.x = svgP.x - (svgP.x - this.viewBox.x) * (newW / this.viewBox.w);
    this.viewBox.y = svgP.y - (svgP.y - this.viewBox.y) * (newH / this.viewBox.h);
    this.viewBox.w = newW;
    this.viewBox.h = newH;
  }

  addNode() {
    const newNode: Partial<SkillNode> = {
      treeId: this.tree?.id,
      title: 'New Skill',
      description: '',
      icon: 'code',
      level: 0,
      maxLevel: 5,
      progress: 0,
      positionX: this.viewBox.x + this.viewBox.w / 2,
      positionY: this.viewBox.y + this.viewBox.h / 2 - 100,
    };

    this.nodesService.createNode(newNode).subscribe(node => {
      this.nodes.push(node);
      this.selectedNode = node;
      this.editNodeData = { ...node };
      this.showProperties = true;
      this.editingDescription = false;
    });
  }

  completeLink(targetNode: SkillNode) {
    this.interactionState = 'idle';
    const sourceNode = this.linkSourceNode;
    this.linkSourceNode = null;

    if (!sourceNode || sourceNode.id === targetNode.id) return;

    if (sourceNode.parentId === targetNode.id) {
      this.dialogService.alert("Нельзя привязать навык к своему родителю!");
      return;
    }

    targetNode.parentId = sourceNode.id;
    this.nodesService.updateNode(targetNode.id, { parentId: sourceNode.id }).subscribe();
  }

  cancelLinking() {
    this.interactionState = 'idle';
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

  async deleteNode() {
    if (!this.selectedNode) return;
    if (await this.dialogService.confirm('Delete this node?')) {
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

