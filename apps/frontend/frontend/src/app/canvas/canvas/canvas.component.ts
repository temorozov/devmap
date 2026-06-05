import { ChangeDetectorRef, Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TreesService, Tree } from '../../trees.service';
import { NodesService, SkillNode } from '../../nodes.service';
import { I18nService } from '../../shared/services/i18n.service';
import { DEMO_TREE_ID, getDemoSampleNodes, getDemoSampleTitle } from '../../shared/data/demo-sample';
import { SkillGraphComponent, SkillGraphNode } from '../../shared/components/skill-graph/skill-graph.component';
import { skillNodesToGraph } from '../../shared/components/skill-graph/skill-graph.mapper';

/**
 * Read-only skill map: renders a tree's skills as an interactive force-directed
 * graph. Editing now lives elsewhere; this view is purely for exploring a map.
 */
@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, RouterModule, SkillGraphComponent],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  treesService = inject(TreesService);
  nodesService = inject(NodesService);
  i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  tree: Tree | null = null;
  nodes: SkillNode[] = [];
  graphNodes: SkillGraphNode[] = [];
  loading = true;
  isDemoTree = false;

  private readonly syncDemoTranslations = effect(() => {
    const language = this.i18n.language();
    if (this.tree?.id === DEMO_TREE_ID) {
      this.tree = { ...this.tree, title: getDemoSampleTitle(language) };
      this.nodes = getDemoSampleNodes(language);
      this.buildGraph();
      this.cdr.markForCheck();
    }
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.loadTree(id);
    });
  }

  loadTree(id: string) {
    this.loading = true;
    this.isDemoTree = id === DEMO_TREE_ID;

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
      this.buildGraph();
      this.loading = false;
      return;
    }

    this.treesService.getTree(id).subscribe({
      next: (tree) => this.applyTree(tree, id),
      error: () => {
        this.treesService.getSharedTree(id).subscribe({
          next: (tree) => { this.isDemoTree = false; this.applyTree(tree, id); },
          error: () => this.router.navigate(['/dashboard']),
        });
      },
    });
  }

  private applyTree(tree: Tree, id: string) {
    this.tree = tree;
    if (tree.nodes) {
      this.nodes = tree.nodes;
      this.buildGraph();
      this.loading = false;
      this.cdr.markForCheck();
    } else {
      this.nodesService.getNodesByTree(id).subscribe((nodes) => {
        this.nodes = nodes;
        this.buildGraph();
        this.loading = false;
        this.cdr.markForCheck();
      });
    }
  }

  /** Build a stable graph-node array (recomputed only when nodes change). */
  private buildGraph() {
    this.graphNodes = skillNodesToGraph(this.nodes);
  }

  get verifiedCount(): number {
    return this.nodes.filter((n) => n.verified).length;
  }

  get isEmptyTree(): boolean {
    return !this.loading && this.nodes.length === 0;
  }
}
