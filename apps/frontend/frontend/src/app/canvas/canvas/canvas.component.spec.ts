import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { TreesService } from '../../trees.service';
import { NodesService } from '../../nodes.service';
import { of } from 'rxjs';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;

  const verifiedNode = {
    id: 'react',
    treeId: '1',
    title: 'React',
    parentId: 'ts',
    verified: true,
    evidence: [{ repo: 'a' }, { repo: 'b' }, { repo: 'c' }] as never,
    positionX: 0,
    positionY: 0,
    progress: 100,
    createdAt: '',
    updatedAt: '',
  };
  const baseNode = { ...verifiedNode, id: 'ts', title: 'TypeScript', parentId: undefined };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => '1' }) } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: TreesService,
          useValue: {
            getTree: jest.fn(() => of({ id: '1', title: 'Tree', nodes: [baseNode, verifiedNode] })),
            getSharedTree: jest.fn(() => of({ id: '1', title: 'Tree', nodes: [] })),
          },
        },
        { provide: NodesService, useValue: { getNodesByTree: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps tree nodes into graph nodes with prerequisite edges', () => {
    component.loadTree('1');
    const graph = component.graphNodes;
    expect(graph.length).toBe(2);
    const react = graph.find((n) => n.id === 'react');
    expect(react?.deps).toEqual(['ts']);
    expect(react?.tier).toBe('familiar'); // 3 repos → familiar
  });
});
