import { Component, ElementRef, OnInit, ViewChild, inject, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { take } from 'rxjs';
import { ActivityCalendarComponent } from '../activity-calendar/activity-calendar.component';
import { LinkifyPipe } from '../../shared/pipes/linkify.pipe';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { I18nService } from '../../shared/services/i18n.service';
import { DEMO_TREE_ID, getDemoSampleNodes, getDemoSampleTitle } from '../../shared/data/demo-sample';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const HELP_STORAGE_KEY = 'skill-tree-help-seen';
const DEFAULT_MAX_LEVEL = 3;
const HOVER_TOOLTIP_DELAY_MS = 40;

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
  i18n = inject(I18nService);

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

  // Create / Edit state
  showProperties = false;
  editNodeData: Partial<SkillNode> = {};
  editingDescription = false;
  selectedNode: SkillNode | null = null;
  hoveredNode: SkillNode | null = null;
  readonly defaultMaxLevel = DEFAULT_MAX_LEVEL;
  private hoverTooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private hoveredNodeId: string | null = null;
  showHelp = false;
  isDemoTree = false;
  localDemoNodeCounter = 0;

  private readonly syncDemoTranslations = effect(() => {
    const language = this.i18n.language();
    if (this.tree?.id === DEMO_TREE_ID) {
      this.tree = {
        ...this.tree,
        title: getDemoSampleTitle(language),
      };
      this.nodes = getDemoSampleNodes(language);
    }
  });

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

  get panelLevel(): number {
    return Math.max(0, Number(this.editNodeData.level) || 0);
  }

  get panelMaxLevel(): number {
    const maxLevel = Number(this.editNodeData.maxLevel) || DEFAULT_MAX_LEVEL;
    return maxLevel > 0 ? maxLevel : DEFAULT_MAX_LEVEL;
  }

  get panelProgressPercent(): number {
    return Math.round((Math.min(this.panelLevel, this.panelMaxLevel) / this.panelMaxLevel) * 100);
  }

  get panelStatusKey(): string {
    if (this.panelLevel <= 0) {
      return 'canvas.statusNotStarted';
    }

    if (this.panelLevel >= this.panelMaxLevel) {
      return 'canvas.statusCompleted';
    }

    return 'canvas.statusInProgress';
  }

  get panelStatusClass(): string {
    if (this.panelLevel <= 0) {
      return 'status-not-started';
    }

    if (this.panelLevel >= this.panelMaxLevel) {
      return 'status-completed';
    }

    return 'status-in-progress';
  }

  getNodeStatusKey(node: Pick<SkillNode, 'level' | 'maxLevel'>): string {
    const level = Math.max(0, Number(node.level) || 0);
    const maxLevel = Number(node.maxLevel) > 0 ? Number(node.maxLevel) : DEFAULT_MAX_LEVEL;

    if (level <= 0) {
      return 'canvas.statusNotStarted';
    }

    if (level >= maxLevel) {
      return 'canvas.statusCompleted';
    }

    return 'canvas.statusInProgress';
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
      if (!this.isDemoTree) {
        this.treesService.updateTree(this.tree.id, newTitle).subscribe({
          error: (err) => console.error('Failed to update tree title', err)
        });
      }
    }
    this.isEditingTreeTitle = false;
  }

  cancelEditingTreeTitle() {
    this.isEditingTreeTitle = false;
  }

  openAiPrompt() {
    if (this.isDemoTree) return;
    this.isGuest$.pipe(take(1)).subscribe(isGuest => {
      if (isGuest) {
        this.dialogService.alert(
          this.i18n.t('canvas.guestAiUnavailable'),
          this.i18n.t('canvas.loginRequiredTitle')
        );
        return;
      }
      this.showAiPrompt = true;
      this.aiPrompt = '';
    });
  }

  generateWithAi() {
    if (this.isDemoTree) return;
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
          const errorDetails = JSON.stringify(err.error || err.message || '');
          this.dialogService.alert(`${this.i18n.t('canvas.generateError')} ${errorDetails}`);
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
    { name: 'brush', label: 'Art' }
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
    this.loading = true;
    this.isDemoTree = id === DEMO_TREE_ID;
    this.showProperties = false;
    this.selectedNode = null;
    this.hoveredNode = null;
    this.maybeOpenHelp();

    if (this.isDemoTree) {
      this.tree = {
        id: DEMO_TREE_ID,
        title: getDemoSampleTitle(this.i18n.currentLanguage()),
        sharedToken: DEMO_TREE_ID,
        userId: 'demo',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        activities: [],
      };
      this.nodes = getDemoSampleNodes(this.i18n.currentLanguage());
      this.centerDemoTreeInView();
      this.loading = false;
      return;
    }

    this.treesService.getTree(id).subscribe({
      next: (tree) => {
        this.tree = tree;
        if (tree.nodes) {
          this.nodes = tree.nodes;
          this.loading = false;
        } else {
          // Fetch separately if not included
          this.nodesService.getNodesByTree(id).subscribe(nodes => {
            this.nodes = nodes;
            this.loading = false;
          });
        }
      },
      error: () => {
        // Fallback for shared links testing logic
        this.treesService.getSharedTree(id).subscribe({
          next: (tree) => {
            this.tree = tree;
            this.loading = false;
            this.nodes = tree.nodes || [];
            this.isDemoTree = false;
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
    this.hideNodeTooltip();
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
    this.hideNodeTooltip();
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
  }

  onNodePointerEnter(event: PointerEvent, node: SkillNode) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    this.hoveredNodeId = node.id;
    if (this.hoverTooltipTimer) {
      clearTimeout(this.hoverTooltipTimer);
    }
    this.hoverTooltipTimer = setTimeout(() => {
      if (this.hoveredNodeId === node.id) {
        this.hoveredNode = node;
      }
    }, HOVER_TOOLTIP_DELAY_MS);
  }

  onNodePointerLeave() {
    this.hideNodeTooltip();
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
        if (!this.isDemoTree) {
          this.nodes.forEach(n => {
            if (this.selectedNodes.has(n.id)) {
              this.nodesService.updateNode(n.id, {
                positionX: n.positionX,
                positionY: n.positionY
              }).subscribe();
            }
          });
        }
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
    this.hideNodeTooltip();
    this.interactionState = 'idle';
    this.activePointers.clear();
    this.selectedNode = node;
    this.editNodeData = { ...node };
    this.showProperties = true;
    this.editingDescription = false;
  }

  onNodeTap(event: PointerEvent | MouseEvent, node: SkillNode) {
    const maxLvl = node.maxLevel || DEFAULT_MAX_LEVEL;
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
      if (!this.isDemoTree) {
        this.nodesService.updateNode(node.id, { level: currLvl, progress: node.progress }).subscribe();
      }
      this.editNodeData.level = currLvl;
    }
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
      title: this.i18n.t('canvas.newSkill'),
      description: '',
      icon: 'code',
      level: 0,
      maxLevel: DEFAULT_MAX_LEVEL,
      progress: 0,
      positionX: this.viewBox.x + this.viewBox.w / 2,
      positionY: this.viewBox.y + this.viewBox.h / 2 - 100,
    };

    if (this.isDemoTree) {
      const node: SkillNode = {
        id: `demo-local-${this.localDemoNodeCounter++}`,
        treeId: this.tree?.id || DEMO_TREE_ID,
        title: newNode.title || this.i18n.t('canvas.newSkill'),
        description: newNode.description || '',
        icon: newNode.icon || 'code',
        positionX: newNode.positionX || 0,
        positionY: newNode.positionY || 0,
        progress: 0,
        level: 0,
        maxLevel: DEFAULT_MAX_LEVEL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.nodes.push(node);
      this.selectedNode = node;
      this.editNodeData = { ...node };
      this.showProperties = true;
      this.editingDescription = false;
      return;
    }

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
      this.dialogService.alert(this.i18n.t('canvas.linkParentError'));
      return;
    }

    targetNode.parentId = sourceNode.id;
    if (!this.isDemoTree) {
      this.nodesService.updateNode(targetNode.id, { parentId: sourceNode.id }).subscribe();
    }
  }

  cancelLinking() {
    this.interactionState = 'idle';
    this.linkSourceNode = null;
  }

  saveTimeout: any;

  saveNodeProperties() {
    if (!this.selectedNode || !this.editNodeData) return;

    // Recalculate progress if maxLevel changed
    const maxLvl = this.editNodeData.maxLevel || DEFAULT_MAX_LEVEL;
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

    if (!this.isDemoTree) {
      this.saveTimeout = setTimeout(() => {
        if (!this.selectedNode) return;
        this.nodesService.updateNode(this.selectedNode.id, this.editNodeData).subscribe(() => {
          // Optionally sync any backend-specific generated fields
        });
      }, 500);
    }
  }

  async deleteNode() {
    if (!this.selectedNode) return;
    if (await this.dialogService.confirm(this.i18n.t('canvas.deleteNodeConfirm'))) {
      if (this.isDemoTree) {
        this.nodes = this.nodes.filter(n => n.id !== this.selectedNode?.id);
        this.nodes.forEach(n => {
          if (n.parentId === this.selectedNode?.id) n.parentId = undefined;
        });
        this.selectedNode = null;
        this.showProperties = false;
        return;
      }

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
      totalMaxLevel += node.maxLevel || DEFAULT_MAX_LEVEL;
    }
    return totalMaxLevel === 0 ? 0 : Math.round((totalLevel / totalMaxLevel) * 100);
  }

  get calendarActivities() {
    return this.tree?.activities ?? [];
  }

  get hasCalendarActivities() {
    return this.calendarActivities.length > 0;
  }

  openHelp() {
    this.showHelp = true;
  }

  closeHelp() {
    this.showHelp = false;
    localStorage.setItem(HELP_STORAGE_KEY, 'true');
  }

  private maybeOpenHelp() {
    if (!localStorage.getItem(HELP_STORAGE_KEY)) {
      this.showHelp = true;
    }
  }

  private hideNodeTooltip() {
    this.hoveredNodeId = null;
    if (this.hoverTooltipTimer) {
      clearTimeout(this.hoverTooltipTimer);
      this.hoverTooltipTimer = null;
    }
    this.hoveredNode = null;
  }

  private centerDemoTreeInView() {
    setTimeout(() => this.centerViewOnNodes(this.nodes), 0);
  }

  private centerViewOnNodes(nodes: SkillNode[]) {
    if (!nodes.length) return;

    const nodeRadius = 80;
    const minX = Math.min(...nodes.map(node => node.positionX - nodeRadius));
    const maxX = Math.max(...nodes.map(node => node.positionX + nodeRadius));
    const minY = Math.min(...nodes.map(node => node.positionY - nodeRadius));
    const maxY = Math.max(...nodes.map(node => node.positionY + nodeRadius));

    const viewportWidth = this.svgCanvas?.nativeElement.clientWidth || window.innerWidth;
    const viewportHeight = this.svgCanvas?.nativeElement.clientHeight || window.innerHeight;

    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const zoomToFit = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight);
    const clampedZoom = Math.min(5, Math.max(0.15, Math.min(1, zoomToFit)));

    this.zoomLevel = clampedZoom;
    this.viewBox.w = viewportWidth / this.zoomLevel;
    this.viewBox.h = viewportHeight / this.zoomLevel;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.viewBox.x = centerX - this.viewBox.w / 2;
    this.viewBox.y = centerY - this.viewBox.h / 2;
  }
}
