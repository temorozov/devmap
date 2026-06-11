import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { TreesService } from '../../trees.service';
import { NodesService } from '../../nodes.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TreesService, useValue: { getTrees: () => of([]), createTree: () => of({ id: '1', title: 'My Dev Map' }), deleteTree: () => of({}), syncGitHub: () => of({ nodeCount: 0, verifiedCount: 0, newSkills: [] }) } },
        { provide: NodesService, useValue: { getNodesByTree: () => of([]), createNode: () => of({ id: 'n1' }), updateNode: () => of({ id: 'n1' }), deleteNode: jest.fn(() => of({})) } },
        { provide: AuthService, useValue: { isGuest$: of(false), handle$: of('octocat'), githubUsername$: of('octocat'), user: { getValue: () => ({ handle: 'octocat', githubUsername: 'octocat' }) }, logout: jest.fn(), loadMe: () => of({}) } },
        { provide: DialogService, useValue: { confirm: jest.fn().mockResolvedValue(true), alert: jest.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clears skills from leaves upward', async () => {
    jest.spyOn(component, 'loadStack').mockImplementation(() => undefined);

    const deleted: string[] = [];
    const nodesService = TestBed.inject(NodesService) as unknown as { deleteNode: jest.Mock };
    nodesService.deleteNode.mockImplementation((id: string) => {
      deleted.push(id);
      return of({});
    });

    const mutable = component as unknown as { currentNodes: unknown; groups: typeof component.groups };
    mutable.currentNodes = [
      { id: 'root', parentId: null } as never,
      { id: 'ts', parentId: 'root' } as never,
      { id: 'nest', parentId: 'ts' } as never,
      { id: 'ng', parentId: 'ts' } as never,
      { id: 'n8n', parentId: 'root' } as never,
      { id: 'aio', parentId: 'n8n' } as never,
    ];
    mutable.groups = [
      {
        key: 'language',
        label: 'Languages',
        icon: 'code',
        skills: [
          { id: 'ts' } as never,
          { id: 'nest' } as never,
          { id: 'ng' } as never,
          { id: 'n8n' } as never,
          { id: 'aio' } as never,
        ],
      },
    ];

    await component.clearStack();

    expect(deleted).toEqual(['nest', 'ng', 'aio', 'ts', 'n8n']);
  });
});
