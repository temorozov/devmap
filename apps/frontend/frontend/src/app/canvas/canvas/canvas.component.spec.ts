import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { TreesService } from '../../trees.service';
import { NodesService } from '../../nodes.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { of, Subject, throwError } from 'rxjs';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;
  let treesServiceMock: {
    getTree: jest.Mock;
    getSharedTree: jest.Mock;
    generateTree: jest.Mock;
  };
  let dialogServiceMock: {
    alert: jest.Mock;
  };

  beforeEach(async () => {
    treesServiceMock = {
      getTree: jest.fn(() => of({ id: '1', title: 'Tree', nodes: [] })),
      getSharedTree: jest.fn(() => of({ id: '1', title: 'Tree', nodes: [] })),
      generateTree: jest.fn(),
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
            queryParamMap: of({ get: () => null })
          }
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: TreesService, useValue: treesServiceMock },
        { provide: NodesService, useValue: { getNodesByTree: () => of([]) } },
        { provide: AuthService, useValue: { isGuest$: of(false) } },
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

  it('opens AI prompt and prefills text from query params', async () => {
    const route = TestBed.inject(ActivatedRoute) as {
      paramMap: any;
      queryParamMap: any;
    };

    route.paramMap = of({ get: (key: string) => (key === 'id' ? '1' : null) });
    route.queryParamMap = of({
      get: (key: string) => {
        if (key === 'openAi') return '1';
        if (key === 'aiPrompt') return 'New Tree Title';
        return null;
      }
    });

    component.ngOnInit();
    await Promise.resolve();

    expect(component.showAiPrompt).toBe(true);
    expect(component.aiPrompt).toBe('New Tree Title');
  });

  it('clears AI generation loader when generation succeeds', () => {
    const generatedNode = {
      id: 'node-1',
      treeId: '1',
      title: 'Generated',
      positionX: 0,
      positionY: 0,
      progress: 0,
      createdAt: '',
      updatedAt: '',
    };
    treesServiceMock.generateTree.mockReturnValue(of([generatedNode]));
    component.tree = { id: '1', title: 'Tree', sharedToken: '', userId: 'user', createdAt: '', updatedAt: '' };
    component.aiPrompt = 'Learn Angular';
    component.showAiPrompt = true;

    component.generateWithAi();

    expect(component.isGenerating).toBe(false);
    expect(component.showAiPrompt).toBe(false);
    expect(component.aiPrompt).toBe('');
    expect(component.nodes).toContain(generatedNode);
  });

  it('does not start a second AI generation while one is pending', () => {
    const pendingGeneration = new Subject<any[]>();
    treesServiceMock.generateTree.mockReturnValue(pendingGeneration.asObservable());
    component.tree = { id: '1', title: 'Tree', sharedToken: '', userId: 'user', createdAt: '', updatedAt: '' };
    component.aiPrompt = 'Learn Angular';

    component.generateWithAi();
    component.generateWithAi();

    expect(treesServiceMock.generateTree).toHaveBeenCalledTimes(1);

    pendingGeneration.next([]);
    pendingGeneration.complete();
  });

  it('clears AI generation loader when generation fails', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    treesServiceMock.generateTree.mockReturnValue(throwError(() => ({ error: { message: 'Failed' } })));
    component.tree = { id: '1', title: 'Tree', sharedToken: '', userId: 'user', createdAt: '', updatedAt: '' };
    component.aiPrompt = 'Learn Angular';

    component.generateWithAi();

    expect(component.isGenerating).toBe(false);
    expect(dialogServiceMock.alert).toHaveBeenCalled();
  });

  it('keeps AI generation loader active while the request is pending', () => {
    const pendingGeneration = new Subject<any[]>();
    treesServiceMock.generateTree.mockReturnValue(pendingGeneration.asObservable());
    component.tree = { id: '1', title: 'Tree', sharedToken: '', userId: 'user', createdAt: '', updatedAt: '' };
    component.aiPrompt = 'Learn Angular';

    component.generateWithAi();

    expect(component.isGenerating).toBe(true);

    pendingGeneration.next([]);
    pendingGeneration.complete();

    expect(component.isGenerating).toBe(false);
  });
});
