import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { TreesService } from '../../trees.service';
import { NodesService } from '../../nodes.service';
import { DialogService } from '../../shared/services/dialog.service';
import { of } from 'rxjs';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;
  let treesServiceMock: {
    getTree: jest.Mock;
    getSharedTree: jest.Mock;
  };
  let dialogServiceMock: {
    alert: jest.Mock;
  };

  beforeEach(async () => {
    treesServiceMock = {
      getTree: jest.fn(() => of({ id: '1', title: 'Tree', nodes: [] })),
      getSharedTree: jest.fn(() => of({ id: '1', title: 'Tree', nodes: [] })),
    };
    dialogServiceMock = {
      alert: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: () => '1' }),
          }
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: TreesService, useValue: treesServiceMock },
        { provide: NodesService, useValue: { getNodesByTree: () => of([]) } },
        { provide: DialogService, useValue: dialogServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('centers the canvas on the root node when a tree loads', fakeAsync(() => {
    const rootNode = {
      id: 'root-node',
      treeId: '1',
      title: 'Root',
      positionX: 1200,
      positionY: 900,
      progress: 0,
      createdAt: '',
      updatedAt: '',
    };
    const childNode = {
      ...rootNode,
      id: 'child-node',
      title: 'Child',
      parentId: 'root-node',
      positionX: 1600,
      positionY: 1200,
    };
    treesServiceMock.getTree.mockReturnValue(of({ id: '1', title: 'Tree', nodes: [childNode, rootNode] }));

    component.loadTree('1');
    tick();

    const safeCenterX = 360 + (window.innerWidth - 360 - 24) / 2;
    const safeCenterY = 112 + (window.innerHeight - 112 - 36) / 2;

    expect(component.zoomLevel).toBe(1);
    expect(component.viewBox.x).toBe(rootNode.positionX - safeCenterX);
    expect(component.viewBox.y).toBe(rootNode.positionY - safeCenterY);
  }));
});
