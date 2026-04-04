import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { TreesService } from '../../trees.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TreesService, useValue: { getTrees: () => of([]), createTree: () => of({ id: '1' }), deleteTree: () => of({}) } },
        { provide: AuthService, useValue: { isGuest$: of(false), logout: jest.fn() } },
        { provide: DialogService, useValue: { confirm: jest.fn().mockResolvedValue(true), alert: jest.fn() } },
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
