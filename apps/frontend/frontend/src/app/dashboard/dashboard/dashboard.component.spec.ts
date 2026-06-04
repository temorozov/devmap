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
        { provide: TreesService, useValue: { getTrees: () => of([]), createTree: () => of({ id: '1', title: 'My Tree' }), deleteTree: () => of({}), getExploreProfiles: () => of([]) } },
        { provide: AuthService, useValue: { isGuest$: of(false), logout: jest.fn(), loadMe: () => of({}) } },
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
});
