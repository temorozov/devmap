import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { TreesService } from '../../trees.service';
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
        { provide: TreesService, useValue: { getTrees: () => of([]), createTree: () => of({ id: '1', title: 'My Tree' }), deleteTree: () => of({}) } },
        { provide: AuthService, useValue: { isGuest$: of(false), logout: jest.fn() } },
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

  it('redirects to created tree with prefilled AI prompt query', () => {
    component.newTreeTitle = '  My Tree  ';

    component.createTree();

    expect(router.navigate).toHaveBeenCalledWith(['/tree', '1'], {
      queryParams: {
        aiPrompt: 'My Tree',
        openAi: '1',
      },
    });
  });
});
